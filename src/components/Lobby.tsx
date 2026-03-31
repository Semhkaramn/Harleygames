'use client';

import { useRoomStore } from '@/lib/store';
import type { Room } from '@/lib/gameTypes';

interface LobbyProps {
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export function Lobby({ onJoinRoom, onCreateRoom }: LobbyProps) {
  const { rooms } = useRoomStore();

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Aktif Odalar
          </h2>
          <p className="text-gray-500 text-sm mt-1">Bir masaya katıl veya kendi masanı oluştur</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-400">{rooms.length} oda aktif</span>
        </div>
      </div>

      {/* Room list */}
      {rooms.length > 0 ? (
        <div className="space-y-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoin={() => room.players < room.maxPlayers && onJoinRoom(room.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🎰</div>
          <h3 className="text-xl font-semibold text-white mb-2">Henüz aktif oda yok</h3>
          <p className="text-gray-500 mb-6">İlk odayı sen oluştur ve arkadaşlarını davet et!</p>
          <button
            type="button"
            onClick={onCreateRoom}
            className="btn-gold px-8 py-3"
          >
            Oda Oluştur
          </button>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onJoin }: { room: Room; onJoin: () => void }) {
  const isFull = room.players >= room.maxPlayers;
  const isPlaying = room.status === 'playing';

  return (
    <div
      className={`glass rounded-2xl p-5 transition-all duration-300 ${
        !isFull ? 'hover:bg-white/10 hover:border-amber-500/30 cursor-pointer' : 'opacity-60'
      } border border-transparent`}
      onClick={!isFull ? onJoin : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            isPlaying ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}>
            {isPlaying ? '🎲' : '⏳'}
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg">
              {room.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isPlaying ? 'Oyunda' : 'Bekliyor'}
              </span>
              <span>Min: {room.minBet} 💰</span>
              <span>Max: {room.maxBet} 💰</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Player count */}
          <div className="text-center">
            <div className="flex -space-x-2 mb-1 justify-center">
              {Array.from({ length: Math.min(room.players, 4) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-[#0a0a0a] flex items-center justify-center text-sm"
                >
                  {['🎭', '🎪', '🃏', '👤'][i]}
                </div>
              ))}
              {room.players > 4 && (
                <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#0a0a0a] flex items-center justify-center text-xs text-gray-400">
                  +{room.players - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {room.players}/{room.maxPlayers}
            </span>
          </div>

          {/* Join button */}
          <button
            type="button"
            disabled={isFull}
            onClick={(e) => {
              e.stopPropagation();
              if (!isFull) onJoin();
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isFull
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {isFull ? 'Dolu' : 'Katıl'}
          </button>
        </div>
      </div>
    </div>
  );
}
