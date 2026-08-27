import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from '../layout/Navbar';
import { PageSEO } from '../ui/PageSEO';
import { AuthModal } from '../ui/AuthModal';
import { SecureVideoPlayer } from '../ui/SecureVideoPlayer';
import { api, API_BASE } from '../../services/api';
import { safeGetStorage, safeSetStorage } from '../../utils/storage';

interface ProgramVideosPageProps {
  setActivePage?: (page: PageId) => void;
}

interface VideoModule {
  id: string;
  episodeNumber: number;
  title: string;
  duration: string;
  videoUrl: string;
  isFreePreview: boolean;
  description: string;
}

interface VideoSeries {
  id: string;
  courseSlug: string;
  seriesTitle: string;
  category: string;
  description: string;
  thumbnailUrl: string;
  badge: string;
  color: string;
  modules: VideoModule[];
}

export const ProgramVideosPage: React.FC<ProgramVideosPageProps> = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'bmb' | 'leadership' | 'ignit'>('all');
  const [activeVideo, setActiveVideo] = useState<{ mod: VideoModule; series: VideoSeries } | null>(null);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);

  // Derive enrolled slugs — always from the live-fetched user (not stale localStorage)
  const enrolledSlugs = (() => {
    if (!currentUser) return '';
    const s = currentUser.enrolledCourseSlugs;
    return Array.isArray(s) ? s.join(',').toLowerCase() : (s || '').toLowerCase();
  })();

  const hasAccessToProgram = (courseSlug: string) => {
    if (!currentUser) return false;
    return enrolledSlugs.includes(courseSlug.toLowerCase());
  };

  const [seriesData, setSeriesData] = useState<VideoSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);

  // ── Fetch live user data from DB (bypasses stale localStorage) ──
  useEffect(() => {
    const loadUserFromDB = async () => {
      setUserLoading(true);
      try {
        const localUser = safeGetStorage<any>('uwe_user_account', null);
        if (!localUser || !localUser.id) {
          setCurrentUser(null);
          setUserLoading(false);
          return;
        }
        // Fetch fresh enrolledCourseSlugs from backend
        const res = await fetch(`${API_BASE}/users/${localUser.id}`);
        if (res.ok) {
          const json = await res.json();
          const freshUser = json.data || json;
          const updated = {
            ...localUser,
            enrolledCourseSlugs: freshUser.enrolledCourseSlugs || '',
            isEnrolled: freshUser.isEnrolled,
          };
          // Sync updated access back into localStorage
          safeSetStorage('uwe_user_account', updated);
          setCurrentUser(updated);

          // Fetch watch progress from LMS
          try {
            const progRes = await api.getProgress(localUser.id);
            if (progRes.data) {
              setCompletedModuleIds(progRes.data.filter((p: any) => p.isCompleted).map((p: any) => p.moduleId));
            }
          } catch { /* ignore */ }
        } else {
          // Backend unreachable — fall back to localStorage
          setCurrentUser(localUser);
        }
      } catch {
        // Fallback: use localStorage as-is
        const localUser = safeGetStorage<any>('uwe_user_account', null);
        setCurrentUser(localUser);
      } finally {
        setUserLoading(false);
      }
    };
    loadUserFromDB();
  }, []);

  const toggleModuleCompletion = async (moduleId: string, seriesId?: string) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    const isCompleted = completedModuleIds.includes(moduleId);
    const newCompleted = isCompleted
      ? completedModuleIds.filter((id) => id !== moduleId)
      : [...completedModuleIds, moduleId];

    setCompletedModuleIds(newCompleted);

    try {
      await api.saveProgress({
        userId: currentUser.id,
        moduleId,
        seriesId,
        isCompleted: !isCompleted,
        progressPercent: !isCompleted ? 100 : 0,
      });

      // Award XP for tactical completion
      if (!isCompleted) {
        try {
          await api.awardXp({
            userId: currentUser.id,
            actionType: 'VIDEO_COMPLETED',
            xpAmount: 50,
          });
        } catch { /* silent */ }
      }
    } catch {
      // Rollback on network error
      setCompletedModuleIds(completedModuleIds);
    }
  };

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const json = await api.getProgramVideos();
        if (json.data && json.data.length > 0) {
          const mapped: VideoSeries[] = json.data.map((s: any) => ({
            id: s.id,
            courseSlug: s.courseSlug,
            seriesTitle: s.seriesTitle,
            category: s.category,
            description: s.description,
            thumbnailUrl: s.thumbnailUrl,
            badge: s.courseSlug === 'bmb' ? 'BMB MIND DIVISION' : s.courseSlug === 'leadership' ? 'COMMAND DIVISION' : 'ENTERPRISE DIVISION',
            color: s.courseSlug === 'bmb' ? '#00D2FF' : s.courseSlug === 'leadership' ? '#FFB800' : '#FF4757',
            modules: s.modules ? s.modules.map((m: any) => ({
              id: m.id,
              episodeNumber: m.episodeNumber,
              title: m.title,
              duration: m.duration,
              videoUrl: m.videoUrl,
              isFreePreview: m.isFreePreview,
              description: m.description,
            })) : [],
          }));
          setSeriesData(mapped);
        }
      } catch {
        // Fallback to defaults
      }
    };
    fetchSeries();
  }, []);

  const filteredSeries = selectedFilter === 'all'
    ? seriesData
    : seriesData.filter((s) => s.courseSlug === selectedFilter);

  const handleModuleClick = (mod: VideoModule, series: VideoSeries) => {
    if (mod.isFreePreview) {
      // Free preview — always playable
      setActiveVideo({ mod, series });
    } else if (!currentUser) {
      // Not logged in at all
      setAuthModalOpen(true);
    } else if (!hasAccessToProgram(series.courseSlug)) {
      // Logged in but access revoked for this program
      return; // blocked — the UI shows the overlay
    } else {
      setActiveVideo({ mod, series });
    }
  };

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      <PageSEO
        title="Tactical Video Vault"
        description="Stream classified UWE program modules and tactical mind rewiring training videos."
        canonical="/videos"
      />
      {/* Loading guard while DB access check runs */}
      {userLoading && (
        <div className="fixed inset-0 z-[9999] bg-[#06080D]/90 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin mx-auto" />
            <p className="font-mono-data text-xs text-secondary">VERIFYING OPERATIVE ACCESS...</p>
          </div>
        </div>
      )}
      {/* Top Banner Header */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-md relative z-10 text-center">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4 glass-card p-4 rounded-xl border border-secondary/30">
          <div className="flex items-center gap-2 text-xs font-mono-data text-on-surface-variant">
            <span className="material-symbols-outlined text-secondary">shield</span>
            <span>PUBLIC BROWSING MODE • LOG IN TO WATCH FULL SERIES</span>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="font-mono-data text-xs text-[#2ED573] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span>AUTHENTICATED: {currentUser.name}</span>
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('uwe_user_account');
                  setCurrentUser(null);
                }}
                className="px-3 py-1 rounded glass-panel text-xs font-mono-data text-on-surface-variant hover:text-red-400 border border-outline-variant/30 cursor-pointer"
              >
                LOG OUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="btn-elite px-4 py-2 rounded font-label-caps text-xs uppercase tracking-wider font-bold cursor-pointer"
            >
              CREATE ACCOUNT / LOG IN
            </button>
          )}
        </div>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-xs font-black"
        >
          Category Video <span className="text-secondary text-glow-gold">Series Vault</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto"
        >
          Browse category-wise video modules for BMB, Leadership, and IGNIT. Episode 1 is free to preview — create an account to unlock all full series lessons.
        </motion.p>

        {/* Category Filters */}
        <div className="flex justify-center gap-2 flex-wrap mt-lg mb-xl">
          {[
            { id: 'all', label: 'All Series' },
            { id: 'bmb', label: 'BMB Mind Rewiring' },
            { id: 'leadership', label: 'Leadership Command' },
            { id: 'ignit', label: 'IGNIT Incubator' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-label-caps text-xs uppercase transition-all cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-secondary text-surface-container-lowest font-bold shadow-[0_0_20px_rgba(255,184,0,0.5)]'
                  : 'glass-panel text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Series Cards Display */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg space-y-xl relative z-10">
        {filteredSeries.map((series) => {
          const programLocked = currentUser && !hasAccessToProgram(series.courseSlug);
          const completedCount = series.modules.filter((m) => completedModuleIds.includes(m.id)).length;
          const progressPercent = Math.round((completedCount / (series.modules.length || 1)) * 100);

          return (
          <div key={series.id} className={`glass-card rounded-2xl border overflow-hidden p-6 space-y-6 relative ${
            programLocked ? 'border-red-500/40 opacity-80' : 'border-outline-variant/30'
          }`}>

            {/* ── PROGRAM LOCKED OVERLAY (access revoked by admin) ── */}
            {programLocked && (
              <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-red-400">lock</span>
                </div>
                <div className="text-center">
                  <p className="font-headline-md text-lg text-red-400 font-black uppercase">Access Revoked</p>
                  <p className="font-mono-data text-xs text-on-surface-variant mt-1">Your admin has removed your access to this program.</p>
                  <p className="font-mono-data text-xs text-secondary mt-1">Contact UWE Empire to restore enrollment.</p>
                </div>
              </div>
            )}

            {/* Series Header & LMS Progress Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-outline-variant/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-label-caps text-xs px-2.5 py-1 rounded bg-black/60 text-secondary border border-secondary/40 font-bold">
                    {series.badge}
                  </span>
                  {currentUser && hasAccessToProgram(series.courseSlug) && (
                    <span className="font-mono-data text-xs px-2.5 py-1 rounded bg-[#2ED573]/15 text-[#2ED573] border border-[#2ED573]/40 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      <span>{completedCount}/{series.modules.length} COMPLETED ({progressPercent}%)</span>
                    </span>
                  )}
                </div>
                <h2 className="font-headline-md text-2xl text-on-surface font-bold mt-2">{series.seriesTitle}</h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-1">{series.description}</p>

                {/* Visual Progress Bar */}
                {currentUser && hasAccessToProgram(series.courseSlug) && (
                  <div className="w-full max-w-md bg-[#131929] h-2 rounded-full overflow-hidden mt-3 border border-outline-variant/30">
                    <div
                      style={{ width: `${progressPercent}%` }}
                      className="h-full bg-gradient-to-r from-secondary to-[#2ED573] transition-all duration-500 rounded-full shadow-[0_0_10px_#2ED573]"
                    />
                  </div>
                )}
              </div>

              {!currentUser && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="glass-panel px-4 py-2 rounded text-xs font-mono-data text-secondary border border-secondary/40 hover:bg-secondary/20 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>UNLOCK ALL EPISODES</span>
                </button>
              )}
            </div>

            {/* Video Episode Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {series.modules.map((mod) => {
                const isLocked = !mod.isFreePreview && (!currentUser || !hasAccessToProgram(series.courseSlug));
                const isDone = completedModuleIds.includes(mod.id);

                return (
                  <motion.div
                    key={mod.id}
                    whileHover={{ y: -6 }}
                    onClick={() => handleModuleClick(mod, series)}
                    className={`glass-panel rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between group ${
                      isDone
                        ? 'border-[#2ED573]/60 shadow-[0_0_20px_rgba(46,213,115,0.15)]'
                        : isLocked
                        ? 'border-outline-variant/30 opacity-80'
                        : 'border-secondary/40 hover:border-secondary shadow-lg'
                    }`}
                  >
                    {/* Thumbnail & Lock Overlay */}
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img
                        src={series.thumbnailUrl}
                        alt={mod.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                        <span className="font-mono-data text-xs px-2 py-0.5 rounded bg-black/80 text-white">
                          EPISODE {mod.episodeNumber}
                        </span>
                        {isDone ? (
                          <span className="font-mono-data text-[11px] px-2 py-0.5 rounded bg-[#2ED573] text-black font-bold flex items-center gap-1 shadow-md">
                            <span className="material-symbols-outlined text-xs">check_circle</span> FINISHED
                          </span>
                        ) : mod.isFreePreview ? (
                          <span className="font-mono-data text-[11px] px-2 py-0.5 rounded bg-[#2ED573] text-black font-bold">
                            FREE PREVIEW
                          </span>
                        ) : isLocked ? (
                          <span className="font-mono-data text-[11px] px-2 py-0.5 rounded bg-red-500/80 text-white font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">lock</span> LOCKED
                          </span>
                        ) : (
                          <span className="font-mono-data text-[11px] px-2 py-0.5 rounded bg-secondary text-black font-bold">
                            UNLOCKED
                          </span>
                        )}
                      </div>

                      {/* Center Action Button */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        {isLocked ? (
                          <div className="w-14 h-14 rounded-full bg-red-500/80 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">lock</span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-secondary/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,184,0,0.8)] group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Module Title & Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs font-mono-data text-secondary font-bold">
                        <span>DURATION: {mod.duration}</span>
                      </div>
                      <h4 className="font-headline-md text-base text-on-surface font-bold group-hover:text-secondary transition-colors">
                        {mod.title}
                      </h4>
                      <p className="font-body-md text-xs text-on-surface-variant line-clamp-2">
                        {mod.description}
                      </p>
                      <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center text-xs font-mono-data text-secondary">
                        <span>{isLocked ? 'LOG IN TO WATCH' : isDone ? 'WATCH AGAIN' : 'CLICK TO WATCH'}</span>
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">east</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          );
        })}
      </section>

      {/* Video Modal Player */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9995] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-lg"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="glass-card w-full max-w-4xl rounded-2xl overflow-hidden border border-secondary/50 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-surface-container-high flex justify-between items-center border-b border-outline-variant/30">
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold">{activeVideo.mod.title}</h3>
                  <span className="font-mono-data text-xs text-secondary">{activeVideo.mod.duration} • Full Video Stream</span>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-secondary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* DRM-Protected Secure Video Player */}
              <SecureVideoPlayer
                videoUrl={activeVideo.mod.videoUrl}
                title={activeVideo.mod.title}
                duration={activeVideo.mod.duration}
                watermarkText={currentUser?.name}
                operativeId={currentUser?.id ? `#UWE-OP-${currentUser.id.slice(-4).toUpperCase()}` : undefined}
                moduleId={activeVideo.mod.id}
                seriesId={activeVideo.series.id}
                isCompleted={completedModuleIds.includes(activeVideo.mod.id)}
                onProgressMilestone={async (percent) => {
                  if (percent === 100 && currentUser && !completedModuleIds.includes(activeVideo.mod.id)) {
                    // Auto-complete at 100% watch progress
                    toggleModuleCompletion(activeVideo.mod.id, activeVideo.series.id);
                  }
                  if (currentUser) {
                    try {
                      await api.saveProgress({
                        userId: currentUser.id,
                        moduleId: activeVideo.mod.id,
                        seriesId: activeVideo.series.id,
                        isCompleted: percent >= 100,
                        progressPercent: percent,
                      });
                    } catch { /* silent */ }
                  }
                }}
                onToggleComplete={() => toggleModuleCompletion(activeVideo.mod.id, activeVideo.series.id)}
                onClose={() => setActiveVideo(null)}
              />

              {/* Player Bottom Completion Bar */}
              <div className="p-3.5 bg-[#0D111A] border-t border-outline-variant/30 flex justify-between items-center flex-wrap gap-2">
                <span className="font-mono-data text-xs text-on-surface-variant">
                  {completedModuleIds.includes(activeVideo.mod.id)
                    ? '🎉 You have completed this lesson module!'
                    : 'Watch progress is tracked automatically. Module completes at 100%.'}
                </span>

                <button
                  onClick={() => toggleModuleCompletion(activeVideo.mod.id, activeVideo.series.id)}
                  className={`px-4 py-2 rounded-xl font-mono-data text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                    completedModuleIds.includes(activeVideo.mod.id)
                      ? 'bg-[#2ED573]/20 border border-[#2ED573] text-[#2ED573]'
                      : 'btn-elite shadow-[0_0_15px_rgba(255,184,0,0.3)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {completedModuleIds.includes(activeVideo.mod.id) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>
                    {completedModuleIds.includes(activeVideo.mod.id)
                      ? 'COMPLETED (CLICK TO RESET)'
                      : 'MARK AS FINISHED'}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          safeSetStorage('uwe_user_account', user);
          setCurrentUser(user);
        }}
      />
    </div>
  );
};
