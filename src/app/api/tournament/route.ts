import { NextRequest, NextResponse } from 'next/server';
import {
  initializeTournamentTables,
  createTournament,
  getActiveTournaments,
  getTournament,
  getTournamentPlayers,
  joinTournament,
  leaveTournament,
  startTournament,
  endTournament,
  getFinishedTournaments,
  getUserTournamentHistory,
} from '@/lib/tournament';

// Tabloları initialize et (ilk çağrıda)
let tablesInitialized = false;
async function ensureTables() {
  if (!tablesInitialized) {
    await initializeTournamentTables();
    tablesInitialized = true;
  }
}

// GET - Turnuvaları listele
export async function GET(request: NextRequest) {
  await ensureTables();

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const telegramId = searchParams.get('telegram_id');

  try {
    // Tek turnuva detayı
    if (id) {
      const tournament = await getTournament(id);
      if (!tournament) {
        return NextResponse.json({ error: 'Turnuva bulunamadı' }, { status: 404 });
      }

      const players = await getTournamentPlayers(id);
      return NextResponse.json({
        tournament: {
          ...tournament,
          players: players.map(p => ({
            telegramId: p.telegram_id,
            name: p.first_name || p.username || 'Oyuncu',
            avatar: p.avatar || '🎭',
            chips: p.tournament_chips,
            isEliminated: p.is_eliminated,
            rank: p.final_rank,
            prize: p.prize_won,
          })),
        },
      });
    }

    // Kullanıcı turnuva geçmişi
    if (telegramId && status === 'history') {
      const history = await getUserTournamentHistory(Number(telegramId));
      return NextResponse.json({ history });
    }

    // Bitmiş turnuvalar
    if (status === 'finished') {
      const tournaments = await getFinishedTournaments();
      return NextResponse.json({ tournaments });
    }

    // Aktif turnuvalar (varsayılan)
    const tournaments = await getActiveTournaments();
    return NextResponse.json({
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        entryFee: t.entry_fee,
        prizePool: Number(t.prize_pool),
        status: t.status,
        startTime: t.start_time,
        playerCount: Number(t.player_count),
        maxPlayers: t.max_players,
        minPlayers: t.min_players,
        currentRound: t.current_round,
        totalRounds: t.total_rounds,
      })),
    });
  } catch (error) {
    console.error('Tournament GET error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Turnuva oluştur veya katıl
export async function POST(request: NextRequest) {
  await ensureTables();

  try {
    const body = await request.json();
    const { action, tournament_id, telegram_id, name, entry_fee, max_players } = body;

    switch (action) {
      case 'create': {
        if (!name || !telegram_id) {
          return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
        }

        const tournament = await createTournament({
          name,
          entry_fee: entry_fee || 100,
          max_players: max_players || 8,
          created_by: telegram_id,
        });

        return NextResponse.json({ success: true, tournament });
      }

      case 'join': {
        if (!tournament_id || !telegram_id) {
          return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
        }

        const result = await joinTournament(tournament_id, telegram_id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, player: result.player });
      }

      case 'leave': {
        if (!tournament_id || !telegram_id) {
          return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
        }

        const result = await leaveTournament(tournament_id, telegram_id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'start': {
        if (!tournament_id) {
          return NextResponse.json({ error: 'Turnuva ID gerekli' }, { status: 400 });
        }

        const result = await startTournament(tournament_id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'end': {
        if (!tournament_id) {
          return NextResponse.json({ error: 'Turnuva ID gerekli' }, { status: 400 });
        }

        const result = await endTournament(tournament_id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, winners: result.winners });
      }

      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tournament POST error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
