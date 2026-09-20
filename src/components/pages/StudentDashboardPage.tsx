import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { authService } from '../../services/auth';
import { safeGetStorage, safeSetStorage } from '../../utils/storage';
import { useRealtimeEvent } from '../../services/realtime';
import { CertificateModal } from '../ui/CertificateModal';
import { AuthModal } from '../ui/AuthModal';
import { BankSlipUploadModal } from '../ui/BankSlipUploadModal';
import { MastermindQABoard } from '../ui/MastermindQABoard';
import { LeaderboardModal } from '../ui/LeaderboardModal';
import { PageSEO } from '../ui/PageSEO';
import { sanitizeExternalUrl } from '../../utils/urlSecurity';
import type { PageId } from '../layout/Navbar';

interface StudentDashboardPageProps {
  setActivePage: (page: PageId) => void;
  onSelectCourse?: (courseSlug: string) => void;
}

interface CourseModule {
  id: string;
  title: string;
  episodeNumber: number;
  duration: string;
  isCompleted: boolean;
}

interface EnrolledCourseCard {
  id?: string;
  slug: string;
  title: string;
  subtitle?: string;
  division: string;
  badgeColor: string;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  lastEpisodeTitle?: string;
  instructorName: string;
  modules?: CourseModule[];
  nextBatch?: {
    startDate?: string;
    scheduleText?: string;
    zoomLink?: string;
  } | null;
  hasCertificate?: boolean;
  certificate?: {
    id: string;
    certificateNo: string;
    issuedDate: string;
    gradeScore: string;
  } | null;
}

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ setActivePage, onSelectCourse }) => {
  const [currentUser, setCurrentUser] = useState<any>(() => authService.getStudentUser() || safeGetStorage('uwe_user_account', null));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates' | 'schedule' | 'qa' | 'payments'>('courses');
  const [expandedCourseSlug, setExpandedCourseSlug] = useState<string | null>(null);

  // Sync auth state in real-time across tabs and components
  useEffect(() => {
    const handleAuthSync = () => {
      const user = authService.getStudentUser() || safeGetStorage('uwe_user_account', null);
      setCurrentUser(user);
    };

    window.addEventListener('storage', handleAuthSync);
    window.addEventListener('auth:logout', handleAuthSync);
    window.addEventListener('progress:updated', fetchUserData);
    return () => {
      window.removeEventListener('storage', handleAuthSync);
      window.removeEventListener('auth:logout', handleAuthSync);
      window.removeEventListener('progress:updated', fetchUserData);
    };
  }, []);

  // Certificates & Stats State
  const [userCertificates, setUserCertificates] = useState<any[]>([]);
  const [activeCert, setActiveCert] = useState<any>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [paymentSlips, setPaymentSlips] = useState<any[]>([]);

  // Gamification & Leaderboard State
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [gamificationProfile, setGamificationProfile] = useState<any>(null);

  // Review submission state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewCourseSlug, setReviewCourseSlug] = useState('bmb');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Enrolled courses state (loaded from live database)
  const [coursesData, setCoursesData] = useState<EnrolledCourseCard[]>([]);

  const fetchUserData = async () => {
    const activeUser = currentUser || authService.getStudentUser();
    if (!activeUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const dashRes = await api.getUserDashboard(activeUser.id);
      if (dashRes.success && dashRes.data) {
        const { enrolledCourses, certificates, paymentSlips: slips, stats } = dashRes.data;

        if (Array.isArray(enrolledCourses)) {
          const mapped: EnrolledCourseCard[] = enrolledCourses.map((c: any) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            subtitle: c.subtitle,
            division: c.category === 'MIND' ? 'MIND ARCHITECTURE' : c.category === 'COMMAND' ? 'TACTICAL COMMAND' : 'ENTERPRISE VENTURES',
            badgeColor: c.slug === 'bmb' ? '#FFB800' : c.slug === 'leadership' ? '#00D2FF' : '#00FF66',
            totalModules: c.totalModules || 5,
            completedModules: c.completedModules || 0,
            progressPercent: c.progressPercent || 0,
            modules: c.modules || [],
            lastEpisodeTitle: c.nextModule ? `Module ${c.nextModule.episodeNumber}: ${c.nextModule.title}` : 'All Modules Completed',
            instructorName: c.slug === 'bmb' ? 'Commander Janith Perera' : c.slug === 'leadership' ? 'Suranjith Godagama' : 'Dilshan Madusanka',
            nextBatch: c.nextBatch || null,
            hasCertificate: c.hasCertificate,
            certificate: c.certificate,
          }));
          setCoursesData(mapped);
        }

        if (certificates) {
          setUserCertificates(certificates);
        }

        if (slips) {
          setPaymentSlips(slips);
        }

        if (stats) {
          setDashboardStats(stats);
        }
      }

      // Fetch Gamification & XP Profile
      try {
        const gamifyRes = await api.getGamificationProfile(activeUser.id);
        if (gamifyRes.success && gamifyRes.data) {
          setGamificationProfile(gamifyRes.data);
        }
      } catch {
        /* silent fallback */
      }
    } catch (err) {
      console.warn('Could not fetch live user dashboard aggregation', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [currentUser]);

  // Real-time updates: refresh dashboard live when admin approves slip or updates user
  useRealtimeEvent('slip:verified', () => fetchUserData());
  useRealtimeEvent('slip:rejected', () => fetchUserData());
  useRealtimeEvent('user:updated', () => fetchUserData());

  const handleClaimCertificate = async (course: EnrolledCourseCard) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    try {
      const res = await api.claimCertificate({
        userId: currentUser.id || 'usr-default',
        studentName: currentUser.name || 'Sovereign Operative',
        courseSlug: course.slug,
        courseTitle: course.title,
      });

      if (res.success && res.data) {
        setActiveCert(res.data);
        setCertModalOpen(true);
        setUserCertificates((prev) => {
          const exists = prev.some((c) => c.id === res.data.id);
          return exists ? prev : [res.data, ...prev];
        });
        fetchUserData();
      }
    } catch (err) {
      console.error('Failed to claim certificate', err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setReviewSubmitting(true);
    setReviewSuccessMsg(null);

    try {
      const res = await api.submitReview({
        courseSlug: reviewCourseSlug,
        studentName: currentUser?.name || 'Verified Operative',
        studentRole: 'Verified Operative / Scholar',
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
        userId: currentUser?.id,
      });

      if (res.success) {
        setReviewSuccessMsg('Review recorded and published to the live course catalog!');
        setReviewComment('');
        setReviewTitle('');
        setTimeout(() => {
          setReviewModalOpen(false);
          setReviewSuccessMsg(null);
        }, 1800);
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleLogout = () => {
    authService.clearStudentSession();
    setCurrentUser(null);
  };

  // Not Logged In State
  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <PageSEO
          title="Student Portal Login"
          description="Authenticate your operative credentials to access the UWE LMS video vault and certificates."
          canonical="/dashboard"
        />
        <div className="w-20 h-20 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-secondary mb-6 shadow-[0_0_30px_rgba(255,184,0,0.3)]">
          <span className="material-symbols-outlined text-4xl">lock_person</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-black text-on-surface uppercase tracking-wider mb-3">
          Operative Command Portal
        </h1>
        <p className="font-mono-data text-sm text-on-surface-variant max-w-md mb-8 leading-relaxed">
          Authenticate your student credentials to access your enrolled course directives, interactive learning milestones, and official certificates.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="btn-elite px-8 py-3.5 rounded-xl font-label-caps text-sm uppercase tracking-widest cursor-pointer flex items-center gap-2 shadow-[0_0_25px_rgba(255,184,0,0.4)]"
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span>ENTER OPERATIVE LOGIN</span>
          </button>
          <button
            onClick={() => setActivePage('product')}
            className="px-6 py-3.5 rounded-xl bg-surface-variant/40 border border-outline-variant/40 font-mono-data text-xs text-on-surface hover:bg-surface-variant transition-all cursor-pointer"
          >
            EXPLORE COURSES
          </button>
        </div>

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
  }

  const overallProgress = dashboardStats?.overallProgress ?? 0;
  const completedCount = dashboardStats?.completedCourses ?? coursesData.filter((c) => c.progressPercent >= 100).length;
  const inProgressCount = dashboardStats?.inProgressCourses ?? coursesData.filter((c) => c.progressPercent < 100).length;
  const operativeId = currentUser.id ? `#UWE-OP-${currentUser.id.substring(0, 6).toUpperCase()}` : '#UWE-OP-0842';

  return (
    <div className="min-h-screen bg-[#070A12] text-on-surface py-6 sm:py-10 px-3 sm:px-4 md:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full overflow-x-hidden">
      <PageSEO
        title="Operative Command Dashboard"
        description="Access enrolled course directives, live training progress, and verified credential certificates."
        canonical="/dashboard"
      />

      {/* ── 1. Tactical Operative Header ── */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0C1220] via-[#0F172C] to-[#070A12] border border-secondary/40 p-3.5 sm:p-6 md:p-8 shadow-[0_0_50px_rgba(255,184,0,0.15)] overflow-hidden w-full">
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-[#00D2FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 w-full">
          {/* Operative Identity */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 md:gap-5 min-w-0 w-full lg:w-auto">
            <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-secondary/30 via-[#0A0E18] to-secondary/10 border-2 border-secondary flex items-center justify-center text-secondary font-display font-black text-xl sm:text-3xl shadow-[0_0_25px_rgba(255,184,0,0.3)] shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
                <span className="px-2 py-0.5 rounded-full bg-secondary/20 border border-secondary/50 font-mono-data text-[9px] sm:text-[10px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full">
                  <span className="material-symbols-outlined text-xs shrink-0">
                    {gamificationProfile?.rankInfo?.badgeIcon || 'military_tech'}
                  </span>
                  <span className="truncate">{gamificationProfile?.rankInfo?.rankTitle || 'NOVICE OPERATIVE'}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 font-mono-data text-[9px] sm:text-[10px] text-amber-300 font-bold flex items-center gap-1 shrink-0">
                  <span>🔥</span>
                  <span>{gamificationProfile?.streakDays || 1}D STREAK</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#00FF66]/15 border border-[#00FF66]/40 font-mono-data text-[9px] sm:text-[10px] text-[#00FF66] font-bold shrink-0">
                  {operativeId}
                </span>
                <span className="hidden sm:flex items-center gap-1 font-mono-data text-[10px] text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse inline-block" />
                  DATABASE SYNCED
                </span>
              </div>

              <h1 className="font-display text-xl sm:text-3xl md:text-4xl font-black text-on-surface uppercase tracking-wide truncate">
                {currentUser.name ? currentUser.name : 'Sovereign Operative'}
              </h1>
              <p className="font-mono-data text-[11px] sm:text-xs text-on-surface-variant truncate">
                {currentUser.email} • Enrolled in <span className="text-secondary font-bold">{coursesData.length} Core Directives</span>
              </p>

              {/* Multi-Coach & Cohort Assignment Indicator */}
              {(currentUser.assignedCoachName || gamificationProfile?.assignedCoachName) && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] sm:text-[11px] font-mono-data font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.2)] flex-wrap">
                    <span className="material-symbols-outlined text-xs">school</span>
                    COACH: {currentUser.assignedCoachName || gamificationProfile?.assignedCoachName}
                    <span className="text-blue-400/70">({currentUser.cohortTag || gamificationProfile?.cohortTag || 'ALPHA COHORT'})</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 min-w-0">
            <button
              onClick={() => setLeaderboardOpen(true)}
              className="px-2 py-2 sm:px-3 rounded-xl bg-[#1A2234] border border-secondary/50 text-secondary font-mono-data text-[11px] sm:text-xs font-bold hover:bg-secondary hover:text-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.2)] text-center min-w-0 truncate"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm shrink-0">trophy</span>
              <span className="truncate">STANDINGS</span>
            </button>
            <button
              onClick={() => setActivePage('program-videos')}
              className="px-2 py-2 sm:px-3.5 rounded-xl bg-secondary text-black font-mono-data text-[11px] sm:text-xs font-bold hover:bg-secondary-container transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.35)] text-center min-w-0 truncate"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm shrink-0">play_circle</span>
              <span className="truncate">VIDEO VAULT</span>
            </button>
            <button
              onClick={() => setSlipModalOpen(true)}
              className="px-2 py-2 sm:px-3 rounded-xl bg-surface-variant/40 border border-outline-variant/40 font-mono-data text-[11px] sm:text-xs text-on-surface hover:bg-surface-variant transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center min-w-0 truncate"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm text-secondary shrink-0">receipt_long</span>
              <span className="truncate">UPLOAD SLIP</span>
            </button>
            <button
              onClick={() => setReviewModalOpen(true)}
              className="px-2 py-2 sm:px-3 rounded-xl bg-surface-variant/40 border border-outline-variant/40 font-mono-data text-[11px] sm:text-xs text-on-surface hover:bg-surface-variant transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center min-w-0 truncate"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm text-secondary shrink-0">rate_review</span>
              <span className="truncate">WRITE REVIEW</span>
            </button>
            <button
              onClick={handleLogout}
              className="col-span-2 sm:col-span-1 p-2 sm:px-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-mono-data text-[11px] sm:text-xs hover:bg-red-500/25 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 text-center min-w-0"
              title="Logout session"
            >
              <span className="material-symbols-outlined text-base shrink-0">logout</span>
              <span className="sm:hidden font-bold">LOGOUT</span>
            </button>
          </div>
        </div>

        {/* ── Operative XP Progression Bar ── */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-5 border-t border-outline-variant/30 font-mono-data">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-xs sm:text-sm">bolt</span>
                XP PROGRESSION:
              </span>
              <span className="text-[10px] sm:text-xs text-on-surface font-extrabold">
                {gamificationProfile?.xp || 0} XP
              </span>
              <span className="text-[9px] sm:text-[11px] text-on-surface-variant">
                / {gamificationProfile?.rankInfo?.nextRankXp || 150} XP
              </span>
            </div>
            <div className="flex items-center gap-2">
              {gamificationProfile?.badges && gamificationProfile.badges.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {gamificationProfile.badges.map((b: string) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-[9px] font-bold text-secondary"
                    >
                      {b.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full h-2 sm:h-2.5 bg-black/60 rounded-full overflow-hidden border border-outline-variant/30 relative">
            <div
              className="h-full bg-gradient-to-r from-secondary/80 to-secondary rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,184,0,0.5)]"
              style={{ width: `${gamificationProfile?.rankInfo?.progressPercent || 0}%` }}
            />
          </div>
        </div>

        {/* Tactical KPI Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-5 font-mono-data w-full">
          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[9px] sm:text-[11px] text-on-surface-variant uppercase truncate block">DIRECTIVES</span>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 min-w-0">
              <span className="font-display text-lg sm:text-2xl md:text-3xl font-black text-secondary shrink-0">{coursesData.length}</span>
              <span className="text-[8px] sm:text-[10px] text-on-surface-variant truncate">Enrolled</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[9px] sm:text-[11px] text-on-surface-variant uppercase truncate block">PROGRESS</span>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 min-w-0">
              <span className="font-display text-lg sm:text-2xl md:text-3xl font-black text-[#00FF66] shrink-0">{overallProgress}%</span>
              <span className="text-[8px] sm:text-[10px] text-on-surface-variant truncate">Completed</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[9px] sm:text-[11px] text-on-surface-variant uppercase truncate block">COHORT STATUS</span>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 min-w-0">
              <span className="font-display text-lg sm:text-2xl md:text-3xl font-black text-[#00D2FF] shrink-0">{inProgressCount}</span>
              <span className="text-[8px] sm:text-[10px] text-on-surface-variant truncate">In Training</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[9px] sm:text-[11px] text-on-surface-variant uppercase truncate block">CREDENTIALS</span>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 min-w-0">
              <span className="font-display text-lg sm:text-2xl md:text-3xl font-black text-[#FFB800] shrink-0">{userCertificates.length || completedCount}</span>
              <span className="text-[8px] sm:text-[10px] text-on-surface-variant truncate">Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Interactive Workspace Tabs ── */}
      <div className="border-b border-outline-variant/30 flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none touch-pan-x w-full">
        {[
          { id: 'courses', label: `Directives (${coursesData.length})`, icon: 'school' },
          { id: 'certificates', label: `Credentials (${userCertificates.length})`, icon: 'workspace_premium' },
          { id: 'schedule', label: 'Live Cohorts', icon: 'event' },
          { id: 'qa', label: 'Mastermind Q&A', icon: 'forum' },
          { id: 'payments', label: `Payment Slips (${paymentSlips.length})`, icon: 'receipt_long' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl font-mono-data text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-secondary text-black font-bold shadow-[0_0_20px_rgba(255,184,0,0.4)]'
                  : 'bg-[#0A0F1D] text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Tab Workspaces ── */}
      <AnimatePresence mode="wait">
        {/* Tab 1: Enrolled Courses & Modules Breakdown */}
        {activeTab === 'courses' && (
          <motion.div
            key="courses"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-[#090E1A] p-5 rounded-2xl border border-outline-variant/30">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Curriculum Execution &amp; Video Vault
                </h3>
                <p className="font-mono-data text-xs text-on-surface-variant">
                  Watch modules, complete tactical drills, and earn verified digital credentials.
                </p>
              </div>
              <button
                onClick={() => setActivePage('product')}
                className="px-3.5 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 text-xs font-mono-data text-secondary hover:bg-surface-variant transition-all flex items-center gap-1"
              >
                <span>Browse All Programs</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {coursesData.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#0F1424] via-[#0B0F1C] to-[#070A12] border border-secondary/40 text-center space-y-5 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-secondary mx-auto shadow-[0_0_25px_rgba(255,184,0,0.3)]">
                  <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="font-display text-xl font-black text-on-surface uppercase tracking-wide">
                    No Active Directives Enrolled
                  </h4>
                  <p className="font-mono-data text-xs text-on-surface-variant leading-relaxed">
                    You are logged in as a registered operative. Enroll in a course program or submit your bank deposit slip to activate your curriculum directives.
                  </p>
                </div>

                {paymentSlips.some((s) => s.status === 'PENDING') && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono-data text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>⏳ Bank Transfer Slip Submitted &amp; Pending Admin Verification — Courses will unlock automatically upon approval</span>
                  </div>
                )}

                <div className="flex gap-3 justify-center flex-wrap pt-2">
                  <button
                    onClick={() => setActivePage('product')}
                    className="btn-elite px-6 py-3 rounded-xl font-mono-data text-xs uppercase tracking-wider font-bold cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">explore</span>
                    <span>EXPLORE PROGRAMS &amp; ENROLL</span>
                  </button>
                  <button
                    onClick={() => setSlipModalOpen(true)}
                    className="px-6 py-3 rounded-xl bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/40 font-mono-data text-xs text-on-surface font-bold uppercase transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-secondary">receipt_long</span>
                    <span>UPLOAD PAYMENT SLIP</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {coursesData.map((course) => {
                  const isCompleted = course.progressPercent >= 100;
                  const isExpanded = expandedCourseSlug === course.slug;

                  return (
                    <motion.div
                      key={course.slug}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden"
                    >
                      {/* Accent Top Bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: course.badgeColor }}
                      />

                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <span
                            className="px-2.5 py-1 rounded-md text-[10px] font-mono-data font-bold uppercase tracking-wider border"
                            style={{
                              backgroundColor: `${course.badgeColor}15`,
                              borderColor: `${course.badgeColor}40`,
                              color: course.badgeColor,
                            }}
                          >
                            {course.division}
                          </span>
                          <span className="font-mono-data text-xs font-bold text-on-surface-variant">
                            {course.completedModules} / {course.totalModules} Lessons
                          </span>
                        </div>

                        <div>
                          <h3
                            className="font-display text-lg font-bold text-on-surface hover:text-secondary transition-colors cursor-pointer"
                            onClick={() => onSelectCourse ? onSelectCourse(course.slug) : setActivePage('product')}
                          >
                            {course.title}
                          </h3>
                          {course.subtitle && (
                            <p className="font-mono-data text-[11px] text-secondary mt-0.5 line-clamp-1">
                              {course.subtitle}
                            </p>
                          )}
                          <p className="font-mono-data text-[11px] text-on-surface-variant mt-1">
                            Faculty: <span className="text-on-surface">{course.instructorName}</span>
                          </p>
                        </div>

                        {/* Progress Bar with Glow */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between text-xs font-mono-data">
                            <span className="text-on-surface-variant">Directive Mastery</span>
                            <span className="font-bold" style={{ color: course.badgeColor }}>
                              {course.progressPercent}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-[#161D2E] overflow-hidden p-0.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${course.progressPercent}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full rounded-full shadow-[0_0_10px_currentColor]"
                              style={{ backgroundColor: course.badgeColor, color: course.badgeColor }}
                            />
                          </div>
                        </div>

                        {/* Current Milestone / Last Watched */}
                        <div className="p-3 rounded-xl bg-[#0E1424] border border-outline-variant/20 text-xs font-mono-data">
                          <p className="text-[10px] text-on-surface-variant uppercase">Current Status:</p>
                          <p className="text-on-surface truncate font-bold mt-0.5">{course.lastEpisodeTitle}</p>
                        </div>

                        {/* Expandable Module Breakdown */}
                        {course.modules && course.modules.length > 0 && (
                          <div className="pt-1">
                            <button
                              onClick={() => setExpandedCourseSlug(isExpanded ? null : course.slug)}
                              className="w-full py-1.5 px-3 rounded-lg bg-surface-variant/30 hover:bg-surface-variant/50 text-[11px] font-mono-data text-secondary flex items-center justify-between transition-colors cursor-pointer border border-outline-variant/20"
                            >
                              <span>{isExpanded ? 'Hide Modules' : 'View Module Directives'}</span>
                              <span className="material-symbols-outlined text-sm">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2 space-y-1.5 overflow-hidden"
                                >
                                  {course.modules.map((mod) => (
                                    <div
                                      key={mod.id}
                                      className="p-2 rounded-lg bg-[#080B14] border border-outline-variant/15 flex items-center justify-between text-[11px] font-mono-data"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className={`material-symbols-outlined text-xs ${mod.isCompleted ? 'text-[#00FF66]' : 'text-on-surface-variant'}`}>
                                          {mod.isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                        <span className="truncate text-on-surface">{mod.episodeNumber}. {mod.title}</span>
                                      </div>
                                      <span className="text-[10px] text-on-surface-variant shrink-0 ml-2">
                                        {mod.isCompleted ? '✓ DONE' : mod.duration}
                                      </span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Card */}
                      <div className="pt-5 mt-4 border-t border-outline-variant/20 flex gap-2">
                        {isCompleted ? (
                          <button
                            onClick={() => handleClaimCertificate(course)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-secondary to-[#FFD700] text-black font-mono-data text-xs font-black uppercase hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,184,0,0.3)] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">workspace_premium</span>
                            <span>CLAIM CERTIFICATE</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setActivePage('program-videos')}
                            className="w-full py-2.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary font-mono-data text-xs font-bold uppercase hover:bg-secondary hover:text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">play_arrow</span>
                            <span>RESUME LEARNING</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 2: Verified Certificates Vault */}
        {activeTab === 'certificates' && (
          <motion.div
            key="certificates"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-[#090E1A] p-5 rounded-2xl border border-secondary/40">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Official Completion Credentials &amp; Verification Vault
                </h3>
                <p className="font-mono-data text-xs text-on-surface-variant">
                  Verifiable digital blockchain-grade certificates conferred by the UWE Command Council.
                </p>
              </div>
            </div>

            {userCertificates.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant font-mono-data text-sm bg-[#0B0F1C] rounded-2xl border border-outline-variant/30 space-y-3">
                <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/30 mx-auto flex items-center justify-center text-secondary mb-2">
                  <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                </div>
                <h4 className="font-display text-base font-bold text-on-surface">No Conferred Certificates Yet</h4>
                <p className="max-w-md mx-auto text-xs">
                  Complete all modules in your enrolled directives to unlock and confer your official honors certificates.
                </p>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="px-4 py-2 rounded-xl bg-secondary text-black font-bold text-xs"
                >
                  Continue Learning
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1222] to-[#0A0E18] border border-secondary/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/20 border border-secondary flex items-center justify-center text-secondary shadow-[0_0_20px_rgba(255,184,0,0.3)] shrink-0">
                        <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-mono-data text-[10px] font-bold">
                          {cert.certificateNo}
                        </span>
                        <h4 className="font-display text-base font-bold text-on-surface mt-1">
                          {cert.courseTitle || cert.courseSlug?.toUpperCase()}
                        </h4>
                        <p className="font-mono-data text-xs text-on-surface-variant">
                          Conferred: {new Date(cert.issuedDate || cert.createdAt).toLocaleDateString()} • {cert.gradeScore || 'HONORS DISTINCTION'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveCert(cert);
                        setCertModalOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-secondary text-black font-mono-data text-xs font-bold hover:bg-secondary-container transition-all cursor-pointer whitespace-nowrap self-end sm:self-center shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                    >
                      VIEW CREDENTIAL
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 3: Live Cohort Masterminds & Zoom Schedule */}
        {activeTab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-[#090E1A] p-5 rounded-2xl border border-outline-variant/30">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Live Zoom Cohorts &amp; Mastermind Calendar
                </h3>
                <p className="font-mono-data text-xs text-on-surface-variant">
                  Direct live access links and schedule coordinates for your active batch cohorts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono-data">
              {coursesData.map((course) => (
                <div
                  key={course.slug}
                  className="p-6 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 rounded bg-secondary/15 text-secondary text-[10px] font-bold uppercase">
                        {course.slug.toUpperCase()} LIVE BATCH
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[#00FF66]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-ping" />
                        UPCOMING
                      </span>
                    </div>

                    <h4 className="font-display text-base font-bold text-on-surface">
                      {course.title}
                    </h4>

                    <div className="p-3 rounded-xl bg-[#070A12] border border-outline-variant/20 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-secondary font-bold">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        <span>{course.nextBatch?.scheduleText || '2026-08-25 (Zoom Live 8:30 PM)'}</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px]">
                        Instructor: {course.instructorName}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/20">
                    <a
                      href={sanitizeExternalUrl(course.nextBatch?.zoomLink, 'https://zoom.us/join')}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/50 text-blue-300 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <span className="material-symbols-outlined text-sm">video_camera_front</span>
                      <span>JOIN ZOOM LIVE SESSION</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Mastermind Q&A & Coach Drill Feedback Board */}
            <div className="mt-8">
              <MastermindQABoard
                currentCourseSlug={coursesData[0]?.slug || 'all'}
                currentUser={{
                  id: currentUser?.id,
                  name: currentUser?.name,
                  role: currentUser?.role,
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Tab 4: Dedicated Mastermind Q&A */}
        {activeTab === 'qa' && (
          <motion.div
            key="qa"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <MastermindQABoard
              currentCourseSlug={coursesData[0]?.slug || 'all'}
              currentUser={{
                id: currentUser?.id,
                name: currentUser?.name,
                role: currentUser?.role,
              }}
            />
          </motion.div>
        )}

        {/* Tab 4: Payment Slips & Invoices */}
        {activeTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-[#090E1A] p-5 rounded-2xl border border-outline-variant/30 flex-wrap gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Tuition &amp; Bank Slip Verification Records
                </h3>
                <p className="font-mono-data text-xs text-on-surface-variant">
                  Track the verification status of your uploaded bank transfer receipts.
                </p>
              </div>
              <button
                onClick={() => setSlipModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-secondary text-black font-mono-data text-xs font-bold hover:bg-secondary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>UPLOAD NEW SLIP</span>
              </button>
            </div>

            {paymentSlips.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant font-mono-data text-sm bg-[#0B0F1C] rounded-2xl border border-outline-variant/30 space-y-3">
                <p>No payment slip records found for your account email.</p>
                <button
                  onClick={() => setSlipModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-secondary/20 border border-secondary text-secondary font-bold text-xs"
                >
                  Submit Payment Slip
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono-data text-xs">
                {paymentSlips.map((slip) => (
                  <div
                    key={slip.id}
                    className="p-5 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 rounded bg-secondary/15 text-secondary text-[10px] font-bold uppercase">
                          {slip.courseSlug?.toUpperCase()} PROGRAM
                        </span>
                        <p className="text-on-surface font-bold mt-1 text-sm">{slip.studentName}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                          slip.status === 'VERIFIED'
                            ? 'bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66]'
                            : slip.status === 'REJECTED'
                            ? 'bg-red-500/15 border border-red-500/40 text-red-400'
                            : 'bg-[#FFB800]/15 border border-[#FFB800]/40 text-[#FFB800]'
                        }`}
                      >
                        {slip.status}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#070A12] border border-outline-variant/20 space-y-1 text-[11px] text-on-surface-variant">
                      <div className="flex justify-between">
                        <span>Bank Reference:</span>
                        <span className="text-on-surface font-bold">{slip.bankReference || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tuition Amount:</span>
                        <span className="text-secondary font-bold">
                          {slip.amount ? `Rs. ${slip.amount.toLocaleString()}` : 'Standard Fee'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Submitted At:</span>
                        <span>{new Date(slip.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate Modal Popup */}
      <CertificateModal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        certificate={activeCert}
      />

      {/* Bank Slip Upload Modal */}
      <BankSlipUploadModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        defaultCourseSlug="bmb"
        onUploadSuccess={() => fetchUserData()}
      />

      {/* Review Submission Modal */}
      {reviewModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg bg-[#0C101C] border border-secondary/40 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4 font-mono-data text-xs max-h-[92vh] overflow-y-auto my-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
              <div>
                <h3 className="font-display text-base sm:text-lg font-black text-secondary uppercase">
                  Transmit Course Review
                </h3>
                <p className="text-on-surface-variant text-[10px] sm:text-[11px]">
                  Share your transformation with future cohort operatives
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {reviewSuccessMsg && (
              <div className="p-3 rounded-xl bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66]">
                ✓ {reviewSuccessMsg}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3.5">
              <div>
                <label className="block text-on-surface-variant mb-1 uppercase text-[10px] sm:text-xs">
                  Select Directive
                </label>
                <select
                  value={reviewCourseSlug}
                  onChange={(e) => setReviewCourseSlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs"
                >
                  <option value="bmb">Beyond Mind Boundaries (BMB)</option>
                  <option value="leadership">Leadership &amp; Command Academy</option>
                  <option value="ignit">IGNIT Enterprise Incubator</option>
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 uppercase text-[10px] sm:text-xs">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex gap-2 items-center flex-wrap">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl cursor-pointer transition-transform hover:scale-110 ${
                        star <= reviewRating ? 'text-[#FFB800]' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-secondary font-bold ml-1 text-xs">
                    {reviewRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 uppercase text-[10px] sm:text-xs">
                  Headline / Key Shift (Optional)
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Total neurological breakthrough in 5 days"
                  className="w-full p-2.5 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 uppercase text-[10px] sm:text-xs">
                  Your Tactical Review *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Detail how this program shifted your execution, mindset, and results..."
                  className="w-full p-3 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none resize-none text-xs"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-variant/40 text-on-surface font-mono-data text-xs text-center cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary text-black font-bold hover:bg-secondary-container transition-all cursor-pointer text-xs text-center"
                >
                  {reviewSubmitting ? 'TRANSMITTING...' : 'POST REVIEW'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ── Global Operative Leaderboard Modal ── */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        currentUserId={currentUser?.id}
      />
    </div>
  );
};
