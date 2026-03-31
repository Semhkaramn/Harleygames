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
        'px-6 py-2 rounded-full mb-4 font-bold text-sm uppercase tracking-wider',
        'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg',
        isPlaying && 'ring-2 ring-yellow-400 animate-pulse'
      )}>
        Krupiye
      </div>

      {/* Kartlar */}
      {cards.length > 0 && (
        <div className="mb-3">
          <CardStack cards={cards} size="lg" />
        </div>
      )}

      {/* Skor */}
      {cards.length > 0 && (
        <div className={cn(
          'px-4 py-2 rounded-full font-bold text-lg',
          score > 21 ? 'bg-red-600' : 'bg-red-700/80 text-white'
        )}>
          {cards.every(c => c.faceUp) ? score : `${visibleScore}+?`}
        </div>
      )}
    </div>
  );
}
