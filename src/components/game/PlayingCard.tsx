'use client';

import type { Card } from '@/types/game';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: Card;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

const sizeClasses = {
  sm: 'w-10 h-14 text-xs',
  md: 'w-14 h-20 text-sm',
  lg: 'w-20 h-28 text-base',
};

export function PlayingCard({ card, index = 0, size = 'md', className }: PlayingCardProps) {
  const sizeClass = sizeClasses[size];

  if (!card.faceUp) {
    return (
      <div
        className={cn(
          'playing-card rounded-lg shadow-xl border-2 border-green-700',
          sizeClass,
          className
        )}
        style={{
          background: 'repeating-linear-gradient(45deg, #1a4d2e, #1a4d2e 5px, #2d7a4a 5px, #2d7a4a 10px)',
          animationDelay: `${index * 0.1}s`,
        }}
      >
        <div className="absolute inset-2 border border-green-600 rounded opacity-50" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'playing-card bg-white rounded-lg shadow-xl flex flex-col justify-between p-1',
        sizeClass,
        className,
        'animate-deal-card'
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Top left */}
      <div className={cn('flex flex-col items-start leading-none', suitColors[card.suit])}>
        <span className="font-bold">{card.rank}</span>
        <span className="text-lg -mt-1">{suitSymbols[card.suit]}</span>
      </div>

      {/* Center */}
      <div className={cn('absolute inset-0 flex items-center justify-center', suitColors[card.suit])}>
        <span className={cn(
          size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl'
        )}>
          {suitSymbols[card.suit]}
        </span>
      </div>

      {/* Bottom right (rotated) */}
      <div className={cn('flex flex-col items-end leading-none rotate-180', suitColors[card.suit])}>
        <span className="font-bold">{card.rank}</span>
        <span className="text-lg -mt-1">{suitSymbols[card.suit]}</span>
      </div>
    </div>
  );
}

export function CardStack({ cards, size = 'md' }: { cards: Card[]; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="relative flex">
      {cards.map((card, index) => (
        <div
          key={`${card.suit}-${card.rank}-${index}`}
          className="relative"
          style={{ marginLeft: index > 0 ? (size === 'lg' ? '-40px' : size === 'md' ? '-28px' : '-20px') : 0 }}
        >
          <PlayingCard card={card} index={index} size={size} />
        </div>
      ))}
    </div>
  );
}
