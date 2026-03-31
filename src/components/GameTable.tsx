'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { type Player, type Card, calculateHandValue, isBlackjack, createDeck } from '@/lib/gameTypes';
import { useUserStore, useUIStore } from '@/lib/store';
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

const MIN_DECK_CARDS = 15;

interface ServerGameState {
  id: number;
  room_id: string;
  status: string;
  dealer_cards: Card[];
  dealer_score: number;
  deck: Card[];
  current_player_index: number;
  players: {
    id: string;
    telegramId: number;
    name: string;
    avatar: string;
    seatNumber: number;
    bet: number;
    cards: Card[];
    status: string;
    isTurn: boolean;
  }[];
}

export function GameTable({ roomId, onBack }: GameTableProps) {
  const { dbUser, updateChips, setDbUser } = useUserStore();
  const { showNotification } = useUIStore();

  // Server game state
  const [serverGame, setServerGame] = useState<ServerGameState | null>(null);
  const [isServerMode, setIsServerMode] = useState(!!roomId);

  // Local game state (for demo mode when no roomId)
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [localDealer, setLocalDealer] = useState<{ cards: Card[]; score: number }>({ cards: [], score: 0 });
  const [localDeck, setLocalDeck] = useState<Card[]>([]);
  const [localStatus, setLocalStatus] = useState<'waiting' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'results'>('waiting');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myGamePlayerId, setMyGamePlayerId] = useState<string | null>(null);

  const [selectedBet, setSelectedBet] = useState(0);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const chipValues = [5, 10, 25, 50, 100, 500];

  // Refresh user data from server
  const refreshUserData = useCallback(async () => {
    if (!dbUser) return;
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: '',
          user: {
            id: dbUser.telegram_id,
            first_name: dbUser.first_name,
            username: dbUser.username,
          },
        }),
      });
      const data = await response.json();
      if (data.success && data.user) {
        setDbUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [dbUser, setDbUser]);

  // Fetch game state from server
  const fetchGameState = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/game?room_id=${roomId}`);
      const data = await response.json();

      if (data.game) {
        setServerGame(data.game);

        // Find my player in the game
        if (dbUser) {
          const myPlayer = data.game.players?.find(
            (p: { telegramId: number }) => p.telegramId === dbUser.telegram_id
          );
          if (myPlayer) {
            setMyGamePlayerId(myPlayer.id);
          }
        }

        // Auto trigger dealer play when it's dealer's turn
        if (data.game.status === 'dealer-turn') {
          await triggerDealerPlay();
        }
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [roomId, dbUser]);

  // Trigger dealer play
  const triggerDealerPlay = async () => {
    if (!roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'dealer_play',
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGameState();
        await refreshUserData();
        hapticFeedback('success');
      }
    } catch (error) {
      console.error('Dealer play error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start polling for server mode
  useEffect(() => {
    if (isServerMode && roomId) {
      fetchGameState();
      pollingRef.current = setInterval(fetchGameState, 2000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [isServerMode, roomId, fetchGameState]);

  // Initialize local game for demo mode
  useEffect(() => {
    if (!roomId && dbUser && !isServerMode) {
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
  }, [roomId, dbUser, isServerMode]);

  // Handle joining a seat (server mode)
  const handleJoinSeat = async (seatNumber: number) => {
    if (!dbUser || !roomId) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'join',
          telegram_id: dbUser.telegram_id,
          seat_number: seatNumber,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGameState();
        setShowBetPanel(true);
        hapticFeedback('medium');
      } else {
        showNotification('error', data.error || 'Koltuğa oturulamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle placing bet (server mode)
  const handleServerBet = async () => {
    if (!myGamePlayerId || !roomId || selectedBet === 0 || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'bet',
          player_id: myGamePlayerId,
          bet: selectedBet,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedBet(0);
        setShowBetPanel(false);
        await fetchGameState();
        await refreshUserData();
        hapticFeedback('success');

        // Auto deal after bet (single player mode)
        setTimeout(async () => {
          await handleDeal();
        }, 500);
      } else {
        showNotification('error', data.error || 'Bahis yapılamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle deal cards (server mode)
  const handleDeal = async () => {
    if (!roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'deal',
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGameState();
        hapticFeedback('medium');
      }
    } catch (error) {
      console.error('Deal error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle hit (server mode)
  const handleServerHit = async () => {
    if (!myGamePlayerId || !roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'hit',
          player_id: myGamePlayerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGameState();
        hapticFeedback('medium');

        if (data.status === 'bust') {
          showNotification('error', 'Battınız! 21\'i geçtiniz.');
        }
      } else {
        showNotification('error', data.error || 'Kart alınamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle stand (server mode)
  const handleServerStand = async () => {
    if (!myGamePlayerId || !roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'stand',
          player_id: myGamePlayerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGameState();
        hapticFeedback('light');
      } else {
        showNotification('error', data.error || 'İşlem yapılamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle double down (server mode)
  const handleServerDouble = async () => {
    if (!myGamePlayerId || !roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'double_down',
          player_id: myGamePlayerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGameState();
        await refreshUserData();
        hapticFeedback('success');

        if (data.status === 'bust') {
          showNotification('error', 'Battınız! 21\'i geçtiniz.');
        }
      } else {
        showNotification('error', data.error || 'Katlama yapılamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start new game (server mode)
  const handleNewServerGame = async () => {
    if (!roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'start',
        }),
      });

      const data = await response.json();
      if (data.game) {
        await fetchGameState();
        setShowBetPanel(true);
        hapticFeedback('medium');
      }
    } catch (error) {
      console.error('Start game error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // =====================
  // LOCAL MODE FUNCTIONS
  // =====================

  const ensureDeckHasCards = useCallback((deck: Card[]): Card[] => {
    if (deck.length < MIN_DECK_CARDS) {
      const newDeck = createDeck();
      return [...newDeck, ...deck];
    }
    return deck;
  }, []);

  const handleSeatClick = (seatNumber: number) => {
    if (isServerMode && roomId) {
      handleJoinSeat(seatNumber);
      return;
    }

    if (!dbUser) {
      showNotification('error', 'Giriş yapmanız gerekiyor');
      return;
    }

    if (localPlayers.find(p => p.seatNumber === seatNumber)) {
      showNotification('error', 'Bu koltuk dolu');
      return;
    }

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

  const handleChipClick = (value: number) => {
    const availableChips = isServerMode
      ? (dbUser?.chips || 0)
      : (localPlayers.find(p => p.id === myPlayerId)?.chips || 0);

    if (availableChips >= selectedBet + value) {
      setSelectedBet((prev) => prev + value);
      hapticFeedback('light');
    }
  };

  const handleClearBet = () => {
    setSelectedBet(0);
  };

  const handleConfirmBet = () => {
    if (isServerMode) {
      handleServerBet();
      return;
    }

    const currentPlayer = localPlayers.find(p => p.id === myPlayerId);
    if (!currentPlayer || selectedBet === 0 || isProcessing) return;

    if (currentPlayer.chips < selectedBet) {
      showNotification('error', 'Yetersiz bakiye');
      return;
    }

    setIsProcessing(true);

    setLocalPlayers(prev => prev.map(p =>
      p.id === myPlayerId
        ? { ...p, bet: selectedBet, chips: p.chips - selectedBet, status: 'playing' }
        : p
    ));

    setSelectedBet(0);
    setShowBetPanel(false);
    hapticFeedback('success');

    setTimeout(() => {
      dealLocalCards();
      setIsProcessing(false);
    }, 500);
  };

  const dealLocalCards = () => {
    const deck = ensureDeckHasCards([...localDeck]);
    const players = localPlayers.filter(p => p.bet > 0);

    if (players.length === 0) return;

    const updatedPlayers = localPlayers.map(player => {
      if (player.bet > 0) {
        const card1 = deck.pop()!;
        const card2 = deck.pop()!;
        return { ...player, cards: [card1, card2] };
      }
      return player;
    });

    const dealerCard1 = { ...deck.pop()!, faceUp: true };
    const dealerCard2 = { ...deck.pop()!, faceUp: false };

    setLocalPlayers(updatedPlayers);
    setLocalDealer({ cards: [dealerCard1, dealerCard2], score: calculateHandValue([dealerCard1]) });
    setLocalDeck(deck);
    setLocalStatus('playing');

    const firstPlayer = updatedPlayers.find(p => p.bet > 0);
    if (firstPlayer) {
      setLocalPlayers(prev => prev.map(p => ({
        ...p,
        isTurn: p.id === firstPlayer.id
      })));
    }
  };

  const handleLocalHit = () => {
    const currentPlayer = localPlayers.find(p => p.id === myPlayerId);
    if (!currentPlayer || localStatus !== 'playing' || isProcessing) return;

    setIsProcessing(true);
    const deck = ensureDeckHasCards([...localDeck]);
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

    const updatedPlayer = updatedPlayers.find(p => p.id === myPlayerId);
    if (updatedPlayer?.status === 'bust' || updatedPlayer?.status === 'stand') {
      moveToNextLocalPlayer(updatedPlayers);
    }

    setIsProcessing(false);
  };

  const handleLocalStand = () => {
    const currentPlayer = localPlayers.find(p => p.id === myPlayerId);
    if (!currentPlayer || isProcessing) return;

    setIsProcessing(true);

    const updatedPlayers = localPlayers.map(p =>
      p.id === myPlayerId ? { ...p, status: 'stand' as const, isTurn: false } : p
    );

    setLocalPlayers(updatedPlayers);
    hapticFeedback('light');
    moveToNextLocalPlayer(updatedPlayers);

    setIsProcessing(false);
  };

  const handleLocalDouble = () => {
    const currentPlayer = localPlayers.find(p => p.id === myPlayerId);
    if (!currentPlayer || isProcessing) return;

    if (currentPlayer.chips < currentPlayer.bet) {
      showNotification('error', 'Katlamak için yeterli bakiye yok');
      return;
    }

    setIsProcessing(true);

    const deck = ensureDeckHasCards([...localDeck]);
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
    moveToNextLocalPlayer(updatedPlayers);

    setIsProcessing(false);
  };

  const moveToNextLocalPlayer = (players: Player[]) => {
    const playingPlayers = players.filter(p => p.status === 'playing');

    if (playingPlayers.length > 0) {
      setLocalPlayers(prev => prev.map(p => ({
        ...p,
        isTurn: p.id === playingPlayers[0].id
      })));
    } else {
      setLocalStatus('dealer-turn');
      setTimeout(() => localDealerPlay(), 1000);
    }
  };

  const localDealerPlay = () => {
    const deck = ensureDeckHasCards([...localDeck]);
    let dealerCards = localDealer.cards.map(c => ({ ...c, faceUp: true }));
    let dealerScore = calculateHandValue(dealerCards);

    while (dealerScore < 17) {
      const newCard = { ...deck.pop()!, faceUp: true };
      dealerCards = [...dealerCards, newCard];
      dealerScore = calculateHandValue(dealerCards);
    }

    const dealerHasBlackjackLocal = isBlackjack(dealerCards);

    const updatedPlayers = localPlayers.map(player => {
      if (player.status === 'bust') {
        return { ...player, status: 'lose' as const };
      }

      const playerScore = calculateHandValue(player.cards);
      const playerHasBlackjack = isBlackjack(player.cards);

      if (playerHasBlackjack && !dealerHasBlackjackLocal) {
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

    // Sync chips with server
    if (dbUser) {
      const myPlayer = updatedPlayers.find(p => p.id === myPlayerId);
      const originalPlayer = localPlayers.find(p => p.id === myPlayerId);
      if (myPlayer && originalPlayer) {
        const chipChange = myPlayer.chips - originalPlayer.chips;
        updateChips(chipChange);
      }
    }
  };

  const getResultDisplay = (player: Player | { status: string; bet: number }): { text: string; color: string } => {
    switch (player.status) {
      case 'win':
        return { text: `+${player.bet}`, color: 'text-green-400' };
      case 'blackjack':
        return { text: `+${Math.floor(player.bet * 1.5)}`, color: 'text-amber-400' };
      case 'lose':
      case 'bust':
        return { text: `-${player.bet}`, color: 'text-red-400' };
      case 'push':
        return { text: 'Berabere', color: 'text-gray-400' };
      default:
        return { text: '', color: 'text-gray-400' };
    }
  };

  const handleNewGame = () => {
    if (isServerMode) {
      handleNewServerGame();
      return;
    }

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

  // Determine current state based on mode
  const gameStatus = isServerMode ? (serverGame?.status || 'waiting') : localStatus;
  const gamePlayers = isServerMode
    ? (serverGame?.players?.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        chips: dbUser?.telegram_id === p.telegramId ? (dbUser?.chips || 0) : 0,
        bet: p.bet,
        cards: p.cards || [],
        isActive: true,
        isTurn: p.isTurn,
        status: p.status as Player['status'],
        seatNumber: p.seatNumber,
      })) || [])
    : localPlayers;

  const gameDealer = isServerMode
    ? { cards: serverGame?.dealer_cards || [], score: serverGame?.dealer_score || 0 }
    : localDealer;

  const currentPlayer = isServerMode
    ? gamePlayers.find(p => p.id === myGamePlayerId)
    : gamePlayers.find(p => p.id === myPlayerId);

  const isPlayerTurn = currentPlayer?.isTurn && gameStatus === 'playing';
  const canHit = isPlayerTurn && currentPlayer?.status === 'playing' && !isProcessing;
  const canStand = canHit;
  const canDouble = canHit && (currentPlayer?.cards?.length || 0) === 2 && (dbUser?.chips || 0) >= (currentPlayer?.bet || 0);

  const dealerScore = calculateHandValue(gameDealer.cards);
  const dealerHasBlackjack = isBlackjack(gameDealer.cards);

  // Event handlers based on mode
  const handleHit = isServerMode ? handleServerHit : handleLocalHit;
  const handleStand = isServerMode ? handleServerStand : handleLocalStand;
  const handleDouble = isServerMode ? handleServerDouble : handleLocalDouble;

  return (
    <div className="relative w-full h-[550px] md:h-[650px] lg:h-[700px] overflow-hidden">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="absolute top-3 left-3 z-20 glass rounded-lg px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
      >
        <span>←</span> Geri
      </button>

      {/* Table Background */}
      <div className="absolute inset-0 felt-pattern rounded-[40%] border-[6px] border-amber-800/80 shadow-2xl" style={{
        boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.5)',
      }}>
        <div className="absolute inset-3 rounded-[40%] border border-amber-900/40" />

        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-15">
          <h2 className="text-3xl md:text-5xl font-bold text-amber-500" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY
          </h2>
          <p className="text-sm md:text-lg text-amber-600 tracking-widest">GAMES</p>
        </div>
      </div>

      {/* Dealer Area */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="mb-3 px-4 py-1 bg-black/60 rounded-full border border-amber-500/30">
          <span className="text-amber-400 font-semibold text-xs tracking-wider">KRUPIYE</span>
        </div>

        <div className="flex -space-x-3 mb-2">
          {gameDealer.cards.length > 0 ? (
            gameDealer.cards.map((card, index) => (
              <PlayingCard key={`dealer-${index}`} card={card} index={index} size="sm" />
            ))
          ) : (
            <div className="w-14 h-20 md:w-16 md:h-24 border-2 border-dashed border-amber-600/30 rounded-lg" />
          )}
        </div>

        {gameDealer.cards.length > 0 && (
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${dealerScore > 21 ? 'bg-red-500' : 'bg-black/80'} text-white border border-white/10`}>
            {gameStatus === 'results' || gameStatus === 'dealer-turn' ? (
              dealerHasBlackjack ? 'BJ!' : dealerScore
            ) : (
              calculateHandValue([gameDealer.cards[0]])
            )}
          </div>
        )}
      </div>

      {/* Player Seats */}
      {SEAT_POSITIONS.map((position, index) => {
        const player = gamePlayers.find((p) => p.seatNumber === index + 1);
        const isMyPlayer = isServerMode
          ? player?.id === myGamePlayerId
          : player?.id === myPlayerId;

        return (
          <PlayerSeat
            key={`seat-${index + 1}`}
            player={player}
            seatNumber={index + 1}
            isCurrentUser={isMyPlayer}
            onSeatClick={() => handleSeatClick(index + 1)}
            position={position}
          />
        );
      })}

      {/* Betting Panel */}
      {showBetPanel && (gameStatus === 'betting' || gameStatus === 'waiting') && (!currentPlayer || currentPlayer.bet === 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 animate-slide-up max-w-sm w-[95%]">
          <h3 className="text-center text-amber-400 font-semibold mb-3 text-sm">Bahis Yap</h3>

          <div className="flex gap-1.5 md:gap-2 justify-center mb-3 flex-wrap">
            {chipValues.map((value) => (
              <Chip
                key={value}
                value={value}
                onClick={() => handleChipClick(value)}
                size="sm"
                disabled={(dbUser?.chips || 0) < selectedBet + value}
              />
            ))}
          </div>

          <div className="text-center mb-3">
            <span className="text-gray-400 text-xs">Bahis:</span>
            <span className="text-amber-400 font-bold text-xl ml-2">{selectedBet}</span>
          </div>

          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleClearBet}
              className="btn-secondary text-xs px-4 py-2"
              disabled={isProcessing}
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={handleConfirmBet}
              disabled={selectedBet === 0 || isProcessing}
              className="btn-gold text-xs px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'İşleniyor...' : 'Onayla'}
            </button>
          </div>

          <p className="text-center text-gray-500 text-[10px] mt-2">
            Bakiye: <span className="text-amber-400">{dbUser?.chips?.toLocaleString() || 0}</span>
          </p>
        </div>
      )}

      {/* Action Buttons (Hit, Stand, Double) */}
      {gameStatus === 'playing' && isPlayerTurn && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 animate-slide-up">
          <button
            type="button"
            onClick={handleHit}
            disabled={!canHit}
            className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {isProcessing ? '...' : 'Kart Al'}
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
              onClick={handleDouble}
              className="btn-gold px-5 py-2.5 text-sm"
            >
              Katla
            </button>
          )}
        </div>
      )}

      {/* Game Results */}
      {gameStatus === 'results' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center animate-slide-up">
          <div className="glass rounded-xl px-5 py-3">
            <h3 className="text-lg font-bold text-amber-400 mb-2">Sonuçlar</h3>
            {gamePlayers.map((player) => {
              const result = getResultDisplay(player);
              return (
                <div key={player.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-white">{player.name}</span>
                  <span className={`font-bold ${result.color}`}>
                    {player.status === 'blackjack' && <span className="text-amber-400 mr-1">BJ!</span>}
                    {result.text}
                  </span>
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleNewGame}
              disabled={isProcessing}
              className="btn-gold text-xs px-4 py-2 mt-3 disabled:opacity-50"
            >
              {isProcessing ? 'Başlatılıyor...' : 'Yeni Oyun'}
            </button>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-3 right-3 glass rounded-lg px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            gameStatus === 'waiting' ? 'bg-gray-400' :
            gameStatus === 'betting' ? 'bg-amber-400 animate-pulse' :
            gameStatus === 'playing' ? 'bg-green-400 animate-pulse' :
            gameStatus === 'dealer-turn' ? 'bg-blue-400 animate-pulse' :
            'bg-purple-400'
          }`} />
          <span className="text-[10px] text-gray-300">
            {gameStatus === 'waiting' ? 'Bekleniyor' :
             gameStatus === 'betting' ? 'Bahis' :
             gameStatus === 'playing' ? 'Oyun' :
             gameStatus === 'dealer-turn' ? 'Krupiye' :
             'Sonuçlar'}
          </span>
          {isServerMode && <span className="text-[8px] text-green-400 ml-1">● CANLI</span>}
        </div>
      </div>

      {/* Player Score Display */}
      {currentPlayer && currentPlayer.cards && currentPlayer.cards.length > 0 && gameStatus === 'playing' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 px-4 py-2 rounded-full border border-amber-500/30">
            <span className="text-amber-400 font-bold">
              {calculateHandValue(currentPlayer.cards)}
            </span>
          </div>
        </div>
      )}

      {/* Room ID display for multiplayer */}
      {roomId && (
        <div className="absolute bottom-3 left-3 glass rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">Oda:</span>
            <span className="text-[10px] text-amber-400 font-mono">{roomId}</span>
          </div>
        </div>
      )}
    </div>
  );
}
