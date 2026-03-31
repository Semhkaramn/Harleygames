# HARLEYGAMES - PROJE DURUMU VE TODO LİSTESİ

---

## 🔧 AKTİF DÜZELTMELER

### Kritik Hatalar (Düzeltilecek)
- [x] DB bağlantısı - DATABASE_URL boş olduğunda hata fırlat
- [x] Dealer blackjack kontrolü - Dealer ve oyuncu aynı anda blackjack olursa push olmalı
- [x] Oda oluşturma - Oda sahibi otomatik olarak room_players'a eklenmeli
- [x] Auth route - Development modda bile Telegram kontrolü düzgün çalışmalı
- [x] Game state - Dealer kartları results durumunda hep açık gösterilmeli
- [x] Double down - Blackjack ile double down yapılamaz kontrolü eklenmeli
- [x] Bet validation - Bahis yapıldığında oyuncu durumu doğru güncellenmeli

### Mantıksal İyileştirmeler
- [x] SSE - Game action'lardan sonra broadcastToRoom çağrılmalı
- [x] Tournament tabloları - Her zaman init edilmeli
- [x] Cleanup - Eski oyunları temizleme (results durumunda 10 dk sonra)

---

## 🚫 KALDIRILDI

- [x] Local/Demo mod - Zaten kaldırılmış (page.tsx'de Telegram dışında authError gösteriliyor)
- [x] Mock user - Yok (sadece gerçek Telegram kullanıcısı kabul ediliyor)

---

## ✅ TAMAMLANAN ÖZELLİKLER

- [x] Proje yapısı ve temel kurulum
- [x] Telegram WebApp entegrasyonu
- [x] Kullanıcı authentication (gerçek DB bağlantısı)
- [x] Veritabanı şeması (Neon.tech PostgreSQL)
- [x] Günlük bonus sistemi
- [x] Liderlik tablosu
- [x] Oda oluşturma/katılma
- [x] Temel oyun mekaniği
- [x] Double down API endpoint
- [x] UI Bileşenleri (Header, Lobby, GameTable, PlayerSeat, PlayingCard, Chip, Leaderboard, Tournament)
- [x] Zustand store yapısı
- [x] SSE endpoint yapısı

---

## 🎯 SONRAKI ADIMLAR (UI/UX - Son sırada)

### UI/UX Geliştirmeleri
- [ ] Kart çevirme animasyonları (flip effect)
- [ ] Kart dağıtım animasyonları (deal, slide)
- [ ] Chip animasyonları (stack, toss)
- [ ] Kazanç/Kayıp konfeti efektleri
- [ ] Glassmorphism efektlerini güçlendir
- [ ] Micro-interactions (hover, focus, active states)
- [ ] Progress bar'lar (bahis süresi)
- [ ] Loading skeleton'lar
- [ ] Toast bildirimleri geliştir
- [ ] Responsive tasarım iyileştirmeleri

---

## 📝 TEKNİK NOTLAR

- Veritabanı bağlantısı: Netlify ENV'de DATABASE_URL mevcut (Neon.tech)
- TELEGRAM_BOT_TOKEN: Netlify ENV'de mevcut
- Next.js 15.3.7 + Turbopack
- Zustand 4.5.x state management
- SSE ile gerçek zamanlı güncelleme altyapısı hazır

---

## 🔧 KURULUM

```bash
cd Harleygames
bun install
bun run dev
```

### Environment Variables (Netlify'da var)
```
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
WEBAPP_URL=https://harleygames.netlify.app
```

### Blackjack Kuralları
- Blackjack (ilk 2 kart 21): 2.5x kazanç (bahis geri + 1.5x)
- Normal kazanç: 2x (bahis geri + 1x)
- Dealer 17'de durur
- Double down: 2 kartla, bahis iki katına çıkar, 1 kart alır (blackjack ile yapılamaz)
- Push (berabere): Bahis geri döner
- Dealer ve oyuncu aynı anda blackjack: Push (bahis geri)
