import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { gameEvents } from '@/lib/sse';

// Kart tipleri
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

interface GamePlayer {
  id: number;
  telegram_id: number;
  seat_number: number;
  status: string;
  cards: Card[];
  bet: number;
  is_turn: boolean;
  first_name?: string;
  username?: string;
  photo_url?: string;
  user_chips?: number;
  chips?: number;
}

// Yeni deste oluştur
function createDeck(): Card[] {
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
}

// Kart değeri hesapla
function getCardValue(card: Card): number {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
}

// El değeri hesapla
function calculateHandValue(cards: Card[]): number {
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

// Oyun state'ini SSE ile gönder
async function broadcastGameState(roomId: string, gameId: number, countdown?: number, turnTimer?: number) {
  try {
    const game = await sql`SELECT * FROM games WHERE id = ${gameId}`;
    if (!game[0]) return;

    const players = await sql`
      SELECT gp.*, u.first_name, u.username, u.photo_url, u.chips as user_chips
      FROM game_players gp
      JOIN users u ON gp.telegram_id = u.telegram_id
      WHERE gp.game_id = ${gameId}
      ORDER BY gp.seat_number
    `;

    const gameData = {
      id: game[0].id,
      room_id: game[0].room_id,
      status: game[0].status,
      dealer_cards: game[0].dealer_cards || [],
      dealer_score: game[0].dealer_score || 0,
      current_player_index: game[0].current_player_index,
      betting_end_time: game[0].betting_end_time,
      players: players.map((p) => {
        const player = p as GamePlayer;
        return {
          id: String(player.id),
          telegramId: player.telegram_id,
          name: player.first_name || player.username || 'Oyuncu',
          avatar: player.photo_url || '',
          seatNumber: player.seat_number,
          bet: player.bet || 0,
          cards: player.cards || [],
          status: player.status,
          isTurn: player.is_turn,
          balance: player.user_chips,
        };
      }),
    };

    gameEvents.gameStateUpdate(roomId, { ...gameData, countdown, turnTimer });
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

// Ana POST handler - tüm oyun aksiyonları
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, room_id, telegram_id, amount } = body;

    if (!room_id || !telegram_id) {
      return NextResponse.json({ error: 'Room ID and Telegram ID required' }, { status: 400 });
    }

    switch (action) {
      case 'ready':
        return handleReady(room_id, telegram_id);
      case 'bet':
        return handleBet(room_id, telegram_id, amount);
      case 'hit':
        return handleHit(room_id, telegram_id);
      case 'stand':
        return handleStand(room_id, telegram_id);
      case 'double':
        return handleDouble(room_id, telegram_id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game action error:', error);
    return NextResponse.json({ error: 'Game action failed' }, { status: 500 });
  }
}

// Hazır ol
async function handleReady(roomId: string, telegramId: number) {
  try {
    // Odayı kontrol et
    const rooms = await sql`SELECT * FROM rooms WHERE id = ${roomId}`;
    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Aktif oyun var mı?
    let game = await sql`
      SELECT * FROM games
      WHERE room_id = ${roomId}
      AND status NOT IN ('results', 'ended')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Oyun yoksa veya bitmişse yeni oyun oluştur
    if (game.length === 0 || game[0].status === 'results') {
      // Yeni oyun oluştur
      const deck = createDeck();
      game = await sql`
        INSERT INTO games (room_id, status, deck, dealer_cards, dealer_score, current_player_index)
        VALUES (${roomId}, 'waiting', ${JSON.stringify(deck)}, '[]', 0, -1)
        RETURNING *
      `;

      // Odadaki tüm oyuncuları oyuna ekle
      const roomPlayers = await sql`
        SELECT rp.*, u.first_name, u.username, u.photo_url
        FROM room_players rp
        JOIN users u ON rp.telegram_id = u.telegram_id
        WHERE rp.room_id = ${roomId}
      `;

      for (const rp of roomPlayers) {
        await sql`
          INSERT INTO game_players (game_id, telegram_id, seat_number, status, cards, bet)
          VALUES (${game[0].id}, ${rp.telegram_id}, ${rp.seat_number}, 'waiting', '[]', 0)
          ON CONFLICT DO NOTHING
        `;
      }
    }

    const gameId = game[0].id;

    // Oyuncuyu hazır yap
    await sql`
      UPDATE game_players
      SET status = 'ready'
      WHERE game_id = ${gameId} AND telegram_id = ${telegramId}
    `;

    // Tüm oyuncular hazır mı kontrol et
    const players = await sql`
      SELECT * FROM game_players WHERE game_id = ${gameId}
    `;

    const allReady = players.every((p) => (p as GamePlayer).status === 'ready');
    const playerCount = players.length;

    if (allReady && playerCount >= 1) {
      // Countdown başlat
      await sql`
        UPDATE games SET status = 'countdown' WHERE id = ${gameId}
      `;

      // 5 saniyelik countdown
      broadcastGameState(roomId, gameId, 5);

      // 5 saniye sonra betting başlat
      setTimeout(async () => {
        await startBetting(roomId, gameId);
      }, 5000);
    } else {
      broadcastGameState(roomId, gameId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ready error:', error);
    return NextResponse.json({ error: 'Failed to set ready' }, { status: 500 });
  }
}

// Betting başlat
async function startBetting(roomId: string, gameId: number) {
  try {
    const bettingEndTime = Date.now() + 15000; // 15 saniye

    await sql`
      UPDATE games
      SET status = 'betting', betting_end_time = ${bettingEndTime}
      WHERE id = ${gameId}
    `;

    await sql`
      UPDATE game_players
      SET status = 'betting'
      WHERE game_id = ${gameId}
    `;

    broadcastGameState(roomId, gameId, 15);

    // 15 saniye sonra kartları dağıt
    setTimeout(async () => {
      await dealCards(roomId, gameId);
    }, 15000);
  } catch (error) {
    console.error('Start betting error:', error);
  }
}

// Bahis yap
async function handleBet(roomId: string, telegramId: number, amount: number) {
  try {
    // Aktif oyunu bul
    const game = await sql`
      SELECT * FROM games
      WHERE room_id = ${roomId} AND status = 'betting'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (game.length === 0) {
      return NextResponse.json({ error: 'No active betting phase' }, { status: 400 });
    }

    const gameId = game[0].id;

    // Kullanıcının bakiyesini kontrol et
    const user = await sql`SELECT * FROM users WHERE telegram_id = ${telegramId}`;
    if (user.length === 0 || user[0].chips < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Bahsi kaydet
    await sql`
      UPDATE game_players
      SET bet = ${amount}, status = 'ready'
      WHERE game_id = ${gameId} AND telegram_id = ${telegramId}
    `;

    // Kullanıcının bakiyesini düş
    await sql`
      UPDATE users SET chips = chips - ${amount} WHERE telegram_id = ${telegramId}
    `;

    broadcastGameState(roomId, gameId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bet error:', error);
    return NextResponse.json({ error: 'Failed to place bet' }, { status: 500 });
  }
}

// Kartları dağıt
async function dealCards(roomId: string, gameId: number) {
  try {
    const game = await sql`SELECT * FROM games WHERE id = ${gameId}`;
    if (game.length === 0) return;

    const deck: Card[] = game[0].deck || createDeck();

    // Bahis koymayan oyuncuları spectator yap
    await sql`
      UPDATE game_players
      SET status = 'spectating'
      WHERE game_id = ${gameId} AND (bet IS NULL OR bet = 0)
    `;

    // Bahis koyan oyuncular
    const players = await sql`
      SELECT * FROM game_players
      WHERE game_id = ${gameId} AND bet > 0
      ORDER BY seat_number
    `;

    if (players.length === 0) {
      // Kimse bahis koymadı, oyunu bitir
      await sql`
        UPDATE games SET status = 'results', ended_at = CURRENT_TIMESTAMP WHERE id = ${gameId}
      `;
      broadcastGameState(roomId, gameId);
      return;
    }

    // Oyunculara kart dağıt
    for (const p of players) {
      const player = p as GamePlayer;
      const card1 = deck.pop()!;
      const card2 = deck.pop()!;
      const cards = [card1, card2];
      const score = calculateHandValue(cards);
      const status = score === 21 ? 'blackjack' : 'playing';

      await sql`
        UPDATE game_players
        SET cards = ${JSON.stringify(cards)}, status = ${status}
        WHERE id = ${player.id}
      `;
    }

    // Krupiyeye kart dağıt
    const dealerCard1 = deck.pop()!;
    const dealerCard2 = { ...deck.pop()!, faceUp: false };
    const dealerCards = [dealerCard1, dealerCard2];
    const dealerScore = calculateHandValue(dealerCards);

    // İlk aktif oyuncuyu bul (en düşük seat_number)
    const activePlayers = await sql`
      SELECT * FROM game_players
      WHERE game_id = ${gameId} AND status = 'playing'
      ORDER BY seat_number ASC
    `;

    const firstPlayerIndex = activePlayers.length > 0 ? 0 : -1;

    // İlk oyuncunun sırasını işaretle
    if (activePlayers.length > 0) {
      await sql`
        UPDATE game_players SET is_turn = true WHERE id = ${(activePlayers[0] as GamePlayer).id}
      `;
    }

    await sql`
      UPDATE games
      SET status = 'playing',
          deck = ${JSON.stringify(deck)},
          dealer_cards = ${JSON.stringify(dealerCards)},
          dealer_score = ${dealerScore},
          current_player_index = ${firstPlayerIndex}
      WHERE id = ${gameId}
    `;

    broadcastGameState(roomId, gameId, 0, 15);

    // Eğer aktif oyuncu yoksa dealer'a geç
    if (activePlayers.length === 0) {
      await dealerPlay(roomId, gameId);
    }
  } catch (error) {
    console.error('Deal cards error:', error);
  }
}

// Hit
async function handleHit(roomId: string, telegramId: number) {
  try {
    const game = await sql`
      SELECT * FROM games WHERE room_id = ${roomId} AND status = 'playing'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (game.length === 0) {
      return NextResponse.json({ error: 'No active game' }, { status: 400 });
    }

    const gameId = game[0].id;
    const deck: Card[] = game[0].deck;

    // Oyuncunun sırası mı kontrol et
    const playerArr = await sql`
      SELECT * FROM game_players
      WHERE game_id = ${gameId} AND telegram_id = ${telegramId} AND is_turn = true
    `;

    if (playerArr.length === 0) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    const player = playerArr[0] as GamePlayer;

    // Kart çek
    const newCard = deck.pop()!;
    const newCards = [...(player.cards || []), newCard];
    const newScore = calculateHandValue(newCards);

    let newStatus = 'playing';
    if (newScore > 21) newStatus = 'bust';
    else if (newScore === 21) newStatus = 'stand';

    await sql`
      UPDATE game_players
      SET cards = ${JSON.stringify(newCards)}, status = ${newStatus}
      WHERE id = ${player.id}
    `;

    await sql`
      UPDATE games SET deck = ${JSON.stringify(deck)} WHERE id = ${gameId}
    `;

    // Bust veya 21 ise sıradaki oyuncuya geç
    if (newStatus !== 'playing') {
      await nextPlayer(roomId, gameId, player.seat_number);
    } else {
      broadcastGameState(roomId, gameId, 0, 15);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hit error:', error);
    return NextResponse.json({ error: 'Hit failed' }, { status: 500 });
  }
}

// Stand
async function handleStand(roomId: string, telegramId: number) {
  try {
    const game = await sql`
      SELECT * FROM games WHERE room_id = ${roomId} AND status = 'playing'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (game.length === 0) {
      return NextResponse.json({ error: 'No active game' }, { status: 400 });
    }

    const gameId = game[0].id;

    const playerArr = await sql`
      SELECT * FROM game_players
      WHERE game_id = ${gameId} AND telegram_id = ${telegramId} AND is_turn = true
    `;

    if (playerArr.length === 0) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    const player = playerArr[0] as GamePlayer;

    await sql`
      UPDATE game_players SET status = 'stand' WHERE id = ${player.id}
    `;

    await nextPlayer(roomId, gameId, player.seat_number);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stand error:', error);
    return NextResponse.json({ error: 'Stand failed' }, { status: 500 });
  }
}

// Double Down
async function handleDouble(roomId: string, telegramId: number) {
  try {
    const game = await sql`
      SELECT * FROM games WHERE room_id = ${roomId} AND status = 'playing'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (game.length === 0) {
      return NextResponse.json({ error: 'No active game' }, { status: 400 });
    }

    const gameId = game[0].id;
    const deck: Card[] = game[0].deck;

    const playerArr = await sql`
      SELECT gp.*, u.chips as user_chips FROM game_players gp
      JOIN users u ON gp.telegram_id = u.telegram_id
      WHERE gp.game_id = ${gameId} AND gp.telegram_id = ${telegramId} AND gp.is_turn = true
    `;

    if (playerArr.length === 0) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    const player = playerArr[0] as GamePlayer & { user_chips: number };
    const currentBet = player.bet;

    // Bakiye kontrolü
    if ((player.user_chips ?? 0) < currentBet) {
      return NextResponse.json({ error: 'Insufficient balance for double' }, { status: 400 });
    }

    // Bahsi ikiye katla ve bakiyeden düş
    await sql`
      UPDATE users SET chips = chips - ${currentBet} WHERE telegram_id = ${telegramId}
    `;

    // Bir kart çek
    const newCard = deck.pop()!;
    const newCards = [...(player.cards || []), newCard];
    const newScore = calculateHandValue(newCards);

    const newStatus = newScore > 21 ? 'bust' : 'stand';
    const newBet = currentBet * 2;

    await sql`
      UPDATE game_players
      SET cards = ${JSON.stringify(newCards)}, status = ${newStatus}, bet = ${newBet}
      WHERE id = ${player.id}
    `;

    await sql`
      UPDATE games SET deck = ${JSON.stringify(deck)} WHERE id = ${gameId}
    `;

    await nextPlayer(roomId, gameId, player.seat_number);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Double error:', error);
    return NextResponse.json({ error: 'Double failed' }, { status: 500 });
  }
}

// Sıradaki oyuncuya geç
async function nextPlayer(roomId: string, gameId: number, currentSeatNumber: number) {
  try {
    // Mevcut oyuncunun sırasını kapat
    await sql`
      UPDATE game_players SET is_turn = false
      WHERE game_id = ${gameId} AND seat_number = ${currentSeatNumber}
    `;

    // Sıradaki aktif oyuncuyu bul
    const nextPlayers = await sql`
      SELECT * FROM game_players
      WHERE game_id = ${gameId} AND status = 'playing' AND seat_number > ${currentSeatNumber}
      ORDER BY seat_number ASC
      LIMIT 1
    `;

    if (nextPlayers.length > 0) {
      const nextP = nextPlayers[0] as GamePlayer;
      // Sıradaki oyuncuya geç
      await sql`
        UPDATE game_players SET is_turn = true WHERE id = ${nextP.id}
      `;

      const newIndex = nextP.seat_number - 1; // 0-indexed
      await sql`
        UPDATE games SET current_player_index = ${newIndex} WHERE id = ${gameId}
      `;

      broadcastGameState(roomId, gameId, 0, 15);
    } else {
      // Aktif oyuncu kalmadı, dealer oynasın
      await dealerPlay(roomId, gameId);
    }
  } catch (error) {
    console.error('Next player error:', error);
  }
}

// Dealer oynasın
async function dealerPlay(roomId: string, gameId: number) {
  try {
    const game = await sql`SELECT * FROM games WHERE id = ${gameId}`;
    if (game.length === 0) return;

    const deck: Card[] = game[0].deck;
    const dealerCards: Card[] = (game[0].dealer_cards || []).map((c: Card) => ({ ...c, faceUp: true }));
    let dealerScore = calculateHandValue(dealerCards);

    // Dealer 17'ye kadar çekmeli
    while (dealerScore < 17) {
      const newCard = deck.pop()!;
      dealerCards.push(newCard);
      dealerScore = calculateHandValue(dealerCards);
    }

    await sql`
      UPDATE games
      SET status = 'dealer_turn',
          deck = ${JSON.stringify(deck)},
          dealer_cards = ${JSON.stringify(dealerCards)},
          dealer_score = ${dealerScore},
          current_player_index = -1
      WHERE id = ${gameId}
    `;

    // Tüm oyuncuların sırasını kapat
    await sql`UPDATE game_players SET is_turn = false WHERE game_id = ${gameId}`;

    broadcastGameState(roomId, gameId);

    // 2 saniye sonra sonuçları hesapla
    setTimeout(async () => {
      await calculateResults(roomId, gameId, dealerScore, dealerCards.length === 2 && dealerScore === 21);
    }, 2000);
  } catch (error) {
    console.error('Dealer play error:', error);
  }
}

// Sonuçları hesapla
async function calculateResults(roomId: string, gameId: number, dealerScore: number, dealerHasBlackjack: boolean) {
  try {
    const players = await sql`
      SELECT * FROM game_players WHERE game_id = ${gameId} AND bet > 0
    `;

    const dealerBust = dealerScore > 21;
    const results: {
      telegramId: number;
      status: string;
      winAmount: number;
      bet: number;
    }[] = [];

    for (const p of players) {
      const player = p as GamePlayer;
      const playerScore = calculateHandValue(player.cards || []);
      const playerHasBlackjack = player.status === 'blackjack';

      let status = 'lost';
      let winAmount = 0;

      if (player.status === 'bust') {
        status = 'lost';
        winAmount = 0;
      } else if (playerHasBlackjack && dealerHasBlackjack) {
        status = 'push';
        winAmount = player.bet;
      } else if (playerHasBlackjack) {
        status = 'won';
        winAmount = Math.floor(player.bet * 2.5);
      } else if (dealerHasBlackjack) {
        status = 'lost';
        winAmount = 0;
      } else if (dealerBust) {
        status = 'won';
        winAmount = player.bet * 2;
      } else if (playerScore > dealerScore) {
        status = 'won';
        winAmount = player.bet * 2;
      } else if (playerScore === dealerScore) {
        status = 'push';
        winAmount = player.bet;
      } else {
        status = 'lost';
        winAmount = 0;
      }

      // Oyuncunun durumunu güncelle
      await sql`
        UPDATE game_players SET status = ${status} WHERE id = ${player.id}
      `;

      // Kazanç varsa bakiyeye ekle
      if (winAmount > 0) {
        await sql`
          UPDATE users SET chips = chips + ${winAmount} WHERE telegram_id = ${player.telegram_id}
        `;
      }

      // İstatistikleri güncelle
      const won = status === 'won' || status === 'blackjack';
      await sql`
        UPDATE users SET
          total_games = total_games + 1,
          total_wins = total_wins + ${won ? 1 : 0},
          total_losses = total_losses + ${status === 'lost' ? 1 : 0}
        WHERE telegram_id = ${player.telegram_id}
      `;

      results.push({
        telegramId: player.telegram_id,
        status,
        winAmount,
        bet: player.bet,
      });
    }

    // Oyunu bitir
    await sql`
      UPDATE games SET status = 'results', ended_at = CURRENT_TIMESTAMP WHERE id = ${gameId}
    `;

    broadcastGameState(roomId, gameId);
    gameEvents.gameResults(roomId, { results });
  } catch (error) {
    console.error('Calculate results error:', error);
  }
}

// GET - Oyun durumunu al
export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('room_id');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    const game = await sql`
      SELECT * FROM games
      WHERE room_id = ${roomId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (game.length === 0) {
      return NextResponse.json({ game: null });
    }

    const players = await sql`
      SELECT gp.*, u.first_name, u.username, u.photo_url, u.chips as user_chips
      FROM game_players gp
      JOIN users u ON gp.telegram_id = u.telegram_id
      WHERE gp.game_id = ${game[0].id}
      ORDER BY gp.seat_number
    `;

    return NextResponse.json({
      game: {
        ...game[0],
        players: players.map((p) => {
          const player = p as GamePlayer;
          return {
            id: String(player.id),
            telegramId: player.telegram_id,
            name: player.first_name || player.username || 'Oyuncu',
            avatar: player.photo_url || '',
            seatNumber: player.seat_number,
            bet: player.bet || 0,
            cards: player.cards || [],
            status: player.status,
            isTurn: player.is_turn,
            balance: player.user_chips,
          };
        }),
      },
    });
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 });
  }
}
