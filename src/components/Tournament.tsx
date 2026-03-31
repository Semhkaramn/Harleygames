'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore, useUIStore } from '@/lib/store';
import { hapticFeedback } from '@/lib/telegram';
import { Trophy, Users, Clock, Coins, Crown, Medal, Star, Plus, ArrowLeft, Loader2 } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  playerCount: number;
  maxPlayers: number;
  minPlayers: number;
  status: 'registering' | 'running' | 'finished';
  startTime: string;
  currentRound: number;
  totalRounds: number;
  players?: TournamentPlayer[];
}

interface TournamentPlayer {
  telegramId: number;
  name: string;
  avatar: string;
  chips: number;
  isEliminated: boolean;
  rank?: number;
  prize?: number;
}

interface TournamentListProps {
  onBack?: () => void;
}

export function TournamentList({ onBack }: TournamentListProps) {
  const { dbUser } = useUserStore();
  const { showNotification } = useUIStore();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [filter, setFilter] = useState<'all' | 'registering' | 'running' | 'finished'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    entryFee: 100,
    maxPlayers: 8,
  });

  // Turnuvaları yükle
  const fetchTournaments = useCallback(async () => {
    try {
      const response = await fetch('/api/tournament');
      const data = await response.json();
      if (data.tournaments) {
        setTournaments(data.tournaments);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
    const interval = setInterval(fetchTournaments, 10000);
    return () => clearInterval(interval);
  }, [fetchTournaments]);

  // Turnuva detaylarını yükle
  const fetchTournamentDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/tournament?id=${id}`);
      const data = await response.json();
      if (data.tournament) {
        setSelectedTournament(data.tournament);
      }
    } catch (error) {
      console.error('Failed to fetch tournament details:', error);
    }
  };

  // Turnuvaya katıl
  const handleJoinTournament = async (tournamentId: string) => {
    if (!dbUser) {
      showNotification('error', 'Giriş yapmalısınız');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          tournament_id: tournamentId,
          telegram_id: dbUser.telegram_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Turnuvaya kayıt oldunuz!');
        hapticFeedback('success');
        fetchTournaments();
        if (selectedTournament?.id === tournamentId) {
          fetchTournamentDetails(tournamentId);
        }
      } else {
        showNotification('error', data.error || 'Katılım başarısız');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    } finally {
      setIsJoining(false);
    }
  };

  // Turnuvadan ayrıl
  const handleLeaveTournament = async (tournamentId: string) => {
    if (!dbUser) return;

    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          tournament_id: tournamentId,
          telegram_id: dbUser.telegram_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Turnuvadan ayrıldınız');
        hapticFeedback('light');
        fetchTournaments();
        setSelectedTournament(null);
      } else {
        showNotification('error', data.error || 'Ayrılma başarısız');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    }
  };

  // Turnuva oluştur
  const handleCreateTournament = async () => {
    if (!dbUser) {
      showNotification('error', 'Giriş yapmalısınız');
      return;
    }

    if (!createForm.name.trim()) {
      showNotification('error', 'Turnuva adı gerekli');
      return;
    }

    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: createForm.name,
          entry_fee: createForm.entryFee,
          max_players: createForm.maxPlayers,
          telegram_id: dbUser.telegram_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Turnuva oluşturuldu!');
        hapticFeedback('success');
        setShowCreateModal(false);
        setCreateForm({ name: '', entryFee: 100, maxPlayers: 8 });
        fetchTournaments();
      } else {
        showNotification('error', data.error || 'Oluşturma başarısız');
      }
    } catch (error) {
      showNotification('error', 'Bağlantı hatası');
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Başladı';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 24) return `${Math.floor(hours / 24)} gün`;
    return `${hours}s ${minutes}d`;
  };

  const statusConfig = {
    registering: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', text: 'Kayıt Açık', icon: Clock },
    running: { color: 'text-green-400 bg-green-400/10 border-green-400/30', text: 'Devam Ediyor', icon: Trophy },
    finished: { color: 'text-gray-400 bg-gray-400/10 border-gray-400/30', text: 'Tamamlandı', icon: Medal },
  };

  const isUserRegistered = (tournament: Tournament) => {
    return tournament.players?.some(p => p.telegramId === dbUser?.telegram_id) ?? false;
  };

  // Turnuva detay görünümü
  if (selectedTournament) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => setSelectedTournament(null)}
            className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {selectedTournament.name}
            </h2>
            <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[selectedTournament.status].color}`}>
              {(() => {
                const Icon = statusConfig[selectedTournament.status].icon;
                return <Icon className="w-3 h-3" />;
              })()}
              {statusConfig[selectedTournament.status].text}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4 text-center">
            <Coins className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-400">{selectedTournament.prizePool.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Ödül Havuzu</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{selectedTournament.playerCount}/{selectedTournament.maxPlayers}</div>
            <div className="text-xs text-gray-500">Oyuncular</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{selectedTournament.currentRound}/{selectedTournament.totalRounds}</div>
            <div className="text-xs text-gray-500">Tur</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{formatTime(selectedTournament.startTime)}</div>
            <div className="text-xs text-gray-500">Başlangıç</div>
          </div>
        </div>

        {/* Prize distribution */}
        <div className="glass rounded-xl p-5 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Ödül Dağılımı
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-2xl mb-1">🥇</div>
              <div className="text-lg font-bold text-amber-400">{Math.floor(selectedTournament.prizePool * 0.5).toLocaleString()}</div>
              <div className="text-xs text-gray-500">1. (%50)</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <div className="text-2xl mb-1">🥈</div>
              <div className="text-lg font-bold text-gray-300">{Math.floor(selectedTournament.prizePool * 0.3).toLocaleString()}</div>
              <div className="text-xs text-gray-500">2. (%30)</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="text-2xl mb-1">🥉</div>
              <div className="text-lg font-bold text-orange-400">{Math.floor(selectedTournament.prizePool * 0.2).toLocaleString()}</div>
              <div className="text-xs text-gray-500">3. (%20)</div>
            </div>
          </div>
        </div>

        {/* Players list */}
        <div className="glass rounded-xl p-5 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Katılımcılar ({selectedTournament.players?.length || 0})
          </h3>

          {selectedTournament.players && selectedTournament.players.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedTournament.players
                .sort((a, b) => b.chips - a.chips)
                .map((player, index) => (
                  <motion.div
                    key={player.telegramId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.isEliminated ? 'bg-red-500/10 opacity-60' : 'bg-white/5'
                    } ${player.telegramId === dbUser?.telegram_id ? 'border border-amber-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg">
                        {player.avatar}
                      </div>
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {player.name}
                          {player.telegramId === dbUser?.telegram_id && (
                            <span className="text-xs text-amber-400">(Sen)</span>
                          )}
                        </div>
                        {player.isEliminated && (
                          <span className="text-xs text-red-400">Elendi</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold">{player.chips.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">chip</div>
                    </div>
                  </motion.div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Henüz katılımcı yok</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {selectedTournament.status === 'registering' && (
            isUserRegistered(selectedTournament) ? (
              <button
                type="button"
                onClick={() => handleLeaveTournament(selectedTournament.id)}
                className="btn-danger flex-1"
              >
                Kayıttan Çık
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleJoinTournament(selectedTournament.id)}
                disabled={isJoining || selectedTournament.playerCount >= selectedTournament.maxPlayers}
                className="btn-gold flex-1 flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    Kayıt Ol ({selectedTournament.entryFee} chip)
                  </>
                )}
              </button>
            )
          )}
        </div>
      </motion.div>
    );
  }

  // Ana liste görünümü
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Trophy className="w-8 h-8 text-amber-400" />
              Turnuvalar
            </h2>
            <p className="text-gray-400 text-sm mt-1">Turnuvalara katıl ve büyük ödüller kazan</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Turnuva Oluştur</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Tümü', icon: Star },
          { key: 'registering', label: 'Kayıt Açık', icon: Clock },
          { key: 'running', label: 'Devam Eden', icon: Trophy },
          { key: 'finished', label: 'Tamamlanan', icon: Medal },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              filter === tab.key
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                : 'glass text-gray-400 hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-4" />
          <p className="text-gray-500">Turnuvalar yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Tournament cards */}
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredTournaments.map((tournament, index) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => fetchTournamentDetails(tournament.id)}
                  className="glass rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-amber-500/20"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[tournament.status].color}`}>
                            {(() => {
                              const Icon = statusConfig[tournament.status].icon;
                              return <Icon className="w-3 h-3" />;
                            })()}
                            {statusConfig[tournament.status].text}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block text-xs flex items-center gap-1">
                            <Coins className="w-3 h-3" /> Ödül
                          </span>
                          <span className="text-amber-400 font-bold">{tournament.prizePool.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs">Giriş</span>
                          <span className="text-white font-medium">{tournament.entryFee} chip</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> Oyuncular
                          </span>
                          <span className="text-white font-medium">{tournament.playerCount}/{tournament.maxPlayers}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs">
                            {tournament.status === 'running' ? 'Tur' : 'Başlangıç'}
                          </span>
                          <span className="text-white font-medium">
                            {tournament.status === 'running'
                              ? `${tournament.currentRound}/${tournament.totalRounds}`
                              : formatTime(tournament.startTime)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bars */}
                      {tournament.status === 'running' && (
                        <div className="mt-3">
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${(tournament.currentRound / tournament.totalRounds) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {tournament.status === 'registering' && (
                        <div className="mt-3">
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill !bg-gradient-to-r !from-amber-500 !to-amber-400"
                              style={{ width: `${(tournament.playerCount / tournament.maxPlayers) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center gap-3">
                      {tournament.status === 'registering' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinTournament(tournament.id);
                          }}
                          disabled={isJoining || tournament.playerCount >= tournament.maxPlayers}
                          className="btn-gold px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isJoining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Kayıt Ol'
                          )}
                        </button>
                      )}
                      {tournament.status === 'running' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchTournamentDetails(tournament.id);
                          }}
                          className="btn-secondary px-6 py-2.5"
                        >
                          İzle
                        </button>
                      )}
                      {tournament.status === 'finished' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchTournamentDetails(tournament.id);
                          }}
                          className="btn-secondary px-6 py-2.5"
                        >
                          Sonuçlar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredTournaments.length === 0 && (
            <div className="text-center py-12 glass rounded-2xl">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Turnuva Bulunamadı</h3>
              <p className="text-gray-500 mb-4">İlk turnuvayı sen oluştur!</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn-gold"
              >
                Turnuva Oluştur
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                <Trophy className="w-6 h-6 text-amber-400" />
                Yeni Turnuva
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="tournament-name" className="block text-sm text-gray-400 mb-2">Turnuva Adı</label>
                  <input
                    id="tournament-name"
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Örn: Gece Turnuvası"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="entry-fee" className="block text-sm text-gray-400 mb-2">Giriş Ücreti</label>
                  <select
                    id="entry-fee"
                    value={createForm.entryFee}
                    onChange={(e) => setCreateForm({ ...createForm, entryFee: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                  >
                    <option value={50}>50 chip</option>
                    <option value={100}>100 chip</option>
                    <option value={250}>250 chip</option>
                    <option value={500}>500 chip</option>
                    <option value={1000}>1000 chip</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="max-players" className="block text-sm text-gray-400 mb-2">Maksimum Oyuncu</label>
                  <select
                    id="max-players"
                    value={createForm.maxPlayers}
                    onChange={(e) => setCreateForm({ ...createForm, maxPlayers: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                  >
                    <option value={4}>4 oyuncu</option>
                    <option value={8}>8 oyuncu</option>
                    <option value={16}>16 oyuncu</option>
                    <option value={32}>32 oyuncu</option>
                  </select>
                </div>

                <div className="glass rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Tahmini Ödül Havuzu:</span>
                    <span className="text-amber-400 font-bold">
                      {(createForm.entryFee * createForm.maxPlayers).toLocaleString()} chip
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCreateTournament}
                  className="btn-gold flex-1"
                >
                  Oluştur
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
