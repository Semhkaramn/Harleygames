'use client';

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dealer } from './Dealer';
import { PlayerSlot } from './PlayerSlot';
import { BettingPanel } from './BettingPanel';
import { GameActions } from './GameActions';
import { ResultsPanel } from './ResultsPanel';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export function TableView() {
  const {
    activeTable,
    currentUser,
    leaveTable,
    setReady,
    placeBet,
    hit,
    stand,
    doubleDown,
    decrementCountdown,
    decrementTurnTimer,
    simulateBotActions,
    resetForNewRound,
  } = useGameStore();

  // Countdown timer
  useEffect(() => {
    if (!activeTable) return;
    if (activeTable.status !== 'countdown' && activeTable.status !== 'betting') return;
    if (activeTable.countdown <= 0) return;

    const timer = setInterval(() => {
      decrementCountdown();
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTable?.status, activeTable?.countdown, decrementCountdown]);

  // Turn timer
  useEffect(() => {
    if (!activeTable) return;
    if (activeTable.status !== 'playing') return;
    if (activeTable.turnTimer <= 0) return;

    const timer = setInterval(() => {
      decrementTurnTimer();
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTable?.status, activeTable?.turnTimer, decrementTurnTimer]);

  // Bot actions
  useEffect(() => {
    if (!activeTable) return;
    if (activeTable.status !== 'playing') return;

    const currentPlayer = activeTable.players[activeTable.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isCurrentUser) return;

    // Bot oyuncunun sırası
    const timeout = setTimeout(() => {
      simulateBotActions();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [activeTable?.currentPlayerIndex, activeTable?.status, simulateBotActions]);

  // Bot bahisleri artık startBetting fonksiyonunda otomatik olarak veriliyor

  // Leave on browser close
  useEffect(() => {
    const handleBeforeUnload = () => {
      leaveTable();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [leaveTable]);

  const handleLeave = useCallback(() => {
    // Aktif oyundaysa uyar - Status tutarsızlığı düzeltildi
    if (activeTable && ['dealing', 'playing', 'dealer_turn', 'dealer-turn'].includes(activeTable.status)) {
      if (window.confirm('Oyun devam ediyor! Çıkarsanız bu el için otomatik stand yapılacak. Devam etmek istiyor musunuz?')) {
        leaveTable();
      }
    } else {
      leaveTable();
    }
  }, [activeTable, leaveTable]);

  if (!activeTable) return null;

  const currentPlayer = activeTable.players[activeTable.currentPlayerIndex];
  const isMyTurn = currentPlayer?.isCurrentUser && activeTable.status === 'playing';
  const myPlayer = activeTable.players.find(p => p.isCurrentUser);

  // 5 koltuk pozisyonları (yarım daire şeklinde, sağdan sola)
  const seatPositions = [
    { left: '85%', bottom: '15%' },  // Seat 4 - En sağ
    { left: '70%', bottom: '8%' },   // Seat 3
    { left: '50%', bottom: '5%' },   // Seat 2 - Orta
    { left: '30%', bottom: '8%' },   // Seat 1
    { left: '15%', bottom: '15%' },  // Seat 0 - En sol
  ];

  // Sıralı koltukları oluştur (sağdan sola: 4, 3, 2, 1, 0)
  const seats = [4, 3, 2, 1, 0].map((seatIndex) => {
    const player = activeTable.players.find(p => p.seatIndex === seatIndex);
    const isActive = currentPlayer?.seatIndex === seatIndex;

    return {
      seatIndex,
      player,
      isActive,
      position: seatPositions[4 - seatIndex], // Reverse için
    };
  });

  return (
    <div className="fixed inset-0 table-felt flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/30">
        <Button
          onClick={handleLeave}
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold">
            Oda {activeTable.name}
          </span>
          <span className="text-gray-400 text-sm">
            Min: {activeTable.minBet} - Max: {activeTable.maxBet}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20">
            <span className="text-yellow-400 text-lg">🪙</span>
            <span className="text-yellow-400 font-bold">{currentUser.balance}</span>
          </div>
          <Avatar className="w-10 h-10 border-2 border-green-500">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="bg-gray-700">{currentUser.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Game Status */}
      {activeTable.status === 'waiting' && myPlayer?.status === 'waiting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <Button
            onClick={setReady}
            size="lg"
            className={cn(
              'px-8 py-6 text-xl font-bold',
              'bg-gradient-to-r from-green-600 to-green-500',
              'hover:from-green-500 hover:to-green-400',
              'shadow-lg shadow-green-600/30 animate-pulse'
            )}
          >
            Hazırım
          </Button>
        </div>
      )}

      {activeTable.status === 'waiting' && myPlayer?.status === 'ready' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-2">Hazırsın!</div>
            <div className="text-gray-400">Diğer oyuncular bekleniyor...</div>
          </div>
        </div>
      )}

      {activeTable.status === 'countdown' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="text-center">
            <div className="text-gray-400 mb-2">Oyun Başlıyor</div>
            <div className="text-6xl font-bold text-yellow-400 animate-countdown">
              {activeTable.countdown}
            </div>
          </div>
        </div>
      )}

      {/* Dealer Area */}
      <div className="flex-1 flex flex-col items-center justify-start pt-8 relative">
        <Dealer
          cards={activeTable.dealerCards}
          score={activeTable.dealerScore}
          isPlaying={activeTable.status === 'dealer_turn'}
        />

        {/* Players around the table */}
        <div className="absolute inset-0">
          {seats.map(({ seatIndex, player, isActive, position }) => (
            <div
              key={seatIndex}
              className="absolute transform -translate-x-1/2"
              style={{ left: position.left, bottom: position.bottom }}
            >
              <PlayerSlot
                player={player}
                seatIndex={seatIndex}
                isActive={isActive}
                turnTimer={activeTable.turnTimer}
                isEmpty={!player}
                onSit={() => {
                  // Zaten masadaysa oturamaz
                  if (myPlayer) return;
                  useGameStore.getState().joinTable(activeTable.id, seatIndex);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Betting Panel */}
      {activeTable.status === 'betting' && myPlayer && myPlayer.bet === 0 && (
        <BettingPanel
          minBet={activeTable.minBet}
          maxBet={activeTable.maxBet}
          balance={currentUser.balance}
          countdown={activeTable.countdown}
          onPlaceBet={placeBet}
        />
      )}

      {/* Game Actions */}
      {isMyTurn && myPlayer && (
        <GameActions
          canHit={myPlayer.totalScore < 21}
          canStand={true}
          canDouble={myPlayer.cards.length === 2 && currentUser.balance >= myPlayer.bet}
          onHit={hit}
          onStand={stand}
          onDouble={doubleDown}
        />
      )}

      {/* Results Panel */}
      {activeTable.status === 'results' && (
        <ResultsPanel
          players={activeTable.players}
          dealerScore={activeTable.dealerScore}
          onReady={() => {
            resetForNewRound();
            setTimeout(() => setReady(), 100);
          }}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
