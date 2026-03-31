# HARLEYGAMES - PROJE DURUMU VE TODO LİSTESİ

## 📊 PROJE DURUMU

**Proje Tipi:** Next.js 15 + Tailwind + Telegram WebApp
**Veritabanı:** Neon PostgreSQL (serverless)
**Oyun:** Multiplayer Blackjack
**Deploy:** Netlify (dynamic site)

---

## ✅ TAMAMLANAN ÖZELLİKLER

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

## 🟡 DEVAM EDEN İŞLER

### 1. Bağımlılıkları Yükleme
**Durum:** Bekliyor
**Açıklama:** `bun install` komutu çalıştırılmalı

### 2. Dev Server Başlatma
**Durum:** Bekliyor
**Açıklama:** `bun run dev` ile test edilmeli

### 3. Netlify Deploy
**Durum:** Bekliyor
**Açıklama:** Environment variables ayarlanmalı ve deploy edilmeli

---

## 🔴 EKSİK ÖZELLİKLER (Gelecek)

- [ ] WebSocket/SSE ile gerçek zamanlı güncelleme (şu an polling)
- [ ] Turnuva sistemi (Tournament.tsx mevcut ama mock data)
- [ ] Split (çift aynı kartta bölme) özelliği
- [ ] Sesler ve ses efektleri
- [ ] Admin paneli
- [ ] AFK/Timeout handling

---

## 📝 NOTLAR

### Son Yapılan Değişiklikler (Bu Oturum)
1. `@neondatabase/serverless` paketi package.json'a eklendi
2. GameTable.tsx tamamen yeniden yazıldı:
   - Server mode: Gerçek API çağrıları ile multiplayer
   - Local mode: Offline demo oyun
   - 2 saniyede bir polling ile state senkronizasyonu
   - Tüm oyun aksiyonları (bet, hit, stand, double) API'ye bağlandı
   - Dealer otomatik oynama
   - Chip güncellemeleri server'dan alınıyor

### Blackjack Kuralları (Mevcut Uygulama)
- Blackjack (ilk 2 kart 21): 2.5x kazanç (bahis geri + 1.5x)
- Normal kazanç: 2x (bahis geri + 1x)
- Dealer 17'de durur
- Double down: 2 kartla, bahis iki katına çıkar, 1 kart alır
- Push (berabere): Bahis geri döner

### Environment Variables (Netlify için gerekli)
```
DATABASE_URL=postgresql://...@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
TELEGRAM_BOT_TOKEN=your_bot_token
WEBAPP_URL=https://your-app.netlify.app
```

### Dosya Yapısı
```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts      - Kullanıcı authentication
│   │   ├── bonus/route.ts     - Günlük bonus
│   │   ├── game/route.ts      - Oyun aksiyonları (start, bet, deal, hit, stand, double, dealer_play)
│   │   ├── leaderboard/route.ts
│   │   ├── rooms/route.ts     - Oda yönetimi
│   │   └── telegram/route.ts  - Bot webhook
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               - Ana sayfa
├── components/
│   ├── Chip.tsx
│   ├── GameTable.tsx          - Oyun masası (SERVER + LOCAL mode)
│   ├── Header.tsx
│   ├── Leaderboard.tsx
│   ├── Lobby.tsx
│   ├── PlayerSeat.tsx
│   ├── PlayingCard.tsx
│   └── Tournament.tsx
└── lib/
    ├── db.ts                  - Neon PostgreSQL bağlantısı
    ├── gameTypes.ts           - Tip tanımları
    ├── store.ts               - Zustand stores
    ├── telegram.ts            - Telegram WebApp
    └── useGameStore.ts        - Oyun hook'u
```

---

## 🎯 SONRAKİ ADIMLAR

1. [ ] `bun install` ile bağımlılıkları yükle
2. [ ] `bun run dev` ile dev server başlat
3. [ ] Lint hatalarını kontrol et ve düzelt
4. [ ] Test et (local mode çalışıyor mu?)
5. [ ] Neon.tech DATABASE_URL ayarla
6. [ ] Netlify'a deploy et
7. [ ] Telegram bot ile test et
