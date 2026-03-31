'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { type Player, type Card, calculateHandValue, isBlackjack } from '@/lib/gameTypes';
import { useUserStore, useUIStore } from '@/lib/store';
import { PlayingCard } from './PlayingCard';
import { PlayerSeat } from './PlayerSeat';
import { Chip } from './Chip';
import { hapticFeedback } from '@/lib/telegram';

interface GameTableProps {
  roomId: string;
  onBack: () => void;
}

// Mobil için seat positions - daha kompakt yarım daire
const SEAT_POSITIONS = [
  { x: '8%', y: '65%' },
  { x: '28%', y: '80%' },
  { x: '50%', y: '85%' },
  { x: '72%', y: '80%' },
  { x: '92%', y: '65%' },
  { x: '50%', y: '50%' },
];

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
  const { dbUser, setDbUser } = useUserStore();
  const { showNotification } = useUIStore();

  const [serverGame, setServerGame] = useState<ServerGameState | null>(null);
  const [myGamePlayerId, setMyGamePlayerId] = useState<string | null>(null);

  const [selectedBet, setSelectedBet] = useState(0);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const chipValues = [5, 10, 25, 50, 100];

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

  // Trigger dealer play
  const triggerDealerPlay = useCallback(async () => {
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
        await refreshUserData();
        hapticFeedback('success');
      }
    } catch (error) {
      console.error('Dealer play error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [roomId, isProcessing, refreshUserData]);

  // Fetch game state from server
  const fetchGameState = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/game?room_id=${roomId}`);
      const data = await response.json();

      if (data.game) {
        setServerGame(data.game);

        if (dbUser) {
          const myPlayer = data.game.players?.find(
            (p: { telegramId: number }) => p.telegramId === dbUser.telegram_id
          );
          if (myPlayer) {
            setMyGamePlayerId(myPlayer.id);
          }
        }

        if (data.game.status === 'dealer-turn') {
          triggerDealerPlay();
        }
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [roomId, dbUser, triggerDealerPlay]);

  // Start polling for game state
  useEffect(() => {
    if (roomId) {
      fetchGameState();
      pollingRef.current = setInterval(fetchGameState, 2000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [roomId, fetchGameState]);

  // Handle joining a seat
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

  // Handle placing bet
  const handleBet = async () => {
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

  // Handle deal cards
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

  // Handle hit
  const handleHit = async () => {
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

  // Handle stand
  const handleStand = async () => {
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

  // Handle double down
  const handleDouble = async () => {
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

  // Start new game
  const handleNewGame = async () => {
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

  const handleChipClick = (value: number) => {
    const availableChips = dbUser?.chips || 0;

    if (availableChips >= selectedBet + value) {
      setSelectedBet((prev) => prev + value);
      hapticFeedback('light');
    }
  };

  const handleClearBet = () => {
    setSelectedBet(0);
  };

  const getResultDisplay = (player: { status: string; bet: number }): { text: string; color: string } => {
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

  // Determine current state
  const gameStatus = serverGame?.status || 'waiting';
  const gamePlayers: Player[] = serverGame?.players?.map(p => ({
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
  })) || [];

  const gameDealer = {
    cards: serverGame?.dealer_cards || [],
    score: serverGame?.dealer_score || 0,
  };

  const currentPlayer = gamePlayers.find(p => p.id === myGamePlayerId);
  const isPlayerTurn = currentPlayer?.isTurn && gameStatus === 'playing';
  const canHit = isPlayerTurn && currentPlayer?.status === 'playing' && !isProcessing;
  const canStand = canHit;
  const canDouble = canHit && (currentPlayer?.cards?.length || 0) === 2 && (dbUser?.chips || 0) >= (currentPlayer?.bet || 0);

  const dealerScore = calculateHandValue(gameDealer.cards);
  const dealerHasBlackjack = isBlackjack(gameDealer.cards);

  return (
    <div className="relative w-full h-[420px] overflow-hidden">
      {/* Table Background */}
      <div className="absolute inset-0 felt-pattern rounded-[30%] border-4 border-amber-800/80 shadow-xl" style={{
        boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.6)',
      }}>
        <div className="absolute inset-2 rounded-[30%] border border-amber-900/40" />
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-10">
          <h2 className="text-2xl font-bold text-amber-500" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY
          </h2>
        </div>
      </div>

      {/* Dealer Area */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="mb-1 px-2 py-0.5 bg-black/60 rounded-full border border-amber-500/30">
          <span className="text-amber-400 font-semibold text-[10px] tracking-wider">KRUPIYE</span>
        </div>

        <div className="flex -space-x-2 mb-1">
          {gameDealer.cards.length > 0 ? (
            gameDealer.cards.map((card, index) => (
              <PlayingCard key={`dealer-${index}`} card={card} index={index} size="xs" />
            ))
          ) : (
            <div className="w-10 h-14 border-2 border-dashed border-amber-600/30 rounded-md" />
          )}
        </div>

        {gameDealer.cards.length > 0 && (
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dealerScore > 21 ? 'bg-red-500' : 'bg-black/80'} text-white border border-white/10`}>
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
        const isMyPlayer = player?.id === myGamePlayerId;

        return (
          <PlayerSeat
            key={`seat-${index + 1}`}
            player={player}
            seatNumber={index + 1}
            isCurrentUser={isMyPlayer}
            onSeatClick={() => handleJoinSeat(index + 1)}
            position={position}
          />
        );
      })}

      {/* Betting Panel */}
      {showBetPanel && (gameStatus === 'betting' || gameStatus === 'waiting') && (!currentPlayer || currentPlayer.bet === 0) && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 glass rounded-xl p-3 animate-slide-up w-[90%] max-w-xs">
          <h3 className="text-center text-amber-400 font-semibold mb-2 text-xs">Bahis Yap</h3>

          <div className="flex gap-1 justify-center mb-2 flex-wrap">
            {chipValues.map((value) => (
              <Chip
                key={value}
                value={value}
                onClick={() => handleChipClick(value)}
                size="xs"
                disabled={(dbUser?.chips || 0) < selectedBet + value}
              />
            ))}
          </div>

          <div className="text-center mb-2">
            <span className="text-gray-400 text-[10px]">Bahis:</span>
            <span className="text-amber-400 font-bold text-base ml-1">{selectedBet}</span>
          </div>

          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleClearBet}
              className="btn-secondary text-[10px] px-3 py-1.5"
              disabled={isProcessing}
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={handleBet}
              disabled={selectedBet === 0 || isProcessing}
              className="btn-gold text-[10px] px-4 py-1.5 disabled:opacity-50"
            >
              {isProcessing ? '...' : 'Onayla'}
            </button>
          </div>

          <p className="text-center text-gray-500 text-[8px] mt-1">
            Bakiye: <span className="text-amber-400">{dbUser?.chips?.toLocaleString() || 0}</span>
          </p>
        </div>
      )}

      {/* Action Buttons (Hit, Stand, Double) */}
      {gameStatus === 'playing' && isPlayerTurn && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 animate-slide-up">
          <button
            type="button"
            onClick={handleHit}
            disabled={!canHit}
            className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
          >
            {isProcessing ? '...' : 'Kart Al'}
          </button>
          <button
            type="button"
            onClick={handleStand}
            disabled={!canStand}
            className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
          >
            Dur
          </button>
          {canDouble && (
            <button
              type="button"
              onClick={handleDouble}
              className="btn-gold px-4 py-2 text-xs"
            >
              Katla
            </button>
          )}
        </div>
      )}

      {/* Game Results */}
      {gameStatus === 'results' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center animate-slide-up">
          <div className="glass rounded-lg px-4 py-2">
            <h3 className="text-sm font-bold text-amber-400 mb-1">Sonuçlar</h3>
            {gamePlayers.map((player) => {
              const result = getResultDisplay(player);
              return (
                <div key={player.id} className="flex items-center justify-between gap-3 text-xs">
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
              className="btn-gold text-[10px] px-3 py-1.5 mt-2 disabled:opacity-50"
            >
              {isProcessing ? '...' : 'Yeni Oyun'}
            </button>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-2 right-2 glass rounded-md px-2 py-1">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            gameStatus === 'waiting' ? 'bg-gray-400' :
            gameStatus === 'betting' ? 'bg-amber-400 animate-pulse' :
            gameStatus === 'playing' ? 'bg-green-400 animate-pulse' :
            gameStatus === 'dealer-turn' ? 'bg-blue-400 animate-pulse' :
            'bg-purple-400'
          }`} />
          <span className="text-[9px] text-gray-300">
            {gameStatus === 'waiting' ? 'Bekleniyor' :
             gameStatus === 'betting' ? 'Bahis' :
             gameStatus === 'playing' ? 'Oyun' :
             gameStatus === 'dealer-turn' ? 'Krupiye' :
             'Sonuç'}
          </span>
        </div>
      </div>

      {/* Player Score Display */}
      {currentPlayer && currentPlayer.cards && currentPlayer.cards.length > 0 && gameStatus === 'playing' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 px-3 py-1 rounded-full border border-amber-500/30">
            <span className="text-amber-400 font-bold text-sm">
              {calculateHandValue(currentPlayer.cards)}
            </span>
          </div>
        </div>
      )}

      {/* Room ID display */}
      <div className="absolute bottom-2 left-2 glass rounded-md px-2 py-1">
        <span className="text-[8px] text-gray-400">Oda: </span>
        <span className="text-[8px] text-amber-400 font-mono">{roomId.slice(0, 8)}</span>
      </div>
    </div>
  );
}
