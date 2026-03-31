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

// Mobile-optimized seat positions - better layout for 6 players
// Position 1-2: Left side, 3: Bottom left, 4: Bottom right, 5-6: Right side
const SEAT_POSITIONS = [
  { x: '15%', y: '35%' },   // Seat 1 - Top left
  { x: '15%', y: '55%' },   // Seat 2 - Mid left
  { x: '30%', y: '72%' },   // Seat 3 - Bottom left
  { x: '70%', y: '72%' },   // Seat 4 - Bottom right
  { x: '85%', y: '55%' },   // Seat 5 - Mid right
  { x: '85%', y: '35%' },   // Seat 6 - Top right
];

interface ServerGameState {
  id: number;
  room_id: string;
  status: string;
  dealer_cards: Card[];
  dealer_score: number;
  deck: Card[];
  current_player_index: number;
  betting_end_time?: number;
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
  const { dbUser, setChips } = useUserStore();
  const { showNotification } = useUIStore();

  const [serverGame, setServerGame] = useState<ServerGameState | null>(null);
  const [myGamePlayerId, setMyGamePlayerId] = useState<string | null>(null);

  const [selectedBet, setSelectedBet] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bettingCountdown, setBettingCountdown] = useState(0);
  const [hasBetThisRound, setHasBetThisRound] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastBettingEndTime = useRef<number | null>(null);

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

  // Auto deal cards when betting ends
  const autoDealCards = useCallback(async () => {
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
        hapticFeedback('medium');
      }
    } catch (error) {
      console.error('Auto deal error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [roomId, isProcessing]);

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
          } else {
            setMyGamePlayerId(null);
          }
        }

        // Handle betting countdown from server
        if (data.game.status === 'betting' && data.game.betting_end_time) {
          const endTime = data.game.betting_end_time;

          // Only update if this is a new betting phase
          if (lastBettingEndTime.current !== endTime) {
            lastBettingEndTime.current = endTime;
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setBettingCountdown(remaining);
          }
        }

        if (data.game.status === 'dealer-turn') {
          triggerDealerPlay();
        }

        // Reset hasBetThisRound when new game starts
        if (data.game.status === 'waiting') {
          setHasBetThisRound(false);
          setSelectedBet(0);
          lastBettingEndTime.current = null;
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
      pollingRef.current = setInterval(fetchGameState, 1000);

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
            // Time's up - auto deal if we're in betting phase
            setTimeout(() => {
              autoDealCards();
            }, 500);
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
  }, [serverGame?.status, bettingCountdown, autoDealCards]);

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
        showNotification('success', 'Koltuğa oturdunuz!');
      } else {
        showNotification('error', data.error || 'Koltuğa oturulamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle leaving a seat
  const handleLeaveSeat = async () => {
    if (!myGamePlayerId || !roomId || isProcessing) return;

    // Can't leave during active game
    if (serverGame?.status === 'playing' || serverGame?.status === 'dealer-turn') {
      showNotification('error', 'Oyun sırasında ayrılamazsınız');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          action: 'leave',
          player_id: myGamePlayerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMyGamePlayerId(null);
        await fetchGameState();
        hapticFeedback('light');
        showNotification('info', 'Masadan ayrıldınız');
      } else {
        showNotification('error', data.error || 'Ayrılamadınız');
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
        await fetchGameState();
        hapticFeedback('medium');
        showNotification('info', `Bahis zamanı başladı! ${BETTING_DURATION} saniye`);
      }
    } catch (error) {
      console.error('Start game error:', error);
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
          action: 'start_betting',
        }),
      });

      const data = await response.json();
      if (data.game) {
        setHasBetThisRound(false);
        setSelectedBet(0);
        setBettingCountdown(BETTING_DURATION);
        await fetchGameState();
        hapticFeedback('medium');
        showNotification('info', `Yeni el! Bahis zamanı: ${BETTING_DURATION} saniye`);
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
      case 'skipped':
        return { text: 'Pas', color: 'text-gray-500' };
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
  const isInGame = !!myGamePlayerId;

  const dealerScore = calculateHandValue(gameDealer.cards);
  const dealerHasBlackjack = isBlackjack(gameDealer.cards);

  // Count how many players have bet
  const playersWithBets = gamePlayers.filter(p => p.bet > 0).length;
  const totalActivePlayers = gamePlayers.length;

  return (
    <div className="relative w-full h-[calc(100vh-120px)] min-h-[550px] max-h-[700px] overflow-hidden bg-gradient-to-b from-gray-900 to-black">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-12 glass z-40 flex items-center justify-between px-3">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
        >
          <span className="text-lg">←</span>
          <span className="text-xs">Geri</span>
        </button>

        {/* Center - Betting Countdown or Status */}
        <div className="flex items-center gap-2">
          {isBettingPhase && bettingCountdown > 0 ? (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bettingCountdown <= 5 ? 'bg-red-500/20 border border-red-500/50' : 'bg-amber-500/20 border border-amber-500/30'}`}>
              <div className={`text-lg font-bold ${bettingCountdown <= 5 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                {bettingCountdown}
              </div>
              <div className="text-[10px] text-gray-400">saniye</div>
              <div className="border-l border-white/20 pl-2 ml-1">
                <span className="text-emerald-400 text-sm">{playersWithBets}/{totalActivePlayers}</span>
                <span className="text-[8px] text-gray-400 ml-1">bahis</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40">
              <div className={`w-2 h-2 rounded-full ${
                gameStatus === 'waiting' ? 'bg-gray-400' :
                gameStatus === 'betting' ? 'bg-amber-400 animate-pulse' :
                gameStatus === 'playing' ? 'bg-green-400 animate-pulse' :
                gameStatus === 'dealer-turn' ? 'bg-blue-400 animate-pulse' :
                'bg-purple-400'
              }`} />
              <span className="text-xs text-gray-300">
                {gameStatus === 'waiting' ? 'Bekleniyor' :
                 gameStatus === 'betting' ? 'Bahis Zamanı' :
                 gameStatus === 'playing' ? 'Oyun Devam' :
                 gameStatus === 'dealer-turn' ? 'Krupiye' :
                 'Sonuç'}
              </span>
            </div>
          )}
        </div>

        {/* Room Info */}
        <div className="text-right">
          <div className="text-[8px] text-gray-500">Oda</div>
          <div className="text-[10px] text-amber-400 font-mono">{roomId.slice(0, 6)}</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="absolute top-14 left-2 right-2 bottom-2 rounded-[40px] overflow-hidden">
        {/* Felt Background */}
        <div className="absolute inset-0 felt-pattern border-4 border-amber-800/80" style={{
          boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.7), 0 8px 32px rgba(0, 0, 0, 0.5)',
          borderRadius: '40px'
        }}>
          {/* Inner border */}
          <div className="absolute inset-3 rounded-[32px] border border-amber-700/30" />

          {/* Logo watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
            <h2 className="text-4xl font-bold text-amber-500 tracking-widest" style={{ fontFamily: "'Playfair Display', serif" }}>
              HARLEY
            </h2>
          </div>
        </div>

        {/* Dealer Area - Top Center */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          <div className="mb-2 px-3 py-1 bg-black/70 rounded-full border border-amber-500/40">
            <span className="text-amber-400 font-semibold text-[10px] tracking-widest">KRUPİYE</span>
          </div>

          <div className="flex -space-x-3 mb-2">
            {gameDealer.cards.length > 0 ? (
              gameDealer.cards.map((card, index) => (
                <PlayingCard key={`dealer-${index}`} card={card} index={index} size="sm" />
              ))
            ) : (
              <div className="flex gap-1">
                <div className="w-12 h-16 border-2 border-dashed border-amber-600/30 rounded-lg flex items-center justify-center bg-black/20">
                  <span className="text-amber-600/40 text-2xl">?</span>
                </div>
              </div>
            )}
          </div>

          {gameDealer.cards.length > 0 && (
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${dealerScore > 21 ? 'bg-red-500' : 'bg-black/80'} text-white border border-white/20 shadow-lg`}>
              {gameStatus === 'results' || gameStatus === 'dealer-turn' ? (
                dealerHasBlackjack ? '🃏 BJ!' : dealerScore
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
              onLeave={isMyPlayer ? handleLeaveSeat : undefined}
              position={position}
              isBettingPhase={isBettingPhase}
            />
          );
        })}

        {/* Current Player Hand Info - Bottom Center */}
        {currentPlayer && currentPlayer.cards && currentPlayer.cards.length > 0 && gameStatus === 'playing' && (
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-black/90 px-4 py-2 rounded-xl border border-amber-500/40 shadow-xl">
              <span className="text-amber-400 font-bold text-lg">
                Eliniz: {calculateHandValue(currentPlayer.cards)}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Panel - Actions/Betting/Info */}
        <div className="absolute bottom-4 left-4 right-4 z-30">
          {/* Betting Panel */}
          {isBettingPhase && myGamePlayerId && !hasBetThisRound && (
            <div className="glass rounded-2xl p-4 animate-slide-up border border-amber-500/20">
              <div className="flex flex-col gap-3">
                {/* Chip Selection */}
                <div className="flex gap-2 justify-center flex-wrap">
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

                {/* Bet Amount Display */}
                <div className="text-center py-2 bg-black/40 rounded-lg">
                  <span className="text-gray-400 text-xs">Bahis Miktarı:</span>
                  <span className="text-amber-400 font-bold text-2xl ml-2">{selectedBet}</span>
                  <span className="text-gray-500 text-xs ml-2">/ {dbUser?.chips?.toLocaleString() || 0}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleClearBet}
                    className="btn-secondary text-sm px-6 py-2.5 rounded-xl"
                    disabled={isProcessing || selectedBet === 0}
                  >
                    Temizle
                  </button>
                  <button
                    type="button"
                    onClick={handleBet}
                    disabled={selectedBet === 0 || isProcessing}
                    className="btn-gold text-sm px-8 py-2.5 rounded-xl disabled:opacity-50 font-semibold"
                  >
                    {isProcessing ? '...' : 'Bahis Yap'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Already Bet Indicator */}
          {isBettingPhase && myGamePlayerId && hasBetThisRound && (
            <div className="glass rounded-xl px-6 py-3 text-center animate-slide-up">
              <p className="text-emerald-400 text-sm flex items-center justify-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</span>
                Bahsiniz alındı! ({currentPlayer?.bet} chip)
              </p>
            </div>
          )}

          {/* Not seated message */}
          {!isInGame && gameStatus === 'waiting' && (
            <div className="glass rounded-xl px-6 py-4 text-center">
              <p className="text-gray-300 text-sm">Oynamak için boş bir koltuğa tıklayın</p>
            </div>
          )}

          {/* Start Game Button */}
          {canStartBetting && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isProcessing}
                className="btn-gold px-10 py-3 text-base font-semibold rounded-xl disabled:opacity-50 shadow-xl"
              >
                {isProcessing ? '...' : 'Oyunu Başlat'}
              </button>
            </div>
          )}

          {/* Game Action Buttons */}
          {gameStatus === 'playing' && isPlayerTurn && (
            <div className="glass rounded-2xl p-4 animate-slide-up border border-emerald-500/30">
              <div className="text-center mb-3 text-emerald-400 text-xs font-semibold">
                SİZİN SIRANIZ
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleHit}
                  disabled={!canHit}
                  className="btn-primary px-8 py-3 text-sm rounded-xl disabled:opacity-50 font-semibold"
                >
                  {isProcessing ? '...' : 'Kart Al'}
                </button>
                <button
                  type="button"
                  onClick={handleStand}
                  disabled={!canStand}
                  className="btn-secondary px-8 py-3 text-sm rounded-xl disabled:opacity-50 font-semibold"
                >
                  Dur
                </button>
                {canDouble && (
                  <button
                    type="button"
                    onClick={handleDouble}
                    className="btn-gold px-8 py-3 text-sm rounded-xl font-semibold"
                  >
                    Katla
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Waiting for turn */}
          {gameStatus === 'playing' && !isPlayerTurn && isInGame && currentPlayer?.status === 'playing' && (
            <div className="glass rounded-xl px-6 py-3 text-center">
              <p className="text-gray-400 text-sm animate-pulse">Sıranızı bekleyin...</p>
            </div>
          )}

          {/* Game Results */}
          {gameStatus === 'results' && (
            <div className="glass rounded-2xl p-4 animate-slide-up border border-purple-500/30">
              <h3 className="text-center text-lg font-bold text-amber-400 mb-3">Sonuçlar</h3>
              <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                {gamePlayers.filter(p => p.bet > 0 || p.status === 'skipped').map((player) => {
                  const result = getResultDisplay(player);
                  return (
                    <div key={player.id} className="flex items-center justify-between px-3 py-2 bg-black/30 rounded-lg">
                      <span className="text-white text-sm truncate max-w-[100px]">{player.name}</span>
                      <span className={`font-bold text-sm ${result.color}`}>
                        {player.status === 'blackjack' && <span className="text-amber-400 mr-1">🃏</span>}
                        {result.text}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isInGame && (
                <button
                  type="button"
                  onClick={handleNewGame}
                  disabled={isProcessing}
                  className="btn-gold text-sm px-6 py-2.5 rounded-xl w-full disabled:opacity-50 font-semibold"
                >
                  {isProcessing ? '...' : 'Yeni El'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Player Count Badge */}
        <div className="absolute bottom-4 right-4 glass rounded-full px-3 py-1 z-20">
          <span className="text-emerald-400 text-xs font-semibold">{gamePlayers.length}/6</span>
        </div>
      </div>
    </div>
  );
}
