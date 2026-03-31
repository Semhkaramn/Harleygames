// SSE bağlantı yönetimi ve event yayınlama
import { sql } from '@/lib/db';

// Aktif bağlantıları takip et
export const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Event gönderme yardımcı fonksiyonu
export function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  } catch (error) {
    console.error('SSE send error:', error);
  }
}

// Belirli bir odaya event gönder
export function broadcastToRoom(roomId: string, event: string, data: unknown) {
  const roomConnections = connections.get(roomId);
  if (roomConnections) {
    for (const controller of roomConnections) {
      try {
        sendEvent(controller, event, data);
      } catch {
        roomConnections.delete(controller);
      }
    }
  }
}

// Tüm lobby'e event gönder
export function broadcastToLobby(event: string, data: unknown) {
  const lobbyConnections = connections.get('lobby');
  if (lobbyConnections) {
    for (const controller of lobbyConnections) {
      try {
        sendEvent(controller, event, data);
      } catch {
        lobbyConnections.delete(controller);
      }
    }
  }
}

// Lobby'e güncel oda listesini gönder
export async function broadcastRoomsToLobby() {
  try {
    const rooms = await sql`
      SELECT r.*, COUNT(rp.id) as player_count
      FROM rooms r
      LEFT JOIN room_players rp ON r.id = rp.room_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;

    // Her oda için oyuncu bilgilerini al
    const roomsWithPlayers = await Promise.all(
      rooms.map(async (room) => {
        const players = await sql`
          SELECT rp.*, u.username, u.first_name, u.photo_url, u.chips
          FROM room_players rp
          JOIN users u ON rp.telegram_id = u.telegram_id
          WHERE rp.room_id = ${room.id}
          ORDER BY rp.seat_number
        `;
        return { ...room, players };
      })
    );

    broadcastToLobby('rooms_update', { rooms: roomsWithPlayers });
  } catch (error) {
    console.error('Broadcast rooms error:', error);
  }
}

// Belirli bir odanın durumunu odadaki herkese gönder
export async function broadcastRoomState(roomId: string) {
  try {
    const rooms = await sql`
      SELECT r.*, COUNT(rp.id) as player_count
      FROM rooms r
      LEFT JOIN room_players rp ON r.id = rp.room_id
      WHERE r.id = ${roomId}
      GROUP BY r.id
    `;

    if (rooms.length === 0) return;

    const players = await sql`
      SELECT rp.*, u.username, u.first_name, u.photo_url, u.chips
      FROM room_players rp
      JOIN users u ON rp.telegram_id = u.telegram_id
      WHERE rp.room_id = ${roomId}
      ORDER BY rp.seat_number
    `;

    // Oyun durumunu kontrol et
    const game = await sql`
      SELECT * FROM games
      WHERE room_id = ${roomId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let gamePlayers: typeof players = [];
    if (game[0]) {
      gamePlayers = await sql`
        SELECT gp.*, u.first_name, u.username, u.photo_url, u.chips as user_chips
        FROM game_players gp
        JOIN users u ON gp.telegram_id = u.telegram_id
        WHERE gp.game_id = ${game[0].id}
        ORDER BY gp.seat_number
      `;
    }

    // Eğer aktif oyun varsa, oyun durumunu gönder
    if (game[0] && game[0].status !== 'ended') {
      const gameData = {
        id: game[0].id,
        room_id: game[0].room_id,
        status: game[0].status,
        dealer_cards: game[0].dealer_cards || [],
        dealer_score: game[0].dealer_score || 0,
        current_player_index: game[0].current_player_index,
        betting_end_time: game[0].betting_end_time,
        players: gamePlayers.map((p) => ({
          id: String(p.id),
          telegramId: p.telegram_id,
          name: p.first_name || p.username || 'Oyuncu',
          avatar: p.photo_url || '',
          seatNumber: p.seat_number,
          bet: p.bet || 0,
          cards: p.cards || [],
          status: p.status,
          isTurn: p.is_turn,
          balance: p.user_chips,
        })),
      };
      broadcastToRoom(roomId, 'game_update', { game: gameData });
    } else {
      // Oyun yoksa veya bittiyse, sadece oda durumunu gönder
      const roomData = {
        id: rooms[0].id,
        name: rooms[0].name,
        min_bet: rooms[0].min_bet,
        max_bet: rooms[0].max_bet,
        status: rooms[0].status,
        player_count: players.length,
        players: players.map((p) => ({
          id: String(p.id),
          telegramId: p.telegram_id,
          name: p.first_name || p.username || 'Oyuncu',
          avatar: p.photo_url || '',
          seatNumber: p.seat_number,
          status: 'waiting',
          balance: p.chips,
        })),
      };

      // game_update olarak gönder çünkü client onu dinliyor
      broadcastToRoom(roomId, 'game_update', {
        game: {
          id: 0,
          room_id: roomId,
          status: 'waiting',
          dealer_cards: [],
          dealer_score: 0,
          current_player_index: -1,
          betting_end_time: null,
          players: roomData.players.map(p => ({
            ...p,
            cards: [],
            bet: 0,
            isTurn: false,
          })),
        }
      });
    }
  } catch (error) {
    console.error('Broadcast room state error:', error);
  }
}

// Event yayınlama helper'ları - diğer API route'lardan çağrılacak
export const gameEvents = {
  playerJoined: async (roomId: string, player: unknown) => {
    broadcastToRoom(roomId, 'player_joined', player);
    await broadcastRoomState(roomId);
    await broadcastRoomsToLobby();
  },
  playerLeft: async (roomId: string, telegramId: number) => {
    broadcastToRoom(roomId, 'player_left', { telegramId });
    await broadcastRoomState(roomId);
    await broadcastRoomsToLobby();
  },
  seatChanged: async (roomId: string, telegramId: number, newSeat: number) => {
    broadcastToRoom(roomId, 'seat_changed', { telegramId, newSeat });
    await broadcastRoomState(roomId);
    await broadcastRoomsToLobby();
  },
  betPlaced: (roomId: string, data: unknown) => {
    broadcastToRoom(roomId, 'bet_placed', data);
  },
  cardsDealt: (roomId: string, data: unknown) => {
    broadcastToRoom(roomId, 'cards_dealt', data);
  },
  playerAction: (roomId: string, action: string, data: unknown) => {
    broadcastToRoom(roomId, `player_${action}`, data);
  },
  gameStateUpdate: (roomId: string, game: unknown) => {
    broadcastToRoom(roomId, 'game_update', { game });
  },
  dealerTurn: (roomId: string, data: unknown) => {
    broadcastToRoom(roomId, 'dealer_turn', data);
  },
  gameResults: (roomId: string, results: unknown) => {
    broadcastToRoom(roomId, 'game_results', results);
  },
  roomCreated: async (room: unknown) => {
    broadcastToLobby('room_created', room);
    await broadcastRoomsToLobby();
  },
  tournamentUpdate: (tournament: unknown) => {
    broadcastToLobby('tournament_update', tournament);
  },
};
