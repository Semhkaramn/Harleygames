import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createDeck, calculateHandValue, isBlackjack, type Card } from '@/lib/gameTypes';

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

        // Oyuncuyu ekle
        const user = await sql`SELECT id FROM users WHERE telegram_id = ${telegram_id}`;
        if (user.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await sql`
          INSERT INTO game_players (game_id, user_id, telegram_id, seat_number)
          VALUES (${game.id}, ${user[0].id}, ${telegram_id}, ${seat_number})
          ON CONFLICT DO NOTHING
        `;

        return NextResponse.json({ success: true, game_id: game.id });
      }

      case 'bet': {
        if (!player_id || !bet) {
          return NextResponse.json({ error: 'Player ID and bet required' }, { status: 400 });
        }

        // Bahis koy
        await sql`
          UPDATE game_players
          SET bet = ${bet}, status = 'playing'
          WHERE id = ${player_id}
        `;

        // Kullanıcı bakiyesini düş
        const player = await sql`SELECT telegram_id FROM game_players WHERE id = ${player_id}`;
        if (player.length > 0) {
          await sql`
            UPDATE users
            SET chips = chips - ${bet}
            WHERE telegram_id = ${player[0].telegram_id}
          `;
        }

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
        const deck: Card[] = game.deck as Card[];

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
        const deck: Card[] = game.deck as Card[];

        // Oyuncuyu bul
        const players = await sql`
          SELECT * FROM game_players WHERE id = ${player_id}
        `;

        if (players.length === 0) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const player = players[0];
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
        const deck: Card[] = game.deck as Card[];
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
          } else if (isBlackjack(playerCards) && !isBlackjack(dealerCards)) {
            result = 'blackjack';
            winAmount = Math.floor(player.bet * 2.5);
          } else if (dealerScore > 21) {
            result = 'win';
            winAmount = player.bet * 2;
          } else if (playerScore > dealerScore) {
            result = 'win';
            winAmount = player.bet * 2;
          } else if (playerScore === dealerScore) {
            result = 'push';
            winAmount = player.bet;
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
          await sql`
            UPDATE users
            SET total_games = total_games + 1,
                total_wins = total_wins + ${result === 'win' || result === 'blackjack' ? 1 : 0},
                total_losses = total_losses + ${result === 'lose' ? 1 : 0}
            WHERE telegram_id = ${player.telegram_id}
          `;
        }

        // Oyunu bitir
        await sql`
          UPDATE games
          SET status = 'results',
              dealer_cards = ${JSON.stringify(dealerCards)},
              dealer_score = ${dealerScore},
              ended_at = CURRENT_TIMESTAMP
          WHERE id = ${game.id}
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
