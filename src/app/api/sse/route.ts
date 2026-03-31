import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// Aktif bağlantıları takip et
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Event gönderme yardımcı fonksiyonu
function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get('room_id') || 'lobby';
  const telegramId = searchParams.get('telegram_id');

  const stream = new ReadableStream({
    start(controller) {
      // Bağlantıyı kaydet
      if (!connections.has(roomId)) {
        connections.set(roomId, new Set());
      }
      connections.get(roomId)!.add(controller);

      // İlk bağlantı mesajı
      sendEvent(controller, 'connected', {
        roomId,
        telegramId,
        timestamp: new Date().toISOString(),
      });

      // Heartbeat - bağlantıyı canlı tut
      const heartbeat = setInterval(() => {
        try {
          sendEvent(controller, 'heartbeat', { timestamp: new Date().toISOString() });
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // İlk veriyi gönder
      (async () => {
        try {
          if (roomId === 'lobby') {
            // Lobby için odaları gönder
            const rooms = await sql`
              SELECT r.*, COUNT(rp.id) as player_count
              FROM rooms r
              LEFT JOIN room_players rp ON r.id = rp.room_id
              GROUP BY r.id
              ORDER BY r.created_at DESC
            `;
            sendEvent(controller, 'rooms_update', { rooms });

            // Aktif turnuvaları gönder
            const tournaments = await sql`
              SELECT * FROM tournaments
              WHERE status IN ('registering', 'running')
              ORDER BY start_time ASC
            `;
            sendEvent(controller, 'tournaments_update', { tournaments });
          } else {
            // Oda için oyun durumunu gönder
            const game = await sql`
              SELECT * FROM games
              WHERE room_id = ${roomId}
              ORDER BY created_at DESC
              LIMIT 1
            `;

            if (game[0]) {
              const players = await sql`
                SELECT gp.*, u.first_name, u.avatar
                FROM game_players gp
                JOIN users u ON gp.telegram_id = u.telegram_id
                WHERE gp.game_id = ${game[0].id}
                ORDER BY gp.seat_number
              `;

              sendEvent(controller, 'game_update', {
                game: {
                  ...game[0],
                  players: players.map(p => ({
                    id: String(p.id),
                    telegramId: p.telegram_id,
                    name: p.first_name || 'Oyuncu',
                    avatar: p.avatar || '🎭',
                    seatNumber: p.seat_number,
                    bet: p.bet,
                    cards: p.cards || [],
                    status: p.status,
                    isTurn: p.is_turn,
                  })),
                },
              });
            }
          }
        } catch (error) {
          console.error('SSE initial data error:', error);
        }
      })();

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.get(roomId)?.delete(controller);
        if (connections.get(roomId)?.size === 0) {
          connections.delete(roomId);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Event yayınlama helper'ları - diğer API route'lardan çağrılacak
export const gameEvents = {
  playerJoined: (roomId: string, player: unknown) => {
    broadcastToRoom(roomId, 'player_joined', player);
    broadcastToLobby('rooms_update', null); // Lobby'yi de güncelle
  },
  playerLeft: (roomId: string, telegramId: number) => {
    broadcastToRoom(roomId, 'player_left', { telegramId });
    broadcastToLobby('rooms_update', null);
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
  roomCreated: (room: unknown) => {
    broadcastToLobby('room_created', room);
  },
  tournamentUpdate: (tournament: unknown) => {
    broadcastToLobby('tournament_update', tournament);
  },
};
