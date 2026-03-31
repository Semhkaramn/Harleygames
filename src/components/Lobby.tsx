'use client';

import { useState } from 'react';
import type { Room } from '@/lib/gameTypes';

interface LobbyProps {
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

const MOCK_ROOMS: Room[] = [
  { id: '1', name: 'VIP Masa #1', players: 3, maxPlayers: 6, minBet: 100, maxBet: 10000, status: 'playing' },
  { id: '2', name: 'Başlangıç Masası', players: 2, maxPlayers: 6, minBet: 10, maxBet: 500, status: 'waiting' },
  { id: '3', name: 'High Roller', players: 5, maxPlayers: 6, minBet: 500, maxBet: 50000, status: 'playing' },
  { id: '4', name: 'Turnuva Masası #2', players: 0, maxPlayers: 6, minBet: 25, maxBet: 1000, status: 'waiting' },
  { id: '5', name: 'Casual Table', players: 4, maxPlayers: 6, minBet: 5, maxBet: 200, status: 'playing' },
];

export function Lobby({ onJoinRoom, onCreateRoom }: LobbyProps) {
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');

  const filteredRooms = MOCK_ROOMS.filter((room) => {
    if (filter === 'all') return true;
    return room.status === filter;
  });

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Oyun Lobisi
          </h2>
          <p className="text-gray-400 text-sm mt-1">Bir masaya katıl veya kendi masanı oluştur</p>
        </div>

        <button
          type="button"
          onClick={onCreateRoom}
          className="btn-gold flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Masa Oluştur
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'waiting', label: 'Bekleyen' },
          { key: 'playing', label: 'Oyunda' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as 'all' | 'waiting' | 'playing')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Room list */}
      <div className="space-y-3">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="glass rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group"
            onClick={() => room.players < room.maxPlayers && onJoinRoom(room.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Status indicator */}
                <div className={`w-3 h-3 rounded-full ${
                  room.status === 'waiting' ? 'bg-amber-400' : 'bg-green-400'
                } ${room.status === 'playing' ? 'animate-pulse' : ''}`} />

                <div>
                  <h3 className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                    {room.name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                    <span>Min: {room.minBet}</span>
                    <span>Max: {room.maxBet}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Player count */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {Array.from({ length: Math.min(room.players, 3) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-sm"
                      >
                        {['🎭', '🎪', '🎰'][i]}
                      </div>
                    ))}
                    {room.players > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs text-gray-400">
                        +{room.players - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">
                    {room.players}/{room.maxPlayers}
                  </span>
                </div>

                {/* Join button */}
                <button
                  type="button"
                  disabled={room.players >= room.maxPlayers}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    room.players >= room.maxPlayers
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'btn-primary'
                  }`}
                >
                  {room.players >= room.maxPlayers ? 'Dolu' : 'Katıl'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Henüz masa bulunmuyor</p>
        </div>
      )}
    </div>
  );
}
