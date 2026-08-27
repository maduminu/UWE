import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface LeaderboardUser {
  standing: number;
  id: string;
  name: string;
  operativeId: string;
  xp: number;
  streakDays: number;
  rankTitle: string;
  tierNumber: number;
  badgeIcon: string;
  badges: string[];
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getLeaderboard()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setLeaderboard(res.data);
        }
      })
      .catch((err) => console.error('[LeaderboardModal]', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  const getStandingColor = (standing: number) => {
    switch (standing) {
      case 1:
        return 'text-[#FFD700] border-[#FFD700]/50 bg-[#FFD700]/10 shadow-[0_0_20px_rgba(255,215,0,0.3)]';
      case 2:
        return 'text-[#E2E8F0] border-white/40 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]';
      case 3:
        return 'text-[#CD7F32] border-[#CD7F32]/50 bg-[#CD7F32]/10 shadow-[0_0_15px_rgba(205,127,50,0.2)]';
      default:
        return 'text-on-surface-variant border-outline-variant/30 bg-surface-container-low';
    }
  };

  const getRankBadgeStyle = (tier: number) => {
    switch (tier) {
      case 1:
        return 'text-secondary border-secondary/40 bg-secondary/10';
      case 2:
        return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
      case 3:
        return 'text-purple-400 border-purple-500/40 bg-purple-500/10';
      default:
        return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0D111A] border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 bg-surface-container-high border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-2xl">trophy</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-md text-lg text-on-surface font-bold">
                    GLOBAL OPERATIVE STANDINGS
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono-data font-bold bg-secondary/20 text-secondary border border-secondary/30 uppercase tracking-widest">
                    LIVE XP
                  </span>
                </div>
                <p className="font-mono-data text-xs text-on-surface-variant">
                  Top performing Empire operatives ranked by completed tactical drills & combat XP
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-secondary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-secondary border-t-transparent animate-spin mx-auto" />
                <p className="font-mono-data text-xs text-secondary tracking-widest uppercase">
                  SYNCHRONIZING OPERATIVE DOSSIERS...
                </p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">military_tech</span>
                <p className="font-mono-data text-sm text-on-surface">No operative scores recorded yet.</p>
                <p className="text-xs text-on-surface-variant">Complete video modules & drills to earn the first standing!</p>
              </div>
            ) : (
              <>
                {/* ── Top 3 Podium Cards ── */}
                {top3.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {top3.map((op) => {
                      const isMe = op.id === currentUserId;
                      return (
                        <div
                          key={op.id}
                          className={`p-4 rounded-xl border flex flex-col items-center text-center relative transition-all ${getStandingColor(
                            op.standing
                          )} ${isMe ? 'ring-2 ring-secondary' : ''}`}
                        >
                          <div className="absolute top-2 left-2.5 font-mono-data text-xs font-bold">
                            #{op.standing}
                          </div>
                          {op.streakDays > 1 && (
                            <div className="absolute top-2 right-2 flex items-center gap-0.5 font-mono-data text-[10px] text-amber-400">
                              <span>🔥</span>
                              <span>{op.streakDays}d</span>
                            </div>
                          )}

                          <div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 flex items-center justify-center my-2 text-2xl font-bold text-white">
                            {op.name.charAt(0).toUpperCase()}
                          </div>

                          <h4 className="font-headline-md text-sm font-bold text-white truncate max-w-[150px]">
                            {op.name}
                          </h4>
                          <span className="font-mono-data text-[10px] text-white/60 mb-2">
                            {op.operativeId}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border mb-2 ${getRankBadgeStyle(
                              op.tierNumber
                            )}`}
                          >
                            {op.rankTitle}
                          </span>

                          <div className="font-mono-data text-sm font-extrabold text-secondary">
                            {op.xp.toLocaleString()} <span className="text-[10px] text-white/70">XP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Remaining Operatives Table ── */}
                {remaining.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono-data text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      RESERVE & ACTIVE CORPS
                    </h4>

                    <div className="space-y-1.5">
                      {remaining.map((op) => {
                        const isMe = op.id === currentUserId;
                        return (
                          <div
                            key={op.id}
                            className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                              isMe
                                ? 'bg-secondary/10 border-secondary/50'
                                : 'bg-surface-container-low/60 border-outline-variant/20 hover:border-outline-variant/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono-data text-xs font-bold text-on-surface-variant w-6 text-center">
                                #{op.standing}
                              </span>

                              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold text-xs text-on-surface shrink-0">
                                {op.name.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-headline-md text-xs font-bold text-on-surface truncate">
                                    {op.name}
                                  </p>
                                  {isMe && (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono-data bg-secondary text-black font-extrabold">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono-data text-[10px] text-on-surface-variant">
                                  {op.operativeId} • {op.rankTitle}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              {op.streakDays > 1 && (
                                <span className="font-mono-data text-[11px] text-amber-400 flex items-center gap-0.5">
                                  🔥 {op.streakDays}d
                                </span>
                              )}
                              <div className="text-right">
                                <span className="font-mono-data text-xs font-bold text-secondary">
                                  {op.xp.toLocaleString()} XP
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 bg-[#080B10] border-t border-outline-variant/20 text-center">
            <p className="font-mono-data text-[10px] text-on-surface-variant">
              Complete course modules (+50 XP), drills (+100 XP), and maintain daily login streaks (+15 XP) to climb the Empire standings.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
