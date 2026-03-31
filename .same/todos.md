# HARLEYGAMES - PROJE DURUMU VE TODO LİSTESİ

---

## 🔄 ŞU AN YAPILIYOR

- [x] Proje inceleniyor ve eksikler belirleniyor
- [x] Development server başlatıldı
- [x] framer-motion paketi kuruldu
- [x] TypeScript hataları düzeltildi
- [ ] UI/UX geliştirmeleri başlanıyor
- [ ] Kart animasyonları ekleniyor

---

## 🚀 AKTİF GELİŞTİRME - V2.0

### 1️⃣ UI/UX Geliştirmeleri (ÖNCELİKLİ)
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

### 2️⃣ WebSocket/SSE ile Gerçek Zamanlı Güncelleme
- [ ] Server-Sent Events (SSE) endpoint oluştur (`/api/sse`)
- [ ] EventSource client hook oluştur (`useGameEvents.ts`)
- [ ] GameTable bileşenini SSE ile entegre et
- [ ] Lobby'de oda güncellemelerini gerçek zamanlı yap
- [ ] Oyuncu katılma/ayrılma bildirimleri
- [ ] Polling'i kaldır, sadece SSE kullan

### 3️⃣ Turnuva Sistemi
- [ ] Turnuva API endpoints tamamla
- [ ] Tournament.tsx bileşenini gerçek verilerle doldur
- [ ] Turnuva lobby'si (kayıt, bekleme odası)
- [ ] Eliminasyon sistemi

---

## ✅ TAMAMLANAN ÖZELLİKLER

- [x] Proje yapısı ve temel kurulum
- [x] Telegram WebApp entegrasyonu
- [x] Kullanıcı authentication
- [x] Veritabanı şeması
- [x] Günlük bonus sistemi
- [x] Liderlik tablosu
- [x] Oda oluşturma/katılma
- [x] Temel oyun mekaniği
- [x] Double down API endpoint
- [x] UI Bileşenleri (Header, Lobby, GameTable, PlayerSeat, PlayingCard, Chip, Leaderboard, Tournament)
- [x] Zustand store yapısı
- [x] framer-motion kuruldu
- [x] TypeScript hataları düzeltildi

---

## 📝 TEKNİK NOTLAR

- Veritabanı olmadan local/demo mode çalışıyor bunu kaldır local demo mod olmayacak veritabano bağlantısı netlify de var bu uyarımı da asla silme 
- framer-motion v12.38.0 kullanılıyor
- Next.js 15.3.7 + Turbopack

---

## 🎯 ÖNCELİK SIRASI

1. **en son bu**: UI/UX animasyonları ve efektler
2. **ORTA**: SSE gerçek zamanlı güncelleme
3. **DÜŞÜK**: Turnuva sistemi tamamlama

---
Kullanıcı local demo mode'u tamamen kaldırmak istiyor ve veritabanı bağlantısının her zaman var olduğunu söylüyor. Bu durumda:

page.tsx'den getMockUser() ve ilgili kodları kaldır
GameTable'daki local mode kodlarını kaldır
Telegram dışında çalışma durumunda hata mesajı göster
Todo'yu güncelle
Hadi başlayalım.
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
