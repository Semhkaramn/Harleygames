'use client';

import { useState } from 'react';
import type { Tournament } from '@/lib/gameTypes';

interface TournamentListProps {
  onJoinTournament: (tournamentId: string) => void;
}

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'Günlük Şampiyonası',
    entryFee: 100,
    prizePool: 5000,
    players: 42,
    maxPlayers: 64,
    status: 'registering',
    startTime: new Date(Date.now() + 3600000),
    rounds: 5,
    currentRound: 0,
  },
  {
    id: '2',
    name: 'VIP Turnuvası',
    entryFee: 500,
    prizePool: 25000,
    players: 28,
    maxPlayers: 32,
    status: 'running',
    startTime: new Date(Date.now() - 1800000),
    rounds: 4,
    currentRound: 2,
  },
  {
    id: '3',
    name: 'Haftalık Büyük Ödül',
    entryFee: 250,
    prizePool: 50000,
    players: 120,
    maxPlayers: 128,
    status: 'registering',
    startTime: new Date(Date.now() + 86400000),
    rounds: 7,
    currentRound: 0,
  },
  {
    id: '4',
    name: 'Hızlı Turnuva',
    entryFee: 50,
    prizePool: 2000,
    players: 16,
    maxPlayers: 16,
    status: 'finished',
    startTime: new Date(Date.now() - 7200000),
    rounds: 4,
    currentRound: 4,
  },
];

export function TournamentList({ onJoinTournament }: TournamentListProps) {
  const [filter, setFilter] = useState<'all' | 'registering' | 'running' | 'finished'>('all');

  const filteredTournaments = MOCK_TOURNAMENTS.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) {
      return 'Başladı';
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 24) {
      return `${Math.floor(hours / 24)} gün`;
    }

    return `${hours}s ${minutes}d`;
  };

  const statusColors: Record<'registering' | 'running' | 'finished', string> = {
    registering: 'text-amber-400 bg-amber-400/10',
    running: 'text-green-400 bg-green-400/10',
    finished: 'text-gray-400 bg-gray-400/10',
  };

  const statusText: Record<'registering' | 'running' | 'finished', string> = {
    registering: 'Kayıt Açık',
    running: 'Devam Ediyor',
    finished: 'Tamamlandı',
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          Turnuvalar
        </h2>
        <p className="text-gray-400 text-sm mt-1">Turnuvalara katıl ve büyük ödüller kazan</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'registering', label: 'Kayıt Açık' },
          { key: 'running', label: 'Devam Eden' },
          { key: 'finished', label: 'Tamamlanan' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === tab.key
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tournament cards */}
      <div className="grid gap-4">
        {filteredTournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="glass rounded-xl p-5 hover:bg-white/10 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                    {statusText[tournament.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Ödül Havuzu</span>
                    <span className="text-amber-400 font-bold">{tournament.prizePool.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Giriş Ücreti</span>
                    <span className="text-white font-medium">{tournament.entryFee}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Oyuncular</span>
                    <span className="text-white font-medium">{tournament.players}/{tournament.maxPlayers}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">
                      {tournament.status === 'running' ? 'Tur' : 'Başlangıç'}
                    </span>
                    <span className="text-white font-medium">
                      {tournament.status === 'running'
                        ? `${tournament.currentRound}/${tournament.rounds}`
                        : formatTime(tournament.startTime)}
                    </span>
                  </div>
                </div>

                {/* Progress bar for running tournaments */}
                {tournament.status === 'running' && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                        style={{ width: `${(tournament.currentRound / tournament.rounds) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Registration progress for registering tournaments */}
                {tournament.status === 'registering' && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                        style={{ width: `${(tournament.players / tournament.maxPlayers) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-center gap-3">
                {tournament.status === 'registering' && (
                  <button
                    type="button"
                    onClick={() => onJoinTournament(tournament.id)}
                    disabled={tournament.players >= tournament.maxPlayers}
                    className="btn-gold px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Kayıt Ol
                  </button>
                )}
                {tournament.status === 'running' && (
                  <button
                    type="button"
                    onClick={() => onJoinTournament(tournament.id)}
                    className="btn-secondary px-6 py-2.5"
                  >
                    İzle
                  </button>
                )}
                {tournament.status === 'finished' && (
                  <button
                    type="button"
                    className="btn-secondary px-6 py-2.5 opacity-50"
                    disabled
                  >
                    Sonuçlar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTournaments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Turnuva bulunmuyor</p>
        </div>
      )}
    </div>
  );
}
