'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface GameEventData {
  game?: unknown;
  rooms?: unknown[];
  tournaments?: unknown[];
  player?: unknown;
  telegramId?: number;
  [key: string]: unknown;
}

type EventHandler = (data: GameEventData) => void;

interface UseGameEventsOptions {
  roomId?: string;
  telegramId?: number;
  onPlayerJoined?: EventHandler;
  onPlayerLeft?: EventHandler;
  onBetPlaced?: EventHandler;
  onCardsDealt?: EventHandler;
  onPlayerHit?: EventHandler;
  onPlayerStand?: EventHandler;
  onPlayerDouble?: EventHandler;
  onDealerTurn?: EventHandler;
  onGameResults?: EventHandler;
  onGameUpdate?: EventHandler;
  onRoomsUpdate?: EventHandler;
  onTournamentsUpdate?: EventHandler;
  onRoomCreated?: EventHandler;
  onTournamentUpdate?: EventHandler;
  onConnected?: EventHandler;
  onError?: (error: Error) => void;
}

export function useGameEvents(options: UseGameEventsOptions) {
  const {
    roomId,
    telegramId,
    onPlayerJoined,
    onPlayerLeft,
    onBetPlaced,
    onCardsDealt,
    onPlayerHit,
    onPlayerStand,
    onPlayerDouble,
    onDealerTurn,
    onGameResults,
    onGameUpdate,
    onRoomsUpdate,
    onTournamentsUpdate,
    onRoomCreated,
    onTournamentUpdate,
    onConnected,
    onError,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Önceki bağlantıyı kapat
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (roomId) params.set('room_id', roomId);
    if (telegramId) params.set('telegram_id', String(telegramId));

    const url = `/api/sse?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = (error) => {
      setIsConnected(false);
      console.error('SSE error:', error);
      onError?.(new Error('SSE connection error'));

      // Yeniden bağlanma mantığı
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    // Event handlers
    eventSource.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('connected');
      onConnected?.(data);
    });

    eventSource.addEventListener('heartbeat', () => {
      setLastEvent('heartbeat');
    });

    eventSource.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('player_joined');
      onPlayerJoined?.(data);
    });

    eventSource.addEventListener('player_left', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('player_left');
      onPlayerLeft?.(data);
    });

    eventSource.addEventListener('bet_placed', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('bet_placed');
      onBetPlaced?.(data);
    });

    eventSource.addEventListener('cards_dealt', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('cards_dealt');
      onCardsDealt?.(data);
    });

    eventSource.addEventListener('player_hit', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('player_hit');
      onPlayerHit?.(data);
    });

    eventSource.addEventListener('player_stand', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('player_stand');
      onPlayerStand?.(data);
    });

    eventSource.addEventListener('player_double_down', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('player_double_down');
      onPlayerDouble?.(data);
    });

    eventSource.addEventListener('dealer_turn', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('dealer_turn');
      onDealerTurn?.(data);
    });

    eventSource.addEventListener('game_results', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('game_results');
      onGameResults?.(data);
    });

    eventSource.addEventListener('game_update', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('game_update');
      onGameUpdate?.(data);
    });

    eventSource.addEventListener('rooms_update', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('rooms_update');
      onRoomsUpdate?.(data);
    });

    eventSource.addEventListener('tournaments_update', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('tournaments_update');
      onTournamentsUpdate?.(data);
    });

    eventSource.addEventListener('room_created', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('room_created');
      onRoomCreated?.(data);
    });

    eventSource.addEventListener('tournament_update', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('tournament_update');
      onTournamentUpdate?.(data);
    });
  }, [
    roomId,
    telegramId,
    onPlayerJoined,
    onPlayerLeft,
    onBetPlaced,
    onCardsDealt,
    onPlayerHit,
    onPlayerStand,
    onPlayerDouble,
    onDealerTurn,
    onGameResults,
    onGameUpdate,
    onRoomsUpdate,
    onTournamentsUpdate,
    onRoomCreated,
    onTournamentUpdate,
    onConnected,
    onError,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    reconnect: connect,
    disconnect,
  };
}

// Lobby için basitleştirilmiş hook
export function useLobbyEvents(options: {
  telegramId?: number;
  onRoomsUpdate?: (rooms: unknown[]) => void;
  onTournamentsUpdate?: (tournaments: unknown[]) => void;
  onRoomCreated?: (room: unknown) => void;
}) {
  return useGameEvents({
    telegramId: options.telegramId,
    onRoomsUpdate: (data) => options.onRoomsUpdate?.(data.rooms || []),
    onTournamentsUpdate: (data) => options.onTournamentsUpdate?.(data.tournaments || []),
    onRoomCreated: (data) => options.onRoomCreated?.(data),
  });
}

// Oyun odası için basitleştirilmiş hook
export function useRoomEvents(options: {
  roomId: string;
  telegramId?: number;
  onGameUpdate?: (game: unknown) => void;
  onPlayerJoined?: (player: unknown) => void;
  onPlayerLeft?: (telegramId: number) => void;
}) {
  return useGameEvents({
    roomId: options.roomId,
    telegramId: options.telegramId,
    onGameUpdate: (data) => options.onGameUpdate?.(data.game),
    onPlayerJoined: (data) => options.onPlayerJoined?.(data.player),
    onPlayerLeft: (data) => options.onPlayerLeft?.(data.telegramId as number),
  });
}
