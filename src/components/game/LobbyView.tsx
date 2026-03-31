'use client';

import { useGameStore } from '@/store/gameStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Coins } from 'lucide-react';

export function LobbyView() {
  const { tables, currentUser, joinTable } = useGameStore();

  const handleJoinTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Boş bir koltuk bul
    const occupiedSeats = table.players.map(p => p.seatIndex);
    const availableSeat = [0, 1, 2, 3, 4].find(s => !occupiedSeats.includes(s));

    if (availableSeat !== undefined) {
      joinTable(tableId, availableSeat);
    }
  };

  const getTableStatusBadge = (table: typeof tables[0]) => {
    if (table.players.length === 0) {
      return <Badge className="bg-gray-600">Boş</Badge>;
    }
    if (table.players.length >= table.maxPlayers) {
      return <Badge className="bg-red-600">Dolu</Badge>;
    }
    if (['playing', 'dealing', 'dealer_turn'].includes(table.status)) {
      return <Badge className="bg-yellow-600">Oyunda</Badge>;
    }
    return <Badge className="bg-green-600">Açık</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <span className="text-xl">♠</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              Blackjack <span className="text-green-400">Pro</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{currentUser.balance.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <Avatar className="w-10 h-10 border-2 border-green-500">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="bg-gray-700 text-white">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium hidden sm:block">{currentUser.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Masalar</h2>
          <p className="text-gray-400">Bir masa seçerek oyuna katıl</p>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => {
            const isFull = table.players.length >= table.maxPlayers;
            const isPlaying = ['playing', 'dealing', 'dealer_turn'].includes(table.status);

            return (
              <div
                key={table.id}
                className={cn(
                  'relative overflow-hidden rounded-2xl',
                  'bg-gradient-to-br from-gray-800 to-gray-900',
                  'border border-gray-700 hover:border-green-600/50',
                  'transition-all duration-300 hover:shadow-lg hover:shadow-green-600/10',
                  'group'
                )}
              >
                {/* Table Header */}
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{table.name}</h3>
                    {getTableStatusBadge(table)}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{table.players.length}/{table.maxPlayers}</span>
                    </div>
                    <div className="text-gray-400">
                      <span className="text-green-400">{table.minBet}</span>
                      {' - '}
                      <span className="text-green-400">{table.maxBet}</span>
                    </div>
                  </div>
                </div>

                {/* Players Preview */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4 min-h-[48px]">
                    {table.players.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {table.players.slice(0, 4).map((player) => (
                            <Avatar
                              key={player.id}
                              className="w-10 h-10 border-2 border-gray-800 ring-2 ring-gray-900"
                            >
                              <AvatarImage src={player.avatar} />
                              <AvatarFallback className="bg-gray-700 text-xs">
                                {player.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {table.players.length > 4 && (
                            <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center">
                              <span className="text-xs text-gray-400">+{table.players.length - 4}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-2 text-sm text-gray-400">
                          {table.players.map(p => p.name).slice(0, 2).join(', ')}
                          {table.players.length > 2 && ` +${table.players.length - 2}`}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">Oyuncu bekleniyor...</span>
                    )}
                  </div>

                  {/* Join Button */}
                  <Button
                    onClick={() => handleJoinTable(table.id)}
                    disabled={isFull}
                    className={cn(
                      'w-full',
                      isFull
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
                    )}
                  >
                    {isFull ? 'Masa Dolu' : isPlaying ? 'İzle & Bekle' : 'Masaya Otur'}
                  </Button>
                </div>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Blackjack Pro - Eğlence Amaçlı</p>
        </div>
      </footer>
    </div>
  );
}
