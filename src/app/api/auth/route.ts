import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUser, initializeDatabase } from '@/lib/db';
import crypto from 'crypto';

// Telegram initData doğrulama
function verifyTelegramAuth(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    params.delete('hash');
    const dataCheckArr = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return calculatedHash === hash;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData, user } = body;

    // Development modunda doğrulama atla
    const isDev = process.env.NODE_ENV === 'development';
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

    // Telegram doğrulama (production'da zorunlu)
    if (!isDev && botToken && !verifyTelegramAuth(initData, botToken)) {
      return NextResponse.json({ error: 'Invalid Telegram auth' }, { status: 401 });
    }

    // Kullanıcı bilgisi gerekli
    if (!user || !user.id) {
      return NextResponse.json({ error: 'User data required' }, { status: 400 });
    }

    // Veritabanını başlat (sadece ilk kez)
    await initializeDatabase();

    // Kullanıcıyı oluştur veya güncelle
    const dbUser = await createUser({
      telegram_id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    return NextResponse.json({
      success: true,
      user: dbUser,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    const user = await getUser(parseInt(telegramId));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
