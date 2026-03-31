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
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-800',
  spades: 'text-gray-800',
};

const sizeClasses = {
  sm: 'w-8 h-11 text-[10px]',
  md: 'w-10 h-14 text-xs',
  lg: 'w-14 h-20 text-sm',
};

export function PlayingCard({ card, index = 0, size = 'md', className }: PlayingCardProps) {
  const sizeClass = sizeClasses[size];

  if (!card.faceUp) {
    return (
      <div
        className={cn(
          'rounded shadow-md',
          sizeClass,
          className
        )}
        style={{
          background: 'repeating-linear-gradient(45deg, #1a4d2e, #1a4d2e 4px, #2d7a4a 4px, #2d7a4a 8px)',
          animationDelay: `${index * 0.1}s`,
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded shadow-md flex flex-col justify-between p-0.5 relative',
        sizeClass,
        className,
        'animate-deal-card'
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Top left */}
      <div className={cn('flex flex-col items-start leading-none', suitColors[card.suit])}>
        <span className="font-bold">{card.rank}</span>
        <span className={cn(
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base',
          '-mt-0.5'
        )}>{suitSymbols[card.suit]}</span>
      </div>

      {/* Center symbol */}
      <div className={cn('absolute inset-0 flex items-center justify-center', suitColors[card.suit])}>
        <span className={cn(
          size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'
        )}>
          {suitSymbols[card.suit]}
        </span>
      </div>
    </div>
  );
}

export function CardStack({ cards, size = 'md' }: { cards: Card[]; size?: 'sm' | 'md' | 'lg' }) {
  const overlap = size === 'lg' ? -32 : size === 'md' ? -22 : -16;

  return (
    <div className="relative flex">
      {cards.map((card, index) => (
        <div
          key={`${card.suit}-${card.rank}-${index}`}
          className="relative"
          style={{ marginLeft: index > 0 ? `${overlap}px` : 0 }}
        >
          <PlayingCard card={card} index={index} size={size} />
        </div>
      ))}
    </div>
  );
}
