# HARLEYGAMES - PROJE DURUMU VE TODO LİSTESİ

## 📊 PROJE DURUMU

**Proje Tipi:** Next.js 15 + Tailwind + Telegram WebApp
**Veritabanı:** Neon PostgreSQL (serverless)
**Oyun:** Multiplayer Blackjack

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
- [x] Double down API endpoint eklendi
- [x] Oda temizleme mekanizması eklendi
- [x] Race condition düzeltildi (SELECT FOR UPDATE)
- [x] Telegram bot grup desteği eklendi
- [x] Deck tükenme kontrolü eklendi
- [x] Blackjack kazanç hesabı (2.5x) doğru
- [x] UI Bileşenleri (Header, Lobby, GameTable, PlayerSeat, PlayingCard, Chip, Leaderboard)
- [x] Zustand store yapısı (user, room, game, ui stores)
- [x] Animasyonlar ve görsel efektler

---

## 🟡 İYİLEŞTİRİLMESİ GEREKEN ALANLAR

### 1. Multiplayer Sync Problemi
**Durum:** Önemli
**Açıklama:** GameTable.tsx şu an local state kullanıyor. Server ile gerçek zamanlı senkronizasyon yok.
**Çözüm:** Polling veya WebSocket ile server state'i senkronize et

### 2. Server-Side Chip Sync
**Durum:** Önemli
**Açıklama:** Oyun sonuçları sunucuya düzgün yansımıyor, local değişiklikler API'ye gönderilmiyor
**Çözüm:** Her oyun aksiyonunda API çağrısı yap

### 3. Timeout/AFK Handling
**Durum:** Orta
**Açıklama:** Oyuncu AFK kalırsa otomatik stand/fold yok
**Çözüm:** Timer ekle, süre dolunca otomatik aksiyon

### 4. Loading States
**Durum:** Düşük
**Açıklama:** API çağrıları sırasında loading göstergeleri eksik
**Çözüm:** İsProcessing state'lerini genişlet

### 5. Error Handling
**Durum:** Düşük
**Açıklama:** Generic error mesajları
**Çözüm:** Kullanıcı dostu Türkçe hata mesajları ekle

---

## 🔴 EKSİK ÖZELLİKLER (Gelecek)

- [ ] WebSocket/SSE ile gerçek zamanlı güncelleme
- [ ] Turnuva sistemi (Tournament.tsx mevcut ama mock data)
- [ ] Split (çift aynı kartta bölme) özelliği
- [ ] Insurance (sigorta) özelliği
- [ ] Sesler ve ses efektleri
- [ ] Oyuncu profil sayfası
- [ ] Arkadaş sistemi
- [ ] Özel oda davetleri
- [ ] Admin paneli
- [ ] İstatistik grafikleri

---

## 📝 NOTLAR

### Blackjack Kuralları (Mevcut Uygulama)
- Blackjack (ilk 2 kart 21): 2.5x kazanç (bahis geri + 1.5x)
- Normal kazanç: 2x (bahis geri + 1x)
- Dealer 17'de durur
- Double down: 2 kartla, bahis iki katına çıkar, 1 kart alır
- Push (berabere): Bahis geri döner

### Dosya Yapısı
```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts      - Kullanıcı authentication
│   │   ├── bonus/route.ts     - Günlük bonus
│   │   ├── game/route.ts      - Oyun aksiyonları
│   │   ├── leaderboard/route.ts
│   │   ├── rooms/route.ts     - Oda yönetimi
│   │   └── telegram/route.ts  - Bot webhook
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               - Ana sayfa
├── components/
│   ├── Chip.tsx
│   ├── GameTable.tsx          - Oyun masası
│   ├── Header.tsx
│   ├── Leaderboard.tsx
│   ├── Lobby.tsx
│   ├── PlayerSeat.tsx
│   ├── PlayingCard.tsx
│   └── Tournament.tsx
└── lib/
    ├── db.ts                  - Veritabanı işlemleri
    ├── gameTypes.ts           - Tip tanımları
    ├── store.ts               - Zustand stores
    ├── telegram.ts            - Telegram WebApp
    └── useGameStore.ts        - Oyun hook'u
```

### Environment Variables
- `DATABASE_URL` - Neon PostgreSQL bağlantı URL'i
- `TELEGRAM_BOT_TOKEN` - Bot token
- `WEBAPP_URL` - Deploy edilmiş URL
- `TELEGRAM_BOT_USERNAME` - Bot kullanıcı adı
- `ALLOWED_GROUP_IDS` - İzin verilen grup ID'leri (opsiyonel)
- `TELEGRAM_DEBUG` - Debug modu (opsiyonel)

---

## 🎯 SONRAKİ ADIMLAR

1. [ ] Dev server başlat ve test et
2. [ ] Görsel iyileştirmeler
3. [ ] Multiplayer sync implementasyonu
4. [ ] Deploy ve test
