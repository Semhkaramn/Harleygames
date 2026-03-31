'use client';

import { useState } from 'react';

interface HeaderProps {
  currentView: 'lobby' | 'game' | 'tournament';
  onViewChange: (view: 'lobby' | 'game' | 'tournament') => void;
  userChips?: number;
  userName?: string;
}

export function Header({ currentView, onViewChange, userChips = 1000, userName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: 'lobby', label: 'Lobi', icon: '🏠' },
    { key: 'game', label: 'Oyun', icon: '🃏' },
    { key: 'tournament', label: 'Turnuvalar', icon: '🏆' },
  ] as const;

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-xl shadow-lg">
              🃏
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold gold-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                BLACKJACK
              </h1>
              <p className="text-[10px] text-gray-500 -mt-1">LIVE</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onViewChange(item.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  currentView === item.key
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-4">
            {/* Chips */}
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full">
              <span className="text-amber-400">💰</span>
              <span className="text-amber-300 font-bold text-sm">{userChips.toLocaleString()}</span>
            </div>

            {/* User avatar */}
            {userName && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                  🎭
                </div>
                <span className="text-sm text-gray-300">{userName}</span>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onViewChange(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                    currentView === item.key
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
