'use client';

import { useEffect, useCallback, useState } from 'react';
import { useGameStore, calculateHandValue } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dealer } from './Dealer';
import { PlayerSlot } from './PlayerSlot';
import { BettingPanel } from './BettingPanel';
import { GameActions } from './GameActions';
import { ResultsPanel } from './ResultsPanel';
import { cn } from '@/lib/utils';
import { ArrowLeft, Coins, Wifi, WifiOff } from 'lucide-react';

export function TableView() {
  const {
    activeGame,
    currentUser,
    isConnected,
    countdown,
    turnTimer,
    leaveRoom,
    setReady,
    placeBet,
    hit,
    stand,
    doubleDown,
    decrementCountdown,
    decrementTurnTimer,
  } = useGameStore();

  const [isLeaving, setIsLeaving] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!activeGame) return;
    if (activeGame.status !== 'countdown' && activeGame.status !== 'betting') return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      decrementCountdown();
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame?.status, countdown, decrementCountdown]);

  // Turn timer
  useEffect(() => {
    if (!activeGame) return;
    if (activeGame.status !== 'playing') return;
    if (turnTimer <= 0) return;

    const timer = setInterval(() => {
      decrementTurnTimer();
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame?.status, turnTimer, decrementTurnTimer]);

  const handleLeave = useCallback(async () => {
    if (!activeGame) return;

    if (['dealing', 'playing', 'dealer_turn'].includes(activeGame.status)) {
      if (!window.confirm('Oyun devam ediyor! Çıkarsanız bu el için otomatik stand yapılacak. Devam etmek istiyor musunuz?')) {
        return;
      }
    }

    setIsLeaving(true);
    await leaveRoom();
    setIsLeaving(false);
  }, [activeGame, leaveRoom]);

  const handleSetReady = useCallback(async () => {
    await setReady();
  }, [setReady]);

  const handlePlaceBet = useCallback(async (amount: number) => {
    await placeBet(amount);
  }, [placeBet]);

  const handleHit = useCallback(async () => {
    await hit();
  }, [hit]);

  const handleStand = useCallback(async () => {
    await stand();
  }, [stand]);

  const handleDouble = useCallback(async () => {
    await doubleDown();
  }, [doubleDown]);

  if (!activeGame || !currentUser) return null;

  const myPlayer = activeGame.players.find(p => p.isCurrentUser);
  const currentPlayerIndex = activeGame.currentPlayerIndex;
  const currentPlayer = currentPlayerIndex >= 0 ? activeGame.players[currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.isCurrentUser && activeGame.status === 'playing';

  // 6 koltuk pozisyonları - yarım daire
  const seatPositions = [
    { left: '5%', bottom: '20%' },    // Seat 1 - Sol
    { left: '20%', bottom: '8%' },    // Seat 2
    { left: '38%', bottom: '3%' },    // Seat 3
    { left: '62%', bottom: '3%' },    // Seat 4
    { left: '80%', bottom: '8%' },    // Seat 5
    { left: '95%', bottom: '20%' },   // Seat 6 - Sağ
  ];

  // Sıralı koltukları oluştur
  const seats = [1, 2, 3, 4, 5, 6].map((seatNumber, index) => {
    const player = activeGame.players.find(p => p.seatNumber === seatNumber);
    const isActive = player && currentPlayer?.telegramId === player.telegramId;

    return {
      seatNumber,
      player,
      isActive,
      position: seatPositions[index],
    };
  });

  return (
    <div className="fixed inset-0 table-felt flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40">
        <button
          onClick={handleLeave}
          disabled={isLeaving}
          type="button"
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isLeaving ? 'Çıkılıyor...' : 'Geri'}</span>
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400 font-medium">
            {activeGame.roomName}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400 text-xs">
            {activeGame.minBet}-{activeGame.maxBet}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}

          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20">
            <Coins className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">{currentUser.balance.toLocaleString()}</span>
          </div>
          <Avatar className="w-8 h-8 border border-green-500">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="bg-gray-700 text-xs">{currentUser.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Game Status - Ortada */}
      {activeGame.status === 'waiting' && myPlayer?.status === 'waiting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <Button
            onClick={handleSetReady}
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

      {activeGame.status === 'waiting' && myPlayer?.status === 'ready' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 mb-1">Hazırsın!</div>
            <div className="text-gray-400 text-sm">Diğer oyuncular bekleniyor...</div>
          </div>
        </div>
      )}

      {activeGame.status === 'countdown' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Oyun Başlıyor</div>
            <div className="text-5xl font-bold text-yellow-400 animate-pulse">
              {countdown}
            </div>
          </div>
        </div>
      )}

      {/* Dealer Area */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 relative">
        <Dealer
          cards={activeGame.dealerCards}
          score={activeGame.dealerScore}
          isPlaying={activeGame.status === 'dealer_turn'}
        />

        {/* Players around the table */}
        <div className="absolute inset-0 pointer-events-none">
          {seats.map(({ seatNumber, player, isActive, position }) => (
            <div
              key={seatNumber}
              className="absolute transform -translate-x-1/2 pointer-events-auto"
              style={{ left: position.left, bottom: position.bottom }}
            >
              <PlayerSlot
                player={player}
                seatNumber={seatNumber}
                isActive={isActive || false}
                turnTimer={turnTimer}
                isEmpty={!player}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Betting Panel */}
      {activeGame.status === 'betting' && myPlayer && myPlayer.bet === 0 && (
        <BettingPanel
          minBet={activeGame.minBet}
          maxBet={activeGame.maxBet}
          balance={currentUser.balance}
          countdown={countdown}
          onPlaceBet={handlePlaceBet}
        />
      )}

      {/* Bahis bekleniyor mesajı */}
      {activeGame.status === 'betting' && myPlayer && myPlayer.bet > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-green-600/80 px-6 py-3 rounded-xl text-white text-center">
            <div className="font-bold">Bahsin: {myPlayer.bet}</div>
            <div className="text-sm opacity-80">Diğer oyuncular bekleniyor... ({countdown}s)</div>
          </div>
        </div>
      )}

      {/* Game Actions */}
      {isMyTurn && myPlayer && (
        <GameActions
          canHit={myPlayer.totalScore < 21}
          canStand={true}
          canDouble={myPlayer.cards.length === 2 && currentUser.balance >= myPlayer.bet}
          onHit={handleHit}
          onStand={handleStand}
          onDouble={handleDouble}
        />
      )}

      {/* Sıra başkasında mesajı */}
      {activeGame.status === 'playing' && !isMyTurn && currentPlayer && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-gray-800/90 px-6 py-3 rounded-xl text-white text-center">
            <div className="text-sm opacity-80">Sıra:</div>
            <div className="font-bold">{currentPlayer.name}</div>
          </div>
        </div>
      )}

      {/* Results Panel */}
      {activeGame.status === 'results' && (
        <ResultsPanel
          players={activeGame.players}
          dealerScore={activeGame.dealerScore}
          onReady={handleSetReady}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
