# HARLEYGAMES - PROJE DURUMU VE TODO LİSTESİ

---

## 🚀 AKTİF GELİŞTİRME - V2.0

### 1️⃣ WebSocket/SSE ile Gerçek Zamanlı Güncelleme
- [ ] Server-Sent Events (SSE) endpoint oluştur (`/api/sse`)
- [ ] EventSource client hook oluştur (`useGameEvents.ts`)
- [ ] GameTable bileşenini SSE ile entegre et
- [ ] Lobby'de oda güncellemelerini gerçek zamanlı yap
- [ ] Oyuncu katılma/ayrılma bildirimleri
- [ ] Bahis yapıldığında diğer oyunculara bildirim
- [ ] Kart dağıtımı animasyonlu senkronizasyon
- [ ] Dealer sırası gerçek zamanlı gösterim
- [ ] Polling'i kaldır, sadece SSE kullan

### 2️⃣ Turnuva Sistemi
- [ ] Turnuva veritabanı tabloları oluştur
  - `tournaments` (id, name, entry_fee, prize_pool, status, start_time, max_players)
  - `tournament_players` (tournament_id, user_id, chips, eliminated, rank)
  - `tournament_rounds` (tournament_id, round_number, status)
- [ ] Turnuva API endpoints
  - GET /api/tournament - Aktif turnuvaları listele
  - POST /api/tournament - Yeni turnuva oluştur
  - POST /api/tournament/join - Turnuvaya katıl
  - GET /api/tournament/[id] - Turnuva detayları
  - POST /api/tournament/[id]/start - Turnuvayı başlat
- [ ] Tournament.tsx bileşenini gerçek verilerle doldur
- [ ] Turnuva lobby'si (kayıt, bekleme odası)
- [ ] Eliminasyon sistemi (en düşük chip'li elenir)
- [ ] Turnuva sıralaması ve ödül dağıtımı
- [ ] Turnuva geçmişi ve istatistikler
- [ ] Günlük/Haftalık otomatik turnuvalar

### 3️⃣ UI/UX Geliştirmeleri
- [ ] Yeni renk paleti ve gradient'ler
- [ ] Glassmorphism efektlerini güçlendir
- [ ] Kart animasyonları (flip, deal, slide)
- [ ] Chip animasyonları (stack, toss)
- [ ] Kazanç/Kayıp konfeti efektleri
- [ ] Loading skeleton'lar
- [ ] Toast bildirimleri geliştir
- [ ] Responsive tasarım iyileştirmeleri
- [ ] Dark/Light tema desteği
- [ ] Oyuncu avatarları sistemi
- [ ] Ses efektleri için altyapı (mute/unmute)
- [ ] Micro-interactions (hover, focus, active states)
- [ ] Progress bar'lar (bahis süresi, sıra bekleme)
- [ ] Emoji reactions sistemi

---

## ✅ TAMAMLANAN ÖZELLİKLER (V1.0)

- [x] Proje yapısı ve temel kurulum
- [x] Telegram WebApp entegrasyonu
- [x] Kullanıcı authentication (auth/route.ts)
- [x] Veritabanı şeması (users, rooms, games, game_players, room_players, transactions)
- [x] Günlük bonus sistemi (bonus/route.ts)
- [x] Liderlik tablosu (leaderboard/route.ts)
- [x] Oda oluşturma/katılma (rooms/route.ts)
- [x] Temel oyun mekaniği (game/route.ts)
- [x] Double down API endpoint
- [x] Oda temizleme mekanizması
- [x] Race condition düzeltildi (SELECT FOR UPDATE)
- [x] Telegram bot grup desteği
- [x] Deck tükenme kontrolü
- [x] Blackjack kazanç hesabı (2.5x)
- [x] UI Bileşenleri (Header, Lobby, GameTable, PlayerSeat, PlayingCard, Chip, Leaderboard)
- [x] Zustand store yapısı (user, room, game, ui stores)
- [x] Animasyonlar ve görsel efektler
- [x] @neondatabase/serverless paketi eklendi
- [x] GameTable server API entegrasyonu (polling ile)
- [x] Gerçek zamanlı oyun state senkronizasyonu
- [x] Server-side chip güncelleme
- [x] Multiplayer desteği (server mode)
- [x] Demo/Local mode (offline oyun)

---

## 📝 TEKNİK NOTLAR

### SSE vs WebSocket
- Next.js App Router'da WebSocket native desteklenmiyor
- SSE (Server-Sent Events) kullanacağız
- Tek yönlü (server → client) ama yeterli
- Polling'den çok daha verimli

### Turnuva Mantığı
- Sit & Go formatı (belirli oyuncu sayısına ulaşınca başlar)
- Her tur sonunda en düşük chip'li elenir
- Son 3 oyuncu ödül alır (50%, 30%, 20%)
- Entry fee prize pool'a eklenir

### UI Teknolojileri
- Framer Motion (animasyonlar)
- CSS Keyframes (basit animasyonlar)
- Canvas Confetti (kutlama efektleri)
- Lucide React (ikonlar)

---

## 🎯 ÖNCELİK SIRASI

1. **YÜKSEK**: SSE gerçek zamanlı güncelleme
2. **YÜKSEK**: UI animasyonları ve iyileştirmeler
3. **ORTA**: Turnuva sistemi temel yapı
4. **ORTA**: Turnuva UI ve akış
5. **DÜŞÜK**: Ses efektleri, tema desteği

---

## 🔧 KURULUM

```bash
cd Harleygames
bun install
bun run dev
```

### Environment Variables (Netlify'da)
```
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
WEBAPP_URL=https://harleygames.netlify.app
```

### Blackjack Kuralları (Mevcut Uygulama)
- Blackjack (ilk 2 kart 21): 2.5x kazanç (bahis geri + 1.5x)
- Normal kazanç: 2x (bahis geri + 1x)
- Dealer 17'de durur
- Double down: 2 kartla, bahis iki katına çıkar, 1 kart alır
- Push (berabere): Bahis geri döner
