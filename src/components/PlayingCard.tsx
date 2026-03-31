'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Card, SUIT_SYMBOLS, isRedSuit } from '@/lib/gameTypes';

interface PlayingCardProps {
  card: Card;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  flipDelay?: number;
}

export function PlayingCard({ card, index = 0, size = 'md', animate = true, flipDelay = 0 }: PlayingCardProps) {
  const [isFlipped, setIsFlipped] = useState(!card.faceUp);
  const [showFront, setShowFront] = useState(card.faceUp);

  useEffect(() => {
    if (card.faceUp && !showFront) {
      // Delay flip animation
      const timer = setTimeout(() => {
        setIsFlipped(false);
        setTimeout(() => setShowFront(true), 150);
      }, flipDelay);
      return () => clearTimeout(timer);
    } else if (!card.faceUp) {
      setIsFlipped(true);
      setShowFront(false);
    }
  }, [card.faceUp, flipDelay, showFront]);

  const sizeClasses = {
    sm: { card: 'w-12 h-[68px]', font: 'text-xs', symbol: 'text-lg', corner: 'text-[8px]' },
    md: { card: 'w-16 h-[92px] md:w-[70px] md:h-[100px]', font: 'text-sm', symbol: 'text-2xl', corner: 'text-[10px]' },
    lg: { card: 'w-20 h-[115px] md:w-24 md:h-[138px]', font: 'text-base', symbol: 'text-3xl', corner: 'text-xs' },
  };

  const sizes = sizeClasses[size];
  const isRed = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];

  const dealVariants = {
    hidden: {
      x: 200,
      y: -100,
      rotate: 180,
      scale: 0.5,
      opacity: 0,
    },
    visible: {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: index * 0.15,
      },
    },
  };

  const flipVariants = {
    front: {
      rotateY: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    back: {
      rotateY: 180,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  // Card back design
  const CardBack = () => (
    <div
      className={`${sizes.card} rounded-lg relative flex items-center justify-center overflow-hidden`}
      style={{
        background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2744 100%)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
      }}
    >
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255, 215, 0, 0.2) 6px, rgba(255, 215, 0, 0.2) 12px),
            repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255, 215, 0, 0.15) 6px, rgba(255, 215, 0, 0.15) 12px)
          `,
        }}
      />
      {/* Inner border */}
      <div className="absolute inset-1.5 rounded border border-amber-500/30" />
      <div className="absolute inset-2.5 rounded border border-amber-500/20" />
      {/* Logo */}
      <div className="relative z-10 text-amber-500/60 font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
        <span className="text-xl">H</span>
      </div>
      {/* Corner decorations */}
      <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-amber-500/40" />
      <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-amber-500/40" />
      <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-amber-500/40" />
      <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-amber-500/40" />
    </div>
  );

  // Card front design
  const CardFront = () => (
    <div
      className={`${sizes.card} rounded-lg relative flex flex-col items-center justify-between p-1.5 overflow-hidden select-none`}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25), 0 2px 5px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        color: isRed ? '#dc2626' : '#171717',
        backfaceVisibility: 'hidden',
        fontFamily: "'Playfair Display', serif",
      }}
    >
      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M0 0h20L0 20z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Top left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none z-10">
        <span className={`font-bold ${sizes.corner}`}>{card.rank}</span>
        <span className={`${sizes.corner} -mt-0.5`}>{symbol}</span>
      </div>

      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.span
          className={sizes.symbol}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          {symbol}
        </motion.span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 z-10">
        <span className={`font-bold ${sizes.corner}`}>{card.rank}</span>
        <span className={`${sizes.corner} -mt-0.5`}>{symbol}</span>
      </div>

      {/* Shine effect */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, transparent 100%)',
        }}
      />
    </div>
  );

  return (
    <motion.div
      className="relative cursor-default"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
      variants={animate ? dealVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate={animate ? 'visible' : undefined}
      whileHover={{
        y: -8,
        rotateX: 5,
        transition: { duration: 0.2 },
      }}
    >
      <motion.div
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
        }}
        animate={isFlipped ? 'back' : 'front'}
        variants={flipVariants}
      >
        {/* Front of card */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          <CardFront />
        </div>

        {/* Back of card */}
        <div
          className="absolute top-0 left-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Mini card for compact displays
export function MiniCard({ card, className = '' }: { card: Card; className?: string }) {
  const isRed = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];

  if (!card.faceUp) {
    return (
      <div className={`w-6 h-8 rounded bg-gradient-to-br from-blue-900 to-blue-950 border border-amber-500/30 flex items-center justify-center ${className}`}>
        <span className="text-amber-500/50 text-[8px]">H</span>
      </div>
    );
  }

  return (
    <div
      className={`w-6 h-8 rounded bg-white flex flex-col items-center justify-center shadow-sm ${className}`}
      style={{ color: isRed ? '#dc2626' : '#171717' }}
    >
      <span className="text-[8px] font-bold leading-none">{card.rank}</span>
      <span className="text-[8px] leading-none">{symbol}</span>
    </div>
  );
}
