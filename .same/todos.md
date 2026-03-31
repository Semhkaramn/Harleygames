# HARLEYGAMES - PROJE DURUMU VE TODO LİSTESİ


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



## 🔴 EKSİK ÖZELLİKLER (Gelecek)

- [ ] WebSocket/SSE ile gerçek zamanlı güncelleme (şu an polling)
- [ ] Turnuva sistemi (Tournament.tsx mevcut ama mock data)
- [ ] Split (çift aynı kartta bölme) özelliği
- [ ] Sesler ve ses efektleri
- [ ] Admin paneli
- [ ] AFK/Timeout handling

---
netlify ve neon.tech kullanılıyor envler netlifyede olacak 
local mode vs hiç olmayacak tamamen gerçek api ler oalcak
tüm mantıksal hataları vs düzenle gör

### Blackjack Kuralları (Mevcut Uygulama)
- Blackjack (ilk 2 kart 21): 2.5x kazanç (bahis geri + 1.5x)
- Normal kazanç: 2x (bahis geri + 1x)
- Dealer 17'de durur
- Double down: 2 kartla, bahis iki katına çıkar, 1 kart alır
- Push (berabere): Bahis geri döner

