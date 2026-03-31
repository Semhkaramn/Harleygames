'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/store';

interface LeaderboardEntry {
  rank: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  avatar: string;
  chips: number;
  wins: number;
  games: number;
  winRate: number;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { dbUser } = useUserStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard?limit=20');
        const data = await response.json();
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      } catch (error) {
        console.error('Leaderboard error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/30 to-gray-300/30 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-orange-600/30 to-orange-500/30 border-orange-500/50';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold gold-text" style={{ fontFamily: "'Playfair Display', serif" }}>
          Liderlik Tablosu
        </h2>
        <p className="text-gray-500 text-sm mt-1">En zengin oyuncular</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-400">Henüz oyuncu yok</p>
          <p className="text-gray-500 text-sm mt-1">İlk sıralamalara giren sen ol!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.telegramId}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getRankStyle(entry.rank)} ${
                dbUser?.telegram_id === entry.telegramId ? 'ring-2 ring-amber-500' : ''
              }`}
            >
              {/* Rank */}
              <div className="w-10 text-center font-bold text-lg">
                {typeof getRankIcon(entry.rank) === 'string' && getRankIcon(entry.rank).startsWith('#') ? (
                  <span className="text-gray-400 text-sm">{getRankIcon(entry.rank)}</span>
                ) : (
                  <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center text-xl">
                {entry.avatar}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {entry.firstName || entry.username || 'Oyuncu'}
                  {dbUser?.telegram_id === entry.telegramId && (
                    <span className="ml-2 text-xs text-amber-500">(Sen)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.wins} kazanma / {entry.games} oyun ({entry.winRate}%)
                </p>
              </div>

              {/* Chips */}
              <div className="text-right">
                <p className="font-bold text-amber-400">{entry.chips.toLocaleString()}</p>
                <p className="text-xs text-gray-500">chip</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current User Position (if not in top 20) */}
      {dbUser && !leaderboard.find(e => e.telegramId === dbUser.telegram_id) && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-center text-gray-500 text-sm mb-2">Senin sıralaman</p>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="w-10 text-center font-bold text-gray-400">?</div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center text-xl">
              {dbUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{dbUser.first_name || 'Oyuncu'}</p>
              <p className="text-xs text-gray-500">
                {dbUser.total_wins} kazanma / {dbUser.total_games} oyun
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-amber-400">{dbUser.chips.toLocaleString()}</p>
              <p className="text-xs text-gray-500">chip</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
