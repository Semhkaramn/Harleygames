import { create } from 'zustand';
import type { TelegramUser } from './telegram';
import type { Card, Player, Room } from './gameTypes';

// User Store
interface UserState {
  telegramUser: TelegramUser | null;
  dbUser: {
    id: number;
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar: string;
    chips: number;
    total_wins: number;
    total_losses: number;
    total_games: number;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setTelegramUser: (user: TelegramUser | null) => void;
  setDbUser: (user: UserState['dbUser']) => void;
  setLoading: (loading: boolean) => void;
  updateChips: (amount: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  telegramUser: null,
  dbUser: null,
  isLoading: true,
  isAuthenticated: false,
  setTelegramUser: (user) => set({ telegramUser: user }),
  setDbUser: (user) => set({ dbUser: user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  updateChips: (amount) => set((state) => ({
    dbUser: state.dbUser ? { ...state.dbUser, chips: state.dbUser.chips + amount } : null
  })),
  logout: () => set({ telegramUser: null, dbUser: null, isAuthenticated: false }),
}));

// Room Store
interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  isLoading: boolean;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  setLoading: (loading: boolean) => void;
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  isLoading: false,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setLoading: (loading) => set({ isLoading: loading }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === roomId ? { ...r, ...updates } : r),
    currentRoom: state.currentRoom?.id === roomId ? { ...state.currentRoom, ...updates } : state.currentRoom
  })),
  removeRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter((r) => r.id !== roomId),
    currentRoom: state.currentRoom?.id === roomId ? null : state.currentRoom
  })),
}));

// Live Game Store
interface LiveGameState {
  gameId: string | null;
  roomId: string | null;
  status: 'waiting' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'results';
  players: Player[];
  dealer: { cards: Card[]; score: number };
  currentPlayerIndex: number;
  myPlayerId: string | null;
  mySeatNumber: number | null;
  minBet: number;
  maxBet: number;
  timeLeft: number;

  setGame: (game: Partial<LiveGameState>) => void;
  setMyPlayer: (playerId: string, seatNumber: number) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setDealer: (dealer: { cards: Card[]; score: number }) => void;
  setStatus: (status: LiveGameState['status']) => void;
  setTimeLeft: (time: number) => void;
  reset: () => void;
}

const initialGameState = {
  gameId: null,
  roomId: null,
  status: 'waiting' as const,
  players: [],
  dealer: { cards: [], score: 0 },
  currentPlayerIndex: 0,
  myPlayerId: null,
  mySeatNumber: null,
  minBet: 10,
  maxBet: 1000,
  timeLeft: 30,
};

export const useLiveGameStore = create<LiveGameState>((set) => ({
  ...initialGameState,
  setGame: (game) => set((state) => ({ ...state, ...game })),
  setMyPlayer: (playerId, seatNumber) => set({ myPlayerId: playerId, mySeatNumber: seatNumber }),
  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map((p) => p.id === playerId ? { ...p, ...updates } : p)
  })),
  setDealer: (dealer) => set({ dealer }),
  setStatus: (status) => set({ status }),
  setTimeLeft: (time) => set({ timeLeft: time }),
  reset: () => set(initialGameState),
}));

// UI Store - Genişletilmiş
interface UIState {
  currentView: 'lobby' | 'game' | 'leaderboard';
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  showBonusModal: boolean;
  setCurrentView: (view: UIState['currentView']) => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  clearNotification: () => void;
  setShowBonusModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'lobby',
  notification: null,
  showBonusModal: false,
  setCurrentView: (view) => set({ currentView: view }),
  showNotification: (type, message) => set({ notification: { type, message } }),
  clearNotification: () => set({ notification: null }),
  setShowBonusModal: (show) => set({ showBonusModal: show }),
}));
