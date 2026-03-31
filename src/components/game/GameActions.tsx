'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameActionsProps {
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
}

export function GameActions({ canHit, canStand, canDouble, onHit, onStand, onDouble }: GameActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
      <div className="max-w-md mx-auto flex gap-3">
        <Button
          onClick={onHit}
          disabled={!canHit}
          className={cn(
            'flex-1 h-14 text-lg font-bold',
            'bg-gradient-to-r from-blue-600 to-blue-500',
            'hover:from-blue-500 hover:to-blue-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-lg shadow-blue-600/30'
          )}
        >
          Kart Al
        </Button>

        <Button
          onClick={onStand}
          disabled={!canStand}
          className={cn(
            'flex-1 h-14 text-lg font-bold',
            'bg-gradient-to-r from-red-600 to-red-500',
            'hover:from-red-500 hover:to-red-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-lg shadow-red-600/30'
          )}
        >
          Dur
        </Button>

        <Button
          onClick={onDouble}
          disabled={!canDouble}
          className={cn(
            'flex-1 h-14 text-lg font-bold',
            'bg-gradient-to-r from-yellow-600 to-yellow-500',
            'hover:from-yellow-500 hover:to-yellow-400 text-black',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-lg shadow-yellow-600/30'
          )}
        >
          2x
        </Button>
      </div>
    </div>
  );
}
