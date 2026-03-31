import { useState, useCallback } from 'react';
import {
  type Card,
  type Player,
  type GameState,
  type GameStatus,
  createDeck,
  calculateHandValue,
  calculateFullHandValue,
  isBlackjack,
  isBust,
  AVATARS,
  generatePlayerName,
} from './gameTypes';

const generateId = () => Math.random().toString(36).substring(2, 9);

export function useGameStore() {
  const [gameState, setGameState] = useState<GameState>({
    id: generateId(),
    status: 'waiting',
    players: [],
    dealer: { cards: [], score: 0 },
    deck: createDeck(),
    currentPlayerIndex: 0,
    minBet: 10,
    maxBet: 1000,
    timeLeft: 30,
  });

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // Join game
  const joinGame = useCallback((seatNumber: number, name?: string) => {
    const newPlayer: Player = {
      id: generateId(),
      name: name || generatePlayerName(),
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      chips: 1000,
      bet: 0,
      cards: [],
      isActive: true,
      isTurn: false,
      status: 'waiting',
      seatNumber,
    };

    setCurrentPlayer(newPlayer);
    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));

    return newPlayer;
  }, []);

  // Add bot player
  const addBot = useCallback((seatNumber: number) => {
    const botPlayer: Player = {
      id: generateId(),
      name: `Bot_${generatePlayerName()}`,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      chips: 1000,
      bet: 0,
      cards: [],
      isActive: true,
      isTurn: false,
      status: 'waiting',
      seatNumber,
    };

    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, botPlayer],
    }));
  }, []);

  // Place bet
  const placeBet = useCallback((playerId: string, amount: number) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId
          ? { ...p, bet: amount, chips: p.chips - amount, status: 'playing' }
          : p
      ),
    }));

    if (currentPlayer?.id === playerId) {
      setCurrentPlayer((prev) =>
        prev ? { ...prev, bet: amount, chips: prev.chips - amount, status: 'playing' } : null
      );
    }
  }, [currentPlayer]);

  // Deal cards
  const dealCards = useCallback(() => {
    setGameState((prev) => {
      const deck = [...prev.deck];
      const players = prev.players.map((player) => {
        if (player.bet > 0) {
          const card1 = deck.pop()!;
          const card2 = deck.pop()!;
          return { ...player, cards: [card1, card2] };
        }
        return player;
      });

      const dealerCard1 = { ...deck.pop()!, faceUp: true };
      const dealerCard2 = { ...deck.pop()!, faceUp: false };

      return {
        ...prev,
        deck,
        players,
        dealer: {
          cards: [dealerCard1, dealerCard2],
          score: calculateHandValue([dealerCard1]),
        },
        status: 'playing' as GameStatus,
        currentPlayerIndex: 0,
      };
    });
  }, []);

  // Hit
  const hit = useCallback((playerId: string) => {
    setGameState((prev) => {
      const deck = [...prev.deck];
      const newCard = deck.pop()!;

      const players = prev.players.map((p) => {
        if (p.id === playerId) {
          const newCards = [...p.cards, newCard];
          const handValue = calculateHandValue(newCards);
          let status = p.status;

          if (handValue > 21) {
            status = 'bust';
          } else if (handValue === 21) {
            status = 'stand';
          }

          return { ...p, cards: newCards, status };
        }
        return p;
      });

      // Check if we need to move to next player
      const currentPlayer = players.find((p) => p.id === playerId);
      let currentPlayerIndex = prev.currentPlayerIndex;
      let status = prev.status;

      if (currentPlayer?.status === 'bust' || currentPlayer?.status === 'stand') {
        const nextPlayerIndex = players.findIndex(
          (p, i) => i > prev.currentPlayerIndex && p.status === 'playing'
        );

        if (nextPlayerIndex !== -1) {
          currentPlayerIndex = nextPlayerIndex;
        } else {
          status = 'dealer-turn';
        }
      }

      return { ...prev, deck, players, currentPlayerIndex, status };
    });
  }, []);

  // Stand
  const stand = useCallback((playerId: string) => {
    setGameState((prev) => {
      const players = prev.players.map((p) =>
        p.id === playerId ? { ...p, status: 'stand' as const } : p
      );

      const nextPlayerIndex = players.findIndex(
        (p, i) => i > prev.currentPlayerIndex && p.status === 'playing'
      );

      let currentPlayerIndex = prev.currentPlayerIndex;
      let status = prev.status;

      if (nextPlayerIndex !== -1) {
        currentPlayerIndex = nextPlayerIndex;
      } else {
        status = 'dealer-turn';
      }

      return { ...prev, players, currentPlayerIndex, status };
    });
  }, []);

  // Double down
  const doubleDown = useCallback((playerId: string) => {
    setGameState((prev) => {
      const deck = [...prev.deck];
      const newCard = deck.pop()!;

      const players = prev.players.map((p) => {
        if (p.id === playerId) {
          const newCards = [...p.cards, newCard];
          const handValue = calculateHandValue(newCards);
          const newBet = p.bet * 2;
          const newChips = p.chips - p.bet;

          return {
            ...p,
            cards: newCards,
            bet: newBet,
            chips: newChips,
            status: handValue > 21 ? ('bust' as const) : ('stand' as const),
          };
        }
        return p;
      });

      const nextPlayerIndex = players.findIndex(
        (p, i) => i > prev.currentPlayerIndex && p.status === 'playing'
      );

      let currentPlayerIndex = prev.currentPlayerIndex;
      let status = prev.status;

      if (nextPlayerIndex !== -1) {
        currentPlayerIndex = nextPlayerIndex;
      } else {
        status = 'dealer-turn';
      }

      return { ...prev, deck, players, currentPlayerIndex, status };
    });
  }, []);

  // Dealer plays
  const dealerPlay = useCallback(() => {
    setGameState((prev) => {
      const deck = [...prev.deck];
      let dealerCards = prev.dealer.cards.map((c) => ({ ...c, faceUp: true }));
      let dealerScore = calculateHandValue(dealerCards);

      // Dealer hits on 16 or less, stands on 17 or more
      while (dealerScore < 17) {
        const newCard = { ...deck.pop()!, faceUp: true };
        dealerCards = [...dealerCards, newCard];
        dealerScore = calculateHandValue(dealerCards);
      }

      // Determine winners
      const players = prev.players.map((player) => {
        if (player.status === 'bust') {
          return { ...player, status: 'lose' as const };
        }

        // Oyuncu ve dealer skorlarını hesapla (tüm kartlar açık)
        const playerScore = calculateFullHandValue(player.cards);
        const playerHasBlackjack = isBlackjack(player.cards);
        const dealerHasBlackjack = isBlackjack(dealerCards);

        if (playerHasBlackjack && !dealerHasBlackjack) {
          // Blackjack: bahis geri + bahsin 1.5 katı = toplam 2.5x
          return {
            ...player,
            status: 'blackjack' as const,
            chips: player.chips + Math.floor(player.bet * 2.5),
          };
        }

        if (dealerScore > 21) {
          return {
            ...player,
            status: 'win' as const,
            chips: player.chips + player.bet * 2,
          };
        }

        if (playerScore > dealerScore) {
          return {
            ...player,
            status: 'win' as const,
            chips: player.chips + player.bet * 2,
          };
        }

        if (playerScore === dealerScore) {
          return {
            ...player,
            status: 'push' as const,
            chips: player.chips + player.bet,
          };
        }

        return { ...player, status: 'lose' as const };
      });

      return {
        ...prev,
        deck,
        dealer: { cards: dealerCards, score: dealerScore },
        players,
        status: 'results' as GameStatus,
      };
    });
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: 'betting',
      deck: createDeck(),
      dealer: { cards: [], score: 0 },
      currentPlayerIndex: 0,
      players: prev.players.map((p) => ({
        ...p,
        cards: [],
        bet: 0,
        status: 'waiting',
        isTurn: false,
      })),
    }));
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: 'betting',
    }));
  }, []);

  // Leave game
  const leaveGame = useCallback((playerId: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));

    if (currentPlayer?.id === playerId) {
      setCurrentPlayer(null);
    }
  }, [currentPlayer]);

  return {
    gameState,
    currentPlayer,
    joinGame,
    addBot,
    placeBet,
    dealCards,
    hit,
    stand,
    doubleDown,
    dealerPlay,
    resetGame,
    startGame,
    leaveGame,
  };
}
