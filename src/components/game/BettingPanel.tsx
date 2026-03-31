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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-4 max-w-sm w-full mx-4 border border-gray-800">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-white mb-1">Bahis</h2>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
            <span>Min: <span className="text-green-400">{minBet}</span></span>
            <span>Max: <span className="text-green-400">{maxBet}</span></span>
          </div>
        </div>

        {/* Countdown + Selected bet */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold',
            'bg-yellow-500 text-black'
          )}>
            {countdown}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{selectedBet}</div>
            <div className="text-xs text-gray-500">Bakiye: {balance}</div>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {chipValues.map((value) => (
            <Chip
              key={value}
              value={value}
              size="sm"
              onClick={() => handleChipClick(value)}
              disabled={value > balance - selectedBet || selectedBet + value > maxBet}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleClear}
            variant="outline"
            size="sm"
            className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            Temizle
          </Button>
          <Button
            onClick={handleConfirm}
            size="sm"
            disabled={selectedBet < minBet}
            className="flex-1 bg-green-600 hover:bg-green-500"
          >
            Onayla
          </Button>
        </div>

        {selectedBet > 0 && selectedBet < minBet && (
          <p className="text-center text-red-400 text-xs mt-2">
            Minimum: {minBet}
          </p>
        )}
      </div>
    </div>
  );
}
