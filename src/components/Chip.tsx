'use client';

interface ChipProps {
  value: number;
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const CHIP_COLORS: Record<number, { bg: string; border: string }> = {
  5: { bg: 'from-red-500 to-red-700', border: 'border-red-400' },
  10: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-400' },
  25: { bg: 'from-green-500 to-green-700', border: 'border-green-400' },
  50: { bg: 'from-amber-500 to-amber-700', border: 'border-amber-400' },
  100: { bg: 'from-gray-800 to-gray-950', border: 'border-gray-600' },
  500: { bg: 'from-purple-500 to-purple-700', border: 'border-purple-400' },
  1000: { bg: 'from-yellow-400 to-yellow-600', border: 'border-yellow-300' },
};

export function Chip({ value, onClick, selected = false, size = 'md', disabled = false }: ChipProps) {
  const colors = CHIP_COLORS[value] || CHIP_COLORS[100];

  const sizeClasses = {
    sm: 'w-10 h-10 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-14 h-14 text-sm',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded-full
        bg-gradient-to-br ${colors.bg}
        border-2 ${colors.border}
        flex items-center justify-center
        font-bold text-white
        shadow-lg
        transition-all duration-200
        hover:scale-110 hover:shadow-xl
        active:scale-95
        relative
        ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''}
        ${value === 1000 ? 'text-gray-900' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
      `}
      style={{
        boxShadow: selected
          ? '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.3)'
          : '0 4px 10px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
      }}
    >
      {/* Inner dashed circle */}
      <div
        className="absolute inset-[3px] rounded-full border-2 border-dashed opacity-40"
        style={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}
      />

      {/* Value */}
      <span className="relative z-10 drop-shadow-md">{value}</span>
    </button>
  );
}

interface ChipStackProps {
  total: number;
  maxDisplay?: number;
}

export function ChipStack({ total, maxDisplay = 5 }: ChipStackProps) {
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

  return (
    <div className="relative flex flex-col-reverse items-center">
      {chips.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="relative"
          style={{
            marginTop: index === 0 ? 0 : '-28px',
            zIndex: index,
          }}
        >
          <Chip value={value} size="sm" />
        </div>
      ))}
      {total > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-2 py-0.5 rounded text-xs font-bold text-amber-400 whitespace-nowrap">
          {total}
        </div>
      )}
    </div>
  );
}
