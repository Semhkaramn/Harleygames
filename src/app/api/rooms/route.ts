import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// ID oluşturucu
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Tüm odaları getir
export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('id');

    if (roomId) {
      // Tek oda getir
      const rooms = await sql`
        SELECT r.*, COUNT(rp.id) as player_count
        FROM rooms r
        LEFT JOIN room_players rp ON r.id = rp.room_id
        WHERE r.id = ${roomId}
        GROUP BY r.id
      `;

      if (rooms.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const players = await sql`
        SELECT rp.*, u.username, u.first_name, u.avatar, u.chips
        FROM room_players rp
        JOIN users u ON rp.telegram_id = u.telegram_id
        WHERE rp.room_id = ${roomId}
        ORDER BY rp.seat_number
      `;

      return NextResponse.json({ room: { ...rooms[0], players } });
    }

    // Tüm odalar - boş odaları da temizle
    await cleanupEmptyRooms();

    const rooms = await sql`
      SELECT r.*, COUNT(rp.id) as player_count
      FROM rooms r
      LEFT JOIN room_players rp ON r.id = rp.room_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json({ error: 'Failed to get rooms' }, { status: 500 });
  }
}

// Yeni oda oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, min_bet, max_bet, telegram_id } = body;

    if (!telegram_id) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    // Validation
    const minBet = min_bet || 10;
    const maxBet = max_bet || 1000;

    if (minBet < 1) {
      return NextResponse.json({ error: 'Minimum bahis en az 1 olmalı' }, { status: 400 });
    }

    if (maxBet < minBet) {
      return NextResponse.json({ error: 'Maksimum bahis minimum bahisten büyük olmalı' }, { status: 400 });
    }

    if (maxBet > 100000) {
      return NextResponse.json({ error: 'Maksimum bahis 100.000\'den fazla olamaz' }, { status: 400 });
    }

    const roomId = generateRoomId();

    const result = await sql`
      INSERT INTO rooms (id, name, min_bet, max_bet, created_by, status)
      VALUES (${roomId}, ${name || `Oda ${roomId}`}, ${minBet}, ${maxBet}, ${telegram_id}, 'waiting')
      RETURNING *
    `;

    return NextResponse.json({ room: result[0] });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

// Odaya katıl/ayrıl
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, room_id, telegram_id, seat_number } = body;

    if (!room_id || !telegram_id) {
      return NextResponse.json({ error: 'Room ID and Telegram ID required' }, { status: 400 });
    }

    if (action === 'join') {
      if (seat_number === undefined) {
        return NextResponse.json({ error: 'Seat number required' }, { status: 400 });
      }

      // Seat number validation
      if (seat_number < 1 || seat_number > 6) {
        return NextResponse.json({ error: 'Geçersiz koltuk numarası' }, { status: 400 });
      }

      // Odanın var olduğunu kontrol et
      const rooms = await sql`SELECT * FROM rooms WHERE id = ${room_id}`;
      if (rooms.length === 0) {
        return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 });
      }

      // Oyuncu sayısını kontrol et
      const playerCount = await sql`
        SELECT COUNT(*) as count FROM room_players WHERE room_id = ${room_id}
      `;

      if (parseInt(playerCount[0].count) >= 6) {
        return NextResponse.json({ error: 'Oda dolu' }, { status: 400 });
      }

      // Race condition'ı önlemek için SELECT FOR UPDATE kullan
      const existingSeat = await sql`
        SELECT id FROM room_players
        WHERE room_id = ${room_id} AND seat_number = ${seat_number}
        FOR UPDATE
      `;

      if (existingSeat.length > 0) {
        return NextResponse.json({ error: 'Bu koltuk zaten dolu' }, { status: 400 });
      }

      // Oyuncunun zaten odada olup olmadığını kontrol et
      const existingPlayer = await sql`
        SELECT id FROM room_players
        WHERE room_id = ${room_id} AND telegram_id = ${telegram_id}
      `;

      if (existingPlayer.length > 0) {
        return NextResponse.json({ error: 'Zaten bu odasınız' }, { status: 400 });
      }

      // Oyuncuyu ekle
      const result = await sql`
        INSERT INTO room_players (room_id, telegram_id, seat_number)
        VALUES (${room_id}, ${telegram_id}, ${seat_number})
        RETURNING *
      `;

      return NextResponse.json({ success: true, seat: result[0] });
    }

    if (action === 'leave') {
      await sql`
        DELETE FROM room_players
        WHERE room_id = ${room_id} AND telegram_id = ${telegram_id}
      `;

      // Eğer oda boş kaldıysa, temizle
      const remainingPlayers = await sql`
        SELECT COUNT(*) as count FROM room_players WHERE room_id = ${room_id}
      `;

      if (parseInt(remainingPlayers[0].count) === 0) {
        // Odaya bağlı aktif oyun var mı kontrol et
        const activeGames = await sql`
          SELECT id FROM games
          WHERE room_id = ${room_id} AND status NOT IN ('results', 'ended')
        `;

        // Aktif oyun yoksa odayı sil
        if (activeGames.length === 0) {
          await deleteRoom(room_id);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Room action error:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}

// Oda silme (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('room_id');
    const telegramId = request.nextUrl.searchParams.get('telegram_id');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    // Odayı bul
    const rooms = await sql`SELECT * FROM rooms WHERE id = ${roomId}`;
    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 });
    }

    const room = rooms[0];

    // Sadece oda sahibi silebilir (eğer telegram_id verilmişse)
    if (telegramId && room.created_by !== parseInt(telegramId)) {
      return NextResponse.json({ error: 'Sadece oda sahibi odayı silebilir' }, { status: 403 });
    }

    // Aktif oyun var mı kontrol et
    const activeGames = await sql`
      SELECT id FROM games
      WHERE room_id = ${roomId} AND status NOT IN ('results', 'ended')
    `;

    if (activeGames.length > 0) {
      return NextResponse.json({ error: 'Aktif oyun varken oda silinemez' }, { status: 400 });
    }

    await deleteRoom(roomId);

    return NextResponse.json({ success: true, message: 'Oda silindi' });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}

// Yardımcı fonksiyonlar

// Boş odaları temizle
async function cleanupEmptyRooms() {
  try {
    // 1 saatten eski boş odaları bul
    const emptyRooms = await sql`
      SELECT r.id
      FROM rooms r
      LEFT JOIN room_players rp ON r.id = rp.room_id
      WHERE r.created_at < NOW() - INTERVAL '1 hour'
      GROUP BY r.id
      HAVING COUNT(rp.id) = 0
    `;

    for (const room of emptyRooms) {
      await deleteRoom(room.id);
    }

    // Bitmiş oyunları olan odaların durumunu güncelle
    await sql`
      UPDATE rooms r
      SET status = 'waiting'
      WHERE EXISTS (
        SELECT 1 FROM games g
        WHERE g.room_id = r.id
        AND g.status = 'results'
        AND g.ended_at < NOW() - INTERVAL '5 minutes'
      )
    `;

    console.log(`Cleaned up ${emptyRooms.length} empty rooms`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Odayı sil (tüm ilişkili verileri temizle)
async function deleteRoom(roomId: string) {
  try {
    // Önce game_players'ı sil
    await sql`
      DELETE FROM game_players
      WHERE game_id IN (SELECT id FROM games WHERE room_id = ${roomId})
    `;

    // Sonra games'i sil
    await sql`DELETE FROM games WHERE room_id = ${roomId}`;

    // Room players'ı sil
    await sql`DELETE FROM room_players WHERE room_id = ${roomId}`;

    // Son olarak odayı sil
    await sql`DELETE FROM rooms WHERE id = ${roomId}`;

    console.log(`Room ${roomId} deleted successfully`);
  } catch (error) {
    console.error(`Failed to delete room ${roomId}:`, error);
    throw error;
  }
}
