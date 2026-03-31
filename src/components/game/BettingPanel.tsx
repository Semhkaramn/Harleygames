'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from './Chip';
import { cn } from '@/lib/utils';

interface BettingPanelProps {
  minBet: number;
  maxBet: number;
  balance: number;
  countdown: number;
  onPlaceBet: (amount: number) => void;
}

const chipValues = [10, 25, 50, 100, 250, 500];

export function BettingPanel({ minBet, maxBet, balance, countdown, onPlaceBet }: BettingPanelProps) {
  const [selectedBet, setSelectedBet] = useState<number>(0);

  const handleChipClick = (value: number) => {
    const newBet = selectedBet + value;
    if (newBet <= Math.min(maxBet, balance)) {
      setSelectedBet(newBet);
    }
  };

  const handleConfirm = () => {
    if (selectedBet >= minBet && selectedBet <= maxBet && selectedBet <= balance) {
      onPlaceBet(selectedBet);
    }
  };

  const handleClear = () => {
    setSelectedBet(0);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Bahisini Seç</h2>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-400">Min: <span className="text-green-400">{minBet}</span></span>
            <span className="text-gray-400">Max: <span className="text-green-400">{maxBet}</span></span>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold',
            'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black animate-countdown'
          )}>
            {countdown}
          </div>
        </div>

        {/* Selected bet display */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-400 mb-1">Seçilen Bahis</div>
          <div className="text-4xl font-bold text-yellow-400">
            {selectedBet}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Bakiye: <span className="text-green-400">{balance}</span>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {chipValues.map((value) => (
            <Chip
              key={value}
              value={value}
              size="md"
              onClick={() => handleChipClick(value)}
              disabled={value > balance - selectedBet || selectedBet + value > maxBet}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleClear}
            variant="outline"
            className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            Temizle
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedBet < minBet}
            className={cn(
              'flex-1 bg-gradient-to-r from-green-600 to-green-500',
              'hover:from-green-500 hover:to-green-400',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Onayla
          </Button>
        </div>

        {selectedBet > 0 && selectedBet < minBet && (
          <p className="text-center text-red-400 text-sm mt-3">
            Minimum bahis: {minBet}
          </p>
        )}
      </div>
    </div>
  );
}
