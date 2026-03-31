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

const statusConfig: Record<string, { text: string; colorClass: string; amountPrefix: string }> = {
  won: { text: 'Kazandı!', colorClass: 'text-green-400', amountPrefix: '+' },
  lost: { text: 'Kaybetti', colorClass: 'text-red-400', amountPrefix: '' },
  push: { text: 'Berabere', colorClass: 'text-gray-400', amountPrefix: '' },
  blackjack: { text: 'Blackjack!', colorClass: 'text-yellow-400', amountPrefix: '+' },
  bust: { text: 'Bust!', colorClass: 'text-red-400', amountPrefix: '' },
  spectating: { text: 'İzledi', colorClass: 'text-gray-500', amountPrefix: '' },
};

export function ResultsPanel({ players, dealerScore, onReady, onLeave }: ResultsPanelProps) {
  // Sadece oyuna katılan oyuncuları göster
  const activePlayers = players.filter(p => p.bet > 0 || ['won', 'lost', 'push', 'blackjack', 'bust'].includes(p.status));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block px-4 py-1 rounded-full bg-red-600/20 text-red-400 text-sm mb-2">
            Krupiye: {dealerScore > 21 ? 'Bust!' : dealerScore}
          </div>
          <h2 className="text-2xl font-bold text-gold">Sonuçlar</h2>
        </div>

        {/* Results list */}
        <div className="space-y-3 mb-6">
          {activePlayers.map((player) => {
            const config = statusConfig[player.status] || statusConfig.lost;
            let winAmount = 0;

            if (player.status === 'won') winAmount = player.bet;
            else if (player.status === 'blackjack') winAmount = player.bet * 1.5;
            else if (player.status === 'push') winAmount = 0;
            else if (player.status === 'lost' || player.status === 'bust') winAmount = -player.bet;

            return (
              <div
                key={player.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl',
                  'bg-gray-800/50 border border-gray-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-gray-600">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback className="bg-gray-700">
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">
                      {player.isCurrentUser ? 'Sen' : player.name}
                    </div>
                    <div className={cn('text-sm', config.colorClass)}>
                      {config.text}
                    </div>
                  </div>
                </div>

                {winAmount !== 0 && (
                  <div className={cn(
                    'text-lg font-bold',
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
        <div className="flex gap-3">
          <Button
            onClick={onLeave}
            variant="outline"
            className="flex-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            Lobiye Dön
          </Button>
          <Button
            onClick={onReady}
            className={cn(
              'flex-1 bg-gradient-to-r from-green-600 to-green-500',
              'hover:from-green-500 hover:to-green-400'
            )}
          >
            Hazırım
          </Button>
        </div>
      </div>
    </div>
  );
}
