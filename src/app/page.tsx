'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore, calculateHandValue } from '@/store/gameStore';
import { LobbyView } from '@/components/game/LobbyView';
import { TableView } from '@/components/game/TableView';
import { getTelegramUser, getTelegramWebApp, initTelegramWebApp } from '@/lib/telegram';
import type { Player, Card, RoomStatus } from '@/types/game';

export default function Home() {
  const {
    view,
    currentUser,
    isAuthenticated,
    isLoading,
    activeGame,
    setCurrentUser,
    setAuthenticated,
    setLoading,
    setRooms,
    setActiveGame,
    updateActiveGame,
    setConnected,
    setCountdown,
    setTurnTimer,
    fetchRooms,
  } = useGameStore();

  const eventSourceRef = useRef<EventSource | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Telegram WebApp başlat ve kullanıcıyı al
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);

      // Telegram WebApp'i başlat
      const webApp = initTelegramWebApp();
      const telegramUser = getTelegramUser();

      if (telegramUser && webApp) {
        // Gerçek Telegram kullanıcısı
        try {
          const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: telegramUser.id,
              username: telegramUser.username,
              first_name: telegramUser.first_name,
              last_name: telegramUser.last_name,
              photo_url: telegramUser.photo_url,
              init_data: webApp.initData,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setCurrentUser({
              id: data.user.id,
              telegramId: data.user.telegram_id,
              name: data.user.first_name || data.user.username || 'Oyuncu',
              username: data.user.username,
              avatar: data.user.photo_url || '',
              balance: data.user.chips,
            });
            setAuthenticated(true);
          } else {
            setAuthError('Giriş yapılamadı');
          }
        } catch (error) {
          console.error('Auth error:', error);
          setAuthError('Bağlantı hatası');
        }
      } else {
        // Test modu - Telegram dışında çalışıyor
        // Rastgele test kullanıcısı oluştur
        const testTelegramId = Math.floor(100000000 + Math.random() * 900000000);

        try {
          const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: testTelegramId,
              username: `test_user_${testTelegramId}`,
              first_name: 'Test',
              last_name: 'User',
              init_data: '',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setCurrentUser({
              id: data.user.id,
              telegramId: data.user.telegram_id,
              name: data.user.first_name || 'Test User',
              username: data.user.username,
              avatar: '',
              balance: data.user.chips,
            });
            setAuthenticated(true);
          }
        } catch (error) {
          console.error('Test auth error:', error);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, [setCurrentUser, setAuthenticated, setLoading]);

  // SSE bağlantısı
  const connectSSE = useCallback(() => {
    if (!currentUser) return;

    // Önceki bağlantıyı kapat
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const roomId = activeGame?.roomId || 'lobby';
    const url = `/api/sse?room_id=${roomId}&telegram_id=${currentUser.telegramId}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      console.log('SSE connected to:', roomId);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnected(false);

      // 3 saniye sonra yeniden bağlan
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          connectSSE();
        }
      }, 3000);
    };

    // Connected event
    eventSource.addEventListener('connected', (e) => {
      console.log('SSE connected event:', JSON.parse(e.data));
    });

    // Heartbeat
    eventSource.addEventListener('heartbeat', () => {
      // Bağlantı canlı
    });

    // Rooms update (lobby)
    eventSource.addEventListener('rooms_update', (e) => {
      const data = JSON.parse(e.data);
      if (data.rooms) {
        const rooms = data.rooms.map((r: any) => ({
          id: r.id,
          name: r.name,
          minBet: r.min_bet,
          maxBet: r.max_bet,
          maxPlayers: r.max_players || 6,
          status: r.status,
          createdBy: r.created_by,
          playerCount: parseInt(r.player_count) || 0,
          players: [],
        }));
        setRooms(rooms);
      }
    });

    // Game update (room)
    eventSource.addEventListener('game_update', (e) => {
      const data = JSON.parse(e.data);
      if (data.game && activeGame) {
        const game = data.game;

        // Oyuncuları map et
        const players: Player[] = (game.players || []).map((p: any) => ({
          id: String(p.id),
          telegramId: p.telegramId || p.telegram_id,
          name: p.name || p.first_name || 'Oyuncu',
          avatar: p.avatar || p.photo_url || '',
          balance: p.balance || p.chips || 0,
          seatNumber: p.seatNumber || p.seat_number,
          cards: p.cards || [],
          bet: p.bet || 0,
          status: p.status || 'waiting',
          isCurrentUser: (p.telegramId || p.telegram_id) === currentUser.telegramId,
          totalScore: p.cards ? calculateHandValue(p.cards) : 0,
          isTurn: p.isTurn || p.is_turn || false,
        }));

        updateActiveGame({
          id: game.id,
          status: game.status,
          players,
          dealerCards: game.dealer_cards || [],
          dealerScore: game.dealer_score || 0,
          currentPlayerIndex: game.current_player_index ?? -1,
          bettingEndTime: game.betting_end_time,
        });

        // Countdown ve timer güncelle
        if (data.countdown !== undefined) {
          setCountdown(data.countdown);
        }
        if (data.turnTimer !== undefined) {
          setTurnTimer(data.turnTimer);
        }
      }
    });

    // Player joined
    eventSource.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data);
      console.log('Player joined:', data);
      // Game update ile gelecek
    });

    // Player left
    eventSource.addEventListener('player_left', (e) => {
      const data = JSON.parse(e.data);
      console.log('Player left:', data);
      // Game update ile gelecek
    });

    // Game results
    eventSource.addEventListener('game_results', (e) => {
      const data = JSON.parse(e.data);
      console.log('Game results:', data);

      if (data.results && activeGame) {
        // Bakiyeyi güncelle
        const myResult = data.results.find((r: any) =>
          r.telegramId === currentUser.telegramId || r.telegram_id === currentUser.telegramId
        );

        if (myResult && myResult.winAmount !== undefined) {
          setCurrentUser({
            ...currentUser,
            balance: currentUser.balance + myResult.winAmount,
          });
        }
      }
    });

    // Room created
    eventSource.addEventListener('room_created', (e) => {
      const data = JSON.parse(e.data);
      console.log('Room created:', data);
      // Rooms update ile gelecek
    });

    return () => {
      eventSource.close();
    };
  }, [currentUser, activeGame?.roomId, setConnected, setRooms, updateActiveGame, setCountdown, setTurnTimer, setCurrentUser]);

  // SSE bağlantısını yönet
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      connectSSE();

      // Başlangıçta odaları çek
      if (view === 'lobby') {
        fetchRooms();
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, currentUser?.telegramId, activeGame?.roomId, view, connectSSE, fetchRooms]);

  // Yükleniyor
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Auth hatası
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
            type="button"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Auth olmamış
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg">Lütfen Telegram üzerinden giriş yapın</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {view === 'lobby' ? <LobbyView /> : <TableView />}
    </main>
  );
}
