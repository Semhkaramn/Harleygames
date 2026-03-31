'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Lobby } from '@/components/Lobby';
import { GameTable } from '@/components/GameTable';
import { TournamentList } from '@/components/Tournament';

export default function Home() {
  const [currentView, setCurrentView] = useState<'lobby' | 'game' | 'tournament'>('lobby');
  const [userChips] = useState(1000);
  const [userName] = useState('');

  const handleJoinRoom = (roomId: string) => {
    console.log('Joining room:', roomId);
    setCurrentView('game');
  };

  const handleCreateRoom = () => {
    console.log('Creating room');
    setCurrentView('game');
  };

  const handleJoinTournament = (tournamentId: string) => {
    console.log('Joining tournament:', tournamentId);
    setCurrentView('game');
  };

  return (
    <main className="min-h-screen">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        userChips={userChips}
        userName={userName}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'lobby' && (
          <div className="animate-slide-up">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span className="gold-text">CANLI BLACKJACK</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                6 kişiye kadar canlı blackjack oyna, turnuvalara katıl ve büyük ödüller kazan!
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentView('game')}
                  className="btn-gold text-lg px-8 py-4"
                >
                  Hemen Oyna
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('tournament')}
                  className="btn-secondary text-lg px-8 py-4"
                >
                  Turnuvalar
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { label: 'Aktif Oyuncu', value: '1,247', icon: '👥' },
                { label: 'Aktif Masa', value: '86', icon: '🎲' },
                { label: 'Günlük Kazanan', value: '324', icon: '🏆' },
                { label: 'Toplam Ödül', value: '₺2.4M', icon: '💰' },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <Lobby onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} />
          </div>
        )}

        {currentView === 'game' && (
          <div className="animate-slide-up">
            <GameTable />
          </div>
        )}

        {currentView === 'tournament' && (
          <div className="animate-slide-up">
            <TournamentList onJoinTournament={handleJoinTournament} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Blackjack Live - Canlı Multiplayer Blackjack Oyunu</p>
          <p className="mt-1">Telegram Bot ile entegre</p>
        </div>
      </footer>
    </main>
  );
}
