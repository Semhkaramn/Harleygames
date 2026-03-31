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

// Mobile-optimized seat positions - semi-circle layout
const SEAT_POSITIONS = [
  { x: '8%', y: '60%' },
  { x: '25%', y: '78%' },
  { x: '50%', y: '85%' },
  { x: '75%', y: '78%' },
  { x: '92%', y: '60%' },
  { x: '50%', y: '45%' },
];

interface ServerGameState {
  id: number;
  room_id: string;
  status: string;
  dealer_cards: Card[];
  dealer_score: number;
  deck: Card[];
  current_player_index: number;
  betting_countdown?: number;
  players: {
    id: string;
    telegramId: number;
    name: string;
    avatar: string;
    photoUrl?: string;
    seatNumber: number;
    bet: number;
    cards: Card[];
    status: string;
    isTurn: boolean;
  }[];
}

const BETTING_DURATION = 15; // 15 seconds for betting

export function GameTable({ roomId, onBack }: GameTableProps) {
  const { dbUser, setDbUser, setChips } = useUserStore();
  const { showNotification } = useUIStore();

  const [serverGame, setServerGame] = useState<ServerGameState | null>(null);
  const [myGamePlayerId, setMyGamePlayerId] = useState<string | null>(null);

  const [selectedBet, setSelectedBet] = useState(0);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bettingCountdown, setBettingCountdown] = useState(0);
  const [hasBetThisRound, setHasBetThisRound] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

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
        setChips(Number(data.user.chips));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [dbUser, setChips]);

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

        // Handle betting countdown
        if (data.game.status === 'betting' && data.game.betting_countdown !== undefined) {
          setBettingCountdown(data.game.betting_countdown);
        }

        if (data.game.status === 'dealer-turn') {
          triggerDealerPlay();
        }

        // Reset hasBetThisRound when new game starts
        if (data.game.status === 'waiting') {
          setHasBetThisRound(false);
          setSelectedBet(0);
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
      pollingRef.current = setInterval(fetchGameState, 1500);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [roomId, fetchGameState]);

  // Local betting countdown timer
  useEffect(() => {
    if (serverGame?.status === 'betting' && bettingCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setBettingCountdown(prev => {
          if (prev <= 1) {
            // Time's up - if no bet placed, skip this round
            if (!hasBetThisRound && myGamePlayerId) {
              // Player skips this round
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [serverGame?.status, bettingCountdown, hasBetThisRound, myGamePlayerId]);

  // Handle joining a seat (no bet selection, just sit down)
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
        hapticFeedback('medium');
        showNotification('success', 'Koltuğa oturdunuz! Oyun başlamasını bekleyin.');
      } else {
        showNotification('error', data.error || 'Koltuğa oturulamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle placing bet during betting phase
  const handleBet = async () => {
    if (!myGamePlayerId || !roomId || selectedBet === 0 || isProcessing || hasBetThisRound) return;

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
        setHasBetThisRound(true);
        setShowBetPanel(false);
        await fetchGameState();
        await refreshUserData();
        hapticFeedback('success');
        showNotification('success', `${selectedBet} chip bahis yapıldı!`);
      } else {
        showNotification('error', data.error || 'Bahis yapılamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start new game with betting phase
  const handleStartGame = async () => {
    if (!roomId || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'start_betting',
        }),
      });

      const data = await response.json();
      if (data.game) {
        setBettingCountdown(BETTING_DURATION);
        setHasBetThisRound(false);
        setSelectedBet(0);
        setShowBetPanel(true);
        await fetchGameState();
        hapticFeedback('medium');
        showNotification('info', 'Bahis zamanı başladı! 15 saniye içinde bahsinizi yapın.');
      }
    } catch (error) {
      console.error('Start game error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Deal cards after betting phase
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
        setHasBetThisRound(false);
        setSelectedBet(0);
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
    photoUrl: p.photoUrl,
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
  const isBettingPhase = gameStatus === 'betting';
  const isWaitingForPlayers = gameStatus === 'waiting' && gamePlayers.length > 0;
  const canStartBetting = isWaitingForPlayers && gamePlayers.some(p => p.id === myGamePlayerId);

  const dealerScore = calculateHandValue(gameDealer.cards);
  const dealerHasBlackjack = isBlackjack(gameDealer.cards);

  return (
    <div className="relative w-full h-[480px] overflow-hidden">
      {/* Table Background */}
      <div className="absolute inset-0 felt-pattern rounded-[30%] border-4 border-amber-800/80 shadow-xl" style={{
        boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.6)',
      }}>
        <div className="absolute inset-2 rounded-[30%] border border-amber-900/40" />
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-10">
          <h2 className="text-2xl font-bold text-amber-500" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY
          </h2>
        </div>
      </div>

      {/* Betting Countdown Timer */}
      {isBettingPhase && bettingCountdown > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className={`glass rounded-full px-4 py-2 flex items-center gap-2 ${bettingCountdown <= 5 ? 'border-red-500 animate-pulse' : 'border-amber-500/30'}`}>
            <div className="text-xl">⏱️</div>
            <div className="text-center">
              <div className={`text-lg font-bold ${bettingCountdown <= 5 ? 'text-red-400' : 'text-amber-400'}`}>
                {bettingCountdown}s
              </div>
              <div className="text-[9px] text-gray-400">Bahis Süresi</div>
            </div>
          </div>
        </div>
      )}

      {/* Dealer Area */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ marginTop: isBettingPhase ? '50px' : '0' }}>
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
            isBettingPhase={isBettingPhase}
          />
        );
      })}

      {/* Betting Panel - Shows during betting phase */}
      {isBettingPhase && myGamePlayerId && !hasBetThisRound && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 glass rounded-xl p-3 animate-slide-up w-[90%] max-w-xs z-30">
          <h3 className="text-center text-amber-400 font-semibold mb-2 text-xs flex items-center justify-center gap-2">
            <span>💰</span>
            Bahis Yap
            <span className={`text-xs ${bettingCountdown <= 5 ? 'text-red-400' : 'text-gray-400'}`}>
              ({bettingCountdown}s)
            </span>
          </h3>

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

      {/* Already bet indicator */}
      {isBettingPhase && myGamePlayerId && hasBetThisRound && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-lg px-4 py-2 animate-slide-up">
          <p className="text-emerald-400 text-sm flex items-center gap-2">
            <span>✓</span>
            Bahsiniz alındı! Diğer oyuncular bekleniyor...
          </p>
        </div>
      )}

      {/* Start Game Button - When waiting with players */}
      {canStartBetting && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={handleStartGame}
            disabled={isProcessing}
            className="btn-gold px-6 py-2 text-sm disabled:opacity-50"
          >
            {isProcessing ? '...' : 'Oyunu Başlat'}
          </button>
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
            {gamePlayers.filter(p => p.bet > 0).map((player) => {
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
             gameStatus === 'betting' ? 'Bahis Zamanı' :
             gameStatus === 'playing' ? 'Oyun' :
             gameStatus === 'dealer-turn' ? 'Krupiye' :
             'Sonuç'}
          </span>
        </div>
      </div>

      {/* Player Score Display */}
      {currentPlayer && currentPlayer.cards && currentPlayer.cards.length > 0 && gameStatus === 'playing' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
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

      {/* Player count */}
      <div className="absolute bottom-2 right-2 glass rounded-md px-2 py-1">
        <span className="text-[8px] text-gray-400">Oyuncu: </span>
        <span className="text-[8px] text-emerald-400">{gamePlayers.length}/6</span>
      </div>
    </div>
  );
}
