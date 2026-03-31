import { NextRequest, NextResponse } from 'next/server';

// Telegram Bot Token from environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// WebApp URL - değiştirilecek deploy sonrası
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://harleygames.netlify.app';

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
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Telegram API'ye mesaj gönder
async function sendTelegramMessage(chatId: number, text: string, options?: object) {
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

// Bot komutlarını handle et
async function handleCommand(message: TelegramMessage) {
  const text = message.text || '';
  const chatId = message.chat.id;
  const fromName = message.from.first_name;

  // /start komutu
  if (text.startsWith('/start')) {
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
/help veya /yardim - Bu mesaj

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

  // Grup mesajları için @bot_username ile bahsetme
  if (message.chat.type !== 'private' && text.toLowerCase().includes('blackjack')) {
    return sendGameInvite(chatId, fromName);
  }

  return null;
}

// Webhook POST handler
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // Mesaj varsa işle
    if (update.message) {
      await handleCommand(update.message);
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

  if (action === 'setWebhook') {
    const webhookUrl = request.nextUrl.searchParams.get('url') || `${WEBAPP_URL}/api/telegram`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
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

  return NextResponse.json({
    message: 'Telegram Bot API',
    actions: ['setWebhook', 'getWebhookInfo', 'deleteWebhook'],
    usage: '/api/telegram?action=setWebhook&url=https://your-domain.com/api/telegram'
  });
}
