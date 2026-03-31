'use client';

import { type Player, calculateHandValue } from '@/lib/gameTypes';
import { PlayingCard } from './PlayingCard';
import { ChipStack } from './Chip';

interface PlayerSeatProps {
  player?: Player;
  seatNumber: number;
  isCurrentUser?: boolean;
  onSeatClick?: () => void;
  position: { x: string; y: string };
}

export function PlayerSeat({ player, seatNumber, isCurrentUser, onSeatClick, position }: PlayerSeatProps) {
  const statusColors: Record<string, string> = {
    waiting: 'text-gray-400',
    playing: 'text-blue-400',
    stand: 'text-amber-400',
    bust: 'text-red-500',
    blackjack: 'text-yellow-400',
    win: 'text-green-400',
    lose: 'text-red-400',
    push: 'text-gray-300',
  };

  const statusText: Record<string, string> = {
    waiting: 'Bekliyor',
    playing: 'Oynuyor',
    stand: 'Dur',
    bust: 'Battı!',
    blackjack: 'BLACKJACK!',
    win: 'Kazandı!',
    lose: 'Kaybetti',
    push: 'Berabere',
  };

  if (!player) {
    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: position.x, top: position.y }}
      >
        <button
          type="button"
          onClick={onSeatClick}
          className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed border-green-600/50 bg-green-900/20 flex items-center justify-center hover:bg-green-800/30 hover:border-green-500 transition-all duration-300 group"
        >
          <div className="text-center">
            <span className="text-2xl md:text-3xl text-green-500/70 group-hover:text-green-400 transition-colors">+</span>
            <p className="text-[10px] md:text-xs text-green-500/70 group-hover:text-green-400 mt-1">Koltuk {seatNumber}</p>
          </div>
        </button>
      </div>
    );
  }

  const handValue = calculateHandValue(player.cards);

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${player.isTurn ? 'animate-pulse-glow' : ''}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className={`relative ${isCurrentUser ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent rounded-xl' : ''}`}>
        {/* Cards */}
        {player.cards.length > 0 && (
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 flex -space-x-4">
            {player.cards.map((card, index) => (
              <PlayingCard key={`${card.suit}-${card.rank}-${index}`} card={card} index={index} size="sm" />
            ))}
          </div>
        )}

        {/* Hand value */}
        {player.cards.length > 0 && (
          <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold ${handValue > 21 ? 'bg-red-500' : 'bg-black/70'} text-white`}>
            {handValue}
          </div>
        )}

        {/* Player info */}
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl ${player.isTurn ? 'bg-green-600' : 'bg-gray-800'} border-2 ${player.isTurn ? 'border-green-400' : 'border-gray-600'} transition-all`}>
            {player.avatar}
          </div>

          {/* Name & Status */}
          <div className="mt-1 text-center">
            <p className="text-xs md:text-sm font-semibold text-white truncate max-w-[80px]">{player.name}</p>
            <p className={`text-[10px] md:text-xs font-medium ${statusColors[player.status]}`}>
              {statusText[player.status]}
            </p>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className="text-amber-400">💰</span>
            <span className="text-amber-300 font-bold">{player.chips}</span>
          </div>

          {/* Bet */}
          {player.bet > 0 && (
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
              <ChipStack total={player.bet} maxDisplay={3} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
