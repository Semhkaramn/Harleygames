'use client';

import type { Player } from '@/types/game';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardStack } from './PlayingCard';
import { User, Plus } from 'lucide-react';

interface PlayerSlotProps {
  player?: Player;
  seatNumber: number;
  isActive: boolean;
  turnTimer?: number;
  isEmpty: boolean;
  canChangeSeat?: boolean;
  isChangingSeat?: boolean;
  onSeatClick?: (seatNumber: number) => void;
}

const statusColors: Record<string, string> = {
  waiting: 'border-gray-500',
  ready: 'border-green-500',
  betting: 'border-yellow-500',
  playing: 'border-blue-500',
  stand: 'border-gray-400',
  bust: 'border-red-500',
  blackjack: 'border-yellow-400',
  won: 'border-green-400',
  lost: 'border-red-400',
  push: 'border-gray-400',
  disconnected: 'border-red-600',
  spectating: 'border-gray-600',
};

export function PlayerSlot({
  player,
  seatNumber,
  isActive,
  turnTimer = 15,
  isEmpty,
  canChangeSeat = false,
  isChangingSeat = false,
  onSeatClick,
}: PlayerSlotProps) {
  // Boş koltuk - tıklanabilir
  if (isEmpty || !player) {
    const isClickable = canChangeSeat && onSeatClick && !isChangingSeat;

    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => isClickable && onSeatClick(seatNumber)}
          disabled={!isClickable || isChangingSeat}
          className={cn(
            'flex items-center justify-center',
            'w-14 h-14 rounded-full',
            'border-2 border-dashed',
            'transition-all duration-200',
            isClickable ? [
              'border-green-500/50 bg-green-900/20',
              'hover:border-green-400 hover:bg-green-800/40',
              'hover:scale-110 cursor-pointer',
              'group'
            ] : [
              'border-gray-600/50 bg-gray-800/30',
              'cursor-default'
            ],
            isChangingSeat && 'opacity-50'
          )}
        >
          {isClickable ? (
            <Plus className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
          ) : (
            <User className="w-5 h-5 text-gray-600" />
          )}
        </button>
        <span className={cn(
          'text-xs font-medium',
          isClickable ? 'text-green-400/80' : 'text-gray-600'
        )}>
          {seatNumber}
        </span>
        {isClickable && (
          <span className="text-[10px] text-green-400/60">Tıkla</span>
        )}
      </div>
    );
  }

  const timerPercent = (turnTimer / 15) * 100;
  const borderColor = statusColors[player.status] || 'border-gray-500';

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Kartlar - oyuncunun üstünde */}
      {player.cards.length > 0 && (
        <div className="mb-1">
          <CardStack cards={player.cards} size="sm" />
        </div>
      )}

      {/* Skor badge */}
      {player.totalScore > 0 && (
        <div className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold mb-1',
          player.status === 'bust' ? 'bg-red-600 text-white' :
          player.status === 'blackjack' ? 'bg-yellow-500 text-black' :
          'bg-green-600 text-white'
        )}>
          {player.totalScore}
        </div>
      )}

      {/* Avatar - yuvarlak profil fotoğrafı */}
      <div className="relative">
        {/* Timer ring (sadece aktif oyuncu için) */}
        {isActive && (
          <svg className="absolute -inset-1 w-16 h-16 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke={timerPercent > 50 ? '#22c55e' : timerPercent > 25 ? '#eab308' : '#ef4444'}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 30}`}
              strokeDashoffset={`${2 * Math.PI * 30 * (1 - timerPercent / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
        )}

        <Avatar className={cn(
          'w-14 h-14 border-2 transition-all',
          borderColor,
          isActive && 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent'
        )}>
          {/* Telegram profil fotoğrafı veya fallback */}
          <AvatarImage src={player.avatar} alt={player.name} />
          <AvatarFallback className="bg-gray-700 text-white text-sm">
            {player.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Ready indicator */}
        {player.status === 'ready' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
            <span className="text-[8px]">✓</span>
          </div>
        )}
      </div>

      {/* İsim */}
      <span className="text-white text-xs font-medium truncate max-w-[70px]">
        {player.isCurrentUser ? 'Sen' : player.name}
      </span>

      {/* Bahis miktarı */}
      {player.bet > 0 && (
        <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
          <span className="text-yellow-400 text-xs font-bold">{player.bet}</span>
        </div>
      )}

      {/* Status badge */}
      {(player.status === 'won' || player.status === 'lost' || player.status === 'push' || player.status === 'blackjack') && (
        <div className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          player.status === 'won' && 'bg-green-600 text-white',
          player.status === 'lost' && 'bg-red-600 text-white',
          player.status === 'push' && 'bg-gray-600 text-white',
          player.status === 'blackjack' && 'bg-yellow-500 text-black'
        )}>
          {player.status === 'won' && 'Kazandı'}
          {player.status === 'lost' && 'Kaybetti'}
          {player.status === 'push' && 'Berabere'}
          {player.status === 'blackjack' && 'BJ!'}
        </div>
      )}
    </div>
  );
}
