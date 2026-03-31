'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Lobby } from '@/components/Lobby';
import { GameTable } from '@/components/GameTable';
import { TournamentList } from '@/components/Tournament';
import { Leaderboard } from '@/components/Leaderboard';
import { useUserStore, useUIStore, useRoomStore } from '@/lib/store';
import {
  initTelegramWebApp,
  getTelegramUser,
  isInTelegram,
  getMockUser,
  hapticFeedback,
} from '@/lib/telegram';

export default function Home() {
  const { currentView, setCurrentView, showNotification, notification, clearNotification } = useUIStore();
  const { telegramUser, dbUser, isLoading, setTelegramUser, setDbUser, setLoading } = useUserStore();
  const { setRooms } = useRoomStore();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Telegram WebApp başlat ve kullanıcıyı authenticate et
  useEffect(() => {
    const init = async () => {
      try {
        // Telegram WebApp'i başlat
        initTelegramWebApp();

        // Telegram kullanıcısını al
        let user = getTelegramUser();

        // Development modunda mock user kullan
        if (!user && !isInTelegram()) {
          user = getMockUser();
        }

        if (!user) {
          setLoading(false);
          return;
        }

        setTelegramUser(user);

        // Backend'e authenticate ol
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '',
            user,
          }),
        });

        const data = await response.json();

        if (data.success && data.user) {
          setDbUser(data.user);
          hapticFeedback('success');
        } else {
          console.error('Auth failed:', data.error);
          setLoading(false);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Init error:', error);
        setLoading(false);
        setIsInitialized(true);
      }
    };

    init();
  }, [setTelegramUser, setDbUser, setLoading]);

  // Odaları yükle
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      if (data.rooms) {
        setRooms(data.rooms.map((r: any) => ({
          id: r.id,
          name: r.name,
          players: parseInt(r.player_count) || 0,
          maxPlayers: r.max_players || 6,
          minBet: r.min_bet || 10,
          maxBet: r.max_bet || 1000,
          status: r.status || 'waiting',
        })));
      }
    } catch (error) {
      console.error('Fetch rooms error:', error);
    }
  }, [setRooms]);

  useEffect(() => {
    if (isInitialized && currentView === 'lobby') {
      fetchRooms();
      const interval = setInterval(fetchRooms, 5000); // Her 5 saniyede odaları güncelle
      return () => clearInterval(interval);
    }
  }, [isInitialized, currentView, fetchRooms]);

  // Notification auto-clear
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(clearNotification, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  const handleJoinRoom = async (roomId: string) => {
    if (!dbUser) {
      showNotification('error', 'Lütfen giriş yapın');
      return;
    }

    try {
      // Odaya katıl
      const response = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          room_id: roomId,
          telegram_id: dbUser.telegram_id,
          seat_number: 0, // İlk boş koltuk
        }),
      });

      const data = await response.json();

      if (data.success || data.error === 'Seat already taken') {
        setSelectedRoomId(roomId);
        setCurrentView('game');
        hapticFeedback('medium');
      } else {
        showNotification('error', data.error || 'Odaya katılınamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    }
  };

  const handleCreateRoom = async () => {
    if (!dbUser) {
      showNotification('error', 'Lütfen giriş yapın');
      return;
    }

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${dbUser.first_name || 'Player'}'s Room`,
          min_bet: 10,
          max_bet: 1000,
          telegram_id: dbUser.telegram_id,
        }),
      });

      const data = await response.json();

      if (data.room) {
        setSelectedRoomId(data.room.id);
        setCurrentView('game');
        hapticFeedback('success');
        showNotification('success', 'Oda oluşturuldu!');
      } else {
        showNotification('error', 'Oda oluşturulamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    }
  };

  const handleJoinTournament = (tournamentId: string) => {
    hapticFeedback('medium');
    showNotification('info', 'Turnuva sistemi yakında aktif olacak!');
  };

  const handleBackToLobby = () => {
    setSelectedRoomId(null);
    setCurrentView('lobby');
    hapticFeedback('light');
  };

  // Loading screen
  if (isLoading || !isInitialized) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-500/20 to-transparent"></div>
          </div>
          <h2 className="text-2xl font-bold gold-text mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY GAMES
          </h2>
          <p className="text-gray-500 animate-pulse">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg animate-slide-down ${
            notification.type === 'success' ? 'bg-green-500/90' :
            notification.type === 'error' ? 'bg-red-500/90' :
            'bg-blue-500/90'
          }`}
        >
          <p className="text-white font-medium">{notification.message}</p>
        </div>
      )}

      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        userChips={dbUser?.chips || 0}
        userName={dbUser?.first_name || telegramUser?.first_name || ''}
        userAvatar={dbUser?.avatar || '🎭'}
        onBack={currentView === 'game' ? handleBackToLobby : undefined}
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        {currentView === 'lobby' && (
          <div className="animate-slide-up">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-5xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span className="gold-text">HARLEY GAMES</span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
                Canlı blackjack oyna, arkadaşlarınla yarış ve büyük ödüller kazan!
              </p>
              {!dbUser && (
                <p className="text-amber-500 text-sm mt-2">
                  Telegram'dan açarak giriş yapabilirsiniz
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Bakiye', value: `${(dbUser?.chips || 0).toLocaleString()}`, icon: '💰' },
                { label: 'Kazanma', value: `${dbUser?.total_wins || 0}`, icon: '🏆' },
                { label: 'Toplam Oyun', value: `${dbUser?.total_games || 0}`, icon: '🎲' },
                { label: 'Oran', value: dbUser?.total_games ? `%${Math.round((dbUser.total_wins / dbUser.total_games) * 100)}` : '%0', icon: '📊' },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={handleCreateRoom}
                className="btn-gold text-base px-6 py-3"
                disabled={!dbUser}
              >
                Oda Oluştur
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('tournament')}
                className="btn-secondary text-base px-6 py-3"
              >
                Turnuvalar
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('leaderboard')}
                className="btn-secondary text-base px-6 py-3"
              >
                Sıralama
              </button>
            </div>

            <Lobby onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} />
          </div>
        )}

        {currentView === 'game' && (
          <div className="animate-slide-up">
            <GameTable roomId={selectedRoomId} onBack={handleBackToLobby} />
          </div>
        )}

        {currentView === 'tournament' && (
          <div className="animate-slide-up">
            <TournamentList onJoinTournament={handleJoinTournament} />
          </div>
        )}

        {currentView === 'leaderboard' && (
          <div className="animate-slide-up">
            <Leaderboard />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-3 bg-black/80 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-xs">
          <p>Harley Games - Telegram Blackjack</p>
        </div>
      </footer>
    </main>
  );
}
