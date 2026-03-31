'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { type Player, calculateHandValue } from '@/lib/gameTypes';
import { PlayingCard } from './PlayingCard';
import { ChipStack } from './Chip';
import Image from 'next/image';

interface PlayerSeatProps {
  player?: Player;
  seatNumber: number;
  isCurrentUser?: boolean;
  onSeatClick?: () => void;
  position: { x: string; y: string };
  isBettingPhase?: boolean;
  onLeave?: () => void;
}

export function PlayerSeat({
  player,
  seatNumber,
  isCurrentUser,
  onSeatClick,
  position,
  isBettingPhase,
  onLeave
}: PlayerSeatProps) {
  const statusConfig: Record<string, { color: string; bg: string; text: string; glow?: string }> = {
    waiting: { color: 'text-gray-400', bg: 'bg-gray-500/20', text: 'Bekliyor' },
    playing: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', text: 'Oynuyor', glow: 'rgba(16, 185, 129, 0.4)' },
    stand: { color: 'text-amber-400', bg: 'bg-amber-500/20', text: 'Dur' },
    bust: { color: 'text-red-500', bg: 'bg-red-500/20', text: 'Battı!' },
    blackjack: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', text: 'BLACKJACK!', glow: 'rgba(250, 204, 21, 0.5)' },
    win: { color: 'text-green-400', bg: 'bg-green-500/20', text: 'Kazandı!', glow: 'rgba(34, 197, 94, 0.5)' },
    lose: { color: 'text-red-400', bg: 'bg-red-500/20', text: 'Kaybetti' },
    push: { color: 'text-gray-300', bg: 'bg-gray-500/20', text: 'Berabere' },
    skipped: { color: 'text-gray-500', bg: 'bg-gray-600/20', text: 'Pas Geçti' },
  };

  // Empty seat
  if (!player) {
    return (
      <motion.div
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: position.x, top: position.y }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: seatNumber * 0.1 }}
      >
        <motion.button
          type="button"
          onClick={onSeatClick}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-dashed border-emerald-600/40 bg-emerald-900/10 flex items-center justify-center backdrop-blur-sm group relative overflow-hidden"
          whileHover={{
            scale: 1.05,
            borderColor: 'rgba(16, 185, 129, 0.6)',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />

          <div className="text-center relative z-10">
            <motion.span
              className="text-xl md:text-2xl text-emerald-500/70 block"
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            >
              +
            </motion.span>
            <p className="text-[8px] md:text-[10px] text-emerald-500/70 mt-0.5 font-medium">
              Otur
            </p>
          </div>
        </motion.button>
      </motion.div>
    );
  }

  const handValue = calculateHandValue(player.cards);
  const status = statusConfig[player.status] || statusConfig.waiting;
  const isWinner = player.status === 'win' || player.status === 'blackjack';
  const isBust = player.status === 'bust';
  const isSkipped = player.status === 'skipped';
  const needsBet = isBettingPhase && player.bet === 0 && player.status !== 'skipped';

  return (
    <motion.div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isSkipped ? 0.5 : 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className={`relative ${isCurrentUser ? 'scale-105' : ''}`}>
        {/* Glow effect for turn */}
        <AnimatePresence>
          {player.isTurn && (
            <motion.div
              className="absolute inset-0 rounded-full -m-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.1, 1],
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }}
              style={{
                background: `radial-gradient(circle, ${status.glow || 'rgba(16, 185, 129, 0.4)'} 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Needs bet indicator */}
        <AnimatePresence>
          {needsBet && isCurrentUser && (
            <motion.div
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              <div className="bg-amber-500 text-black text-[8px] font-bold px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                Bahis Yap!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner celebration effect */}
        <AnimatePresence>
          {isWinner && (
            <motion.div
              className="absolute inset-0 rounded-full -m-4"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [1, 1.5, 2],
              }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
              }}
              style={{
                background: `radial-gradient(circle, ${status.glow || 'rgba(34, 197, 94, 0.3)'} 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Cards */}
        <AnimatePresence>
          {player.cards.length > 0 && (
            <motion.div
              className="absolute -top-24 left-1/2 -translate-x-1/2 flex -space-x-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {player.cards.map((card, index) => (
                <PlayingCard
                  key={`${card.suit}-${card.rank}-${index}`}
                  card={card}
                  index={index}
                  size="xs"
                  flipDelay={index * 200}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hand value badge */}
        <AnimatePresence>
          {player.cards.length > 0 && (
            <motion.div
              className={`absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                handValue > 21
                  ? 'bg-red-500/90 border-red-400/50'
                  : handValue === 21
                  ? 'bg-amber-500/90 border-amber-400/50'
                  : 'bg-black/80 border-white/10'
              } text-white shadow-lg`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: isBust ? [1, 1.2, 1] : 1,
              }}
              transition={isBust ? { duration: 0.3 } : undefined}
            >
              {handValue}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player info container */}
        <div className="flex flex-col items-center">
          {/* Avatar with ring - supports Telegram photo */}
          <motion.div
            className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300
              ${player.isTurn ? 'ring-2 ring-emerald-400' : ''}
              ${isCurrentUser ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black' : ''}
              ${isSkipped ? 'opacity-50' : ''}
            `}
            style={{
              boxShadow: player.isTurn
                ? '0 0 20px rgba(16, 185, 129, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                : 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
            }}
            animate={isWinner ? {
              rotate: [0, -5, 5, -5, 5, 0],
              scale: [1, 1.1, 1],
            } : undefined}
            transition={isWinner ? { duration: 0.5 } : undefined}
          >
            {/* Telegram Profile Photo or Avatar */}
            {player.photoUrl ? (
              <Image
                src={player.photoUrl}
                alt={player.name}
                fill
                className="object-cover"
                onError={(e) => {
                  // Fallback to avatar if photo fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`absolute inset-0 flex items-center justify-center text-xl md:text-2xl
                ${player.isTurn ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-gray-700 to-gray-900'}
              `}>
                {player.avatar}
              </div>
            )}

            {/* Border gradient */}
            <div className={`absolute inset-0 rounded-full border-2 ${
              player.isTurn ? 'border-emerald-300/50' : 'border-gray-600/50'
            }`} />

            {/* Current user indicator */}
            {isCurrentUser && (
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-black flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <span className="text-[6px]">SEN</span>
              </motion.div>
            )}
          </motion.div>

          {/* Name & Status */}
          <div className="mt-1 text-center">
            <p className="text-[10px] md:text-xs font-semibold text-white truncate max-w-[70px] drop-shadow-md">
              {player.name}
            </p>
            <motion.p
              className={`text-[8px] md:text-[10px] font-medium ${status.color} mt-0.5`}
              animate={player.isTurn ? {
                opacity: [0.7, 1, 0.7],
              } : undefined}
              transition={player.isTurn ? {
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
              } : undefined}
            >
              {isBettingPhase && player.bet > 0 ? `${player.bet} bahis` : status.text}
            </motion.p>
          </div>

          {/* Leave button for current user */}
          {isCurrentUser && onLeave && (
            <motion.button
              type="button"
              onClick={onLeave}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white z-10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              X
            </motion.button>
          )}

          {/* Bet chips */}
          <AnimatePresence>
            {player.bet > 0 && (
              <motion.div
                className="absolute -bottom-12 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, y: -20 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ChipStack total={player.bet} maxDisplay={3} animate />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
