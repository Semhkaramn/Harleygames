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
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Aktif Odalar
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-gray-400">{rooms.length} oda</span>
        </div>
      </div>

      {/* Room list */}
      {rooms.length > 0 ? (
        <div className="space-y-2">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoin={() => room.players < room.maxPlayers && onJoinRoom(room.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">🎰</div>
          <h3 className="text-sm font-semibold text-white mb-1">Henüz aktif oda yok</h3>
          <p className="text-gray-500 text-xs mb-3">İlk odayı sen oluştur!</p>
          <button
            type="button"
            onClick={onCreateRoom}
            className="btn-gold px-4 py-2 text-xs"
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
      className={`glass rounded-xl p-3 transition-all ${
        !isFull ? 'active:scale-[0.98] cursor-pointer' : 'opacity-60'
      }`}
      onClick={!isFull ? onJoin : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status indicator */}
          <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-lg ${
            isPlaying ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}>
            {isPlaying ? '🎲' : '⏳'}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-white font-medium text-sm truncate">
              {room.name}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isPlaying ? 'Oyunda' : 'Bekliyor'}
              </span>
              <span>{room.minBet}-{room.maxBet}💰</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Player count */}
          <div className="text-center">
            <div className="flex -space-x-1.5">
              {Array.from({ length: Math.min(room.players, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-[#0a0a0a] flex items-center justify-center text-[10px]"
                >
                  {['🎭', '🎪', '🃏'][i]}
                </div>
              ))}
              {room.players > 3 && (
                <div className="w-5 h-5 rounded-full bg-gray-800 border border-[#0a0a0a] flex items-center justify-center text-[8px] text-gray-400">
                  +{room.players - 3}
                </div>
              )}
            </div>
            <span className="text-[9px] text-gray-500 mt-0.5 block">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
