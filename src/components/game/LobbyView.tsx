'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Users, Coins, Trophy, RefreshCw } from 'lucide-react';
import type { Room } from '@/types/game';

export function LobbyView() {
  const {
    currentUser,
    rooms,
    isConnected,
    createRoom,
    joinRoom,
    fetchRooms,
  } = useGameStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMinBet, setNewRoomMinBet] = useState(10);
  const [newRoomMaxBet, setNewRoomMaxBet] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<{ roomId: string; seat: number } | null>(null);

  if (!currentUser) return null;

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    setIsLoading(true);
    const roomId = await createRoom(newRoomName, newRoomMinBet, newRoomMaxBet);

    if (roomId) {
      // Oluşturan kişi otomatik olarak 1. koltuğa oturur
      await joinRoom(roomId, 1);
    }

    setIsLoading(false);
    setIsCreating(false);
    setNewRoomName('');
  };

  const handleJoinRoom = async (roomId: string, seatNumber: number) => {
    setIsLoading(true);
    await joinRoom(roomId, seatNumber);
    setIsLoading(false);
    setSelectedSeat(null);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchRooms();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-green-500">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="bg-gray-700 text-white">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-white font-bold">{currentUser.name}</h1>
            <div className="flex items-center gap-1 text-yellow-400">
              <Coins className="w-4 h-4" />
              <span className="font-medium">{currentUser.balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            disabled={isLoading}
            className="border-gray-600"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Create Room Button */}
      {!isCreating ? (
        <Button
          onClick={() => setIsCreating(true)}
          className="w-full mb-6 bg-green-600 hover:bg-green-500"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Oda Oluştur
        </Button>
      ) : (
        <div className="bg-gray-800 rounded-xl p-4 mb-6 space-y-4">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Oda adı..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Min Bahis</label>
              <input
                type="number"
                value={newRoomMinBet}
                onChange={(e) => setNewRoomMinBet(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Max Bahis</label>
              <input
                type="number"
                value={newRoomMaxBet}
                onChange={(e) => setNewRoomMaxBet(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreating(false)}
              variant="outline"
              className="flex-1 border-gray-600"
            >
              İptal
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || !newRoomName.trim()}
              className="flex-1 bg-green-600 hover:bg-green-500"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className="space-y-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Aktif Odalar
        </h2>

        {rooms.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Henüz oda yok</p>
            <p className="text-sm">İlk odayı sen oluştur!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              selectedSeat={selectedSeat?.roomId === room.id ? selectedSeat.seat : null}
              onSelectSeat={(seat) => setSelectedSeat({ roomId: room.id, seat })}
              onJoin={(seat) => handleJoinRoom(room.id, seat)}
              isLoading={isLoading}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Room Card Component
function RoomCard({
  room,
  selectedSeat,
  onSelectSeat,
  onJoin,
  isLoading,
}: {
  room: Room;
  selectedSeat: number | null;
  onSelectSeat: (seat: number) => void;
  onJoin: (seat: number) => void;
  isLoading: boolean;
}) {
  const seats = [1, 2, 3, 4, 5, 6];
  const occupiedSeats = room.players.map(p => p.seatNumber);

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-bold">{room.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{room.minBet}-{room.maxBet}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{room.playerCount}/6</span>
            </div>
          </div>
        </div>
        <Badge
          variant={room.status === 'waiting' ? 'default' : 'secondary'}
          className={cn(
            room.status === 'waiting' && 'bg-green-600',
            room.status === 'playing' && 'bg-yellow-600',
            room.status === 'betting' && 'bg-blue-600'
          )}
        >
          {room.status === 'waiting' ? 'Bekliyor' :
           room.status === 'betting' ? 'Bahis' :
           room.status === 'playing' ? 'Oyunda' :
           room.status === 'results' ? 'Sonuçlar' : room.status}
        </Badge>
      </div>

      {/* Seats */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {seats.map((seat) => {
          const isOccupied = occupiedSeats.includes(seat);
          const player = room.players.find(p => p.seatNumber === seat);
          const isSelected = selectedSeat === seat;

          return (
            <button
              key={seat}
              type="button"
              onClick={() => !isOccupied && onSelectSeat(seat)}
              disabled={isOccupied || room.status !== 'waiting'}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center transition-all',
                isOccupied
                  ? 'bg-gray-700'
                  : isSelected
                    ? 'bg-green-600 ring-2 ring-green-400'
                    : 'bg-gray-700 hover:bg-gray-600',
                (isOccupied || room.status !== 'waiting') && 'cursor-not-allowed opacity-50'
              )}
            >
              {isOccupied && player ? (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={player.avatar} />
                  <AvatarFallback className="text-xs bg-gray-600">
                    {player.name.substring(0, 1)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="text-gray-500 text-xs">{seat}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Join Button */}
      {selectedSeat && room.status === 'waiting' && (
        <Button
          onClick={() => onJoin(selectedSeat)}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-500"
        >
          {isLoading ? 'Katılınıyor...' : `${selectedSeat}. Koltuğa Otur`}
        </Button>
      )}
    </div>
  );
}
