'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Lobby } from '@/components/Lobby';
import { GameTable } from '@/components/GameTable';
import { Leaderboard } from '@/components/Leaderboard';
import { useUserStore, useUIStore, useRoomStore } from '@/lib/store';
import {
  initTelegramWebApp,
  getTelegramUser,
  isInTelegram,
  hapticFeedback,
} from '@/lib/telegram';

export default function Home() {
  const { currentView, setCurrentView, showNotification, notification, clearNotification, showBonusModal, setShowBonusModal } = useUIStore();
  const { telegramUser, dbUser, isLoading, setTelegramUser, setDbUser, setLoading, setChips } = useUserStore();
  const { setRooms } = useRoomStore();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bonusStatus, setBonusStatus] = useState<{ available: boolean; remaining_hours?: number } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // URL parametrelerini kontrol et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'leaderboard') {
        setCurrentView('leaderboard');
      }
      if (params.get('bonus') === 'true') {
        setShowBonusModal(true);
      }
    }
  }, [setCurrentView, setShowBonusModal]);

  // Telegram WebApp başlat ve kullanıcıyı authenticate et
  useEffect(() => {
    const init = async () => {
      try {
        // Telegram WebApp'i başlat
        initTelegramWebApp();

        // Telegram kullanıcısını al
        const user = getTelegramUser();

        // Telegram dışında açılmışsa hata göster
        if (!user || !isInTelegram()) {
          setAuthError('Bu uygulama sadece Telegram üzerinden açılabilir.');
          setLoading(false);
          setIsInitialized(true);
          return;
        }

        setTelegramUser(user);

        // Backend'e authenticate ol
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '',
            user: {
              ...user,
              photo_url: user.photo_url, // Include photo_url from Telegram
            },
          }),
        });

        const data = await response.json();

        if (data.success && data.user) {
          // Ensure chips is a number
          setDbUser({
            ...data.user,
            chips: Number(data.user.chips),
            photo_url: data.user.photo_url || user.photo_url,
          });
          hapticFeedback('success');

          // Bonus durumunu kontrol et
          checkBonusStatus(data.user.telegram_id);
        } else {
          console.error('Auth failed:', data.error);
          setAuthError('Kimlik doğrulama başarısız. Lütfen tekrar deneyin.');
          setLoading(false);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Init error:', error);
        setAuthError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        setLoading(false);
        setIsInitialized(true);
      }
    };

    init();
  }, [setTelegramUser, setDbUser, setLoading]);

  // Sync user data from server periodically
  const syncUserData = useCallback(async () => {
    if (!dbUser?.telegram_id) return;
    try {
      const response = await fetch(`/api/auth?telegram_id=${dbUser.telegram_id}`);
      const data = await response.json();
      if (data.user) {
        // Only update chips to sync with server
        setChips(Number(data.user.chips));
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [dbUser?.telegram_id, setChips]);

  // Bonus durumunu kontrol et
  const checkBonusStatus = async (telegramId: number) => {
    try {
      const response = await fetch(`/api/bonus?telegram_id=${telegramId}`);
      const data = await response.json();
      setBonusStatus(data);
    } catch (error) {
      console.error('Bonus check error:', error);
    }
  };

  // Bonus al
  const claimBonus = async () => {
    if (!dbUser) return;

    try {
      const response = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: dbUser.telegram_id }),
      });

      const data = await response.json();

      if (data.success) {
        // Use setChips to sync with server value
        setChips(Number(data.new_balance));
        showNotification('success', `${data.amount} chip bonus alındı!`);
        setBonusStatus({ available: false, remaining_hours: 24 });
        hapticFeedback('success');
      } else {
        showNotification('error', data.error || 'Bonus alınamadı');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setShowBonusModal(false);
    }
  };

  // Odaları yükle
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      if (data.rooms) {
        setRooms(data.rooms.map((r: {
          id: string;
          name: string;
          player_count?: string | number;
          max_players?: number;
          min_bet?: number;
          max_bet?: number;
          status?: string;
        }) => ({
          id: r.id,
          name: r.name,
          players: parseInt(String(r.player_count)) || 0,
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
    if (isInitialized && dbUser && currentView === 'lobby') {
      fetchRooms();
      const interval = setInterval(fetchRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, dbUser, currentView, fetchRooms]);

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
      const roomResponse = await fetch(`/api/rooms?id=${roomId}`);
      const roomData = await roomResponse.json();

      if (!roomData.room) {
        showNotification('error', 'Oda bulunamadı');
        return;
      }

      const occupiedSeats = (roomData.room.players || []).map((p: { seat_number: number }) => p.seat_number);

      let availableSeat = -1;
      for (let i = 1; i <= 6; i++) {
        if (!occupiedSeats.includes(i)) {
          availableSeat = i;
          break;
        }
      }

      if (availableSeat === -1) {
        showNotification('error', 'Oda dolu');
        return;
      }

      const response = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          room_id: roomId,
          telegram_id: dbUser.telegram_id,
          seat_number: availableSeat,
        }),
      });

      const data = await response.json();

      if (data.success) {
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

  // Leave room and cleanup
  const handleBackToLobby = async () => {
    if (selectedRoomId && dbUser) {
      try {
        // Leave room via API
        await fetch('/api/rooms', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            room_id: selectedRoomId,
            telegram_id: dbUser.telegram_id,
          }),
        });

        // Sync user data to get updated chips
        await syncUserData();
      } catch (error) {
        console.error('Leave room error:', error);
      }
    }

    setSelectedRoomId(null);
    setCurrentView('lobby');
    hapticFeedback('light');

    // Refresh rooms after leaving
    fetchRooms();
  };

  // Loading screen
  if (isLoading || !isInitialized) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-3 border-amber-500/20" />
            <div className="absolute inset-0 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
          </div>
          <h2 className="text-xl font-bold gold-text mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            HARLEY GAMES
          </h2>
          <p className="text-gray-500 animate-pulse text-xs">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  // Telegram dışında açılmışsa hata göster
  if (authError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Erişim Hatası
          </h2>
          <p className="text-gray-400 text-sm mb-4">{authError}</p>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Telegram'da oynamak için:</p>
            <ol className="text-left text-xs text-gray-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">1.</span>
                <span>Telegram'ı açın</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">2.</span>
                <span>@HarleyGamesBot'u arayın</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">3.</span>
                <span>"Başla" butonuna tıklayın</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-xl animate-slide-down backdrop-blur-lg text-xs ${
            notification.type === 'success' ? 'bg-emerald-500/90 border border-emerald-400/30' :
            notification.type === 'error' ? 'bg-red-500/90 border border-red-400/30' :
            'bg-amber-500/90 border border-amber-400/30'
          }`}
        >
          <p className="text-white font-medium">{notification.message}</p>
        </div>
      )}

      {/* Bonus Modal */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass rounded-xl p-4 max-w-xs w-full animate-slide-up">
            <div className="text-center">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Günlük Bonus
              </h3>

              {bonusStatus?.available ? (
                <>
                  <p className="text-gray-400 text-sm mb-3">1000 chip bonus seni bekliyor!</p>
                  <button
                    type="button"
                    onClick={claimBonus}
                    className="btn-gold px-6 py-2 w-full text-sm"
                  >
                    Bonus Al
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-3">
                    Sonraki bonus: {bonusStatus?.remaining_hours || 24} saat sonra
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBonusModal(false)}
                    className="btn-secondary px-6 py-2 w-full text-sm"
                  >
                    Tamam
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowBonusModal(false)}
                className="mt-2 text-gray-500 text-xs hover:text-white transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <Header
        currentView={currentView}
        userChips={dbUser?.chips || 0}
        userName={dbUser?.first_name || telegramUser?.first_name || ''}
        userAvatar={dbUser?.avatar || '🎭'}
        userPhotoUrl={dbUser?.photo_url || telegramUser?.photo_url}
        onBack={currentView !== 'lobby' ? handleBackToLobby : undefined}
      />

      <div className="px-3 py-3">
        {currentView === 'lobby' && (
          <div className="animate-fade-in">
            {/* Hero Section - Kompakt */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span className="gold-text">HARLEY GAMES</span>
              </h1>
              <p className="text-gray-500 text-xs">
                Blackjack oyna, arkadaşlarınla yarış
              </p>
            </div>

            {/* Stats Cards - 2x2 Grid Kompakt */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="glass rounded-xl p-2 text-center">
                <div className="text-lg mb-0.5">💰</div>
                <div className="text-sm font-bold text-white">{(dbUser?.chips || 0).toLocaleString()}</div>
                <div className="text-[9px] text-gray-500">Bakiye</div>
              </div>
              <div className="glass rounded-xl p-2 text-center">
                <div className="text-lg mb-0.5">🏆</div>
                <div className="text-sm font-bold text-emerald-400">{dbUser?.total_wins || 0}</div>
                <div className="text-[9px] text-gray-500">Kazanılan</div>
              </div>
              <div className="glass rounded-xl p-2 text-center">
                <div className="text-lg mb-0.5">🎲</div>
                <div className="text-sm font-bold text-white">{dbUser?.total_games || 0}</div>
                <div className="text-[9px] text-gray-500">Oyun</div>
              </div>
              <div className="glass rounded-xl p-2 text-center cursor-pointer active:scale-95 transition-transform" onClick={() => setShowBonusModal(true)}>
                <div className="text-lg mb-0.5">🎁</div>
                <div className={`text-sm font-bold ${bonusStatus?.available ? 'text-amber-400' : 'text-gray-500'}`}>
                  {bonusStatus?.available ? '!' : `${bonusStatus?.remaining_hours || '?'}s`}
                </div>
                <div className="text-[9px] text-gray-500">Bonus</div>
              </div>
            </div>

            {/* Action Buttons - Tek Satır */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={!dbUser}
                className="btn-gold flex-1 text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>+</span>
                Oda Oluştur
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('leaderboard')}
                className="btn-secondary text-sm py-2.5 px-4 flex items-center gap-1"
              >
                <span>🏆</span>
              </button>
            </div>

            <Lobby onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} />
          </div>
        )}

        {currentView === 'leaderboard' && (
          <div className="animate-fade-in">
            <Leaderboard />
          </div>
        )}

        {currentView === 'game' && selectedRoomId && (
          <div className="animate-fade-in">
            <GameTable roomId={selectedRoomId} onBack={handleBackToLobby} />
          </div>
        )}
      </div>
    </main>
  );
}
