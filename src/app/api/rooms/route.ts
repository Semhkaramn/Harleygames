import { NextRequest, NextResponse } from 'next/server';
import { getRooms, createRoom, getRoom, joinRoom, leaveRoom, getRoomPlayers } from '@/lib/db';

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
      const room = await getRoom(roomId);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const players = await getRoomPlayers(roomId);
      return NextResponse.json({ room: { ...room, players } });
    }

    // Tüm odalar
    const rooms = await getRooms();
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

    const roomId = generateRoomId();
    const room = await createRoom({
      id: roomId,
      name: name || `Oda ${roomId}`,
      min_bet: min_bet || 10,
      max_bet: max_bet || 1000,
      created_by: telegram_id,
    });

    return NextResponse.json({ room });
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

      const result = await joinRoom(room_id, telegram_id, seat_number);
      if (!result) {
        return NextResponse.json({ error: 'Seat already taken' }, { status: 400 });
      }

      return NextResponse.json({ success: true, seat: result });
    }

    if (action === 'leave') {
      await leaveRoom(room_id, telegram_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Room action error:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
