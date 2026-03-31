'use client';

interface HeaderProps {
  currentView: 'lobby' | 'game' | 'leaderboard';
  userChips?: number;
  userName?: string;
  userAvatar?: string;
  userPhotoUrl?: string | null;
  onBack?: () => void;
}

export function Header({ currentView, userChips = 0, userName, userAvatar = '🎭', userPhotoUrl, onBack }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-amber-500/10">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Back Button or Logo */}
          <div className="flex items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-gray-400 hover:text-amber-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs font-medium">Geri</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-base shadow-lg shadow-amber-500/30">
                  🃏
                </div>
                <div>
                  <h1 className="text-sm font-bold gold-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                    HARLEY
                  </h1>
                </div>
              </div>
            )}
          </div>

          {/* User Info - Kompakt */}
          <div className="flex items-center gap-2">
            {/* Chips */}
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/10 to-amber-600/10 px-2 py-1 rounded-full border border-amber-500/30">
              <span className="text-sm">💰</span>
              <span className="text-amber-300 font-bold text-xs">{userChips.toLocaleString()}</span>
            </div>

            {/* User avatar - with TG photo support */}
            {userName && (
              <div className="flex items-center gap-1.5">
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={userName}
                    className="w-7 h-7 rounded-full border border-amber-500/20 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex items-center justify-center text-sm border border-amber-500/20">
                    {userAvatar}
                  </div>
                )}
                <span className="text-[10px] text-gray-400 max-w-[60px] truncate hidden sm:block">
                  {userName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
