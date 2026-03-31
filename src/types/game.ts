// Veritabanı modelleriyle uyumlu tipler

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PlayerStatus =
  | 'waiting'
  | 'ready'
  | 'betting'
  | 'playing'
  | 'stand'
  | 'bust'
  | 'blackjack'
  | 'won'
  | 'lost'
  | 'push'
  | 'disconnected'
  | 'spectating';

export type RoomStatus = 'waiting' | 'countdown' | 'betting' | 'dealing' | 'playing' | 'dealer_turn' | 'results';

// Veritabanından gelen kullanıcı
export interface DBUser {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar: string;
  photo_url: string | null;
  chips: number;
  total_wins: number;
  total_losses: number;
  total_games: number;
  created_at: string;
  updated_at: string;
}

// Veritabanından gelen oda
export interface DBRoom {
  id: string;
  name: string;
  min_bet: number;
  max_bet: number;
  max_players: number;
  status: RoomStatus;
  created_by: number;
  created_at: string;
  player_count?: number;
}

// Veritabanından gelen oyun
export interface DBGame {
  id: number;
  room_id: string;
  status: RoomStatus;
  dealer_cards: Card[];
  dealer_score: number;
  deck: Card[];
  current_player_index: number;
  betting_end_time: number | null;
  created_at: string;
  ended_at: string | null;
}

// Veritabanından gelen oyuncu
export interface DBGamePlayer {
  id: number;
  game_id: number;
  user_id: number;
  telegram_id: number;
  seat_number: number;
  bet: number;
  cards: Card[];
  status: PlayerStatus;
  is_turn: boolean;
  created_at: string;
  // JOIN ile gelen user bilgileri
  username?: string;
  first_name?: string;
  avatar?: string;
  photo_url?: string;
  chips?: number;
}

// Oda oyuncusu (henüz oyun başlamadan)
export interface DBRoomPlayer {
  id: number;
  room_id: string;
  telegram_id: number;
  seat_number: number;
  joined_at: string;
  // JOIN ile gelen user bilgileri
  username?: string;
  first_name?: string;
  avatar?: string;
  photo_url?: string;
  chips?: number;
}

// Frontend'de kullanılan player modeli
export interface Player {
  id: string;
  telegramId: number;
  name: string;
  avatar: string; // Telegram photo_url veya emoji fallback
  balance: number;
  seatNumber: number;
  cards: Card[];
  bet: number;
  status: PlayerStatus;
  isCurrentUser: boolean;
  totalScore: number;
  isTurn: boolean;
}

// Frontend'de kullanılan room modeli
export interface Room {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  status: RoomStatus;
  createdBy: number;
  playerCount: number;
  players: Player[];
}

// Aktif oyun state'i
export interface ActiveGame {
  id: number;
  roomId: string;
  roomName: string;
  status: RoomStatus;
  minBet: number;
  maxBet: number;
  players: Player[];
  dealerCards: Card[];
  dealerScore: number;
  currentPlayerIndex: number;
  countdown: number;
  turnTimer: number;
  bettingEndTime: number | null;
}

// Mevcut kullanıcı
export interface CurrentUser {
  id: number;
  telegramId: number;
  name: string;
  username: string | null;
  avatar: string;
  balance: number;
}

// Store state
export interface GameState {
  // Kullanıcı
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Lobby
  rooms: Room[];

  // Aktif oyun
  activeGame: ActiveGame | null;

  // View
  view: 'lobby' | 'room';

  // SSE connection
  isConnected: boolean;
}

// SSE Event tipleri
export interface SSEGameUpdate {
  game: {
    id: number;
    room_id: string;
    status: RoomStatus;
    dealer_cards: Card[];
    dealer_score: number;
    current_player_index: number;
    betting_end_time: number | null;
    players: Array<{
      id: string;
      telegramId: number;
      name: string;
      avatar: string;
      seatNumber: number;
      bet: number;
      cards: Card[];
      status: PlayerStatus;
      isTurn: boolean;
      balance?: number;
    }>;
  };
  countdown?: number;
  turnTimer?: number;
}

export interface SSERoomsUpdate {
  rooms: DBRoom[];
}

export interface SSEPlayerJoined {
  player: DBRoomPlayer;
  roomId: string;
}

export interface SSEPlayerLeft {
  telegramId: number;
  roomId: string;
}
