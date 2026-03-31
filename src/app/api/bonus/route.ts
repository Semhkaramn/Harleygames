import { NextRequest, NextResponse } from 'next/server';
import { sql, addChips, logTransaction } from '@/lib/db';

const DAILY_BONUS_AMOUNT = 1000;
const BONUS_COOLDOWN_HOURS = 24;

// Günlük bonus al
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegram_id } = body;

    if (!telegram_id) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    // Son bonus zamanını kontrol et
    const transactions = await sql`
      SELECT created_at FROM transactions
      WHERE telegram_id = ${telegram_id} AND type = 'daily_bonus'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (transactions.length > 0) {
      const lastBonus = new Date(transactions[0].created_at);
      const now = new Date();
      const hoursSinceLastBonus = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastBonus < BONUS_COOLDOWN_HOURS) {
        const remainingHours = Math.ceil(BONUS_COOLDOWN_HOURS - hoursSinceLastBonus);
        return NextResponse.json({
          error: 'Bonus henüz hazır değil',
          remaining_hours: remainingHours,
          next_bonus_at: new Date(lastBonus.getTime() + BONUS_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
        }, { status: 400 });
      }
    }

    // Bonus ver
    const updatedUser = await addChips(telegram_id, DAILY_BONUS_AMOUNT);

    // İşlemi kaydet
    await logTransaction(telegram_id, 'daily_bonus', DAILY_BONUS_AMOUNT, 'Günlük bonus');

    return NextResponse.json({
      success: true,
      amount: DAILY_BONUS_AMOUNT,
      new_balance: updatedUser?.chips || 0,
    });
  } catch (error) {
    console.error('Bonus error:', error);
    return NextResponse.json({ error: 'Failed to claim bonus' }, { status: 500 });
  }
}

// Bonus durumunu kontrol et
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    const transactions = await sql`
      SELECT created_at FROM transactions
      WHERE telegram_id = ${telegramId} AND type = 'daily_bonus'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (transactions.length === 0) {
      return NextResponse.json({
        available: true,
        amount: DAILY_BONUS_AMOUNT,
      });
    }

    const lastBonus = new Date(transactions[0].created_at);
    const now = new Date();
    const hoursSinceLastBonus = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastBonus >= BONUS_COOLDOWN_HOURS) {
      return NextResponse.json({
        available: true,
        amount: DAILY_BONUS_AMOUNT,
      });
    }

    const remainingHours = Math.ceil(BONUS_COOLDOWN_HOURS - hoursSinceLastBonus);
    return NextResponse.json({
      available: false,
      remaining_hours: remainingHours,
      next_bonus_at: new Date(lastBonus.getTime() + BONUS_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Bonus status error:', error);
    return NextResponse.json({ error: 'Failed to check bonus status' }, { status: 500 });
  }
}
