'use client';

import { useGameStore } from '@/store/gameStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Coins } from 'lucide-react';

export function LobbyView() {
  const { tables, currentUser, joinTable } = useGameStore();

  const handleJoinTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const occupiedSeats = table.players.map(p => p.seatIndex);
    const availableSeat = [0, 1, 2, 3, 4].find(s => !occupiedSeats.includes(s));

    if (availableSeat !== undefined) {
      joinTable(tableId, availableSeat);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">♠</span>
            <h1 className="text-lg font-bold text-white">Blackjack</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">{currentUser.balance}</span>
            </div>
            <Avatar className="w-8 h-8 border border-green-500">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-gray-700 text-xs">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <h2 className="text-lg font-bold text-white mb-4">Masalar</h2>

        {/* Tables List */}
        <div className="space-y-3">
          {tables.map((table) => {
            const isFull = table.players.length >= table.maxPlayers;
            const isPlaying = ['playing', 'dealing', 'dealer_turn'].includes(table.status);

            return (
              <div
                key={table.id}
                className="rounded-xl bg-gray-900 border border-gray-800 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{table.name}</h3>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs',
                      isFull ? 'bg-red-600/20 text-red-400' :
                      isPlaying ? 'bg-yellow-600/20 text-yellow-400' :
                      table.players.length === 0 ? 'bg-gray-700 text-gray-400' :
                      'bg-green-600/20 text-green-400'
                    )}>
                      {isFull ? 'Dolu' : isPlaying ? 'Oyunda' : table.players.length === 0 ? 'Boş' : 'Açık'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{table.players.length}/5</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {table.players.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {table.players.slice(0, 4).map((player) => (
                          <Avatar
                            key={player.id}
                            className="w-7 h-7 border border-gray-800"
                          >
                            <AvatarImage src={player.avatar} />
                            <AvatarFallback className="bg-gray-700 text-[10px]">
                              {player.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">Bekleniyor</span>
                    )}
                    <span className="text-gray-500 text-xs">
                      {table.minBet}-{table.maxBet}
                    </span>
                  </div>

                  <Button
                    onClick={() => handleJoinTable(table.id)}
                    disabled={isFull}
                    size="sm"
                    className={cn(
                      'h-8 px-4 text-sm',
                      isFull ? 'bg-gray-700 text-gray-400' : 'bg-green-600 hover:bg-green-500'
                    )}
                  >
                    {isFull ? 'Dolu' : 'Otur'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-lg mx-auto px-4 py-4 text-center text-gray-600 text-xs">
          @harleygamesbot
        </div>
      </footer>
    </div>
  );
}
