'use client';

interface HeaderProps {
  currentView: 'lobby' | 'game';
  userChips?: number;
  userName?: string;
  userAvatar?: string;
  onBack?: () => void;
}

export function Header({ currentView, userChips = 0, userName, userAvatar = '🎭', onBack }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-amber-500/10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Back Button or Logo */}
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Lobiye Dön</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-xl shadow-lg shadow-amber-500/30">
                  🃏
                </div>
                <div>
                  <h1 className="text-xl font-bold gold-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                    HARLEY
                  </h1>
                  <p className="text-[10px] text-gray-500 -mt-0.5 tracking-[0.2em]">GAMES</p>
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            {/* Chips */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 px-4 py-2 rounded-full border border-amber-500/30">
              <span className="text-lg">💰</span>
              <span className="text-amber-300 font-bold">{userChips.toLocaleString()}</span>
            </div>

            {/* User avatar */}
            {userName && (
              <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-full border border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex items-center justify-center text-lg border border-amber-500/20">
                  {userAvatar}
                </div>
                <span className="text-sm text-gray-300 font-medium hidden sm:block">{userName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
