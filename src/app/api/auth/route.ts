import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/db';

// Veritabanını başlat
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Veritabanını ilk istekte başlat
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const body = await request.json();
    const { telegram_id, username, first_name, last_name, photo_url, init_data } = body;

    if (!telegram_id) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    // Kullanıcıyı bul veya oluştur
    const existingUsers = await sql`
      SELECT * FROM users WHERE telegram_id = ${telegram_id}
    `;

    let user;

    if (existingUsers.length > 0) {
      // Mevcut kullanıcıyı güncelle
      const updateResult = await sql`
        UPDATE users SET
          username = COALESCE(${username || null}, username),
          first_name = COALESCE(${first_name || null}, first_name),
          last_name = COALESCE(${last_name || null}, last_name),
          photo_url = COALESCE(${photo_url || null}, photo_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ${telegram_id}
        RETURNING *
      `;
      user = updateResult[0];
    } else {
      // Yeni kullanıcı oluştur
      const createResult = await sql`
        INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, chips)
        VALUES (${telegram_id}, ${username || null}, ${first_name || null}, ${last_name || null}, ${photo_url || null}, 1000)
        RETURNING *
      `;
      user = createResult[0];
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        avatar: user.avatar,
        chips: user.chips,
        total_wins: user.total_wins,
        total_losses: user.total_losses,
        total_games: user.total_games,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

// Kullanıcı bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    const users = await sql`
      SELECT * FROM users WHERE telegram_id = ${telegramId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    return NextResponse.json({
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        avatar: user.avatar,
        chips: user.chips,
        total_wins: user.total_wins,
        total_losses: user.total_losses,
        total_games: user.total_games,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
