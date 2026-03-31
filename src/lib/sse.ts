// SSE bağlantı yönetimi ve event yayınlama

// Aktif bağlantıları takip et
export const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Event gönderme yardımcı fonksiyonu
export function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
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
