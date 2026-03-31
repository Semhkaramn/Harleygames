'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Lobby } from '@/components/Lobby';
import { GameTable } from '@/components/GameTable';
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
      const interval = setInterval(fetchRooms, 5000);
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
      const response = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          room_id: roomId,
          telegram_id: dbUser.telegram_id,
          seat_number: 0,
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
          name: `${dbUser.first_name || 'Oyuncu'}'nin Odası`,
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

  const handleBackToLobby = () => {
    setSelectedRoomId(null);
    setCurrentView('lobby');
    hapticFeedback('light');
  };

  // Loading screen
  if (isLoading || !isInitialized) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-amber-500/30 to-transparent animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold gold-text mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY GAMES
          </h2>
          <p className="text-gray-500 animate-pulse text-sm">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl animate-slide-down backdrop-blur-lg ${
            notification.type === 'success' ? 'bg-emerald-500/90 border border-emerald-400/30' :
            notification.type === 'error' ? 'bg-red-500/90 border border-red-400/30' :
            'bg-amber-500/90 border border-amber-400/30'
          }`}
        >
          <p className="text-white font-medium text-sm">{notification.message}</p>
        </div>
      )}

      <Header
        currentView={currentView}
        userChips={dbUser?.chips || 0}
        userName={dbUser?.first_name || telegramUser?.first_name || ''}
        userAvatar={dbUser?.avatar || '🎭'}
        onBack={currentView === 'game' ? handleBackToLobby : undefined}
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {currentView === 'lobby' && (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span className="gold-text">HARLEY GAMES</span>
              </h1>
              <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
                Telegram'da Blackjack oyna, arkadaşlarınla yarış
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="glass rounded-2xl p-5 text-center hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-2xl font-bold text-white">{(dbUser?.chips || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Bakiye</div>
              </div>
              <div className="glass rounded-2xl p-5 text-center hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-2xl font-bold text-emerald-400">{dbUser?.total_wins || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Kazanılan</div>
              </div>
              <div className="glass rounded-2xl p-5 text-center hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">🎲</div>
                <div className="text-2xl font-bold text-white">{dbUser?.total_games || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Toplam Oyun</div>
              </div>
              <div className="glass rounded-2xl p-5 text-center hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-amber-400">
                  {dbUser?.total_games ? `%${Math.round((dbUser.total_wins / dbUser.total_games) * 100)}` : '%0'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Başarı Oranı</div>
              </div>
            </div>

            {/* Create Room Button */}
            <div className="flex justify-center mb-8">
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={!dbUser}
                className="btn-gold text-lg px-10 py-4 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">+</span>
                Yeni Oda Oluştur
              </button>
            </div>

            {!dbUser && (
              <p className="text-center text-amber-500/80 text-sm mb-6">
                Telegram üzerinden açarak giriş yapabilirsiniz
              </p>
            )}

            <Lobby onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} />
          </div>
        )}

        {currentView === 'game' && (
          <div className="animate-fade-in">
            <GameTable roomId={selectedRoomId} onBack={handleBackToLobby} />
          </div>
        )}
      </div>
    </main>
  );
}
