'use client';

import type { Player } from '@/types/game';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardStack } from './PlayingCard';
import { BetDisplay } from './Chip';

interface PlayerSlotProps {
  player?: Player;
  seatIndex: number;
  isActive: boolean;
  turnTimer?: number;
  onSit?: () => void;
  isEmpty: boolean;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  waiting: { text: 'Bekliyor', color: 'text-gray-400' },
  ready: { text: 'Hazır', color: 'text-green-400' },
  betting: { text: 'Bahis...', color: 'text-yellow-400' },
  playing: { text: 'Oynuyor', color: 'text-blue-400' },
  stand: { text: 'Stand', color: 'text-gray-400' },
  bust: { text: 'Bust!', color: 'text-red-500' },
  blackjack: { text: 'Blackjack!', color: 'text-yellow-400' },
  won: { text: 'Kazandı!', color: 'text-green-400' },
  lost: { text: 'Kaybetti', color: 'text-red-400' },
  push: { text: 'Berabere', color: 'text-gray-400' },
  disconnected: { text: 'Bağlantı Koptu', color: 'text-red-500' },
  spectating: { text: 'İzliyor', color: 'text-gray-500' },
};

export function PlayerSlot({ player, seatIndex, isActive, turnTimer = 15, onSit, isEmpty }: PlayerSlotProps) {
  // Boş koltuk
  if (isEmpty || !player) {
    return (
      <button
        type="button"
        onClick={onSit}
        className={cn(
          'flex flex-col items-center justify-center p-4 rounded-xl',
          'border-2 border-dashed border-green-700/50 hover:border-green-500',
          'bg-green-900/20 hover:bg-green-900/40 transition-all duration-200',
          'min-w-[120px] min-h-[160px]'
        )}
      >
        <div className="w-12 h-12 rounded-full bg-green-800/50 flex items-center justify-center mb-2">
          <span className="text-2xl text-green-600">+</span>
        </div>
        <span className="text-green-600 text-sm">Otur</span>
      </button>
    );
  }

  const status = statusLabels[player.status] || statusLabels.waiting;
  const timerPercent = (turnTimer / 15) * 100;

  return (
    <div
      className={cn(
        'flex flex-col items-center p-3 rounded-xl transition-all duration-300',
        'bg-black/30 backdrop-blur-sm min-w-[130px]',
        isActive && 'ring-2 ring-green-400 animate-pulse-glow',
        player.status === 'disconnected' && 'opacity-50'
      )}
    >
      {/* Timer bar (sadece aktif oyuncu için) */}
      {isActive && (
        <div className="w-full h-1.5 bg-gray-700 rounded-full mb-2 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-linear rounded-full',
              timerPercent > 50 ? 'bg-green-500' : timerPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Kartlar */}
      {player.cards.length > 0 && (
        <div className="mb-2">
          <CardStack cards={player.cards} size="sm" />
        </div>
      )}

      {/* Skor */}
      {player.totalScore > 0 && (
        <div className={cn(
          'px-3 py-1 rounded-full text-sm font-bold mb-2',
          player.status === 'bust' ? 'bg-red-600' :
          player.status === 'blackjack' ? 'bg-yellow-500 text-black' :
          'bg-green-600'
        )}>
          {player.totalScore}
        </div>
      )}

      {/* Avatar ve isim */}
      <div className="flex items-center gap-2">
        <Avatar className={cn(
          'w-10 h-10 border-2',
          isActive ? 'border-green-400' : 'border-gray-600'
        )}>
          <AvatarImage src={player.avatar} alt={player.name} />
          <AvatarFallback className="bg-gray-700 text-white">
            {player.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-white font-medium text-sm truncate max-w-[80px]">
            {player.isCurrentUser ? 'Sen' : player.name}
          </span>
          <span className={cn('text-xs', status.color)}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Bet gösterimi */}
      {player.bet > 0 && (
        <div className="mt-2">
          <BetDisplay amount={player.bet} size="sm" />
        </div>
      )}
    </div>
  );
}
