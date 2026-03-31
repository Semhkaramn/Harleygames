'use client';

import { create } from 'zustand';
import type {
  GameState,
  CurrentUser,
  Room,
  ActiveGame,
  Player,
  Card,
  RoomStatus,
  DBRoom,
  DBRoomPlayer
} from '@/types/game';

// Kart değeri hesapla
const getCardValue = (card: Card): number => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
};

// El değeri hesapla
export const calculateHandValue = (cards: Card[]): number => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    value += getCardValue(card);
    if (card.rank === 'A') aces++;
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
};

// DB Room'u frontend Room'a çevir
const mapDBRoomToRoom = (dbRoom: DBRoom, players: DBRoomPlayer[] = []): Room => ({
  id: dbRoom.id,
  name: dbRoom.name,
  minBet: dbRoom.min_bet,
  maxBet: dbRoom.max_bet,
  maxPlayers: dbRoom.max_players || 6,
  status: dbRoom.status,
  createdBy: dbRoom.created_by,
  playerCount: dbRoom.player_count || players.length,
  players: players.map(p => ({
    id: String(p.id),
    telegramId: p.telegram_id,
    name: p.first_name || p.username || 'Oyuncu',
    avatar: p.photo_url || '',
    balance: p.chips || 0,
    seatNumber: p.seat_number,
    cards: [],
    bet: 0,
    status: 'waiting',
    isCurrentUser: false,
    totalScore: 0,
    isTurn: false,
  })),
});

interface GameStore extends GameState {
  // Auth actions
  setCurrentUser: (user: CurrentUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;

  // Room actions
  setRooms: (rooms: Room[]) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;

  // Game actions
  setActiveGame: (game: ActiveGame | null) => void;
  updateActiveGame: (updates: Partial<ActiveGame>) => void;
  updatePlayer: (telegramId: number, updates: Partial<Player>) => void;

  // View actions
  setView: (view: 'lobby' | 'room') => void;
  setConnected: (value: boolean) => void;

  // API calls
  authenticate: (telegramId: number, initData: string) => Promise<boolean>;
  fetchRooms: () => Promise<void>;
  createRoom: (name: string, minBet: number, maxBet: number) => Promise<string | null>;
  joinRoom: (roomId: string, seatNumber: number) => Promise<boolean>;
  joinRoomAuto: (roomId: string) => Promise<boolean>;
  changeSeat: (newSeatNumber: number) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  setReady: () => Promise<void>;
  placeBet: (amount: number) => Promise<void>;
  hit: () => Promise<void>;
  stand: () => Promise<void>;
  doubleDown: () => Promise<void>;

  // Timers
  countdown: number;
  turnTimer: number;
  decrementCountdown: () => void;
  decrementTurnTimer: () => void;
  setCountdown: (value: number) => void;
  setTurnTimer: (value: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  rooms: [],
  activeGame: null,
  view: 'lobby',
  isConnected: false,
  countdown: 0,
  turnTimer: 15,

  // Auth actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLoading: (value) => set({ isLoading: value }),

  // Room actions
  setRooms: (rooms) => set({ rooms }),
  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r)
  })),
  addRoom: (room) => set((state) => ({
    rooms: [room, ...state.rooms]
  })),
  removeRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter(r => r.id !== roomId)
  })),

  // Game actions
  setActiveGame: (game) => set({ activeGame: game }),
  updateActiveGame: (updates) => set((state) => ({
    activeGame: state.activeGame ? { ...state.activeGame, ...updates } : null
  })),
  updatePlayer: (telegramId, updates) => set((state) => {
    if (!state.activeGame) return {};
    return {
      activeGame: {
        ...state.activeGame,
        players: state.activeGame.players.map(p =>
          p.telegramId === telegramId ? { ...p, ...updates } : p
        )
      }
    };
  }),

  // View actions
  setView: (view) => set({ view }),
  setConnected: (value) => set({ isConnected: value }),

  // Timer actions
  setCountdown: (value) => set({ countdown: value }),
  setTurnTimer: (value) => set({ turnTimer: value }),
  decrementCountdown: () => set((state) => ({ countdown: Math.max(0, state.countdown - 1) })),
  decrementTurnTimer: () => set((state) => ({ turnTimer: Math.max(0, state.turnTimer - 1) })),

  // API: Authenticate user
  authenticate: async (telegramId, initData) => {
    try {
      set({ isLoading: true });

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          init_data: initData
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();

      if (data.user) {
        set({
          currentUser: {
            id: data.user.id,
            telegramId: data.user.telegram_id,
            name: data.user.first_name || data.user.username || 'Oyuncu',
            username: data.user.username,
            avatar: data.user.photo_url || '',
            balance: data.user.chips,
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Auth error:', error);
      set({ isLoading: false });
      return false;
    }
  },

  // API: Fetch rooms
  fetchRooms: async () => {
    try {
      const response = await fetch('/api/rooms');
      if (!response.ok) throw new Error('Failed to fetch rooms');

      const data = await response.json();
      const rooms = (data.rooms || []).map((r: DBRoom & { players?: DBRoomPlayer[] }) =>
        mapDBRoomToRoom(r, r.players || [])
      );
      set({ rooms });
    } catch (error) {
      console.error('Fetch rooms error:', error);
    }
  },

  // API: Create room
  createRoom: async (name, minBet, maxBet) => {
    const { currentUser } = get();
    if (!currentUser) return null;

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          min_bet: minBet,
          max_bet: maxBet,
          telegram_id: currentUser.telegramId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create room');

      const data = await response.json();
      const roomId = data.room?.id;

      if (roomId) {
        // Oda oluşturuldu, şimdi oda detaylarını al ve odaya geç
        const roomResponse = await fetch(`/api/rooms?id=${roomId}`);
        if (roomResponse.ok) {
          const roomData = await roomResponse.json();
          const room = roomData.room;

          // ActiveGame oluştur
          const players: Player[] = (room.players || []).map((p: DBRoomPlayer) => ({
            id: String(p.id),
            telegramId: p.telegram_id,
            name: p.first_name || p.username || 'Oyuncu',
            avatar: p.photo_url || '',
            balance: p.chips || 0,
            seatNumber: p.seat_number,
            cards: [],
            bet: 0,
            status: 'waiting' as const,
            isCurrentUser: p.telegram_id === currentUser.telegramId,
            totalScore: 0,
            isTurn: false,
          }));

          set({
            activeGame: {
              id: 0,
              roomId: room.id,
              roomName: room.name,
              status: room.status || 'waiting',
              minBet: room.min_bet,
              maxBet: room.max_bet,
              players,
              dealerCards: [],
              dealerScore: 0,
              currentPlayerIndex: -1,
              countdown: 0,
              turnTimer: 15,
              bettingEndTime: null,
            },
            view: 'room',
          });
        }
      }

      return roomId || null;
    } catch (error) {
      console.error('Create room error:', error);
      return null;
    }
  },

  // API: Join room
  joinRoom: async (roomId, seatNumber) => {
    const { currentUser } = get();
    if (!currentUser) return false;

    try {
      const response = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          room_id: roomId,
          telegram_id: currentUser.telegramId,
          seat_number: seatNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Join room error:', error);
        return false;
      }

      // Oda bilgilerini al
      const roomResponse = await fetch(`/api/rooms?id=${roomId}`);
      if (!roomResponse.ok) return false;

      const roomData = await roomResponse.json();
      const room = roomData.room;

      // ActiveGame oluştur
      const players: Player[] = (room.players || []).map((p: DBRoomPlayer) => ({
        id: String(p.id),
        telegramId: p.telegram_id,
        name: p.first_name || p.username || 'Oyuncu',
        avatar: p.photo_url || '',
        balance: p.chips || 0,
        seatNumber: p.seat_number,
        cards: [],
        bet: 0,
        status: 'waiting' as const,
        isCurrentUser: p.telegram_id === currentUser.telegramId,
        totalScore: 0,
        isTurn: false,
      }));

      set({
        activeGame: {
          id: 0,
          roomId: room.id,
          roomName: room.name,
          status: room.status || 'waiting',
          minBet: room.min_bet,
          maxBet: room.max_bet,
          players,
          dealerCards: [],
          dealerScore: 0,
          currentPlayerIndex: -1,
          countdown: 0,
          turnTimer: 15,
          bettingEndTime: null,
        },
        view: 'room',
      });

      return true;
    } catch (error) {
      console.error('Join room error:', error);
      return false;
    }
  },

  // API: Join room automatically (first available seat)
  joinRoomAuto: async (roomId) => {
    const { currentUser, rooms } = get();
    if (!currentUser) return false;

    // Find the room to get occupied seats
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;

    // Find first available seat (1-6)
    const occupiedSeats = room.players.map(p => p.seatNumber);
    let firstAvailableSeat = null;
    for (let seat = 1; seat <= 6; seat++) {
      if (!occupiedSeats.includes(seat)) {
        firstAvailableSeat = seat;
        break;
      }
    }

    if (!firstAvailableSeat) {
      console.error('No available seats');
      return false;
    }

    // Use existing joinRoom with the first available seat
    return get().joinRoom(roomId, firstAvailableSeat);
  },

  // API: Change seat
  changeSeat: async (newSeatNumber) => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return false;

    try {
      const response = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_seat',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
          seat_number: newSeatNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Change seat error:', error);
        return false;
      }

      // Update local state
      set((state) => {
        if (!state.activeGame) return {};
        return {
          activeGame: {
            ...state.activeGame,
            players: state.activeGame.players.map(p =>
              p.telegramId === currentUser.telegramId
                ? { ...p, seatNumber: newSeatNumber }
                : p
            ),
          },
        };
      });

      return true;
    } catch (error) {
      console.error('Change seat error:', error);
      return false;
    }
  },

  // API: Leave room
  leaveRoom: async () => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return;

    try {
      await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
        }),
      });
    } catch (error) {
      console.error('Leave room error:', error);
    }

    set({
      activeGame: null,
      view: 'lobby',
    });
  },

  // API: Set ready
  setReady: async () => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return;

    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ready',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
        }),
      });
    } catch (error) {
      console.error('Set ready error:', error);
    }
  },

  // API: Place bet
  placeBet: async (amount) => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return;

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bet',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
          amount,
        }),
      });

      if (response.ok) {
        // Bakiyeyi güncelle
        set((state) => ({
          currentUser: state.currentUser ? {
            ...state.currentUser,
            balance: state.currentUser.balance - amount
          } : null
        }));
      }
    } catch (error) {
      console.error('Place bet error:', error);
    }
  },

  // API: Hit
  hit: async () => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return;

    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hit',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
        }),
      });
    } catch (error) {
      console.error('Hit error:', error);
    }
  },

  // API: Stand
  stand: async () => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return;

    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stand',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
        }),
      });
    } catch (error) {
      console.error('Stand error:', error);
    }
  },

  // API: Double down
  doubleDown: async () => {
    const { currentUser, activeGame } = get();
    if (!currentUser || !activeGame) return;

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'double',
          room_id: activeGame.roomId,
          telegram_id: currentUser.telegramId,
        }),
      });

      if (response.ok) {
        // Ekstra bahis için bakiyeyi güncelle
        const myPlayer = activeGame.players.find(p => p.isCurrentUser);
        if (myPlayer) {
          set((state) => ({
            currentUser: state.currentUser ? {
              ...state.currentUser,
              balance: state.currentUser.balance - myPlayer.bet
            } : null
          }));
        }
      }
    } catch (error) {
      console.error('Double down error:', error);
    }
  },
}));
