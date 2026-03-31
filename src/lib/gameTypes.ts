// Card Types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const isRedSuit = (suit: Suit): boolean => suit === 'hearts' || suit === 'diamonds';

// Player Types
export interface Player {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  bet: number;
  cards: Card[];
  isActive: boolean;
  isTurn: boolean;
  status: 'waiting' | 'playing' | 'stand' | 'bust' | 'blackjack' | 'win' | 'lose' | 'push';
  seatNumber: number;
}

// Game Types
export type GameStatus = 'waiting' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'results';

export interface GameState {
  id: string;
  status: GameStatus;
  players: Player[];
  dealer: {
    cards: Card[];
    score: number;
  };
  deck: Card[];
  currentPlayerIndex: number;
  minBet: number;
  maxBet: number;
  timeLeft: number;
}

// Room Types
export interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  status: 'waiting' | 'playing';
}

// Tournament Types
export interface Tournament {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  players: number;
  maxPlayers: number;
  status: 'registering' | 'running' | 'finished';
  startTime: Date;
  rounds: number;
  currentRound: number;
}

// Utility Functions
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: true });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCardValue(card: Card): number {
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

export function calculateHandValue(cards: Card[]): number {
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
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards) === 21;
}

export function isBust(cards: Card[]): boolean {
  return calculateHandValue(cards) > 21;
}

// Avatar options
export const AVATARS = [
  '🎭', '🎪', '🎰', '🃏', '👑', '💎',
  '🦁', '🐺', '🦊', '🐯', '🦅', '🐉',
];

// Generate random player name
export function generatePlayerName(): string {
  const adjectives = ['Lucky', 'Wild', 'Royal', 'Golden', 'Silver', 'Diamond', 'Ace', 'King', 'Queen'];
  const nouns = ['Player', 'Gambler', 'Shark', 'Wolf', 'Tiger', 'Eagle', 'Phoenix', 'Dragon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}
