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
import { ArrowLeft, Coins } from 'lucide-react';

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

    const timeout = setTimeout(() => {
      simulateBotActions();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [activeTable?.currentPlayerIndex, activeTable?.status, simulateBotActions]);

  // Leave on browser close
  useEffect(() => {
    const handleBeforeUnload = () => {
      leaveTable();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [leaveTable]);

  const handleLeave = useCallback(() => {
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

  // 5 koltuk pozisyonları - yarım daire, daha geniş aralık
  const seatPositions = [
    { left: '10%', bottom: '25%' },   // Seat 0 - Sol
    { left: '25%', bottom: '10%' },   // Seat 1
    { left: '50%', bottom: '5%' },    // Seat 2 - Orta
    { left: '75%', bottom: '10%' },   // Seat 3
    { left: '90%', bottom: '25%' },   // Seat 4 - Sağ
  ];

  // Sıralı koltukları oluştur
  const seats = [0, 1, 2, 3, 4].map((seatIndex) => {
    const player = activeTable.players.find(p => p.seatIndex === seatIndex);
    const isActive = currentPlayer?.seatIndex === seatIndex;

    return {
      seatIndex,
      player,
      isActive,
      position: seatPositions[seatIndex],
    };
  });

  return (
    <div className="fixed inset-0 table-felt flex flex-col overflow-hidden">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40">
        <button
          onClick={handleLeave}
          type="button"
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri</span>
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400 font-medium">
            {activeTable.name}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400 text-xs">
            {activeTable.minBet}-{activeTable.maxBet}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20">
            <Coins className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">{currentUser.balance}</span>
          </div>
          <Avatar className="w-8 h-8 border border-green-500">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="bg-gray-700 text-xs">{currentUser.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Game Status - Ortada */}
      {activeTable.status === 'waiting' && myPlayer?.status === 'waiting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <Button
            onClick={setReady}
            size="lg"
            className={cn(
              'px-6 py-4 text-lg font-bold',
              'bg-gradient-to-r from-green-600 to-green-500',
              'hover:from-green-500 hover:to-green-400',
              'shadow-lg shadow-green-600/30'
            )}
          >
            Hazırım
          </Button>
        </div>
      )}

      {activeTable.status === 'waiting' && myPlayer?.status === 'ready' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 mb-1">Hazırsın!</div>
            <div className="text-gray-400 text-sm">Diğer oyuncular bekleniyor...</div>
          </div>
        </div>
      )}

      {activeTable.status === 'countdown' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Oyun Başlıyor</div>
            <div className="text-5xl font-bold text-yellow-400 animate-countdown">
              {activeTable.countdown}
            </div>
          </div>
        </div>
      )}

      {/* Dealer Area */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 relative">
        <Dealer
          cards={activeTable.dealerCards}
          score={activeTable.dealerScore}
          isPlaying={activeTable.status === 'dealer_turn'}
        />

        {/* Players around the table */}
        <div className="absolute inset-0 pointer-events-none">
          {seats.map(({ seatIndex, player, isActive, position }) => (
            <div
              key={seatIndex}
              className="absolute transform -translate-x-1/2 pointer-events-auto"
              style={{ left: position.left, bottom: position.bottom }}
            >
              <PlayerSlot
                player={player}
                seatIndex={seatIndex}
                isActive={isActive}
                turnTimer={activeTable.turnTimer}
                isEmpty={!player}
                onSit={() => {
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
