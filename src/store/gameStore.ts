'use client';

import { create } from 'zustand';
import type { Card, GameState, Player, PlayerStatus, Rank, Suit, Table, TableStatus } from '@/types/game';

// Kart destesi oluştur
const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, faceUp: true });
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

// Kart değeri hesapla
const getCardValue = (card: Card): number => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
};

// El değeri hesapla
const calculateHandValue = (cards: Card[]): number => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    value += getCardValue(card);
    if (card.rank === 'A') aces++;
  }

  // As'ları 1 olarak say eğer 21'i geçiyorsa
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
};

// Bot isimleri ve avatarları
const botNames = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Ali', 'Zeynep', 'Can', 'Elif'];
const botAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace',
];

// Rastgele bot oluştur
const createBot = (seatIndex: number): Player => {
  const nameIndex = Math.floor(Math.random() * botNames.length);
  return {
    id: `bot-${Date.now()}-${Math.random()}`,
    name: botNames[nameIndex],
    avatar: botAvatars[nameIndex],
    balance: 1000 + Math.floor(Math.random() * 4000),
    seatIndex,
    cards: [],
    bet: 0,
    status: 'ready',
    isCurrentUser: false,
    totalScore: 0,
    hasInsurance: false,
  };
};

// Başlangıç masaları - BOŞ OLACAK (bot yok)
const createInitialTables = (): Table[] => {
  const tables: Table[] = [];

  for (let i = 1; i <= 6; i++) {
    tables.push({
      id: `table-${i}`,
      name: `Masa ${i}`,
      minBet: i <= 2 ? 10 : i <= 4 ? 50 : 100,
      maxBet: i <= 2 ? 500 : i <= 4 ? 2000 : 5000,
      maxPlayers: 5,
      players: [], // Boş başla - bot yok
      status: 'waiting',
      dealerCards: [],
      dealerScore: 0,
      currentPlayerIndex: -1,
      countdown: 0,
      turnTimer: 15,
      roundNumber: 0,
    });
  }

  return tables;
};

let deck: Card[] = createDeck();

const drawCard = (faceUp = true): Card => {
  if (deck.length < 10) {
    deck = createDeck();
  }
  const card = deck.pop()!;
  card.faceUp = faceUp;
  return card;
};

export const useGameStore = create<GameState>((set, get) => ({
  currentUser: {
    id: 'user-1',
    name: 'Sen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Player',
    balance: 2010,
  },

  tables: createInitialTables(),
  activeTable: null,
  view: 'lobby',

  setView: (view) => set({ view }),

  joinTable: (tableId, seatIndex) => {
    const { tables, currentUser } = get();
    const table = tables.find(t => t.id === tableId);

    if (!table) return;
    if (table.players.some(p => p.seatIndex === seatIndex)) return;
    if (table.players.length >= table.maxPlayers) return;

    const newPlayer: Player = {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      balance: currentUser.balance,
      seatIndex,
      cards: [],
      bet: 0,
      status: 'waiting',
      isCurrentUser: true,
      totalScore: 0,
      hasInsurance: false,
    };

    const updatedTable: Table = {
      ...table,
      players: [...table.players, newPlayer].sort((a, b) => a.seatIndex - b.seatIndex),
    };

    set({
      activeTable: updatedTable,
      view: 'table',
      tables: tables.map(t => t.id === tableId ? updatedTable : t),
    });
  },

  leaveTable: () => {
    const { activeTable, tables, currentUser } = get();
    if (!activeTable) return;

    // Aktif oyundaysa çıkamaz, disconnected olarak işaretle
    // Status tutarsızlığı düzeltildi: 'dealer-turn' yerine 'dealer_turn' kullanılıyor
    if (['dealing', 'playing', 'dealer_turn', 'dealer-turn'].includes(activeTable.status)) {
      const updatedPlayers = activeTable.players.map(p =>
        p.isCurrentUser ? { ...p, status: 'disconnected' as PlayerStatus } : p
      );

      const updatedTable = { ...activeTable, players: updatedPlayers };

      set({
        activeTable: null,
        view: 'lobby',
        tables: tables.map(t => t.id === activeTable.id ? updatedTable : t),
      });
      return;
    }

    // Oyun dışındaysa tamamen çık
    const updatedPlayers = activeTable.players.filter(p => !p.isCurrentUser);
    const updatedTable = { ...activeTable, players: updatedPlayers };

    set({
      activeTable: null,
      view: 'lobby',
      tables: tables.map(t => t.id === activeTable.id ? updatedTable : t),
    });
  },

  setReady: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const updatedPlayers = activeTable.players.map(p =>
      p.isCurrentUser ? { ...p, status: 'ready' as PlayerStatus } : p
    );

    const updatedTable = { ...activeTable, players: updatedPlayers };

    // Herkes hazır mı kontrol et
    const allReady = updatedPlayers.every(p => p.status === 'ready');

    if (allReady && updatedPlayers.length >= 1) {
      updatedTable.status = 'countdown';
      updatedTable.countdown = 5;
    }

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  placeBet: (amount) => {
    const { activeTable, currentUser } = get();
    if (!activeTable) return;
    if (amount > currentUser.balance) return;
    if (amount < activeTable.minBet || amount > activeTable.maxBet) return;

    const updatedPlayers = activeTable.players.map(p =>
      p.isCurrentUser ? { ...p, bet: amount, status: 'ready' as PlayerStatus } : p
    );

    const updatedTable = { ...activeTable, players: updatedPlayers };

    set({
      activeTable: updatedTable,
      currentUser: { ...currentUser, balance: currentUser.balance - amount },
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  hit: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const currentPlayer = activeTable.players[activeTable.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isCurrentUser) return;

    const newCard = drawCard();
    const newCards = [...currentPlayer.cards, newCard];
    const newScore = calculateHandValue(newCards);

    let newStatus: PlayerStatus = 'playing';
    if (newScore > 21) newStatus = 'bust';
    else if (newScore === 21) newStatus = 'stand';

    const updatedPlayers = activeTable.players.map((p, i) =>
      i === activeTable.currentPlayerIndex
        ? { ...p, cards: newCards, totalScore: newScore, status: newStatus }
        : p
    );

    const updatedTable = { ...activeTable, players: updatedPlayers };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });

    // Bust veya 21 olduysa sıradaki oyuncuya geç
    if (newStatus !== 'playing') {
      setTimeout(() => get().nextPlayer(), 500);
    }
  },

  stand: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const updatedPlayers = activeTable.players.map((p, i) =>
      i === activeTable.currentPlayerIndex
        ? { ...p, status: 'stand' as PlayerStatus }
        : p
    );

    const updatedTable = { ...activeTable, players: updatedPlayers };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });

    setTimeout(() => get().nextPlayer(), 300);
  },

  doubleDown: () => {
    const { activeTable, currentUser } = get();
    if (!activeTable) return;

    const currentPlayer = activeTable.players[activeTable.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isCurrentUser) return;
    if (currentPlayer.bet > currentUser.balance) return;

    // Double down için 2 kart kontrolü eklendi
    if (currentPlayer.cards.length !== 2) return;

    // Blackjack ile double down yapılamaz kontrolü eklendi
    const currentScore = calculateHandValue(currentPlayer.cards);
    if (currentScore === 21 && currentPlayer.cards.length === 2) return;

    const newCard = drawCard();
    const newCards = [...currentPlayer.cards, newCard];
    const newScore = calculateHandValue(newCards);
    const newBet = currentPlayer.bet * 2;

    let newStatus: PlayerStatus = 'stand';
    if (newScore > 21) newStatus = 'bust';

    const updatedPlayers = activeTable.players.map((p, i) =>
      i === activeTable.currentPlayerIndex
        ? { ...p, cards: newCards, totalScore: newScore, bet: newBet, status: newStatus }
        : p
    );

    const updatedTable = { ...activeTable, players: updatedPlayers };

    set({
      activeTable: updatedTable,
      currentUser: { ...currentUser, balance: currentUser.balance - currentPlayer.bet },
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });

    setTimeout(() => get().nextPlayer(), 500);
  },

  startCountdown: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const updatedTable = { ...activeTable, status: 'countdown' as TableStatus, countdown: 5 };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  startBetting: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    // Oyuncuları betting moduna geçir ve botlar için otomatik bahis koy
    const updatedPlayers = activeTable.players.map(p => {
      if (!p.isCurrentUser) {
        // Bot için rastgele bahis belirle - BAKİYE KONTROLÜ EKLENDİ
        const minBet = activeTable.minBet;
        // Bakiye yetersizse bot bahis koyamaz
        if (p.balance < minBet) {
          return {
            ...p,
            status: 'spectating' as PlayerStatus,
            cards: [],
            totalScore: 0,
            bet: 0,
          };
        }
        const maxBet = Math.min(activeTable.maxBet, p.balance);
        const betOptions = [minBet, minBet * 2, minBet * 5, Math.floor(maxBet / 2)].filter(b => b <= maxBet && b >= minBet && b <= p.balance);
        const randomBet = betOptions[Math.floor(Math.random() * betOptions.length)] || minBet;

        return {
          ...p,
          status: 'ready' as PlayerStatus,
          cards: [],
          totalScore: 0,
          bet: randomBet,
          balance: p.balance - randomBet,
        };
      }
      return {
        ...p,
        status: 'betting' as PlayerStatus,
        cards: [],
        totalScore: 0,
      };
    });

    const updatedTable: Table = {
      ...activeTable,
      status: 'betting',
      countdown: 10,
      players: updatedPlayers,
      dealerCards: [],
      dealerScore: 0,
    };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  dealCards: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    deck = createDeck(); // Yeni deste

    // Bet vermeyen oyuncuları spectating yap
    const playersWithBets = activeTable.players.map(p => {
      if (p.bet === 0) {
        return { ...p, status: 'spectating' as PlayerStatus };
      }

      const cards = [drawCard(), drawCard()];
      const score = calculateHandValue(cards);
      const status: PlayerStatus = score === 21 ? 'blackjack' : 'playing';

      return { ...p, cards, totalScore: score, status };
    });

    // Krupiye kartları
    const dealerCards = [drawCard(), { ...drawCard(), faceUp: false }];
    const dealerScore = calculateHandValue(dealerCards);

    // İlk aktif oyuncuyu bul (sağdan başla - en yüksek seatIndex)
    const activePlayers = playersWithBets.filter(p => p.status === 'playing');
    const sortedByRightToLeft = [...activePlayers].sort((a, b) => b.seatIndex - a.seatIndex);
    const firstActiveIndex = sortedByRightToLeft.length > 0
      ? playersWithBets.findIndex(p => p.id === sortedByRightToLeft[0].id)
      : -1;

    const updatedTable: Table = {
      ...activeTable,
      status: 'playing',
      players: playersWithBets,
      dealerCards,
      dealerScore,
      currentPlayerIndex: firstActiveIndex,
      turnTimer: 15,
      roundNumber: activeTable.roundNumber + 1,
    };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  nextPlayer: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const currentIndex = activeTable.currentPlayerIndex;

    // Sağdan sola git - seatIndex'i daha düşük olan oyunculara
    const currentSeatIndex = activeTable.players[currentIndex]?.seatIndex ?? 5;

    // Sıradaki aktif oyuncuyu bul (daha düşük seatIndex)
    const nextPlayer = activeTable.players
      .filter(p => p.seatIndex < currentSeatIndex && p.status === 'playing')
      .sort((a, b) => b.seatIndex - a.seatIndex)[0];

    if (nextPlayer) {
      const nextIndex = activeTable.players.findIndex(p => p.id === nextPlayer.id);

      const updatedTable = {
        ...activeTable,
        currentPlayerIndex: nextIndex,
        turnTimer: 15,
      };

      set({
        activeTable: updatedTable,
        tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
      });
    } else {
      // Aktif oyuncu kalmadı, krupiye oynasın
      get().dealerPlay();
    }
  },

  dealerPlay: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    // Önce kapalı kartı aç
    let dealerCards = activeTable.dealerCards.map(c => ({ ...c, faceUp: true }));
    let dealerScore = calculateHandValue(dealerCards);

    // Krupiye 17'ye kadar çekmeli
    while (dealerScore < 17) {
      dealerCards = [...dealerCards, drawCard()];
      dealerScore = calculateHandValue(dealerCards);
    }

    const updatedTable: Table = {
      ...activeTable,
      status: 'dealer_turn',
      dealerCards,
      dealerScore,
      currentPlayerIndex: -1,
    };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });

    // Sonuçları göster
    setTimeout(() => get().showResults(), 1500);
  },

  showResults: () => {
    const { activeTable, currentUser } = get();
    if (!activeTable) return;

    const dealerScore = activeTable.dealerScore;
    const dealerBust = dealerScore > 21;
    // Dealer blackjack kontrolü eklendi
    const dealerHasBlackjack = dealerScore === 21 && activeTable.dealerCards.length === 2;

    let balanceChange = 0;

    const updatedPlayers = activeTable.players.map(p => {
      if (p.status === 'spectating' || p.bet === 0) {
        return p;
      }

      let status: PlayerStatus;
      let winAmount = 0;

      // Oyuncu blackjack kontrolü
      const playerHasBlackjack = p.status === 'blackjack';

      if (p.status === 'bust') {
        status = 'lost';
        winAmount = 0;
      } else if (playerHasBlackjack && dealerHasBlackjack) {
        // Her ikisi de blackjack - Push
        status = 'push';
        winAmount = p.bet;
      } else if (playerHasBlackjack) {
        // Sadece oyuncu blackjack
        status = 'won';
        // Blackjack kazancı düzeltildi: Math.floor ile tam sayıya yuvarla
        winAmount = Math.floor(p.bet * 2.5);
      } else if (dealerHasBlackjack) {
        // Sadece dealer blackjack - Oyuncu kaybeder
        status = 'lost';
        winAmount = 0;
      } else if (dealerBust) {
        status = 'won';
        winAmount = p.bet * 2;
      } else if (p.totalScore > dealerScore) {
        status = 'won';
        winAmount = p.bet * 2;
      } else if (p.totalScore === dealerScore) {
        status = 'push';
        winAmount = p.bet;
      } else {
        status = 'lost';
        winAmount = 0;
      }

      if (p.isCurrentUser) {
        balanceChange = winAmount;
      }

      return { ...p, status, balance: p.balance + winAmount };
    });

    const updatedTable: Table = {
      ...activeTable,
      status: 'results',
      players: updatedPlayers,
    };

    set({
      activeTable: updatedTable,
      currentUser: { ...currentUser, balance: currentUser.balance + balanceChange },
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  resetForNewRound: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const updatedPlayers = activeTable.players.map(p => ({
      ...p,
      cards: [],
      bet: 0,
      status: 'waiting' as PlayerStatus,
      totalScore: 0,
    }));

    const updatedTable: Table = {
      ...activeTable,
      status: 'waiting',
      players: updatedPlayers,
      dealerCards: [],
      dealerScore: 0,
      currentPlayerIndex: -1,
      countdown: 0,
    };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  decrementCountdown: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const newCountdown = activeTable.countdown - 1;

    if (newCountdown <= 0) {
      if (activeTable.status === 'countdown') {
        get().startBetting();
      } else if (activeTable.status === 'betting') {
        get().dealCards();
      }
      return;
    }

    const updatedTable = { ...activeTable, countdown: newCountdown };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  decrementTurnTimer: () => {
    const { activeTable } = get();
    if (!activeTable || activeTable.status !== 'playing') return;

    const newTimer = activeTable.turnTimer - 1;

    if (newTimer <= 0) {
      // Süre doldu, otomatik stand
      const currentPlayer = activeTable.players[activeTable.currentPlayerIndex];
      if (currentPlayer) {
        if (currentPlayer.isCurrentUser) {
          get().stand();
        } else {
          // Bot için otomatik stand
          const updatedPlayers = activeTable.players.map((p, i) =>
            i === activeTable.currentPlayerIndex
              ? { ...p, status: 'stand' as PlayerStatus }
              : p
          );

          const updatedTable = { ...activeTable, players: updatedPlayers };

          set({
            activeTable: updatedTable,
            tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
          });

          setTimeout(() => get().nextPlayer(), 300);
        }
      }
      return;
    }

    const updatedTable = { ...activeTable, turnTimer: newTimer };

    set({
      activeTable: updatedTable,
      tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  },

  simulateBotActions: () => {
    const { activeTable } = get();
    if (!activeTable) return;

    const currentPlayer = activeTable.players[activeTable.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isCurrentUser || currentPlayer.status !== 'playing') return;

    // Bot stratejisi: 16 ve altında hit, 17 ve üstünde stand
    if (currentPlayer.totalScore < 17) {
      // Hit
      const newCard = drawCard();
      const newCards = [...currentPlayer.cards, newCard];
      const newScore = calculateHandValue(newCards);

      let newStatus: PlayerStatus = 'playing';
      if (newScore > 21) newStatus = 'bust';
      else if (newScore === 21) newStatus = 'stand';

      const updatedPlayers = activeTable.players.map((p, i) =>
        i === activeTable.currentPlayerIndex
          ? { ...p, cards: newCards, totalScore: newScore, status: newStatus }
          : p
      );

      const updatedTable = { ...activeTable, players: updatedPlayers };

      set({
        activeTable: updatedTable,
        tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
      });

      if (newStatus !== 'playing') {
        setTimeout(() => get().nextPlayer(), 800);
      } else {
        // Tekrar hit yapabilir
        setTimeout(() => get().simulateBotActions(), 1000);
      }
    } else {
      // Stand
      const updatedPlayers = activeTable.players.map((p, i) =>
        i === activeTable.currentPlayerIndex
          ? { ...p, status: 'stand' as PlayerStatus }
          : p
      );

      const updatedTable = { ...activeTable, players: updatedPlayers };

      set({
        activeTable: updatedTable,
        tables: get().tables.map(t => t.id === updatedTable.id ? updatedTable : t),
      });

      setTimeout(() => get().nextPlayer(), 500);
    }
  },
}));
