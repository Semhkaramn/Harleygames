export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PlayerStatus =
  | 'waiting'      // Masada oturuyor, hazır değil
  | 'ready'        // Hazır oldu
  | 'betting'      // Bet seçiyor
  | 'playing'      // Sırası geldi, oynuyor
  | 'stand'        // Stand dedi
  | 'bust'         // 21'i geçti
  | 'blackjack'    // Blackjack yaptı
  | 'won'          // Kazandı
  | 'lost'         // Kaybetti
  | 'push'         // Berabere
  | 'disconnected' // Bağlantı koptu
  | 'spectating';  // İzliyor (bet vermedi)

export interface Player {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  seatIndex: number; // 0-4 arası koltuk
  cards: Card[];
  bet: number;
  status: PlayerStatus;
  isCurrentUser: boolean;
  totalScore: number;
  hasInsurance: boolean;
}

export type TableStatus =
  | 'waiting'      // Oyuncu bekleniyor
  | 'ready_check'  // Herkes hazır mı kontrol
  | 'countdown'    // Geri sayım
  | 'betting'      // Bet alma
  | 'dealing'      // Kart dağıtımı
  | 'playing'      // Oyun devam ediyor
  | 'dealer_turn'  // Krupiye oynuyor
  | 'results'      // Sonuçlar gösteriliyor
  | 'between_rounds'; // Eller arası

export interface Table {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  players: Player[];
  status: TableStatus;
  dealerCards: Card[];
  dealerScore: number;
  currentPlayerIndex: number; // Sırası gelen oyuncu
  countdown: number;
  turnTimer: number;
  roundNumber: number;
}

export interface GameState {
  // Kullanıcı
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    balance: number;
  };

  // Lobideki masalar
  tables: Table[];

  // Aktif masa (oyundayken)
  activeTable: Table | null;

  // UI durumu
  view: 'lobby' | 'table';

  // Actions
  setView: (view: 'lobby' | 'table') => void;
  joinTable: (tableId: string, seatIndex: number) => void;
  leaveTable: () => void;
  setReady: () => void;
  placeBet: (amount: number) => void;
  hit: () => void;
  stand: () => void;
  doubleDown: () => void;

  // Game loop
  startCountdown: () => void;
  startBetting: () => void;
  dealCards: () => void;
  nextPlayer: () => void;
  dealerPlay: () => void;
  showResults: () => void;
  resetForNewRound: () => void;

  // Timer
  decrementCountdown: () => void;
  decrementTurnTimer: () => void;

  // Bot actions
  simulateBotActions: () => void;
}
