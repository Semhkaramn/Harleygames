'use client';

import { cn } from '@/lib/utils';

interface ChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

const chipColors: Record<number, string> = {
  10: 'bg-blue-600 border-blue-400',
  25: 'bg-green-600 border-green-400',
  50: 'bg-red-600 border-red-400',
  100: 'bg-gray-800 border-gray-600',
  250: 'bg-purple-600 border-purple-400',
  500: 'bg-yellow-500 border-yellow-300 text-black',
};

const sizeClasses = {
  sm: 'w-10 h-10 text-xs',
  md: 'w-14 h-14 text-sm',
  lg: 'w-20 h-20 text-lg',
};

export function Chip({ value, size = 'md', onClick, selected, disabled, className }: ChipProps) {
  const colorClass = chipColors[value] || 'bg-gray-600 border-gray-400';
  const sizeClass = sizeClasses[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'chip rounded-full flex items-center justify-center font-bold shadow-lg text-white',
        'border-4 border-dashed transition-all duration-200',
        'hover:scale-110 hover:shadow-xl active:scale-95',
        colorClass,
        sizeClass,
        selected && 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        className
      )}
    >
      <span className="relative z-10">{value}</span>
      {/* Inner ring */}
      <div className="absolute inset-2 rounded-full border-2 border-white/30" />
    </button>
  );
}

export function ChipStack({ value, count = 1, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'md' | 'lg' }) {
  const stackedChips = Math.min(count, 5);

  return (
    <div className="relative">
      {Array.from({ length: stackedChips }).map((_, i) => (
        <div
          key={`chip-${value}-${i}`}
          className="absolute"
          style={{ bottom: i * 4, left: 0 }}
        >
          <Chip value={value} size={size} />
        </div>
      ))}
    </div>
  );
}

export function BetDisplay({ amount, size = 'sm' }: { amount: number; size?: 'sm' | 'md' | 'lg' }) {
  if (amount <= 0) return null;

  // En büyük chip'ten başlayarak hesapla
  const chipValues = [500, 250, 100, 50, 25, 10];
  const chips: { value: number; count: number }[] = [];
  let remaining = amount;

  for (const value of chipValues) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      chips.push({ value, count: Math.min(count, 3) });
      remaining = remaining % value;
    }
  }

  return (
    <div className="flex items-end gap-1">
      {chips.map(({ value, count }) => (
        <ChipStack key={value} value={value} count={count} size={size} />
      ))}
      <span className="ml-2 text-yellow-400 font-bold text-sm">{amount}</span>
    </div>
  );
}
