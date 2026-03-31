import { NextRequest, NextResponse } from 'next/server';

// Telegram Bot Token from environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// WebApp URL - değiştirilecek deploy sonrası
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://harleygames.netlify.app';

// Bot username (@ olmadan)
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'HarleyBlackjackBot';

// İzin verilen grup ID'leri (virgülle ayrılmış string olarak env'den alınır)
// Boş bırakılırsa tüm gruplarda çalışır
const ALLOWED_GROUP_IDS = process.env.ALLOWED_GROUP_IDS
  ? process.env.ALLOWED_GROUP_IDS.split(',').map(id => parseInt(id.trim()))
  : [];

// Debug modu
const DEBUG_MODE = process.env.TELEGRAM_DEBUG === 'true';

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
  };
  text?: string;
  date: number;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    message?: TelegramMessage;
    data?: string;
  };
}

// Telegram API'ye mesaj gönder
async function sendTelegramMessage(chatId: number, text: string, options?: object) {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set');
    return { ok: false, error: 'BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Send message error:', error);
    return { ok: false, error };
  }
}

// Callback query'ye cevap ver
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
  } catch (error) {
    console.error('Answer callback error:', error);
  }
}

// WebApp butonu ile mesaj gönder
async function sendGameInvite(chatId: number, fromName: string) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🎰 Oyuna Katıl',
          web_app: { url: WEBAPP_URL },
        },
      ],
      [
        {
          text: '🏆 Liderlik Tablosu',
          web_app: { url: `${WEBAPP_URL}?view=leaderboard` },
        },
      ],
    ],
  };

  const text = `🃏 <b>HARLEY GAMES</b> 🃏

${fromName} sizi Blackjack oynamaya davet ediyor!

🎯 Bahis yap, kart çek ve kazanan sen ol!
💰 Günlük bonus: 1000 chip
🏆 Liderlik tablosunda yerini al

Hemen katıl ve şansını dene!`;

  return sendTelegramMessage(chatId, text, { reply_markup: keyboard });
}

// Hızlı oyun başlat butonu
async function sendQuickPlay(chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '⚡ Hızlı Oyun',
          web_app: { url: `${WEBAPP_URL}?quick=true` },
        },
      ],
      [
        {
          text: '🏠 Oda Oluştur',
          web_app: { url: `${WEBAPP_URL}?create=true` },
        },
        {
          text: '🚪 Odaya Katıl',
          web_app: { url: `${WEBAPP_URL}?join=true` },
        },
      ],
    ],
  };

  const text = `🎰 <b>Hızlı Oyun</b>

Bir seçenek seç:

⚡ <b>Hızlı Oyun</b> - Anında bir masaya otur
🏠 <b>Oda Oluştur</b> - Kendi masanı kur
🚪 <b>Odaya Katıl</b> - Mevcut odalara göz at`;

  return sendTelegramMessage(chatId, text, { reply_markup: keyboard });
}

// Grubun izinli olup olmadığını kontrol et
function isGroupAllowed(chatId: number): boolean {
  // Eğer izin listesi boşsa, tüm gruplar izinli
  if (ALLOWED_GROUP_IDS.length === 0) {
    return true;
  }
  return ALLOWED_GROUP_IDS.includes(chatId);
}

// Bot'un mention edilip edilmediğini kontrol et
function isBotMentioned(text: string, entities?: TelegramMessage['entities']): boolean {
  if (!entities) return false;

  for (const entity of entities) {
    if (entity.type === 'mention') {
      const mention = text.substring(entity.offset, entity.offset + entity.length);
      if (mention.toLowerCase() === `@${BOT_USERNAME.toLowerCase()}`) {
        return true;
      }
    }
  }
  return false;
}

// Bot komutlarını handle et
async function handleCommand(message: TelegramMessage) {
  const text = message.text || '';
  const chatId = message.chat.id;
  const chatType = message.chat.type;
  const fromName = message.from.first_name;

  // Debug log
  if (DEBUG_MODE) {
    console.log(`[DEBUG] Message from ${chatType} (${chatId}): ${text}`);
  }

  // Grup mesajı kontrolü
  const isGroup = chatType === 'group' || chatType === 'supergroup';

  // Grup mesajlarında izin kontrolü
  if (isGroup && !isGroupAllowed(chatId)) {
    if (DEBUG_MODE) {
      console.log(`[DEBUG] Group ${chatId} is not in allowed list`);
    }
    return null; // İzinsiz gruplarda yanıt verme
  }

  // Grup mesajlarında bot mention veya komut kontrolü
  if (isGroup) {
    const isCommand = text.startsWith('/');
    const isMentioned = isBotMentioned(text, message.entities);
    const containsKeyword = /blackjack|harley|oyun|oyna/i.test(text);

    // Grup mesajlarında sadece mention veya komut ile yanıt ver
    if (!isCommand && !isMentioned && !containsKeyword) {
      return null;
    }
  }

  // /start komutu
  if (text.startsWith('/start')) {
    // start parametresi varsa işle
    const startParam = text.split(' ')[1];
    if (startParam) {
      // Örnek: /start room_ABC123
      if (startParam.startsWith('room_')) {
        const roomId = startParam.replace('room_', '');
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🎲 Odaya Katıl',
                web_app: { url: `${WEBAPP_URL}?room=${roomId}` },
              },
            ],
          ],
        };
        return sendTelegramMessage(chatId, `🎰 <b>${fromName}</b> tarafından davet edildiniz!\n\nOda ID: <code>${roomId}</code>`, { reply_markup: keyboard });
      }
    }
    return sendGameInvite(chatId, fromName);
  }

  // /play veya /oyun komutu
  if (text.startsWith('/play') || text.startsWith('/oyun')) {
    return sendQuickPlay(chatId);
  }

  // /help veya /yardim komutu
  if (text.startsWith('/help') || text.startsWith('/yardim')) {
    const helpText = `🎲 <b>HARLEY GAMES - Yardım</b>

<b>Komutlar:</b>
/start - Oyunu başlat
/play veya /oyun - Hızlı oyun menüsü
/rules veya /kurallar - Blackjack kuralları
/bonus - Günlük bonus al
/stats - İstatistiklerini gör
/invite - Davet linki oluştur
/help veya /yardim - Bu mesaj

<b>Grup Komutları:</b>
• Bot'u etiketle veya "blackjack" yaz
• /play@${BOT_USERNAME} - Grupta oyun başlat

<b>Oyun Hakkında:</b>
Blackjack'te amaç, 21'i geçmeden dealer'ı yenmektir.

<b>Kart Değerleri:</b>
• 2-10: Üzerindeki değer
• J, Q, K: 10 puan
• A (As): 1 veya 11 puan`;

    return sendTelegramMessage(chatId, helpText);
  }

  // /rules veya /kurallar komutu
  if (text.startsWith('/rules') || text.startsWith('/kurallar')) {
    const rulesText = `📜 <b>BLACKJACK KURALLARI</b>

<b>Amaç:</b>
Dealer'ı yenmek - 21'e en yakın eli elde et.

<b>Kart Değerleri:</b>
• Sayılar (2-10): Üzerindeki değer
• Resimler (J, Q, K): 10 puan
• As (A): 1 veya 11 puan

<b>Oyun Akışı:</b>
1️⃣ Bahis yap
2️⃣ 2 kart al
3️⃣ "Kart Al" veya "Dur" de
4️⃣ 21'i geçersen kaybedersin (Bust)
5️⃣ Dealer 17'ye kadar kart çeker

<b>Özel Durumlar:</b>
🎯 <b>Blackjack</b>: İlk 2 kart = 21 (1.5x kazanç)
✖️ <b>Katla</b>: Bahisi 2x yap, 1 kart al
🤝 <b>Berabere</b>: Aynı puan = bahis geri`;

    return sendTelegramMessage(chatId, rulesText);
  }

  // /bonus komutu
  if (text.startsWith('/bonus')) {
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🎁 Bonus Al',
            web_app: { url: `${WEBAPP_URL}?bonus=true` },
          },
        ],
      ],
    };

    const bonusText = `🎁 <b>GÜNLÜK BONUS</b>

Her gün 1000 chip kazan!

Son bonus alım zamanını kontrol etmek ve bonusunu almak için butona tıkla.`;

    return sendTelegramMessage(chatId, bonusText, { reply_markup: keyboard });
  }

  // /stats komutu
  if (text.startsWith('/stats')) {
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📊 İstatistikler',
            web_app: { url: `${WEBAPP_URL}?stats=true` },
          },
        ],
      ],
    };

    const statsText = `📊 <b>İSTATİSTİKLERİN</b>

Oyun istatistiklerini ve sıralamanı görmek için butona tıkla!`;

    return sendTelegramMessage(chatId, statsText, { reply_markup: keyboard });
  }

  // /invite komutu - Davet linki oluştur
  if (text.startsWith('/invite')) {
    const inviteLink = `https://t.me/${BOT_USERNAME}?start=ref_${message.from.id}`;
    const shareText = `🎰 Harley Games'te benimle Blackjack oyna! ${inviteLink}`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📤 Paylaş',
            url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('🎰 Harley Games\'te Blackjack oyna!')}`,
          },
        ],
        [
          {
            text: '🎮 Oyuna Git',
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    };

    return sendTelegramMessage(chatId, `🔗 <b>Davet Linkin:</b>\n<code>${inviteLink}</code>\n\nArkadaşlarını davet et ve birlikte oyna!`, { reply_markup: keyboard });
  }

  // /groupid komutu - Grup ID'sini göster (admin için)
  if (text.startsWith('/groupid')) {
    if (isGroup) {
      return sendTelegramMessage(chatId, `📍 <b>Grup Bilgileri:</b>\n\nGrup ID: <code>${chatId}</code>\nGrup Tipi: ${chatType}\nGrup Adı: ${message.chat.title || 'N/A'}`);
    } else {
      return sendTelegramMessage(chatId, `📍 Bu komut sadece gruplarda çalışır.\n\nChat ID: <code>${chatId}</code>`);
    }
  }

  // Grup mesajları için özel kelime tetikleyicileri
  if (isGroup) {
    // Bot mention veya anahtar kelime varsa oyun daveti gönder
    if (isBotMentioned(text, message.entities) || /blackjack|harley/i.test(text)) {
      return sendGameInvite(chatId, fromName);
    }
  }

  return null;
}

// Webhook POST handler
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    if (DEBUG_MODE) {
      console.log('[DEBUG] Received update:', JSON.stringify(update, null, 2));
    }

    // Mesaj varsa işle
    if (update.message) {
      await handleCommand(update.message);
    }

    // Callback query varsa işle
    if (update.callback_query) {
      await answerCallbackQuery(update.callback_query.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Webhook URL'ini ayarlamak için GET endpoint (manuel setup)
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 500 });
  }

  if (action === 'setWebhook') {
    const webhookUrl = request.nextUrl.searchParams.get('url') || `${WEBAPP_URL}/api/telegram`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  }

  if (action === 'getWebhookInfo') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    return NextResponse.json(result);
  }

  if (action === 'deleteWebhook') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const result = await response.json();
    return NextResponse.json(result);
  }

  if (action === 'setCommands') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Oyunu başlat' },
          { command: 'play', description: 'Hızlı oyun menüsü' },
          { command: 'bonus', description: 'Günlük bonus al' },
          { command: 'stats', description: 'İstatistiklerini gör' },
          { command: 'rules', description: 'Blackjack kuralları' },
          { command: 'invite', description: 'Davet linki oluştur' },
          { command: 'help', description: 'Yardım' },
        ],
      }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  }

  if (action === 'getMe') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const result = await response.json();
    return NextResponse.json(result);
  }

  return NextResponse.json({
    message: 'Telegram Bot API',
    bot_username: BOT_USERNAME,
    webapp_url: WEBAPP_URL,
    allowed_groups: ALLOWED_GROUP_IDS.length > 0 ? ALLOWED_GROUP_IDS : 'all',
    debug_mode: DEBUG_MODE,
    actions: ['setWebhook', 'getWebhookInfo', 'deleteWebhook', 'setCommands', 'getMe'],
    usage: '/api/telegram?action=setWebhook&url=https://your-domain.com/api/telegram',
    env_required: [
      'TELEGRAM_BOT_TOKEN - Bot token from @BotFather',
      'WEBAPP_URL - Your deployed app URL',
      'TELEGRAM_BOT_USERNAME - Bot username without @',
      'ALLOWED_GROUP_IDS - Comma-separated group IDs (optional)',
      'TELEGRAM_DEBUG - Set to "true" for debug logs (optional)',
    ]
  });
}
