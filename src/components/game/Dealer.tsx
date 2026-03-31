'use client';

import type { Card } from '@/types/game';
import { cn } from '@/lib/utils';
import { CardStack } from './PlayingCard';

interface DealerProps {
  cards: Card[];
  score: number;
  isPlaying: boolean;
}

export function Dealer({ cards, score, isPlaying }: DealerProps) {
  const visibleScore = cards.every(c => c.faceUp) ? score :
    cards.filter(c => c.faceUp).reduce((acc, c) => {
      if (['J', 'Q', 'K'].includes(c.rank)) return acc + 10;
      if (c.rank === 'A') return acc + 11;
      return acc + parseInt(c.rank);
    }, 0);

  return (
    <div className="flex flex-col items-center">
      {/* Krupiye etiketi */}
      <div className={cn(
        'px-4 py-1.5 rounded-full mb-3 font-semibold text-xs uppercase tracking-wide',
        'bg-green-700 text-white',
        isPlaying && 'ring-2 ring-yellow-400'
      )}>
        Krupiye
      </div>

      {/* Kartlar */}
      {cards.length > 0 && (
        <div className="mb-2">
          <CardStack cards={cards} size="md" />
        </div>
      )}

      {/* Skor */}
      {cards.length > 0 && (
        <div className={cn(
          'px-3 py-1 rounded-full font-bold text-sm',
          score > 21 ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
        )}>
          {cards.every(c => c.faceUp) ? score : `${visibleScore}+?`}
        </div>
      )}
    </div>
  );
}
