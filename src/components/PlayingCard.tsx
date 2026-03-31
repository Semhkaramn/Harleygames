'use client';

import { type Card, SUIT_SYMBOLS, isRedSuit } from '@/lib/gameTypes';

interface PlayingCardProps {
  card: Card;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function PlayingCard({ card, index = 0, size = 'md', animate = true }: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-12 h-[68px] text-sm',
    md: 'w-16 h-[92px] text-base md:w-[70px] md:h-[100px]',
    lg: 'w-20 h-[115px] text-lg md:w-24 md:h-[138px]',
  };

  if (!card.faceUp) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg relative flex items-center justify-center transition-all duration-300`}
        style={{
          background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2744 100%)',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), 0 2px 5px rgba(0, 0, 0, 0.2)',
          animationDelay: animate ? `${index * 100}ms` : '0ms',
        }}
      >
        <div
          className="absolute inset-1 rounded-md opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              rgba(255, 215, 0, 0.3) 8px,
              rgba(255, 215, 0, 0.3) 16px
            )`,
          }}
        />
        <div className="absolute inset-2 border border-amber-500/30 rounded" />
        <span className="text-amber-500/50 text-2xl">?</span>
      </div>
    );
  }

  const isRed = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg relative flex flex-col items-center justify-between p-1.5 transition-all duration-300 hover:-translate-y-1 cursor-default select-none ${animate ? 'animate-deal' : ''}`}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25), 0 2px 5px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        color: isRed ? '#dc2626' : '#171717',
        animationDelay: animate ? `${index * 100}ms` : '0ms',
        fontFamily: "'Playfair Display', serif",
      }}
    >
      {/* Top left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className="font-bold text-[0.9em]">{card.rank}</span>
        <span className="text-[0.8em]">{symbol}</span>
      </div>

      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[1.8em]">{symbol}</span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span className="font-bold text-[0.9em]">{card.rank}</span>
        <span className="text-[0.8em]">{symbol}</span>
      </div>
    </div>
  );
}
