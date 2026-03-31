'use client';

import { motion } from 'framer-motion';

interface ChipProps {
  value: number;
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  animate?: boolean;
  index?: number;
}

const CHIP_COLORS: Record<number, { bg: string; border: string; glow: string }> = {
  5: { bg: 'from-red-500 via-red-600 to-red-700', border: 'border-red-400', glow: 'rgba(239, 68, 68, 0.5)' },
  10: { bg: 'from-blue-500 via-blue-600 to-blue-700', border: 'border-blue-400', glow: 'rgba(59, 130, 246, 0.5)' },
  25: { bg: 'from-emerald-500 via-emerald-600 to-emerald-700', border: 'border-emerald-400', glow: 'rgba(16, 185, 129, 0.5)' },
  50: { bg: 'from-amber-500 via-amber-600 to-amber-700', border: 'border-amber-400', glow: 'rgba(245, 158, 11, 0.5)' },
  100: { bg: 'from-gray-700 via-gray-800 to-gray-900', border: 'border-gray-500', glow: 'rgba(107, 114, 128, 0.5)' },
  500: { bg: 'from-purple-500 via-purple-600 to-purple-700', border: 'border-purple-400', glow: 'rgba(168, 85, 247, 0.5)' },
  1000: { bg: 'from-yellow-400 via-yellow-500 to-yellow-600', border: 'border-yellow-300', glow: 'rgba(250, 204, 21, 0.6)' },
};

export function Chip({ value, onClick, selected = false, size = 'md', disabled = false, animate = false, index = 0 }: ChipProps) {
  const colors = CHIP_COLORS[value] || CHIP_COLORS[100];

  const sizeConfig = {
    sm: { size: 'w-10 h-10', font: 'text-[10px]', inner: 'inset-[2px]', dashed: 'inset-[4px]' },
    md: { size: 'w-12 h-12', font: 'text-xs', inner: 'inset-[3px]', dashed: 'inset-[5px]' },
    lg: { size: 'w-14 h-14', font: 'text-sm', inner: 'inset-[4px]', dashed: 'inset-[6px]' },
  };

  const config = sizeConfig[size];

  const chipVariants = {
    hidden: {
      y: -50,
      rotate: 180,
      opacity: 0,
      scale: 0.5,
    },
    visible: {
      y: 0,
      rotate: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: index * 0.1,
      },
    },
    hover: {
      y: -5,
      scale: 1.1,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 },
    },
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        ${config.size}
        rounded-full
        bg-gradient-to-br ${colors.bg}
        border-2 ${colors.border}
        flex items-center justify-center
        font-bold text-white
        relative
        overflow-hidden
        ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}
        ${value >= 1000 ? 'text-gray-900' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        boxShadow: selected
          ? `0 0 25px ${colors.glow}, 0 4px 15px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)`
          : `0 4px 15px rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.25), inset 0 -2px 4px rgba(0, 0, 0, 0.15)`,
      }}
      variants={animate ? chipVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate={animate ? 'visible' : undefined}
      whileHover={!disabled ? 'hover' : undefined}
      whileTap={!disabled ? 'tap' : undefined}
    >
      {/* Outer ring pattern */}
      <div
        className={`absolute ${config.inner} rounded-full border border-white/20`}
      />

      {/* Inner dashed circle */}
      <div
        className={`absolute ${config.dashed} rounded-full border-2 border-dashed border-white/40`}
      />

      {/* Edge pattern (dots) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/30"
          style={{
            top: '50%',
            left: '50%',
            transform: `rotate(${i * 45}deg) translateY(-${size === 'sm' ? 16 : size === 'md' ? 20 : 24}px) translate(-50%, -50%)`,
          }}
        />
      ))}

      {/* Shine effect */}
      <div
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Value */}
      <span className={`relative z-10 ${config.font} font-bold drop-shadow-md`}>{value}</span>
    </motion.button>
  );
}

interface ChipStackProps {
  total: number;
  maxDisplay?: number;
  animate?: boolean;
}

export function ChipStack({ total, maxDisplay = 5, animate = false }: ChipStackProps) {
  // Break down total into chip denominations
  const denominations = [1000, 500, 100, 50, 25, 10, 5];
  const chips: number[] = [];
  let remaining = total;

  for (const denom of denominations) {
    while (remaining >= denom && chips.length < maxDisplay) {
      chips.push(denom);
      remaining -= denom;
    }
  }

  if (chips.length === 0 && total > 0) {
    chips.push(5);
  }

  const stackVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const chipStackVariant = {
    hidden: { y: -30, opacity: 0, scale: 0.8 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
      },
    },
  };

  return (
    <motion.div
      className="relative flex flex-col-reverse items-center"
      variants={animate ? stackVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate={animate ? 'visible' : undefined}
    >
      {chips.map((value, index) => (
        <motion.div
          key={`${value}-${index}`}
          className="relative"
          style={{
            marginTop: index === 0 ? 0 : '-28px',
            zIndex: index,
          }}
          variants={animate ? chipStackVariant : undefined}
        >
          <Chip value={value} size="sm" />
        </motion.div>
      ))}
      {total > 0 && (
        <motion.div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 px-2.5 py-0.5 rounded-md text-xs font-bold text-amber-400 whitespace-nowrap border border-amber-500/30"
          initial={animate ? { opacity: 0, y: 10 } : undefined}
          animate={animate ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.3 }}
        >
          {total.toLocaleString()}
        </motion.div>
      )}
    </motion.div>
  );
}

// Animated chip for bet display
export function BetChip({ value, onRemove }: { value: number; onRemove?: () => void }) {
  const colors = CHIP_COLORS[value] || CHIP_COLORS[100];

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0, y: -20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Chip value={value} size="sm" onClick={onRemove} />
    </motion.div>
  );
}
