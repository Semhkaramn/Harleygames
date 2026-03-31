# Harleygames - Proje Analiz & Yapılacaklar

## 📅 Son Güncelleme: 2026-03-31

---

## 🔴 KRİTİK HATALAR (Uygulama Çalışmıyor)

### 1. Eksik UI Bileşenleri
- [x] `src/components/ui/button.tsx` - ✅ OLUŞTURULDU
- [x] `src/components/ui/avatar.tsx` - ✅ OLUŞTURULDU
- [x] `src/components/ui/badge.tsx` - ✅ OLUŞTURULDU

**Etkilenen dosyalar:** ✅ TÜM IMPORTLAR ÇALIŞIYOR
- `src/components/game/BettingPanel.tsx` → Button import
- `src/components/game/GameActions.tsx` → Button import
- `src/components/game/LobbyView.tsx` → Avatar, Button, Badge import
- `src/components/game/PlayerSlot.tsx` → Avatar import
- `src/components/game/ResultsPanel.tsx` → Button, Avatar import
- `src/components/game/TableView.tsx` → Button, Avatar import

---

## 🟠 TYPE HATALARI

### 2. Player Interface Tutarsızlığı
- [x] `src/types/game.ts` satır 26: `visibleName` → `name` olarak değiştirildi ✅

**Detay:** Player interface'de `visibleName` tanımlı ama tüm componentlerde `player.name` olarak kullanılıyor:
- `PlayerSlot.tsx` satır 105, 107, 112 ✅
- `LobbyView.tsx` satır 63, 129, 140 ✅
- `ResultsPanel.tsx` satır 62, 67 ✅
- `gameStore.ts` satır 72, 158 ✅

### 3. Çift Player Type Tanımı
- [ ] `src/types/game.ts` ve `src/lib/gameTypes.ts` içinde farklı Player interfaceleri var - birleştirilmeli veya netleştirilmeli (DÜŞÜK ÖNCELİK - API route'larda kullanılıyor)

---

## 🟡 MANTIKSAL HATALAR

### 4. Bot Bahis Simülasyonu Eksik
- [x] `src/store/gameStore.ts` startBetting fonksiyonu güncellendi - Botlar otomatik bahis koyuyor ✅

### 5. Kullanılmayan Dependency
- [x] `package.json` içinde `react-grab: latest` kaldırıldı ✅

---

## 🔵 İYİLEŞTİRMELER (Gelecek için)

### 6. API Routes Kullanılmıyor
- [ ] `src/app/api/*` route'ları mevcut ama client-side `gameStore.ts` ile çalışılıyor
- [ ] Multiplayer için API entegrasyonu yapılmalı veya gereksiz dosyalar kaldırılmalı

### 7. SSE (Server-Sent Events) Kullanılmıyor
- [ ] `src/lib/sse.ts` ve `src/app/api/sse/route.ts` mevcut ama entegre değil
- [ ] `src/lib/useGameEvents.ts` hook'u mevcut ama kullanılmıyor

### 8. Telegram Entegrasyonu Eksik
- [ ] `src/lib/telegram.ts` helper'ları mevcut ama `page.tsx` veya `layout.tsx`'de çağrılmıyor
- [ ] Telegram WebApp başlatma kodu eksik

### 9. Tournament Sistemi Kullanılmıyor
- [ ] `src/lib/tournament.ts` ve `src/app/api/tournament/route.ts` mevcut ama UI'da yok

### 10. Bonus Sistemi Kullanılmıyor
- [ ] `src/app/api/bonus/route.ts` mevcut ama UI'da yok

---

## ✅ TAMAMLANAN

- [x] Proje yapısı analiz edildi
- [x] Tüm dosyalar incelendi
- [x] Hata listesi oluşturuldu
- [x] UI Bileşenleri oluşturuldu (button.tsx, avatar.tsx, badge.tsx)
- [x] Type hatası düzeltildi (visibleName → name)
- [x] Bot bahis simülasyonu tamamlandı
- [x] Kullanılmayan dependency kaldırıldı (react-grab)
- [x] Proje çalışır durumda test edildi

---

## 📝 NOTLAR

1. Proje Next.js 15 + TypeScript + Tailwind + Zustand kullanıyor
2. Shadcn/ui bileşenleri için `components.json` var - custom bileşenler yazıldı
3. Veritabanı Neon PostgreSQL kullanıyor ama sadece API route'larda
4. Client-side state management (gameStore.ts) ile çalışıyor - bot simülasyonu var
5. Telegram Mini App olarak tasarlanmış

---

## 🚀 SONUÇ

✅ **KRİTİK HATALAR DÜZELTİLDİ**
- UI bileşenleri oluşturuldu
- Type hatası giderildi
- Bot simülasyonu tamamlandı
- Proje artık çalışır durumda

⚠️ **İLERİ SEVİYE GELİŞTİRMELER** (İsteğe bağlı)
- API entegrasyonu
- Telegram WebApp aktivasyonu
- Tournament/Bonus sistemleri
