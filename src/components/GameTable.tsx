'use client';

import { useEffect, useState, useCallback } from 'react';
import { type Player, type Card, calculateHandValue, isBlackjack, createDeck } from '@/lib/gameTypes';
import { useUserStore, useLiveGameStore, useUIStore } from '@/lib/store';
import { PlayingCard } from './PlayingCard';
import { PlayerSeat } from './PlayerSeat';
import { Chip } from './Chip';
import { hapticFeedback } from '@/lib/telegram';

interface GameTableProps {
  roomId: string | null;
  onBack: () => void;
}

// Seat positions around the table (semi-circle)
const SEAT_POSITIONS = [
  { x: '10%', y: '70%' },
  { x: '25%', y: '82%' },
  { x: '50%', y: '88%' },
  { x: '75%', y: '82%' },
  { x: '90%', y: '70%' },
  { x: '50%', y: '55%' },
];

export function GameTable({ roomId, onBack }: GameTableProps) {
  const { dbUser } = useUserStore();
  const { showNotification } = useUIStore();

  // Local game state (for offline/demo mode)
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [localDealer, setLocalDealer] = useState<{ cards: Card[]; score: number }>({ cards: [], score: 0 });
  const [localDeck, setLocalDeck] = useState<Card[]>([]);
  const [localStatus, setLocalStatus] = useState<'waiting' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'results'>('waiting');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const [selectedBet, setSelectedBet] = useState(0);
  const [showBetPanel, setShowBetPanel] = useState(false);

  const chipValues = [5, 10, 25, 50, 100, 500];

  // Initialize local game
  useEffect(() => {
    if (!roomId && dbUser) {
      // Demo mode - add current user to the game
      const player: Player = {
        id: `player-${dbUser.telegram_id}`,
        name: dbUser.first_name || 'Oyuncu',
        avatar: dbUser.avatar || '🎭',
        chips: dbUser.chips,
        bet: 0,
        cards: [],
        isActive: true,
        isTurn: false,
        status: 'waiting',
        seatNumber: 1,
      };
      setLocalPlayers([player]);
      setMyPlayerId(player.id);
      setLocalDeck(createDeck());
      setLocalStatus('betting');
      setShowBetPanel(true);
    }
  }, [roomId, dbUser]);

  // Get current player
  const currentPlayer = localPlayers.find(p => p.id === myPlayerId);

  // Handle seat selection
  const handleSeatClick = (seatNumber: number) => {
    if (!dbUser) {
      showNotification('error', 'Giriş yapmanız gerekiyor');
      return;
    }

    // Check if seat is available
    if (localPlayers.find(p => p.seatNumber === seatNumber)) {
      showNotification('error', 'Bu koltuk dolu');
      return;
    }

    // Join the seat
    const player: Player = {
      id: `player-${dbUser.telegram_id}`,
      name: dbUser.first_name || 'Oyuncu',
      avatar: dbUser.avatar || '🎭',
      chips: dbUser.chips,
      bet: 0,
      cards: [],
      isActive: true,
      isTurn: false,
      status: 'waiting',
      seatNumber,
    };

    setLocalPlayers(prev => [...prev, player]);
    setMyPlayerId(player.id);
    hapticFeedback('medium');

    if (localStatus === 'waiting') {
      setLocalStatus('betting');
      setShowBetPanel(true);
    }
  };

  // Handle betting
  const handleChipClick = (value: number) => {
    if (currentPlayer && currentPlayer.chips >= selectedBet + value) {
      setSelectedBet((prev) => prev + value);
      hapticFeedback('light');
    }
  };

  const handleClearBet = () => {
    setSelectedBet(0);
  };

  const handleConfirmBet = () => {
    if (!currentPlayer || selectedBet === 0) return;

    setLocalPlayers(prev => prev.map(p =>
      p.id === myPlayerId
        ? { ...p, bet: selectedBet, chips: p.chips - selectedBet, status: 'playing' }
        : p
    ));

    setSelectedBet(0);
    setShowBetPanel(false);
    hapticFeedback('success');

    // Auto deal after bet
    setTimeout(() => dealCards(), 500);
  };

  // Deal cards
  const dealCards = () => {
    let deck = [...localDeck];
    const players = localPlayers.filter(p => p.bet > 0);

    if (players.length === 0) return;

    // Deal 2 cards to each player
    const updatedPlayers = localPlayers.map(player => {
      if (player.bet > 0) {
        const card1 = deck.pop()!;
        const card2 = deck.pop()!;
        return { ...player, cards: [card1, card2] };
      }
      return player;
    });

    // Deal 2 cards to dealer (one face down)
    const dealerCard1 = { ...deck.pop()!, faceUp: true };
    const dealerCard2 = { ...deck.pop()!, faceUp: false };

    setLocalPlayers(updatedPlayers);
    setLocalDealer({ cards: [dealerCard1, dealerCard2], score: calculateHandValue([dealerCard1]) });
    setLocalDeck(deck);
    setLocalStatus('playing');
    setCurrentPlayerIndex(0);

    // Set first player's turn
    const firstPlayer = updatedPlayers.find(p => p.bet > 0);
    if (firstPlayer) {
      setLocalPlayers(prev => prev.map(p => ({
        ...p,
        isTurn: p.id === firstPlayer.id
      })));
    }
  };

  // Hit
  const handleHit = () => {
    if (!currentPlayer || localStatus !== 'playing') return;

    let deck = [...localDeck];
    const newCard = deck.pop()!;

    const updatedPlayers = localPlayers.map(player => {
      if (player.id === myPlayerId) {
        const newCards = [...player.cards, newCard];
        const handValue = calculateHandValue(newCards);
        let status = player.status;

        if (handValue > 21) {
          status = 'bust';
        } else if (handValue === 21) {
          status = 'stand';
        }

        return { ...player, cards: newCards, status };
      }
      return player;
    });

    setLocalPlayers(updatedPlayers);
    setLocalDeck(deck);
    hapticFeedback('medium');

    // Check if current player is done
    const updatedPlayer = updatedPlayers.find(p => p.id === myPlayerId);
    if (updatedPlayer?.status === 'bust' || updatedPlayer?.status === 'stand') {
      moveToNextPlayer(updatedPlayers);
    }
  };

  // Stand
  const handleStand = () => {
    if (!currentPlayer) return;

    const updatedPlayers = localPlayers.map(p =>
      p.id === myPlayerId ? { ...p, status: 'stand' as const, isTurn: false } : p
    );

    setLocalPlayers(updatedPlayers);
    hapticFeedback('light');
    moveToNextPlayer(updatedPlayers);
  };

  // Double down
  const handleDoubleDown = () => {
    if (!currentPlayer) return;

    let deck = [...localDeck];
    const newCard = deck.pop()!;

    const updatedPlayers = localPlayers.map(player => {
      if (player.id === myPlayerId) {
        const newCards = [...player.cards, newCard];
        const handValue = calculateHandValue(newCards);
        const newBet = player.bet * 2;
        const newChips = player.chips - player.bet;

        return {
          ...player,
          cards: newCards,
          bet: newBet,
          chips: newChips,
          status: handValue > 21 ? 'bust' as const : 'stand' as const,
          isTurn: false,
        };
      }
      return player;
    });

    setLocalPlayers(updatedPlayers);
    setLocalDeck(deck);
    hapticFeedback('success');
    moveToNextPlayer(updatedPlayers);
  };

  // Move to next player or dealer
  const moveToNextPlayer = (players: Player[]) => {
    const playingPlayers = players.filter(p => p.status === 'playing');

    if (playingPlayers.length > 0) {
      setLocalPlayers(prev => prev.map(p => ({
        ...p,
        isTurn: p.id === playingPlayers[0].id
      })));
    } else {
      // Dealer's turn
      setLocalStatus('dealer-turn');
      setTimeout(() => dealerPlay(), 1000);
    }
  };

  // Dealer plays
  const dealerPlay = () => {
    let deck = [...localDeck];
    let dealerCards = localDealer.cards.map(c => ({ ...c, faceUp: true }));
    let dealerScore = calculateHandValue(dealerCards);

    // Dealer hits on 16 or less
    while (dealerScore < 17) {
      const newCard = { ...deck.pop()!, faceUp: true };
      dealerCards = [...dealerCards, newCard];
      dealerScore = calculateHandValue(dealerCards);
    }

    // Calculate results
    const updatedPlayers = localPlayers.map(player => {
      if (player.status === 'bust') {
        return { ...player, status: 'lose' as const };
      }

      const playerScore = calculateHandValue(player.cards);
      const playerHasBlackjack = isBlackjack(player.cards);
      const dealerHasBlackjack = isBlackjack(dealerCards);

      if (playerHasBlackjack && !dealerHasBlackjack) {
        return {
          ...player,
          status: 'blackjack' as const,
          chips: player.chips + Math.floor(player.bet * 2.5),
        };
      }

      if (dealerScore > 21) {
        return {
          ...player,
          status: 'win' as const,
          chips: player.chips + player.bet * 2,
        };
      }

      if (playerScore > dealerScore) {
        return {
          ...player,
          status: 'win' as const,
          chips: player.chips + player.bet * 2,
        };
      }

      if (playerScore === dealerScore) {
        return {
          ...player,
          status: 'push' as const,
          chips: player.chips + player.bet,
        };
      }

      return { ...player, status: 'lose' as const };
    });

    setLocalDealer({ cards: dealerCards, score: dealerScore });
    setLocalPlayers(updatedPlayers);
    setLocalDeck(deck);
    setLocalStatus('results');
    hapticFeedback('success');
  };

  // Reset game
  const handleNewGame = () => {
    setLocalPlayers(prev => prev.map(p => ({
      ...p,
      cards: [],
      bet: 0,
      status: 'waiting',
      isTurn: false,
    })));
    setLocalDealer({ cards: [], score: 0 });
    setLocalDeck(createDeck());
    setLocalStatus('betting');
    setShowBetPanel(true);
    hapticFeedback('medium');
  };

  // Check game conditions
  const isPlayerTurn = currentPlayer?.isTurn && localStatus === 'playing';
  const canHit = isPlayerTurn && currentPlayer?.status === 'playing';
  const canStand = canHit;
  const canDouble = canHit && currentPlayer?.cards.length === 2 && (currentPlayer?.chips || 0) >= (currentPlayer?.bet || 0);

  const dealerScore = calculateHandValue(localDealer.cards);
  const dealerHasBlackjack = isBlackjack(localDealer.cards);

  return (
    <div className="relative w-full h-[550px] md:h-[650px] lg:h-[700px] overflow-hidden">
      {/* Table Background */}
      <div className="absolute inset-0 felt-pattern rounded-[40%] border-[6px] border-amber-800/80 shadow-2xl" style={{
        boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Table edge highlight */}
        <div className="absolute inset-3 rounded-[40%] border border-amber-900/40" />

        {/* Center logo */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-15">
          <h2 className="text-3xl md:text-5xl font-bold text-amber-500" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY
          </h2>
          <p className="text-sm md:text-lg text-amber-600 tracking-widest">GAMES</p>
        </div>
      </div>

      {/* Dealer Area */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* Dealer label */}
        <div className="mb-3 px-4 py-1 bg-black/60 rounded-full border border-amber-500/30">
          <span className="text-amber-400 font-semibold text-xs tracking-wider">KRUPIYE</span>
        </div>

        {/* Dealer cards */}
        <div className="flex -space-x-3 mb-2">
          {localDealer.cards.length > 0 ? (
            localDealer.cards.map((card, index) => (
              <PlayingCard key={`dealer-${index}`} card={card} index={index} size="sm" />
            ))
          ) : (
            <div className="w-14 h-20 md:w-16 md:h-24 border-2 border-dashed border-amber-600/30 rounded-lg" />
          )}
        </div>

        {/* Dealer score */}
        {localDealer.cards.length > 0 && (
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${dealerScore > 21 ? 'bg-red-500' : 'bg-black/80'} text-white border border-white/10`}>
            {localStatus === 'results' || localStatus === 'dealer-turn' ? (
              dealerHasBlackjack ? 'BJ!' : dealerScore
            ) : (
              calculateHandValue([localDealer.cards[0]])
            )}
          </div>
        )}
      </div>

      {/* Player Seats */}
      {SEAT_POSITIONS.map((position, index) => {
        const player = localPlayers.find((p) => p.seatNumber === index + 1);
        return (
          <PlayerSeat
            key={`seat-${index + 1}`}
            player={player}
            seatNumber={index + 1}
            isCurrentUser={player?.id === myPlayerId}
            onSeatClick={() => handleSeatClick(index + 1)}
            position={position}
          />
        );
      })}

      {/* Betting Panel */}
      {showBetPanel && localStatus === 'betting' && currentPlayer && currentPlayer.bet === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 animate-slide-up max-w-sm w-[95%]">
          <h3 className="text-center text-amber-400 font-semibold mb-3 text-sm">Bahis Yap</h3>

          {/* Chip selection */}
          <div className="flex gap-1.5 md:gap-2 justify-center mb-3 flex-wrap">
            {chipValues.map((value) => (
              <Chip
                key={value}
                value={value}
                onClick={() => handleChipClick(value)}
                size="sm"
                disabled={(currentPlayer?.chips || 0) < selectedBet + value}
              />
            ))}
          </div>

          {/* Current bet */}
          <div className="text-center mb-3">
            <span className="text-gray-400 text-xs">Bahis:</span>
            <span className="text-amber-400 font-bold text-xl ml-2">{selectedBet}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleClearBet}
              className="btn-secondary text-xs px-4 py-2"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={handleConfirmBet}
              disabled={selectedBet === 0}
              className="btn-gold text-xs px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Onayla
            </button>
          </div>

          <p className="text-center text-gray-500 text-[10px] mt-2">
            Bakiye: <span className="text-amber-400">{currentPlayer?.chips}</span>
          </p>
        </div>
      )}

      {/* Action Buttons (Hit, Stand, Double) */}
      {localStatus === 'playing' && isPlayerTurn && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 animate-slide-up">
          <button
            type="button"
            onClick={handleHit}
            disabled={!canHit}
            className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
          >
            Kart Al
          </button>
          <button
            type="button"
            onClick={handleStand}
            disabled={!canStand}
            className="btn-secondary px-5 py-2.5 text-sm disabled:opacity-50"
          >
            Dur
          </button>
          {canDouble && (
            <button
              type="button"
              onClick={handleDoubleDown}
              className="btn-gold px-5 py-2.5 text-sm"
            >
              Katla
            </button>
          )}
        </div>
      )}

      {/* Game Status Message */}
      {localStatus === 'results' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center animate-slide-up">
          <div className="glass rounded-xl px-5 py-3">
            <h3 className="text-lg font-bold text-amber-400 mb-2">Sonuçlar</h3>
            {localPlayers.map((player) => (
              <div key={player.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white">{player.name}</span>
                <span className={`font-bold ${
                  player.status === 'win' || player.status === 'blackjack' ? 'text-green-400' :
                  player.status === 'lose' || player.status === 'bust' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {player.status === 'win' ? `+${player.bet}` :
                   player.status === 'blackjack' ? `+${Math.floor(player.bet * 1.5)}` :
                   player.status === 'lose' || player.status === 'bust' ? `-${player.bet}` :
                   'Berabere'}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={handleNewGame}
              className="btn-gold text-xs px-4 py-2 mt-3"
            >
              Yeni Oyun
            </button>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-3 right-3 glass rounded-lg px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            localStatus === 'waiting' ? 'bg-gray-400' :
            localStatus === 'betting' ? 'bg-amber-400 animate-pulse' :
            localStatus === 'playing' ? 'bg-green-400 animate-pulse' :
            localStatus === 'dealer-turn' ? 'bg-blue-400 animate-pulse' :
            'bg-purple-400'
          }`} />
          <span className="text-[10px] text-gray-300">
            {localStatus === 'waiting' ? 'Bekleniyor' :
             localStatus === 'betting' ? 'Bahis' :
             localStatus === 'playing' ? 'Oyun' :
             localStatus === 'dealer-turn' ? 'Krupiye' :
             'Sonuçlar'}
          </span>
        </div>
      </div>

      {/* Player Score Display (when playing) */}
      {currentPlayer && currentPlayer.cards.length > 0 && localStatus === 'playing' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 px-4 py-2 rounded-full border border-amber-500/30">
            <span className="text-amber-400 font-bold">
              {calculateHandValue(currentPlayer.cards)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
