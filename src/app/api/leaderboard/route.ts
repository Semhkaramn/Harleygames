import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getUser } from '@/lib/db';

interface LeaderboardUser {
  telegram_id: number | bigint;
  username: string | null;
  first_name: string | null;
  avatar: string | null;
  chips: number;
  total_wins: number;
  total_games: number;
}

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);
    const telegramId = request.nextUrl.searchParams.get('telegram_id');

    // Liderlik tablosu
    const leaderboard = await getLeaderboard(Math.min(limit, 100));

    // Kullanıcının sıralaması (opsiyonel)
    let userRank = null;
    let userData = null;

    if (telegramId) {
      userData = await getUser(parseInt(telegramId, 10));

      if (userData) {
        // Kullanıcının sıralamasını bul
        const index = leaderboard.findIndex(
          (u: { telegram_id: number | bigint }) => u.telegram_id.toString() === telegramId
        );

        if (index !== -1) {
          userRank = index + 1;
        } else {
          // Top 100'de değilse, gerçek sırasını hesapla (basit yaklaşım)
          userRank = '>100';
        }
      }
    }

    return NextResponse.json({
      leaderboard: leaderboard.map((user: LeaderboardUser, index: number) => ({
        rank: index + 1,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        avatar: user.avatar || '🎭',
        chips: user.chips,
        total_wins: user.total_wins,
        total_games: user.total_games,
        win_rate: user.total_games > 0
          ? Math.round((user.total_wins / user.total_games) * 100)
          : 0,
      })),
      user_rank: userRank,
      user_data: userData ? {
        telegram_id: userData.telegram_id,
        username: userData.username,
        first_name: userData.first_name,
        avatar: userData.avatar,
        chips: userData.chips,
        total_wins: userData.total_wins,
        total_games: userData.total_games,
      } : null,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
  }
}
