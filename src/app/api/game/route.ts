import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createDeck, calculateHandValue, isBlackjack, type Card } from '@/lib/gameTypes';

// Minimum kart sayısı - bu altına düşerse deste yenilenir
const MIN_DECK_CARDS = 15;

// Oyun durumunu getir
export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('room_id');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    // Aktif oyunu bul
    const games = await sql`
      SELECT * FROM games
      WHERE room_id = ${roomId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (games.length === 0) {
      return NextResponse.json({ game: null });
    }

    const game = games[0];

    // Oyuncuları getir
    const players = await sql`
      SELECT gp.*, u.username, u.first_name, u.avatar
      FROM game_players gp
      JOIN users u ON gp.telegram_id = u.telegram_id
      WHERE gp.game_id = ${game.id}
      ORDER BY gp.seat_number
    `;

    return NextResponse.json({
      game: {
        ...game,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        players: players.map((p: any) => ({
          id: p.id.toString(),
          telegramId: p.telegram_id,
          name: p.first_name || p.username || 'Player',
          avatar: p.avatar || '🎭',
          seatNumber: p.seat_number,
          bet: p.bet,
          cards: p.cards || [],
          status: p.status,
          isTurn: p.is_turn,
        })),
      },
    });
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 });
  }
}

// Deck'i kontrol et ve gerekirse yenile
function ensureDeckHasCards(deck: Card[]): Card[] {
  if (deck.length < MIN_DECK_CARDS) {
    // Yeni deste oluştur ve mevcut kartları ekle
    const newDeck = createDeck();
    return [...newDeck, ...deck];
  }
  return deck;
}

// Yeni oyun başlat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, action, telegram_id, player_id, bet, seat_number } = body;

    if (!room_id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    // Odayı kontrol et
    const rooms = await sql`SELECT * FROM rooms WHERE id = ${room_id}`;
    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = rooms[0];

    switch (action) {
      case 'start': {
        // Yeni oyun oluştur
        const deck = createDeck();
        const result = await sql`
          INSERT INTO games (room_id, status, deck)
          VALUES (${room_id}, 'betting', ${JSON.stringify(deck)})
          RETURNING *
        `;

        // Oda oyuncularını oyuna ekle
        const roomPlayers = await sql`
          SELECT rp.*, u.id as user_id
          FROM room_players rp
          JOIN users u ON rp.telegram_id = u.telegram_id
          WHERE rp.room_id = ${room_id}
        `;

        for (const player of roomPlayers) {
          await sql`
            INSERT INTO game_players (game_id, user_id, telegram_id, seat_number, status)
            VALUES (${result[0].id}, ${player.user_id}, ${player.telegram_id}, ${player.seat_number}, 'waiting')
          `;
        }

        return NextResponse.json({ game: result[0] });
      }

      case 'join': {
        if (!telegram_id || seat_number === undefined) {
          return NextResponse.json({ error: 'Telegram ID and seat number required' }, { status: 400 });
        }

        // Seat number validation
        if (seat_number < 1 || seat_number > 6) {
          return NextResponse.json({ error: 'Invalid seat number' }, { status: 400 });
        }

        // Aktif oyunu bul
        const games = await sql`
          SELECT * FROM games
          WHERE room_id = ${room_id} AND status IN ('waiting', 'betting')
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (games.length === 0) {
          // Yeni oyun oluştur
          const deck = createDeck();
          const newGame = await sql`
            INSERT INTO games (room_id, status, deck)
            VALUES (${room_id}, 'waiting', ${JSON.stringify(deck)})
            RETURNING *
          `;

          const user = await sql`SELECT id FROM users WHERE telegram_id = ${telegram_id}`;
          if (user.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }

          await sql`
            INSERT INTO game_players (game_id, user_id, telegram_id, seat_number)
            VALUES (${newGame[0].id}, ${user[0].id}, ${telegram_id}, ${seat_number})
          `;

          return NextResponse.json({ success: true, game_id: newGame[0].id });
        }

        const game = games[0];

        // Koltuğun boş olup olmadığını kontrol et (Race condition fix)
        const existingSeat = await sql`
          SELECT id FROM game_players
          WHERE game_id = ${game.id} AND seat_number = ${seat_number}
          FOR UPDATE
        `;

        if (existingSeat.length > 0) {
          return NextResponse.json({ error: 'Bu koltuk dolu' }, { status: 400 });
        }

        // Oyuncuyu ekle
        const user = await sql`SELECT id FROM users WHERE telegram_id = ${telegram_id}`;
        if (user.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Oyuncunun zaten oyunda olup olmadığını kontrol et
        const existingPlayer = await sql`
          SELECT id FROM game_players
          WHERE game_id = ${game.id} AND telegram_id = ${telegram_id}
        `;

        if (existingPlayer.length > 0) {
          return NextResponse.json({ error: 'Zaten bu oyundasınız' }, { status: 400 });
        }

        await sql`
          INSERT INTO game_players (game_id, user_id, telegram_id, seat_number)
          VALUES (${game.id}, ${user[0].id}, ${telegram_id}, ${seat_number})
        `;

        return NextResponse.json({ success: true, game_id: game.id });
      }

      case 'bet': {
        if (!player_id || !bet) {
          return NextResponse.json({ error: 'Player ID and bet required' }, { status: 400 });
        }

        // Bahis validation
        if (bet <= 0) {
          return NextResponse.json({ error: 'Bahis pozitif olmalı' }, { status: 400 });
        }

        // Minimum ve maksimum bahis kontrolü
        if (bet < room.min_bet || bet > room.max_bet) {
          return NextResponse.json({ error: `Bahis ${room.min_bet} ile ${room.max_bet} arasında olmalı` }, { status: 400 });
        }

        // Kullanıcının yeterli bakiyesi var mı kontrol et
        const player = await sql`SELECT telegram_id FROM game_players WHERE id = ${player_id}`;
        if (player.length === 0) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const user = await sql`SELECT chips FROM users WHERE telegram_id = ${player[0].telegram_id}`;
        if (user.length === 0 || user[0].chips < bet) {
          return NextResponse.json({ error: 'Yetersiz bakiye' }, { status: 400 });
        }

        // Bahis koy
        await sql`
          UPDATE game_players
          SET bet = ${bet}, status = 'playing'
          WHERE id = ${player_id}
        `;

        // Kullanıcı bakiyesini düş
        await sql`
          UPDATE users
          SET chips = chips - ${bet}
          WHERE telegram_id = ${player[0].telegram_id} AND chips >= ${bet}
        `;

        return NextResponse.json({ success: true });
      }

      case 'deal': {
        // Kartları dağıt
        const games = await sql`
          SELECT * FROM games
          WHERE room_id = ${room_id} AND status = 'betting'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (games.length === 0) {
          return NextResponse.json({ error: 'No active game' }, { status: 400 });
        }

        const game = games[0];
        let deck: Card[] = ensureDeckHasCards(game.deck as Card[]);

        // Bahis koyan oyuncuları al
        const players = await sql`
          SELECT * FROM game_players
          WHERE game_id = ${game.id} AND bet > 0
          ORDER BY seat_number
        `;

        if (players.length === 0) {
          return NextResponse.json({ error: 'No players with bets' }, { status: 400 });
        }

        // Her oyuncuya 2 kart ver
        for (const player of players) {
          const card1 = deck.pop()!;
          const card2 = deck.pop()!;
          await sql`
            UPDATE game_players
            SET cards = ${JSON.stringify([card1, card2])}
            WHERE id = ${player.id}
          `;
        }

        // Dealer'a 2 kart ver (biri kapalı)
        const dealerCard1 = { ...deck.pop()!, faceUp: true };
        const dealerCard2 = { ...deck.pop()!, faceUp: false };
        const dealerCards = [dealerCard1, dealerCard2];

        // İlk oyuncunun sırasını başlat
        await sql`
          UPDATE game_players
          SET is_turn = TRUE
          WHERE id = ${players[0].id}
        `;

        // Oyun durumunu güncelle
        await sql`
          UPDATE games
          SET status = 'playing',
              dealer_cards = ${JSON.stringify(dealerCards)},
              dealer_score = ${calculateHandValue([dealerCard1])},
              deck = ${JSON.stringify(deck)},
              current_player_index = 0
          WHERE id = ${game.id}
        `;

        return NextResponse.json({ success: true });
      }

      case 'hit': {
        if (!player_id) {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }

        // Aktif oyunu bul
        const games = await sql`
          SELECT * FROM games
          WHERE room_id = ${room_id} AND status = 'playing'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (games.length === 0) {
          return NextResponse.json({ error: 'No active game' }, { status: 400 });
        }

        const game = games[0];
        let deck: Card[] = ensureDeckHasCards(game.deck as Card[]);

        // Oyuncuyu bul
        const players = await sql`
          SELECT * FROM game_players WHERE id = ${player_id}
        `;

        if (players.length === 0) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const player = players[0];

        // Sıranın bu oyuncuda olup olmadığını kontrol et
        if (!player.is_turn) {
          return NextResponse.json({ error: 'Sıra sizde değil' }, { status: 400 });
        }

        const cards: Card[] = player.cards as Card[];
        const newCard = deck.pop()!;
        cards.push(newCard);

        const handValue = calculateHandValue(cards);
        let status = player.status;

        if (handValue > 21) {
          status = 'bust';
        } else if (handValue === 21) {
          status = 'stand';
        }

        // Güncelle
        await sql`
          UPDATE game_players
          SET cards = ${JSON.stringify(cards)}, status = ${status}
          WHERE id = ${player_id}
        `;

        await sql`
          UPDATE games
          SET deck = ${JSON.stringify(deck)}
          WHERE id = ${game.id}
        `;

        // Sıra kontrolü
        if (status === 'bust' || status === 'stand') {
          await moveToNextPlayer(game.id, player_id);
        }

        return NextResponse.json({ success: true, handValue, status });
      }

      case 'stand': {
        if (!player_id) {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }

        // Oyuncunun sırasında olup olmadığını kontrol et
        const playerCheck = await sql`
          SELECT is_turn FROM game_players WHERE id = ${player_id}
        `;

        if (playerCheck.length === 0) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        if (!playerCheck[0].is_turn) {
          return NextResponse.json({ error: 'Sıra sizde değil' }, { status: 400 });
        }

        // Oyuncuyu stand yap
        await sql`
          UPDATE game_players
          SET status = 'stand', is_turn = FALSE
          WHERE id = ${player_id}
        `;

        // Aktif oyunu bul
        const games = await sql`
          SELECT * FROM games
          WHERE room_id = ${room_id} AND status = 'playing'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (games.length > 0) {
          await moveToNextPlayer(games[0].id, player_id);
        }

        return NextResponse.json({ success: true });
      }

      case 'double_down': {
        if (!player_id) {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }

        // Aktif oyunu bul
        const games = await sql`
          SELECT * FROM games
          WHERE room_id = ${room_id} AND status = 'playing'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (games.length === 0) {
          return NextResponse.json({ error: 'No active game' }, { status: 400 });
        }

        const game = games[0];
        let deck: Card[] = ensureDeckHasCards(game.deck as Card[]);

        // Oyuncuyu bul
        const players = await sql`
          SELECT * FROM game_players WHERE id = ${player_id}
        `;

        if (players.length === 0) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const player = players[0];

        // Sıranın bu oyuncuda olup olmadığını kontrol et
        if (!player.is_turn) {
          return NextResponse.json({ error: 'Sıra sizde değil' }, { status: 400 });
        }

        // Sadece 2 kartla double down yapılabilir
        const playerCards: Card[] = player.cards as Card[];
        if (playerCards.length !== 2) {
          return NextResponse.json({ error: 'Double down sadece ilk 2 kartla yapılabilir' }, { status: 400 });
        }

        // Kullanıcının yeterli bakiyesi var mı kontrol et
        const user = await sql`SELECT chips FROM users WHERE telegram_id = ${player.telegram_id}`;
        if (user.length === 0 || user[0].chips < player.bet) {
          return NextResponse.json({ error: 'Katlamak için yeterli bakiye yok' }, { status: 400 });
        }

        // Bahsi iki katına çıkar
        const newBet = player.bet * 2;
        const additionalBet = player.bet;

        // Kullanıcı bakiyesinden ek bahsi düş
        await sql`
          UPDATE users
          SET chips = chips - ${additionalBet}
          WHERE telegram_id = ${player.telegram_id} AND chips >= ${additionalBet}
        `;

        // Yeni kart çek
        const newCard = deck.pop()!;
        playerCards.push(newCard);

        const handValue = calculateHandValue(playerCards);
        const status = handValue > 21 ? 'bust' : 'stand';

        // Oyuncuyu güncelle
        await sql`
          UPDATE game_players
          SET cards = ${JSON.stringify(playerCards)},
              bet = ${newBet},
              status = ${status},
              is_turn = FALSE
          WHERE id = ${player_id}
        `;

        // Deck'i güncelle
        await sql`
          UPDATE games
          SET deck = ${JSON.stringify(deck)}
          WHERE id = ${game.id}
        `;

        // Sıradaki oyuncuya geç
        await moveToNextPlayer(game.id, player_id);

        return NextResponse.json({ success: true, handValue, status, newBet });
      }

      case 'dealer_play': {
        // Aktif oyunu bul
        const games = await sql`
          SELECT * FROM games
          WHERE room_id = ${room_id} AND status = 'dealer-turn'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (games.length === 0) {
          return NextResponse.json({ error: 'Game not in dealer turn' }, { status: 400 });
        }

        const game = games[0];
        let deck: Card[] = ensureDeckHasCards(game.deck as Card[]);
        let dealerCards: Card[] = (game.dealer_cards as Card[]).map(c => ({ ...c, faceUp: true }));
        let dealerScore = calculateHandValue(dealerCards);

        // Dealer 17'ye kadar çeker
        while (dealerScore < 17) {
          const newCard = { ...deck.pop()!, faceUp: true };
          dealerCards.push(newCard);
          dealerScore = calculateHandValue(dealerCards);
        }

        // Sonuçları hesapla
        const players = await sql`
          SELECT * FROM game_players
          WHERE game_id = ${game.id} AND bet > 0
        `;

        for (const player of players) {
          const playerCards: Card[] = player.cards as Card[];
          const playerScore = calculateHandValue(playerCards);
          let result = 'lose';
          let winAmount = 0;

          if (player.status === 'bust') {
            result = 'lose';
            winAmount = 0;
          } else if (isBlackjack(playerCards) && !isBlackjack(dealerCards)) {
            result = 'blackjack';
            // Blackjack: Bahis geri + bahsin 1.5 katı kazanç = 2.5x
            winAmount = Math.floor(player.bet * 2.5);
          } else if (dealerScore > 21) {
            result = 'win';
            winAmount = player.bet * 2;
          } else if (playerScore > dealerScore) {
            result = 'win';
            winAmount = player.bet * 2;
          } else if (playerScore === dealerScore) {
            result = 'push';
            winAmount = player.bet; // Bahis geri
          } else {
            result = 'lose';
            winAmount = 0;
          }

          // Oyuncu durumunu güncelle
          await sql`
            UPDATE game_players
            SET status = ${result}
            WHERE id = ${player.id}
          `;

          // Kazanç varsa bakiyeye ekle
          if (winAmount > 0) {
            await sql`
              UPDATE users
              SET chips = chips + ${winAmount}
              WHERE telegram_id = ${player.telegram_id}
            `;
          }

          // İstatistikleri güncelle
          const won = result === 'win' || result === 'blackjack';
          const lost = result === 'lose';
          await sql`
            UPDATE users
            SET total_games = total_games + 1,
                total_wins = total_wins + ${won ? 1 : 0},
                total_losses = total_losses + ${lost ? 1 : 0}
            WHERE telegram_id = ${player.telegram_id}
          `;
        }

        // Oyunu bitir
        await sql`
          UPDATE games
          SET status = 'results',
              dealer_cards = ${JSON.stringify(dealerCards)},
              dealer_score = ${dealerScore},
              deck = ${JSON.stringify(deck)},
              ended_at = CURRENT_TIMESTAMP
          WHERE id = ${game.id}
        `;

        // Oda durumunu güncelle
        await sql`
          UPDATE rooms
          SET status = 'waiting'
          WHERE id = ${room_id}
        `;

        return NextResponse.json({ success: true, dealerScore });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game action error:', error);
    return NextResponse.json({ error: 'Failed to perform game action' }, { status: 500 });
  }
}

// Sıradaki oyuncuya geç
async function moveToNextPlayer(gameId: number, currentPlayerId: string) {
  // Mevcut oyuncunun sırasını kapat
  await sql`
    UPDATE game_players
    SET is_turn = FALSE
    WHERE id = ${currentPlayerId}
  `;

  // Sıradaki playing durumundaki oyuncuyu bul
  const nextPlayers = await sql`
    SELECT * FROM game_players
    WHERE game_id = ${gameId} AND status = 'playing' AND is_turn = FALSE
    ORDER BY seat_number
    LIMIT 1
  `;

  if (nextPlayers.length > 0) {
    // Sırayı ver
    await sql`
      UPDATE game_players
      SET is_turn = TRUE
      WHERE id = ${nextPlayers[0].id}
    `;
  } else {
    // Dealer'ın sırası
    await sql`
      UPDATE games
      SET status = 'dealer-turn'
      WHERE id = ${gameId}
    `;
  }
}
