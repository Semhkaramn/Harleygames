import { neon } from '@neondatabase/serverless';

// Neon.tech PostgreSQL bağlantısı
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
}

const sql = neon(DATABASE_URL || '');

// Veritabanı şemasını oluştur
export async function initializeDatabase() {
  try {
    // Kullanıcılar tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        avatar VARCHAR(50) DEFAULT '🎭',
        photo_url TEXT,
        chips BIGINT DEFAULT 1000,
        total_wins INT DEFAULT 0,
        total_losses INT DEFAULT 0,
        total_games INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // photo_url column ekle (eğer yoksa)
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT
    `.catch(() => {/* column already exists */});

    // Oyun odaları tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        min_bet INT DEFAULT 10,
        max_bet INT DEFAULT 1000,
        max_players INT DEFAULT 6,
        status VARCHAR(20) DEFAULT 'waiting',
        created_by BIGINT REFERENCES users(telegram_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Oyunlar tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(20) REFERENCES rooms(id),
        status VARCHAR(20) DEFAULT 'betting',
        dealer_cards JSONB DEFAULT '[]',
        dealer_score INT DEFAULT 0,
        deck JSONB DEFAULT '[]',
        current_player_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP
      )
    `;

    // Oyuncu-Oyun ilişkisi tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS game_players (
        id SERIAL PRIMARY KEY,
        game_id INT REFERENCES games(id),
        user_id INT REFERENCES users(id),
        telegram_id BIGINT,
        seat_number INT,
        bet INT DEFAULT 0,
        cards JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'waiting',
        is_turn BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Oda oyuncuları tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS room_players (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(20) REFERENCES rooms(id),
        telegram_id BIGINT,
        seat_number INT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, seat_number)
      )
    `;

    // İşlem geçmişi tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id),
        type VARCHAR(20) NOT NULL,
        amount BIGINT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

// Kullanıcı işlemleri
export async function getUser(telegramId: number) {
  const result = await sql`
    SELECT * FROM users WHERE telegram_id = ${telegramId}
  `;
  return result[0] || null;
}

export async function createUser(userData: {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}) {
  const result = await sql`
    INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
    VALUES (${userData.telegram_id}, ${userData.username || null}, ${userData.first_name || null}, ${userData.last_name || null}, ${userData.photo_url || null})
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, users.username),
      first_name = COALESCE(EXCLUDED.first_name, users.first_name),
      last_name = COALESCE(EXCLUDED.last_name, users.last_name),
      photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return result[0];
}

export async function updateUserChips(telegramId: number, amount: number, type: 'add' | 'subtract') {
  // Use separate queries for add and subtract to avoid SQL injection
  if (type === 'add') {
    const result = await sql`
      UPDATE users SET
        chips = chips + ${Math.abs(amount)},
        updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ${telegramId}
      RETURNING *
    `;
    return result[0];
  } else {
    const result = await sql`
      UPDATE users SET
        chips = chips - ${Math.abs(amount)},
        updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ${telegramId}
      RETURNING *
    `;
    return result[0];
  }
}

export async function addChips(telegramId: number, amount: number) {
  const result = await sql`
    UPDATE users SET
      chips = chips + ${amount},
      updated_at = CURRENT_TIMESTAMP
    WHERE telegram_id = ${telegramId}
    RETURNING *
  `;
  return result[0];
}

export async function subtractChips(telegramId: number, amount: number) {
  // Önce yeterli bakiye olup olmadığını kontrol et
  const user = await getUser(telegramId);
  if (!user || user.chips < amount) {
    return null; // Yetersiz bakiye
  }

  const result = await sql`
    UPDATE users SET
      chips = chips - ${amount},
      updated_at = CURRENT_TIMESTAMP
    WHERE telegram_id = ${telegramId} AND chips >= ${amount}
    RETURNING *
  `;
  return result[0];
}

export async function updateUserStats(telegramId: number, won: boolean) {
  const result = await sql`
    UPDATE users SET
      total_games = total_games + 1,
      total_wins = total_wins + ${won ? 1 : 0},
      total_losses = total_losses + ${won ? 0 : 1},
      updated_at = CURRENT_TIMESTAMP
    WHERE telegram_id = ${telegramId}
    RETURNING *
  `;
  return result[0];
}

// Oda işlemleri
export async function getRooms() {
  const result = await sql`
    SELECT r.*, COUNT(rp.id) as player_count
    FROM rooms r
    LEFT JOIN room_players rp ON r.id = rp.room_id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;
  return result;
}

export async function getRoom(roomId: string) {
  const result = await sql`
    SELECT r.*, COUNT(rp.id) as player_count
    FROM rooms r
    LEFT JOIN room_players rp ON r.id = rp.room_id
    WHERE r.id = ${roomId}
    GROUP BY r.id
  `;
  return result[0] || null;
}

export async function createRoom(roomData: {
  id: string;
  name: string;
  min_bet: number;
  max_bet: number;
  created_by: number;
}) {
  const result = await sql`
    INSERT INTO rooms (id, name, min_bet, max_bet, created_by)
    VALUES (${roomData.id}, ${roomData.name}, ${roomData.min_bet}, ${roomData.max_bet}, ${roomData.created_by})
    RETURNING *
  `;
  return result[0];
}

export async function joinRoom(roomId: string, telegramId: number, seatNumber: number) {
  const result = await sql`
    INSERT INTO room_players (room_id, telegram_id, seat_number)
    VALUES (${roomId}, ${telegramId}, ${seatNumber})
    ON CONFLICT (room_id, seat_number) DO NOTHING
    RETURNING *
  `;
  return result[0];
}

export async function leaveRoom(roomId: string, telegramId: number) {
  await sql`
    DELETE FROM room_players
    WHERE room_id = ${roomId} AND telegram_id = ${telegramId}
  `;
}

export async function getRoomPlayers(roomId: string) {
  const result = await sql`
    SELECT rp.*, u.username, u.first_name, u.avatar, u.chips
    FROM room_players rp
    JOIN users u ON rp.telegram_id = u.telegram_id
    WHERE rp.room_id = ${roomId}
    ORDER BY rp.seat_number
  `;
  return result;
}

// Liderlik tablosu
export async function getLeaderboard(limit = 10) {
  const result = await sql`
    SELECT telegram_id, username, first_name, avatar, chips, total_wins, total_games
    FROM users
    ORDER BY chips DESC
    LIMIT ${limit}
  `;
  return result;
}

// İşlem kaydet
export async function logTransaction(telegramId: number, type: string, amount: number, description: string) {
  await sql`
    INSERT INTO transactions (telegram_id, type, amount, description)
    VALUES (${telegramId}, ${type}, ${amount}, ${description})
  `;
}

export { sql };
