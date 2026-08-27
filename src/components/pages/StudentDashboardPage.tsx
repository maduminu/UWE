import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { authService } from '../../services/auth';
import { safeGetStorage, safeSetStorage } from '../../utils/storage';
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
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates' | 'schedule' | 'payments'>('courses');
  const [expandedCourseSlug, setExpandedCourseSlug] = useState<string | null>(null);

  // Sync auth state in real-time across tabs and components
  useEffect(() => {
    const handleAuthSync = () => {
      const user = authService.getStudentUser() || safeGetStorage('uwe_user_account', null);
      setCurrentUser(user);
    };

    window.addEventListener('storage', handleAuthSync);
    window.addEventListener('auth:logout', handleAuthSync);
    return () => {
      window.removeEventListener('storage', handleAuthSync);
      window.removeEventListener('auth:logout', handleAuthSync);
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

  // Default fallback courses
  const [coursesData, setCoursesData] = useState<EnrolledCourseCard[]>([
    {
      slug: 'bmb',
      title: 'Beyond Mind Boundaries (BMB)',
      subtitle: 'Subconscious Reprogramming & Identity Transcendence',
      division: 'MIND ARCHITECTURE',
      badgeColor: '#FFB800',
      totalModules: 5,
      completedModules: 0,
      progressPercent: 0,
      lastEpisodeTitle: 'Module 01: Neural Deconditioning & Calibration',
      instructorName: 'Commander Janith Perera',
      nextBatch: {
        scheduleText: '2026-08-25 (Zoom Live 8:30 PM)',
      },
    },
    {
      slug: 'leadership',
      title: 'Leadership & Command Academy',
      subtitle: 'Executive Authority & Tactical Delegation',
      division: 'TACTICAL COMMAND',
      badgeColor: '#00D2FF',
      totalModules: 4,
      completedModules: 0,
      progressPercent: 0,
      lastEpisodeTitle: 'Module 01: The Sovereign Command Philosophy',
      instructorName: 'Suranjith Godagama',
      nextBatch: {
        scheduleText: '2026-09-02 (Weekend Mastermind)',
      },
    },
    {
      slug: 'ignit',
      title: 'IGNIT Enterprise Incubator',
      subtitle: 'Zero-to-One Venture Launch & AI Automation',
      division: 'ENTERPRISE VENTURES',
      badgeColor: '#00FF66',
      totalModules: 4,
      completedModules: 0,
      progressPercent: 0,
      lastEpisodeTitle: 'Module 01: Venture Ideation & Market Validation',
      instructorName: 'Dilshan Madusanka',
      nextBatch: {
        scheduleText: '2026-09-15 (Incubator Access)',
      },
    },
  ]);

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

        if (enrolledCourses && enrolledCourses.length > 0) {
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
    <div className="min-h-screen bg-[#070A12] text-on-surface py-10 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      <PageSEO
        title="Operative Command Dashboard"
        description="Access enrolled course directives, live training progress, and verified credential certificates."
        canonical="/dashboard"
      />

      {/* ── 1. Tactical Operative Header ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0C1220] via-[#0F172C] to-[#070A12] border border-secondary/40 p-6 md:p-8 shadow-[0_0_50px_rgba(255,184,0,0.15)] overflow-hidden">
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-[#00D2FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Operative Identity */}
          <div className="flex items-start sm:items-center gap-4 md:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-secondary/30 via-[#0A0E18] to-secondary/10 border-2 border-secondary flex items-center justify-center text-secondary font-display font-black text-2xl sm:text-3xl shadow-[0_0_25px_rgba(255,184,0,0.3)] shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-secondary/20 border border-secondary/50 font-mono-data text-[10px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    {gamificationProfile?.rankInfo?.badgeIcon || 'military_tech'}
                  </span>
                  {gamificationProfile?.rankInfo?.rankTitle || 'NOVICE OPERATIVE'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 font-mono-data text-[10px] text-amber-300 font-bold flex items-center gap-1">
                  <span>🔥</span>
                  <span>{gamificationProfile?.streakDays || 1}D COMBAT STREAK</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#00FF66]/15 border border-[#00FF66]/40 font-mono-data text-[10px] text-[#00FF66] font-bold">
                  {operativeId}
                </span>
                <span className="flex items-center gap-1 font-mono-data text-[10px] text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse inline-block" />
                  DATABASE SYNCED
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-on-surface uppercase tracking-wide">
                {currentUser.name ? currentUser.name : 'Sovereign Operative'}
              </h1>
              <p className="font-mono-data text-xs text-on-surface-variant">
                {currentUser.email} • Enrolled in <span className="text-secondary font-bold">{coursesData.length} Core Directives</span>
              </p>

              {/* Multi-Coach & Cohort Assignment Indicator */}
              {(currentUser.assignedCoachName || gamificationProfile?.assignedCoachName) && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-mono-data font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    <span className="material-symbols-outlined text-xs">school</span>
                    ASSIGNED COMMAND COACH: {currentUser.assignedCoachName || gamificationProfile?.assignedCoachName}
                    <span className="text-blue-400/70">({currentUser.cohortTag || gamificationProfile?.cohortTag || 'ALPHA COHORT'})</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto shrink-0">
            <button
              onClick={() => setLeaderboardOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#1A2234] border border-secondary/50 text-secondary font-mono-data text-xs font-bold hover:bg-secondary hover:text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.2)] shrink-0"
            >
              <span className="material-symbols-outlined text-sm">trophy</span>
              <span>STANDINGS</span>
            </button>
            <button
              onClick={() => setActivePage('program-videos')}
              className="px-3.5 py-2 rounded-xl bg-secondary text-black font-mono-data text-xs font-bold hover:bg-secondary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.35)] shrink-0"
            >
              <span className="material-symbols-outlined text-sm">play_circle</span>
              <span>VIDEO VAULT</span>
            </button>
            <button
              onClick={() => setSlipModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 font-mono-data text-xs text-on-surface hover:bg-surface-variant transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-secondary">receipt_long</span>
              <span>UPLOAD SLIP</span>
            </button>
            <button
              onClick={() => setReviewModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 font-mono-data text-xs text-on-surface hover:bg-surface-variant transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-secondary">rate_review</span>
              <span>WRITE REVIEW</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-mono-data text-xs hover:bg-red-500/25 transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Logout session"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        </div>

        {/* ── Operative XP Progression Bar ── */}
        <div className="mt-6 pt-5 border-t border-outline-variant/30 font-mono-data">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">bolt</span>
                TACTICAL XP PROGRESSION:
              </span>
              <span className="text-xs text-on-surface font-extrabold">
                {gamificationProfile?.xp || 0} XP
              </span>
              <span className="text-[11px] text-on-surface-variant">
                / {gamificationProfile?.rankInfo?.nextRankXp || 150} XP for next tier
              </span>
            </div>
            <div className="flex items-center gap-2">
              {gamificationProfile?.badges && gamificationProfile.badges.length > 0 && (
                <div className="flex items-center gap-1">
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
          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-outline-variant/30 relative">
            <div
              className="h-full bg-gradient-to-r from-secondary/80 to-secondary rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,184,0,0.5)]"
              style={{ width: `${gamificationProfile?.rankInfo?.progressPercent || 0}%` }}
            />
          </div>
        </div>

        {/* Tactical KPI Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-5 font-mono-data">
          <div className="p-4 rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase">DIRECTIVES ENROLLED</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-2xl md:text-3xl font-black text-secondary">{coursesData.length}</span>
              <span className="text-[10px] text-on-surface-variant">Active Programs</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase">OVERALL PROGRESS</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-2xl md:text-3xl font-black text-[#00FF66]">{overallProgress}%</span>
              <span className="text-[10px] text-on-surface-variant">LMS Completion</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase">COHORT STATUS</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-2xl md:text-3xl font-black text-[#00D2FF]">{inProgressCount}</span>
              <span className="text-[10px] text-on-surface-variant">In Training</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090E1A] border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase">CREDENTIALS ISSUED</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-2xl md:text-3xl font-black text-[#FFB800]">{userCertificates.length || completedCount}</span>
              <span className="text-[10px] text-on-surface-variant">Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Interactive Workspace Tabs ── */}
      <div className="border-b border-outline-variant/30 flex gap-2 sm:gap-4 overflow-x-auto pb-1">
        {[
          { id: 'courses', label: `Directives & Progress (${coursesData.length})`, icon: 'school' },
          { id: 'certificates', label: `Official Credentials (${userCertificates.length})`, icon: 'workspace_premium' },
          { id: 'schedule', label: 'Live Masterminds & Zoom', icon: 'event' },
          { id: 'payments', label: `Payment Slips (${paymentSlips.length})`, icon: 'receipt_long' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 rounded-xl font-mono-data text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
                        <div className="pt-2">
                          <button
                            onClick={() => setExpandedCourseSlug(isExpanded ? null : course.slug)}
                            className="w-full py-1.5 px-3 rounded-lg bg-[#111728] border border-outline-variant/20 text-on-surface-variant text-[11px] font-mono-data hover:text-on-surface flex items-center justify-between cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Modules' : `View ${course.modules.length} Lessons Breakdown`}</span>
                            <span className="material-symbols-outlined text-sm">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1"
                              >
                                {course.modules.map((mod) => (
                                  <div
                                    key={mod.id}
                                    className="p-2 rounded bg-[#080C16] border border-outline-variant/20 flex items-center justify-between text-[10px] font-mono-data"
                                  >
                                    <span className="truncate pr-2 text-on-surface">
                                      0{mod.episodeNumber}. {mod.title}
                                    </span>
                                    <span className={mod.isCompleted ? 'text-[#00FF66] font-bold' : 'text-on-surface-variant'}>
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
                currentCourseSlug={coursesData[0]?.slug || 'bmb'}
                currentUser={{
                  id: currentUser?.id,
                  name: currentUser?.name,
                  role: currentUser?.role,
                }}
              />
            </div>
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
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-[#0C101C] border border-secondary/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4 font-mono-data text-xs"
          >
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
              <div>
                <h3 className="font-display text-lg font-black text-secondary uppercase">
                  Transmit Course Review
                </h3>
                <p className="text-on-surface-variant text-[11px]">
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

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-on-surface-variant mb-1 uppercase">
                  Select Directive
                </label>
                <select
                  value={reviewCourseSlug}
                  onChange={(e) => setReviewCourseSlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none"
                >
                  <option value="bmb">Beyond Mind Boundaries (BMB)</option>
                  <option value="leadership">Leadership &amp; Command Academy</option>
                  <option value="ignit">IGNIT Enterprise Incubator</option>
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 uppercase">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex gap-2 items-center">
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
                  <span className="text-secondary font-bold ml-2">
                    {reviewRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 uppercase">
                  Headline / Key Shift (Optional)
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Total neurological breakthrough in 5 days"
                  className="w-full p-2.5 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 uppercase">
                  Your Tactical Review *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Detail how this program shifted your execution, mindset, and results..."
                  className="w-full p-3 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-variant/40 text-on-surface"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 rounded-xl bg-secondary text-black font-bold hover:bg-secondary-container transition-all cursor-pointer"
                >
                  {reviewSubmitting ? 'TRANSMITTING...' : 'POST REVIEW'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
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
