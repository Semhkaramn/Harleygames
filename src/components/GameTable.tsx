'use client';

import { useEffect, useState, useCallback } from 'react';
import { type Player, calculateHandValue, isBlackjack } from '@/lib/gameTypes';
import { useGameStore } from '@/lib/useGameStore';
import { PlayingCard } from './PlayingCard';
import { PlayerSeat } from './PlayerSeat';
import { Chip } from './Chip';
import { ChipStack } from './Chip';

// Seat positions around the table (semi-circle)
const SEAT_POSITIONS = [
  { x: '15%', y: '75%' },
  { x: '30%', y: '85%' },
  { x: '50%', y: '90%' },
  { x: '70%', y: '85%' },
  { x: '85%', y: '75%' },
  { x: '95%', y: '55%' },
];

export function GameTable() {
  const {
    gameState,
    currentPlayer,
    joinGame,
    addBot,
    placeBet,
    dealCards,
    hit,
    stand,
    doubleDown,
    dealerPlay,
    resetGame,
    startGame,
  } = useGameStore();

  const [selectedBet, setSelectedBet] = useState(0);
  const [showBetPanel, setShowBetPanel] = useState(false);

  const chipValues = [5, 10, 25, 50, 100, 500];

  // Handle seat selection
  const handleSeatClick = (seatNumber: number) => {
    if (!currentPlayer) {
      joinGame(seatNumber);
    }
  };

  // Handle betting
  const handleChipClick = (value: number) => {
    if (currentPlayer && currentPlayer.chips >= selectedBet + value) {
      setSelectedBet((prev) => prev + value);
    }
  };

  const handleClearBet = () => {
    setSelectedBet(0);
  };

  const handleConfirmBet = () => {
    if (currentPlayer && selectedBet > 0) {
      placeBet(currentPlayer.id, selectedBet);
      setSelectedBet(0);
      setShowBetPanel(false);
    }
  };

  // Auto start betting phase
  useEffect(() => {
    if (gameState.status === 'waiting' && gameState.players.length >= 1) {
      const timer = setTimeout(() => {
        startGame();
        setShowBetPanel(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.players.length, startGame]);

  // Auto deal cards after all bets are placed
  useEffect(() => {
    if (gameState.status === 'betting') {
      const playersWithBets = gameState.players.filter((p) => p.bet > 0);
      if (playersWithBets.length > 0 && playersWithBets.length === gameState.players.length) {
        setTimeout(() => {
          dealCards();
        }, 500);
      }
    }
  }, [gameState.status, gameState.players, dealCards]);

  // Dealer's turn
  useEffect(() => {
    if (gameState.status === 'dealer-turn') {
      setTimeout(() => {
        dealerPlay();
      }, 1000);
    }
  }, [gameState.status, dealerPlay]);

  // Auto reset after results
  useEffect(() => {
    if (gameState.status === 'results') {
      const timer = setTimeout(() => {
        resetGame();
        setShowBetPanel(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState.status, resetGame]);

  const isPlayerTurn = currentPlayer && gameState.players[gameState.currentPlayerIndex]?.id === currentPlayer.id;
  const canHit = isPlayerTurn && gameState.status === 'playing' && currentPlayer.status === 'playing';
  const canStand = canHit;
  const canDouble = canHit && currentPlayer.cards.length === 2 && currentPlayer.chips >= currentPlayer.bet;

  const dealerScore = calculateHandValue(gameState.dealer.cards);
  const dealerHasBlackjack = isBlackjack(gameState.dealer.cards);

  return (
    <div className="relative w-full h-[600px] md:h-[700px] lg:h-[800px] overflow-hidden">
      {/* Table Background */}
      <div className="absolute inset-0 felt-pattern rounded-[50%] border-8 border-amber-800 shadow-2xl" style={{
        boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.5), 0 0 50px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Table edge highlight */}
        <div className="absolute inset-4 rounded-[50%] border border-amber-900/30" />

        {/* Center logo */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-20">
          <h2 className="text-4xl md:text-6xl font-bold text-amber-500" style={{ fontFamily: "'Playfair Display', serif" }}>
            BLACKJACK
          </h2>
          <p className="text-lg md:text-xl text-amber-600 mt-2">21</p>
        </div>
      </div>

      {/* Dealer Area */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* Dealer label */}
        <div className="mb-4 px-4 py-1 bg-black/50 rounded-full">
          <span className="text-amber-400 font-semibold text-sm">KRUPIYE</span>
        </div>

        {/* Dealer cards */}
        <div className="flex -space-x-4 mb-2">
          {gameState.dealer.cards.length > 0 ? (
            gameState.dealer.cards.map((card, index) => (
              <PlayingCard key={`dealer-${index}`} card={card} index={index} size="md" />
            ))
          ) : (
            <div className="w-16 h-24 md:w-[70px] md:h-[100px] border-2 border-dashed border-amber-600/30 rounded-lg" />
          )}
        </div>

        {/* Dealer score */}
        {gameState.dealer.cards.length > 0 && (
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${dealerScore > 21 ? 'bg-red-500' : 'bg-black/70'} text-white`}>
            {gameState.status === 'results' || gameState.status === 'dealer-turn' ? (
              dealerHasBlackjack ? 'BLACKJACK!' : dealerScore
            ) : (
              calculateHandValue([gameState.dealer.cards[0]])
            )}
          </div>
        )}
      </div>

      {/* Player Seats */}
      {SEAT_POSITIONS.map((position, index) => {
        const player = gameState.players.find((p) => p.seatNumber === index + 1);
        return (
          <PlayerSeat
            key={`seat-${index + 1}`}
            player={player}
            seatNumber={index + 1}
            isCurrentUser={player?.id === currentPlayer?.id}
            onSeatClick={() => handleSeatClick(index + 1)}
            position={position}
          />
        );
      })}

      {/* Betting Panel */}
      {showBetPanel && gameState.status === 'betting' && currentPlayer && currentPlayer.bet === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 md:p-6 animate-slide-up">
          <h3 className="text-center text-amber-400 font-semibold mb-3">Bahis Yap</h3>

          {/* Chip selection */}
          <div className="flex gap-2 md:gap-3 justify-center mb-4">
            {chipValues.map((value) => (
              <Chip
                key={value}
                value={value}
                onClick={() => handleChipClick(value)}
                size="md"
              />
            ))}
          </div>

          {/* Current bet */}
          <div className="text-center mb-4">
            <span className="text-gray-400 text-sm">Bahis:</span>
            <span className="text-amber-400 font-bold text-2xl ml-2">{selectedBet}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={handleClearBet}
              className="btn-secondary text-sm px-4 py-2"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={handleConfirmBet}
              disabled={selectedBet === 0}
              className="btn-gold text-sm px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Onayla
            </button>
          </div>

          <p className="text-center text-gray-500 text-xs mt-3">
            Bakiye: <span className="text-amber-400">{currentPlayer.chips}</span>
          </p>
        </div>
      )}

      {/* Action Buttons (Hit, Stand, Double) */}
      {gameState.status === 'playing' && isPlayerTurn && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 animate-slide-up">
          <button
            type="button"
            onClick={() => currentPlayer && hit(currentPlayer.id)}
            disabled={!canHit}
            className="btn-primary px-6 py-3 text-lg disabled:opacity-50"
          >
            Kart Al
          </button>
          <button
            type="button"
            onClick={() => currentPlayer && stand(currentPlayer.id)}
            disabled={!canStand}
            className="btn-secondary px-6 py-3 text-lg disabled:opacity-50"
          >
            Dur
          </button>
          {canDouble && (
            <button
              type="button"
              onClick={() => currentPlayer && doubleDown(currentPlayer.id)}
              className="btn-gold px-6 py-3 text-lg"
            >
              Katla
            </button>
          )}
        </div>
      )}

      {/* Game Status Message */}
      {gameState.status === 'results' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center animate-slide-up">
          <div className="glass rounded-xl px-6 py-4">
            <h3 className="text-xl font-bold text-amber-400 mb-2">Sonuçlar</h3>
            {gameState.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white">{player.name}</span>
                <span className={`font-bold ${
                  player.status === 'win' || player.status === 'blackjack' ? 'text-green-400' :
                  player.status === 'lose' || player.status === 'bust' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {player.status === 'win' ? `+${player.bet}` :
                   player.status === 'blackjack' ? `+${player.bet * 1.5}` :
                   player.status === 'lose' || player.status === 'bust' ? `-${player.bet}` :
                   'Berabere'}
                </span>
              </div>
            ))}
            <p className="text-gray-400 text-xs mt-3">Yeni oyun 5 saniye içinde başlayacak...</p>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-4 right-4 glass rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            gameState.status === 'waiting' ? 'bg-gray-400' :
            gameState.status === 'betting' ? 'bg-amber-400 animate-pulse' :
            gameState.status === 'playing' ? 'bg-green-400 animate-pulse' :
            'bg-blue-400'
          }`} />
          <span className="text-xs text-gray-300">
            {gameState.status === 'waiting' ? 'Oyuncu Bekleniyor' :
             gameState.status === 'betting' ? 'Bahis Zamanı' :
             gameState.status === 'playing' ? 'Oyun Devam Ediyor' :
             gameState.status === 'dealer-turn' ? 'Krupiye Oynuyor' :
             'Sonuçlar'}
          </span>
        </div>
      </div>

      {/* Add Bot Button */}
      {gameState.status === 'waiting' && gameState.players.length < 6 && currentPlayer && (
        <div className="absolute top-4 left-4">
          <button
            type="button"
            onClick={() => {
              const availableSeats = [1, 2, 3, 4, 5, 6].filter(
                (s) => !gameState.players.find((p) => p.seatNumber === s)
              );
              if (availableSeats.length > 0) {
                addBot(availableSeats[0]);
              }
            }}
            className="btn-secondary text-sm px-3 py-2"
          >
            + Bot Ekle
          </button>
        </div>
      )}
    </div>
  );
}
