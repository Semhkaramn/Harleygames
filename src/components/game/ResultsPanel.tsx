'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Player } from '@/types/game';
import { cn } from '@/lib/utils';

interface ResultsPanelProps {
  players: Player[];
  dealerScore: number;
  onReady: () => void;
  onLeave: () => void;
}

const statusConfig: Record<string, { text: string; colorClass: string }> = {
  won: { text: 'Kazandı', colorClass: 'text-green-400' },
  lost: { text: 'Kaybetti', colorClass: 'text-red-400' },
  push: { text: 'Berabere', colorClass: 'text-gray-400' },
  blackjack: { text: 'BJ!', colorClass: 'text-yellow-400' },
  bust: { text: 'Bust', colorClass: 'text-red-400' },
  spectating: { text: 'İzledi', colorClass: 'text-gray-500' },
};

export function ResultsPanel({ players, dealerScore, onReady, onLeave }: ResultsPanelProps) {
  const activePlayers = players.filter(p => p.bet > 0 || ['won', 'lost', 'push', 'blackjack', 'bust'].includes(p.status));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-4 max-w-sm w-full mx-4 border border-gray-800">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-block px-3 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs mb-2">
            Krupiye: {dealerScore > 21 ? 'Bust' : dealerScore}
          </div>
          <h2 className="text-lg font-bold text-white">Sonuçlar</h2>
        </div>

        {/* Results list */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {activePlayers.map((player) => {
            const config = statusConfig[player.status] || statusConfig.lost;
            let winAmount = 0;

            if (player.status === 'won') winAmount = player.bet;
            else if (player.status === 'blackjack') winAmount = Math.floor(player.bet * 1.5);
            else if (player.status === 'push') winAmount = 0;
            else if (player.status === 'lost' || player.status === 'bust') winAmount = -player.bet;

            return (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-gray-600">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback className="bg-gray-700 text-xs">
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white text-sm">
                      {player.isCurrentUser ? 'Sen' : player.name}
                    </div>
                    <div className={cn('text-xs', config.colorClass)}>
                      {config.text}
                    </div>
                  </div>
                </div>

                {winAmount !== 0 && (
                  <div className={cn(
                    'text-sm font-bold',
                    winAmount > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {winAmount > 0 ? '+' : ''}{winAmount}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onLeave}
            variant="outline"
            size="sm"
            className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            Lobi
          </Button>
          <Button
            onClick={onReady}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-500"
          >
            Devam
          </Button>
        </div>
      </div>
    </div>
  );
}
