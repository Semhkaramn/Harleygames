import { sql } from './db';

// Turnuva tablosunu oluştur
export async function initializeTournamentTables() {
  try {
    // Turnuvalar tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS tournaments (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        entry_fee INT DEFAULT 100,
        prize_pool BIGINT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'registering',
        start_time TIMESTAMP,
        max_players INT DEFAULT 8,
        min_players INT DEFAULT 4,
        current_round INT DEFAULT 0,
        total_rounds INT DEFAULT 3,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP
      )
    `;

    // Turnuva oyuncuları tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id VARCHAR(20) REFERENCES tournaments(id) ON DELETE CASCADE,
        telegram_id BIGINT,
        tournament_chips INT DEFAULT 1000,
        is_eliminated BOOLEAN DEFAULT FALSE,
        final_rank INT,
        prize_won BIGINT DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        eliminated_at TIMESTAMP,
        UNIQUE(tournament_id, telegram_id)
      )
    `;

    // Turnuva turları tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS tournament_rounds (
        id SERIAL PRIMARY KEY,
        tournament_id VARCHAR(20) REFERENCES tournaments(id) ON DELETE CASCADE,
        round_number INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        UNIQUE(tournament_id, round_number)
      )
    `;

    console.log('Tournament tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Tournament tables initialization error:', error);
    return false;
  }
}

// Turnuva oluştur
export async function createTournament(data: {
  name: string;
  entry_fee: number;
  max_players: number;
  min_players?: number;
  total_rounds?: number;
  created_by: number;
}) {
  const id = `T${Date.now().toString(36).toUpperCase()}`;
  const startTime = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika sonra

  const result = await sql`
    INSERT INTO tournaments (id, name, entry_fee, max_players, min_players, total_rounds, start_time, created_by)
    VALUES (
      ${id},
      ${data.name},
      ${data.entry_fee},
      ${data.max_players},
      ${data.min_players || 4},
      ${data.total_rounds || 3},
      ${startTime},
      ${data.created_by}
    )
    RETURNING *
  `;
  return result[0];
}

// Aktif turnuvaları getir
export async function getActiveTournaments() {
  const result = await sql`
    SELECT t.*,
           COUNT(tp.id) as player_count,
           ARRAY_AGG(
             json_build_object(
               'telegram_id', tp.telegram_id,
               'tournament_chips', tp.tournament_chips,
               'is_eliminated', tp.is_eliminated
             )
           ) FILTER (WHERE tp.id IS NOT NULL) as players
    FROM tournaments t
    LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
    WHERE t.status IN ('registering', 'running')
    GROUP BY t.id
    ORDER BY t.start_time ASC
  `;
  return result;
}

// Turnuva detayları
export async function getTournament(tournamentId: string) {
  const result = await sql`
    SELECT t.*,
           COUNT(tp.id) as player_count
    FROM tournaments t
    LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
    WHERE t.id = ${tournamentId}
    GROUP BY t.id
  `;
  return result[0] || null;
}

// Turnuva oyuncularını getir
export async function getTournamentPlayers(tournamentId: string) {
  const result = await sql`
    SELECT tp.*, u.first_name, u.username, u.avatar
    FROM tournament_players tp
    JOIN users u ON tp.telegram_id = u.telegram_id
    WHERE tp.tournament_id = ${tournamentId}
    ORDER BY tp.tournament_chips DESC, tp.is_eliminated ASC
  `;
  return result;
}

// Turnuvaya katıl
export async function joinTournament(tournamentId: string, telegramId: number) {
  // Önce turnuvayı kontrol et
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    return { success: false, error: 'Turnuva bulunamadı' };
  }

  if (tournament.status !== 'registering') {
    return { success: false, error: 'Turnuva kayıtları kapandı' };
  }

  if (Number(tournament.player_count) >= tournament.max_players) {
    return { success: false, error: 'Turnuva dolu' };
  }

  // Kullanıcı bakiyesini kontrol et
  const user = await sql`SELECT * FROM users WHERE telegram_id = ${telegramId}`;
  if (!user[0] || user[0].chips < tournament.entry_fee) {
    return { success: false, error: 'Yetersiz bakiye' };
  }

  try {
    // Chip düş
    await sql`
      UPDATE users
      SET chips = chips - ${tournament.entry_fee}
      WHERE telegram_id = ${telegramId}
    `;

    // Prize pool'a ekle
    await sql`
      UPDATE tournaments
      SET prize_pool = prize_pool + ${tournament.entry_fee}
      WHERE id = ${tournamentId}
    `;

    // Oyuncuyu ekle
    const result = await sql`
      INSERT INTO tournament_players (tournament_id, telegram_id, tournament_chips)
      VALUES (${tournamentId}, ${telegramId}, 1000)
      ON CONFLICT (tournament_id, telegram_id) DO NOTHING
      RETURNING *
    `;

    if (!result[0]) {
      // Zaten kayıtlı, chip'i geri ver
      await sql`
        UPDATE users
        SET chips = chips + ${tournament.entry_fee}
        WHERE telegram_id = ${telegramId}
      `;
      await sql`
        UPDATE tournaments
        SET prize_pool = prize_pool - ${tournament.entry_fee}
        WHERE id = ${tournamentId}
      `;
      return { success: false, error: 'Zaten kayıtlısınız' };
    }

    // Yeterli oyuncu varsa turnuvayı başlat
    const updatedTournament = await getTournament(tournamentId);
    if (Number(updatedTournament.player_count) >= tournament.min_players) {
      // Otomatik başlatma zamanlaması
    }

    return { success: true, player: result[0] };
  } catch (error) {
    console.error('Join tournament error:', error);
    return { success: false, error: 'Katılım hatası' };
  }
}

// Turnuvadan ayrıl (sadece kayıt aşamasında)
export async function leaveTournament(tournamentId: string, telegramId: number) {
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.status !== 'registering') {
    return { success: false, error: 'Turnuvadan ayrılamazsınız' };
  }

  try {
    // Oyuncuyu sil
    const deleted = await sql`
      DELETE FROM tournament_players
      WHERE tournament_id = ${tournamentId} AND telegram_id = ${telegramId}
      RETURNING *
    `;

    if (deleted[0]) {
      // Chip'i geri ver
      await sql`
        UPDATE users
        SET chips = chips + ${tournament.entry_fee}
        WHERE telegram_id = ${telegramId}
      `;

      // Prize pool'dan düş
      await sql`
        UPDATE tournaments
        SET prize_pool = prize_pool - ${tournament.entry_fee}
        WHERE id = ${tournamentId}
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Leave tournament error:', error);
    return { success: false, error: 'Ayrılma hatası' };
  }
}

// Turnuvayı başlat
export async function startTournament(tournamentId: string) {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    return { success: false, error: 'Turnuva bulunamadı' };
  }

  if (tournament.status !== 'registering') {
    return { success: false, error: 'Turnuva zaten başladı' };
  }

  if (Number(tournament.player_count) < tournament.min_players) {
    return { success: false, error: 'Yeterli oyuncu yok' };
  }

  try {
    // Turnuvayı başlat
    await sql`
      UPDATE tournaments
      SET status = 'running',
          started_at = CURRENT_TIMESTAMP,
          current_round = 1
      WHERE id = ${tournamentId}
    `;

    // İlk turu oluştur
    await sql`
      INSERT INTO tournament_rounds (tournament_id, round_number, status, started_at)
      VALUES (${tournamentId}, 1, 'running', CURRENT_TIMESTAMP)
    `;

    return { success: true };
  } catch (error) {
    console.error('Start tournament error:', error);
    return { success: false, error: 'Başlatma hatası' };
  }
}

// Oyuncu eleme
export async function eliminatePlayer(tournamentId: string, telegramId: number, rank: number) {
  const result = await sql`
    UPDATE tournament_players
    SET is_eliminated = TRUE,
        final_rank = ${rank},
        eliminated_at = CURRENT_TIMESTAMP
    WHERE tournament_id = ${tournamentId} AND telegram_id = ${telegramId}
    RETURNING *
  `;
  return result[0];
}

// Turnuvayı bitir ve ödülleri dağıt
export async function endTournament(tournamentId: string) {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    return { success: false, error: 'Turnuva bulunamadı' };
  }

  const players = await getTournamentPlayers(tournamentId);
  const activePlayers = players.filter(p => !p.is_eliminated);

  // Sıralama (chip'e göre)
  const sortedPlayers = [...activePlayers].sort((a, b) => b.tournament_chips - a.tournament_chips);

  // Ödül dağılımı (50%, 30%, 20%)
  const prizeDistribution = [0.5, 0.3, 0.2];
  const prizePool = Number(tournament.prize_pool);

  for (let i = 0; i < Math.min(3, sortedPlayers.length); i++) {
    const player = sortedPlayers[i];
    const prize = Math.floor(prizePool * prizeDistribution[i]);

    // Ödülü ver
    await sql`
      UPDATE users
      SET chips = chips + ${prize}
      WHERE telegram_id = ${player.telegram_id}
    `;

    // Kaydet
    await sql`
      UPDATE tournament_players
      SET final_rank = ${i + 1}, prize_won = ${prize}
      WHERE tournament_id = ${tournamentId} AND telegram_id = ${player.telegram_id}
    `;
  }

  // Turnuvayı bitir
  await sql`
    UPDATE tournaments
    SET status = 'finished', ended_at = CURRENT_TIMESTAMP
    WHERE id = ${tournamentId}
  `;

  return {
    success: true,
    winners: sortedPlayers.slice(0, 3).map((p, i) => ({
      ...p,
      rank: i + 1,
      prize: Math.floor(prizePool * prizeDistribution[i]),
    })),
  };
}

// Tamamlanmış turnuvaları getir
export async function getFinishedTournaments(limit = 10) {
  const result = await sql`
    SELECT t.*,
           (SELECT COUNT(*) FROM tournament_players WHERE tournament_id = t.id) as player_count
    FROM tournaments t
    WHERE t.status = 'finished'
    ORDER BY t.ended_at DESC
    LIMIT ${limit}
  `;
  return result;
}

// Kullanıcının turnuva geçmişi
export async function getUserTournamentHistory(telegramId: number, limit = 10) {
  const result = await sql`
    SELECT tp.*, t.name, t.prize_pool, t.entry_fee,
           (SELECT COUNT(*) FROM tournament_players WHERE tournament_id = t.id) as total_players
    FROM tournament_players tp
    JOIN tournaments t ON tp.tournament_id = t.id
    WHERE tp.telegram_id = ${telegramId}
    ORDER BY tp.joined_at DESC
    LIMIT ${limit}
  `;
  return result;
}
