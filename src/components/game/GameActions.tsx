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
    <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
      <div className="max-w-xs mx-auto flex gap-2">
        <Button
          onClick={onHit}
          disabled={!canHit}
          size="sm"
          className={cn(
            'flex-1 h-10 text-sm font-bold',
            'bg-blue-600 hover:bg-blue-500',
            'disabled:opacity-50'
          )}
        >
          Kart Al
        </Button>

        <Button
          onClick={onStand}
          disabled={!canStand}
          size="sm"
          className={cn(
            'flex-1 h-10 text-sm font-bold',
            'bg-red-600 hover:bg-red-500',
            'disabled:opacity-50'
          )}
        >
          Dur
        </Button>

        <Button
          onClick={onDouble}
          disabled={!canDouble}
          size="sm"
          className={cn(
            'flex-1 h-10 text-sm font-bold',
            'bg-yellow-500 hover:bg-yellow-400 text-black',
            'disabled:opacity-50'
          )}
        >
          2x
        </Button>
      </div>
    </div>
  );
}
