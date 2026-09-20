import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { authService } from '../../services/auth';
import { useRealtimeEvent } from '../../services/realtime';
import { parsePrice } from '../../utils/priceFormatter';
import { BankSlipUploadModal } from '../ui/BankSlipUploadModal';
import { PageSEO } from '../ui/PageSEO';
import { CourseReviewsSkeleton } from '../ui/ShimmerSkeletons';
import { MastermindQABoard } from '../ui/MastermindQABoard';
import type { PageId } from '../layout/Navbar';

interface CourseDetailPageProps {
  courseSlug?: string;
  setActivePage?: (page: PageId) => void;
  onBackToCatalog?: () => void;
}

interface DetailedCourseInfo {
  slug: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  price: number;
  duration: string;
  scheduleText: string;
  availableSeats: number;
  totalSeats: number;
  rating: number;
  reviewCount: number;
  description: string;
  trailerVideoUrl?: string;
  instructor: {
    name: string;
    title: string;
    bio: string;
    credentials: string;
    specialties: string;
    studentCount: number;
  };
  learningOutcomes: string[];
  modules: {
    number: number;
    title: string;
    duration: string;
    isFreePreview?: boolean;
    description: string;
  }[];
}

const DEFAULT_COURSE_DETAILS: Record<string, DetailedCourseInfo> = {
  bmb: {
    slug: 'bmb',
    title: 'Beyond Mind Boundaries (BMB)',
    subtitle: 'Subconscious Reprogramming & Identity Transcendence Architecture',
    badge: 'MIND DIVISION',
    badgeColor: '#FFB800',
    price: 15000,
    duration: '5 Days Intensive (Night Zoom Live)',
    scheduleText: 'Next Cohort: 2026-08-25 (Zoom Live 8:30 PM)',
    availableSeats: 6,
    totalSeats: 20,
    rating: 4.98,
    reviewCount: 48,
    description:
      'A transformative 5-day neurological and mindset rewiring masterclass designed to shatter self-imposed limitations, master wealth psychology, and program your subconscious for unyielding sovereign execution.',
    instructor: {
      name: 'Commander Janith Perera',
      title: 'Founder & Chief Mindset Architect',
      bio: 'Pioneer of the Subconscious Rewiring Framework in Sri Lanka. Trained over 4,500+ professionals and elite corporate executives.',
      credentials: 'B.Sc (Hons), Certified Master NLP Practitioner, Elite Executive Coach',
      specialties: 'Subconscious Reprogramming, High-Ticket Negotiation, Sovereign Mind Architecture',
      studentCount: 3200,
    },
    learningOutcomes: [
      'Eliminate subconscious fear, hesitation, and self-sabotaging behavior patterns.',
      'Construct a bulletproof wealth and abundance paradigm tailored for tough economic climates.',
      'Master the 4-phase mental conditioning protocol used by high-performing enterprise leaders.',
      'Deploy the Identity Shift Framework to command respect and influence in every room.',
      'Receive the 21-Day Daily Subconscious Audio Directive for permanent neural integration.',
    ],
    modules: [
      { number: 1, title: 'Neural Deconditioning & Baseline Calibration', duration: '18:40', isFreePreview: true, description: 'Auditing your inherited subconscious software and locating energetic blockers.' },
      { number: 2, title: 'The Quantum Reality Paradigm', duration: '24:15', isFreePreview: false, description: 'Understanding how internal frequencies dictate external financial outcomes.' },
      { number: 3, title: 'Fear Annihilation & Emotional Stoicism', duration: '28:50', isFreePreview: false, description: 'Techniques to neutralize panic, market uncertainty, and imposter syndrome.' },
      { number: 4, title: 'Wealth Matrix & High-Ticket Psychology', duration: '32:10', isFreePreview: false, description: 'Architecting your personal economic moat and value proposition.' },
      { number: 5, title: 'Identity Transcendence Protocol & Seal', duration: '35:20', isFreePreview: false, description: 'Final directive seal and integration into the Sovereign Alumni network.' },
    ],
  },
  leadership: {
    slug: 'leadership',
    title: 'Leadership & Command Academy',
    subtitle: 'Executive Authority, Tactical Delegation & Organizational Supremacy',
    badge: 'COMMAND DIVISION',
    badgeColor: '#00D2FF',
    price: 25000,
    duration: '4 Weeks Strategic Cohort',
    scheduleText: 'Next Cohort: 2026-09-02 (Weekend Mastermind)',
    availableSeats: 4,
    totalSeats: 15,
    rating: 4.95,
    reviewCount: 36,
    description:
      'An elite leadership directive designed for founders, directors, and emerging managers ready to command high-performance teams, negotiate seven-figure contracts, and build resilient commercial systems.',
    instructor: {
      name: 'Suranjith Godagama',
      title: 'Enterprise Growth Strategist & Corporate Coach',
      bio: 'Renowned sales director and enterprise tactician with over 15+ years leading commercial teams across South Asia.',
      credentials: 'MBA (UK), Fellow CIM, Senior Commercial Growth Director',
      specialties: 'B2B Sales Mastery, High-Performance Leadership, Market Penetration',
      studentCount: 2150,
    },
    learningOutcomes: [
      'Master tactical delegation without sacrificing operational velocity or quality.',
      'Develop high-stakes negotiation protocols to close deals at premium margins.',
      'Build scalable KPI and OKR management dashboards for autonomous teams.',
      'Architect corporate crisis response systems to protect revenue during market shocks.',
    ],
    modules: [
      { number: 1, title: 'The Sovereign Command Philosophy', duration: '22:10', isFreePreview: true, description: 'The fundamentals of extreme ownership and leadership magnetism.' },
      { number: 2, title: 'High-Velocity Team Architecture', duration: '31:40', isFreePreview: false, description: 'Recruiting, retaining, and deploying A-player operatives.' },
      { number: 3, title: 'Strategic Negotiation & Power Dynamics', duration: '40:15', isFreePreview: false, description: 'Psychological leverage in boardroom negotiations.' },
      { number: 4, title: 'Operational Redundancy & Delegation', duration: '34:50', isFreePreview: false, description: 'Automating business operations for founder freedom.' },
    ],
  },
  ignit: {
    slug: 'ignit',
    title: 'IGNIT Enterprise Incubator',
    subtitle: 'Zero-to-One Venture Launch, AI Automation & Scalable Commercial Systems',
    badge: 'ENTERPRISE DIVISION',
    badgeColor: '#00FF66',
    price: 35000,
    duration: '6 Weeks Accelerator Program',
    scheduleText: 'Next Cohort: 2026-09-15 (Incubator Access)',
    availableSeats: 8,
    totalSeats: 20,
    rating: 4.92,
    reviewCount: 29,
    description:
      'A venture creation and scaling blueprint that equips entrepreneurs with AI automation pipelines, digital product architecture, and investor-ready financial models.',
    instructor: {
      name: 'Dilshan Madusanka',
      title: 'Lead Incubator Tactician & AI Systems Specialist',
      bio: 'Tech entrepreneur and venture strategist specializing in AI integration, rapid venture scaling, and capital allocation.',
      credentials: 'M.Sc Computing, Venture Mentor, AI Product Architect',
      specialties: 'AI Automation, Startup MVP Scaling, Venture Capital Pitching',
      studentCount: 1400,
    },
    learningOutcomes: [
      'Validate, build, and launch a commercial venture MVP in under 30 days.',
      'Automate lead acquisition and customer onboarding with custom AI workflows.',
      'Master unit economics, customer acquisition cost (CAC), and lifetime value (LTV).',
      'Create an institutional-grade pitch deck and investor presentation.',
    ],
    modules: [
      { number: 1, title: 'Venture Ideation & Market Validation', duration: '25:00', isFreePreview: true, description: 'Stress-testing business models against market demand.' },
      { number: 2, title: 'AI Automation & No-Code Systems', duration: '38:20', isFreePreview: false, description: 'Building operational pipelines that run 24/7 with zero headcount.' },
      { number: 3, title: 'Growth Engine & Organic Distribution', duration: '42:10', isFreePreview: false, description: 'Acquiring your first 100 paying customers organically.' },
      { number: 4, title: 'Venture Capital & Scaled Financing', duration: '36:45', isFreePreview: false, description: 'Valuation mechanics, equity structures, and pitch mastery.' },
    ],
  },
};



export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  courseSlug,
  setActivePage,
  onBackToCatalog,
}) => {
  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'syllabus' | 'outcomes' | 'instructor' | 'reviews' | 'qa'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['syllabus', 'outcomes', 'instructor', 'reviews', 'qa'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'syllabus';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['syllabus', 'outcomes', 'instructor', 'reviews', 'qa'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [totalReviewsCount, setTotalReviewsCount] = useState<number>(0);
  const [serverDistribution, setServerDistribution] = useState<Record<number, number> | null>(null);
  const [avgRating, setAvgRating] = useState<number>(5.0);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);

  // Review submission state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentRole, setStudentRole] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  const effectiveSlug = params.slug || courseSlug || 'bmb';
  const [course, setCourse] = useState<DetailedCourseInfo>(() => {
    return DEFAULT_COURSE_DETAILS[effectiveSlug] || DEFAULT_COURSE_DETAILS.bmb;
  });

  const loadLiveCourse = useCallback(async () => {
    try {
      const res = await api.getCourseBySlug(effectiveSlug);
      if (res.success && res.data) {
        const live = res.data;
        const defaultMatch = DEFAULT_COURSE_DETAILS[effectiveSlug] || DEFAULT_COURSE_DETAILS.bmb;
        const upcomingBatch = live.batches?.find((b: any) => b.status === 'UPCOMING' || b.status === 'ACTIVE') || live.batches?.[0];

        setCourse({
          ...defaultMatch,
          title: live.title || defaultMatch.title,
          subtitle: live.subtitle || defaultMatch.subtitle,
          price: live.price ? parsePrice(live.price) : defaultMatch.price,
          badge: live.badge || defaultMatch.badge,
          duration: live.duration || defaultMatch.duration,
          scheduleText: upcomingBatch?.scheduleText || defaultMatch.scheduleText,
          availableSeats: typeof upcomingBatch?.availableSeats === 'number' ? upcomingBatch.availableSeats : defaultMatch.availableSeats,
          totalSeats: typeof upcomingBatch?.totalSeats === 'number' ? upcomingBatch.totalSeats : defaultMatch.totalSeats,
        });
      }
    } catch {
      // API fallback
    }
  }, [effectiveSlug]);

  useEffect(() => {
    loadLiveCourse();
  }, [loadLiveCourse]);

  useRealtimeEvent('course:updated', () => loadLiveCourse());
  useRealtimeEvent('review:updated', () => fetchReviews());

  const fetchReviews = async (pageToFetch = 1, append = false) => {
    if (pageToFetch === 1) {
      setLoadingReviews(true);
    } else {
      setLoadingMoreReviews(true);
    }
    try {
      const res = await api.getCourseReviews(effectiveSlug, {
        page: pageToFetch,
        limit: 8,
        rating: selectedRatingFilter !== null ? selectedRatingFilter : undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        if (append) {
          setReviews((prev) => [...prev, ...res.data]);
        } else {
          setReviews(res.data);
        }
        setReviewPage(pageToFetch);
        setHasMoreReviews(res.pagination?.hasMore ?? false);
        if (typeof res.totalCount === 'number') {
          setTotalReviewsCount(res.totalCount);
        }
        if (res.ratingDistribution) {
          setServerDistribution(res.ratingDistribution);
        }
        if (typeof res.averageRating === 'number') {
          setAvgRating(res.averageRating);
        } else if (!append && res.data.length > 0) {
          const sum = res.data.reduce((acc: number, r: any) => acc + (r.rating || 5), 0);
          setAvgRating(parseFloat((sum / res.data.length).toFixed(1)));
        }
      }
    } catch (err) {
      console.warn('Could not load course reviews from database', err);
    } finally {
      setLoadingReviews(false);
      setLoadingMoreReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews(1, false);
  }, [effectiveSlug, selectedRatingFilter]);

  // Autofill name if student is logged in
  useEffect(() => {
    const studentUser = authService.getStudentUser();
    if (studentUser) {
      setStudentName(studentUser.name || '');
      setStudentRole('Verified Student Operative');
    }
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !reviewComment.trim()) return;

    setIsSubmittingReview(true);
    setReviewSuccessMessage(null);

    const studentUser = authService.getStudentUser();
    const optimisticId = `optimistic_rev_${Date.now()}`;
    const optimisticReview = {
      id: optimisticId,
      courseSlug: course.slug,
      studentName: studentName.trim(),
      studentRole: studentRole.trim() || 'Verified Operative',
      rating: reviewRating,
      title: reviewTitle.trim() || undefined,
      comment: reviewComment.trim(),
      isVerified: true,
      isApproved: true,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    const previousReviews = [...reviews];
    // 0ms Perceived Latency: instantly show review in the UI
    setReviews((prev) => [optimisticReview, ...prev]);
    setReviewSuccessMessage('✓ Review submitted instantly!');

    const capturedTitle = reviewTitle.trim();
    const capturedComment = reviewComment.trim();
    setReviewComment('');
    setReviewTitle('');

    try {
      const res = await api.submitReview({
        courseSlug: course.slug,
        studentName: studentName.trim(),
        studentRole: studentRole.trim() || 'Verified Operative',
        rating: reviewRating,
        title: capturedTitle || undefined,
        comment: capturedComment,
        userId: studentUser?.id,
      });

      if (res.success) {
        setReviewSuccessMessage('✓ Review verified & published to the command network!');
        if (res.data) {
          setReviews((prev) =>
            prev.map((r) => (r.id === optimisticId ? res.data : r))
          );
        }
        setTimeout(() => {
          setReviewModalOpen(false);
          setReviewSuccessMessage(null);
        }, 800);
      } else {
        throw new Error(res.message || 'Submission rejected by server');
      }
    } catch (err: any) {
      console.error('Failed to post review:', err);
      // Seamless rollback on failure
      setReviews(previousReviews);
      setReviewComment(capturedComment);
      setReviewTitle(capturedTitle);
      setReviewSuccessMessage('❌ Submission failed — review rolled back.');
      setTimeout(() => setReviewSuccessMessage(null), 3000);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleWhatsAppEnroll = async () => {
    const currentUser = authService.getStudentUser();
    const text = encodeURIComponent(
      `Hello Command Council, I wish to enroll in the ${course.title} directive (${course.badge}). Please send the payment instructions and batch access.`
    );
    try {
      await api.createLead({
        name: currentUser?.name || 'Prospective Operative',
        phone: currentUser?.phone || '071 709 6386',
        email: currentUser?.email || null,
        courseSlug: course.slug,
        inquiryType: (course.slug || 'GENERAL').toUpperCase(),
        message: `Enrollment inquiry for ${course.title}`,
      });
    } catch {
      /* ignore */
    }
    window.open(`https://wa.me/94717096386?text=${text}`, '_blank');
  };

  // Rating breakdown & filtering
  const ratingDistribution = serverDistribution || {
    5: reviews.filter((r) => Math.round(r.rating || 5) === 5).length,
    4: reviews.filter((r) => Math.round(r.rating || 5) === 4).length,
    3: reviews.filter((r) => Math.round(r.rating || 5) === 3).length,
    2: reviews.filter((r) => Math.round(r.rating || 5) === 2).length,
    1: reviews.filter((r) => Math.round(r.rating || 5) === 1).length,
  };

  const displayedReviews = selectedRatingFilter === null
    ? reviews
    : reviews.filter((r) => Math.round(r.rating || 5) === selectedRatingFilter);
  const displayRating = reviews.length > 0 ? avgRating : course.rating;
  const displayReviewCount = totalReviewsCount > 0 ? totalReviewsCount : reviews.length;

  return (
    <div className="min-h-screen bg-[#070A12] text-on-surface py-6 sm:py-10 pb-32 lg:pb-12 px-3.5 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-10 w-full overflow-x-hidden">
      <PageSEO
        title={course.title}
        description={course.description || `${course.title} - ${course.subtitle}`}
        canonical={`/programs/${course.slug}`}
      />
      {/* ── Breadcrumb Navigation ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono-data text-on-surface-variant flex-wrap min-w-0">
        <button onClick={() => onBackToCatalog ? onBackToCatalog() : navigate('/programs')} className="hover:text-secondary flex items-center gap-1 cursor-pointer shrink-0">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Courses Catalog</span>
        </button>
        <span>/</span>
        <span className="text-secondary uppercase shrink-0">{course.badge}</span>
        <span>/</span>
        <span className="text-on-surface truncate max-w-[200px] sm:max-w-none">{course.title}</span>
      </div>

      {/* ── Hero Overview Header & Pricing Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start w-full">
        {/* Left 2 Cols: Main Info */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono-data font-bold uppercase tracking-wider border shrink-0"
              style={{
                backgroundColor: `${course.badgeColor}15`,
                borderColor: `${course.badgeColor}40`,
                color: course.badgeColor,
              }}
            >
              {course.badge}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('reviews');
                const tabsNav = document.getElementById('course-tabs-nav');
                if (tabsNav) tabsNav.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1 font-mono-data text-[11px] sm:text-xs text-[#FFB800] shrink-0 hover:underline cursor-pointer transition-opacity hover:opacity-90"
            >
              <span>★</span>
              <span className="font-bold">{displayRating}</span>
              <span className="text-on-surface-variant">({displayReviewCount} Operatives)</span>
            </button>
            <span className="font-mono-data text-[11px] sm:text-xs text-on-surface-variant shrink-0">• {course.duration}</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black text-on-surface uppercase tracking-wide leading-tight break-words">
            {course.title}
          </h1>

          <p className="font-display text-sm sm:text-base md:text-lg text-secondary font-bold leading-snug">
            {course.subtitle}
          </p>

          <p className="font-body-md text-xs sm:text-sm md:text-base text-on-surface-variant leading-relaxed">
            {course.description}
          </p>

          {/* Instructor Snapshot */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0C1220] border border-outline-variant/30 flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary/20 border border-secondary flex items-center justify-center text-secondary font-display font-bold text-base sm:text-lg shrink-0">
              {course.instructor.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono-data text-[9px] sm:text-[10px] text-secondary uppercase font-bold tracking-wider truncate">
                LEAD INSTRUCTOR &amp; FACULTY
              </p>
              <h4 className="font-display text-sm sm:text-base font-bold text-on-surface truncate">
                {course.instructor.name}
              </h4>
              <p className="font-mono-data text-[11px] sm:text-xs text-on-surface-variant truncate">
                {course.instructor.title}
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Instant Enrollment Action Card */}
        <div className="rounded-2xl bg-gradient-to-b from-[#0E1528] to-[#080C16] border border-secondary/50 p-4 sm:p-6 md:p-8 shadow-[0_0_50px_rgba(255,184,0,0.18)] space-y-4 sm:space-y-6 lg:sticky lg:top-24 w-full min-w-0">
          <div className="space-y-1.5 sm:space-y-2 pb-3.5 sm:pb-4 border-b border-outline-variant/30">
            <p className="font-mono-data text-[10px] sm:text-xs text-on-surface-variant uppercase">TUITION &amp; ADMISSION</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-secondary">
                Rs. {course.price.toLocaleString()}
              </span>
              <span className="font-mono-data text-xs text-on-surface-variant">LKR</span>
            </div>
            <p className="font-mono-data text-[10px] sm:text-[11px] text-[#00FF66]">
              ✓ Includes Official Certificate &amp; Alumni Network
            </p>
          </div>

          {/* Batch Status & Seat Counter */}
          <div className="space-y-2 p-3 rounded-xl bg-[#0A0E18] border border-outline-variant/20">
            <div className="flex justify-between text-[11px] sm:text-xs font-mono-data">
              <span className="text-on-surface-variant">Cohort Capacity</span>
              <span className="text-secondary font-bold">{course.availableSeats} of {course.totalSeats} Seats Left</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#161D2E] overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${((course.totalSeats - course.availableSeats) / course.totalSeats) * 100}%` }}
              />
            </div>
            <p className="font-mono-data text-[10px] text-on-surface-variant mt-1">
              🗓️ {course.scheduleText}
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => setSlipModalOpen(true)}
              className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-secondary to-[#FFD700] text-black font-mono-data text-xs font-black uppercase hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,184,0,0.4)] cursor-pointer text-center"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>ENROLL VIA BANK SLIP (INSTANT)</span>
            </button>

            <button
              onClick={handleWhatsAppEnroll}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-[#00FF66]/15 border border-[#00FF66]/50 text-[#00FF66] font-mono-data text-xs font-bold uppercase hover:bg-[#00FF66] hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>INQUIRE VIA WHATSAPP</span>
            </button>

            <button
              onClick={() => setActivePage ? setActivePage('program-videos') : navigate('/videos')}
              className="w-full py-2.5 rounded-xl bg-surface-variant/40 text-on-surface font-mono-data text-xs hover:bg-surface-variant transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span className="material-symbols-outlined text-sm text-secondary">play_circle</span>
              <span>Watch Episode 1 Preview Free</span>
            </button>
          </div>

          <p className="font-mono-data text-[10px] text-center text-on-surface-variant">
            🔒 Bank transfers, online CDM &amp; mobile banking accepted. Instant approval upon verification.
          </p>
        </div>
      </div>

      {/* ── Interactive Tab Navigation ── */}
      <div id="course-tabs-nav" className="border-b border-outline-variant/30 flex gap-3 md:gap-8 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
        {[
          { id: 'syllabus', label: 'Curriculum & Modules', icon: 'list_alt' },
          { id: 'outcomes', label: 'What You Will Master', icon: 'check_circle' },
          { id: 'instructor', label: 'Faculty Profile', icon: 'person' },
          { id: 'reviews', label: `Reviews (${displayedReviews.length})`, icon: 'star' },
          { id: 'qa', label: 'Directive Q&A', icon: 'forum' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 font-mono-data text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-secondary font-bold border-b-2 border-secondary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Views ── */}
      <div className="pt-2">
        {/* 1. Syllabus & Modules */}
        {activeTab === 'syllabus' && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold uppercase text-on-surface">
              Tactical Syllabus ({course.modules.length} Intensive Modules)
            </h3>
            <div className="space-y-3">
              {course.modules.map((mod) => (
                <div
                  key={mod.number}
                  className="p-4 md:p-5 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 hover:border-secondary/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary font-mono-data font-bold text-xs flex items-center justify-center shrink-0">
                      0{mod.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-sm md:text-base font-bold text-on-surface">
                          {mod.title}
                        </h4>
                        {mod.isFreePreview && (
                          <span className="px-2 py-0.5 rounded bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] font-mono-data text-[10px] font-bold uppercase">
                            FREE PREVIEW
                          </span>
                        )}
                      </div>
                      <p className="font-body-md text-xs text-on-surface-variant mt-1">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center font-mono-data text-xs">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {mod.duration}
                    </span>
                    <button
                      onClick={() => setActivePage ? setActivePage('program-videos') : navigate('/videos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        mod.isFreePreview
                          ? 'bg-secondary text-black hover:bg-secondary-container'
                          : 'bg-surface-variant/40 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {mod.isFreePreview ? 'PLAY LESSON' : 'UNLOCK'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Learning Outcomes */}
        {activeTab === 'outcomes' && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold uppercase text-on-surface">
              Core Capabilities You Will Possess
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {course.learningOutcomes.map((outcome, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 flex items-start gap-3"
                >
                  <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5">
                    verified
                  </span>
                  <p className="font-body-md text-sm text-on-surface leading-relaxed">
                    {outcome}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Instructor Profile */}
        {activeTab === 'instructor' && (
          <div className="p-6 md:p-8 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-secondary/30 to-primary/30 border-2 border-secondary flex items-center justify-center text-secondary font-display text-3xl font-black shadow-[0_0_25px_rgba(255,184,0,0.3)]">
                {course.instructor.name.charAt(0)}
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-secondary/15 border border-secondary/40 text-secondary font-mono-data text-xs font-bold uppercase">
                  MASTER FACULTY
                </span>
                <h3 className="font-display text-2xl font-bold text-on-surface">
                  {course.instructor.name}
                </h3>
                <p className="font-mono-data text-xs text-secondary">
                  {course.instructor.title}
                </p>
                <p className="font-body-md text-sm text-on-surface-variant max-w-2xl leading-relaxed">
                  {course.instructor.bio}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-outline-variant/30 font-mono-data text-xs">
              <div className="p-4 rounded-xl bg-[#070A12] border border-outline-variant/20">
                <span className="text-on-surface-variant block">Credentials:</span>
                <span className="text-on-surface font-bold mt-1 block">{course.instructor.credentials}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#070A12] border border-outline-variant/20">
                <span className="text-on-surface-variant block">Total Alumni Coached:</span>
                <span className="text-secondary font-bold text-lg mt-1 block">{course.instructor.studentCount.toLocaleString()}+</span>
              </div>
              <div className="p-4 rounded-xl bg-[#070A12] border border-outline-variant/20">
                <span className="text-on-surface-variant block">Student Rating:</span>
                <span className="text-[#FFB800] font-bold text-base mt-1 block">★ 4.98 / 5.0</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Student Reviews (Database Driven Live Synced) */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Rating Breakdown & Summary Header */}
            <div className="p-6 md:p-8 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center shadow-xl">
              {/* Left Column: Overall Score & Star Summary */}
              <div className="lg:col-span-3 text-center lg:text-left space-y-2 border-b lg:border-b-0 lg:border-r border-outline-variant/20 pb-5 lg:pb-0 lg:pr-6">
                <div className="flex items-baseline justify-center lg:justify-start gap-2">
                  <span className="font-display text-5xl md:text-6xl font-black text-secondary tracking-tight">
                    {displayRating}
                  </span>
                  <span className="font-mono-data text-xs text-on-surface-variant font-bold">
                    / 5.0
                  </span>
                </div>
                <div className="flex justify-center lg:justify-start gap-1 text-[#FFB800] text-lg">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star}>
                      {star <= Math.round(displayRating) ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <p className="font-mono-data text-xs text-on-surface-variant">
                  Based on {displayReviewCount} Verified Database {displayReviewCount === 1 ? 'Review' : 'Reviews'}
                </p>
                {selectedRatingFilter !== null && (
                  <button
                    onClick={() => setSelectedRatingFilter(null)}
                    className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary text-[11px] font-mono-data hover:bg-secondary/25 transition-colors cursor-pointer border border-secondary/30"
                  >
                    <span>Clear Filter ({selectedRatingFilter}★)</span>
                    <span className="text-xs">✕</span>
                  </button>
                )}
              </div>

              {/* Middle Column: Interactive Progress Bars (5★ to 1★) */}
              <div className="lg:col-span-6 space-y-2 px-0 sm:px-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star as keyof typeof ratingDistribution] || 0;
                  const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : (star === 5 && reviews.length === 0 ? 100 : 0);
                  const isSelected = selectedRatingFilter === star;

                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRatingFilter(isSelected ? null : star)}
                      title={`Filter by ${star} star reviews (${count})`}
                      className={`w-full group flex items-center gap-3 p-1.5 rounded-lg text-left transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-secondary/15 ring-1 ring-secondary shadow-[0_0_12px_rgba(255,184,0,0.25)]'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Star Label */}
                      <span className={`w-10 text-xs font-mono-data font-bold flex items-center gap-0.5 shrink-0 ${
                        isSelected ? 'text-secondary' : 'text-on-surface-variant group-hover:text-secondary'
                      }`}>
                        <span>{star}</span>
                        <span className="text-[#FFB800] text-xs">★</span>
                      </span>

                      {/* Progress Bar Track */}
                      <div className="flex-1 h-2.5 bg-[#141B2D] rounded-full overflow-hidden border border-outline-variant/30 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSelected
                              ? 'bg-secondary shadow-[0_0_10px_rgba(255,184,0,0.6)]'
                              : 'bg-gradient-to-r from-secondary/80 to-[#FFB800] group-hover:from-secondary group-hover:to-[#FFD700]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Percentage & Count */}
                      <div className="w-16 text-right shrink-0 flex items-center justify-end gap-1">
                        <span className={`text-[11px] font-mono-data font-bold ${
                          isSelected ? 'text-secondary' : 'text-on-surface-variant group-hover:text-on-surface'
                        }`}>
                          {pct}%
                        </span>
                        <span className="text-[10px] font-mono-data text-on-surface-variant/70">
                          ({count})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Actions */}
              <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/20 pt-5 lg:pt-0 lg:pl-6">
                <button
                  onClick={() => setReviewModalOpen(true)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary/15 border border-secondary text-secondary font-mono-data text-xs font-bold hover:bg-secondary hover:text-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,184,0,0.2)]"
                >
                  <span className="material-symbols-outlined text-sm">rate_review</span>
                  <span>WRITE A REVIEW</span>
                </button>
                <button
                  onClick={() => setSlipModalOpen(true)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-black font-mono-data text-xs font-bold hover:bg-secondary-container transition-all cursor-pointer flex items-center justify-center shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                >
                  JOIN THIS COHORT
                </button>
              </div>
            </div>

            {/* Active Rating Filter Pill */}
            {selectedRatingFilter !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0F1424] border border-secondary/40 text-xs font-mono-data text-secondary">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-secondary">filter_alt</span>
                  <span>
                    Showing only <strong>{selectedRatingFilter}★ Reviews</strong> ({displayedReviews.length} found)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRatingFilter(null)}
                  className="px-2.5 py-1 rounded bg-secondary/20 hover:bg-secondary hover:text-black transition-colors cursor-pointer text-[11px] font-bold"
                >
                  Show All Reviews
                </button>
              </div>
            )}

            {/* Live Reviews Grid */}
            {loadingReviews ? (
              <CourseReviewsSkeleton count={4} />
            ) : displayedReviews.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant font-mono-data text-sm bg-[#0B0F1C] rounded-2xl border border-outline-variant/30 space-y-3">
                {selectedRatingFilter !== null ? (
                  <>
                    <p>No verified reviews found matching the {selectedRatingFilter}★ filter.</p>
                    <button
                      onClick={() => setSelectedRatingFilter(null)}
                      className="px-4 py-2 rounded bg-secondary/20 text-secondary font-bold text-xs border border-secondary/40 cursor-pointer"
                    >
                      Clear Filter &amp; View All Reviews
                    </button>
                  </>
                ) : (
                  <>
                    <p>No verified operative reviews currently published for this program.</p>
                    <button
                      onClick={() => setReviewModalOpen(true)}
                      className="px-4 py-2 rounded bg-secondary/20 text-secondary font-bold text-xs border border-secondary/40 cursor-pointer"
                    >
                      Be the First Operative to Write a Review
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 space-y-3 hover:border-secondary/40 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-display text-sm font-bold text-on-surface">{rev.studentName}</h4>
                          <p className="font-mono-data text-[10px] text-secondary">{rev.studentRole || 'Verified Operative'}</p>
                        </div>
                        <div className="text-[#FFB800] text-xs font-mono-data tracking-widest">
                          {'★'.repeat(rev.rating || 5)}
                          {'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                        </div>
                      </div>
                      {rev.title && (
                        <h5 className="font-display text-xs font-bold text-on-surface">
                          {rev.title}
                        </h5>
                      )}
                      <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                        "{rev.comment}"
                      </p>
                      <p className="font-mono-data text-[9px] text-on-surface-variant pt-2 border-t border-outline-variant/20 flex justify-between">
                        <span>✓ {rev.isVerified ? 'Verified Operative' : 'Database Record'}</span>
                        <span>{new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* Tactical Load More Reviews Pagination */}
                {hasMoreReviews && (
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => fetchReviews(reviewPage + 1, true)}
                      disabled={loadingMoreReviews}
                      className="px-6 py-3 rounded-xl bg-[#0E1424] hover:bg-secondary/15 border border-secondary/40 hover:border-secondary text-secondary font-mono-data text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 shadow-[0_0_20px_rgba(255,184,0,0.15)] disabled:opacity-50"
                    >
                      {loadingMoreReviews ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                          <span>PULLING TRANSMISSIONS FROM ARCHIVE...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">expand_more</span>
                          <span>LOAD MORE REVIEWS ({displayedReviews.length} OF {displayReviewCount})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Live Mastermind Q&A Board */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            <MastermindQABoard
              currentCourseSlug={effectiveSlug}
              currentUser={{
                id: studentName ? studentName : undefined,
                name: studentName,
                role: studentRole,
              }}
            />
          </div>
        )}
      </div>

      {/* ── Bank Slip Upload Modal ── */}
      <BankSlipUploadModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        defaultCourseSlug={course.slug}
      />

      {/* ── Interactive Course Review Modal ── */}
      <AnimatePresence>
        {reviewModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-[#0D121F] border border-secondary/50 rounded-2xl p-5 sm:p-7 max-w-lg w-full shadow-2xl relative max-h-[92vh] overflow-y-auto my-auto font-mono-data text-xs"
            >
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-outline-variant/30">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-on-surface">
                    Submit Course Transmission
                  </h3>
                  <p className="font-mono-data text-[10px] sm:text-xs text-secondary">
                    Reviewing: {course.title}
                  </p>
                </div>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface text-xl cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {reviewSuccessMessage ? (
                <div className="p-4 rounded-xl bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] font-mono-data text-xs text-center">
                  ✓ {reviewSuccessMessage}
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-3.5 font-mono-data text-xs">
                  <div>
                    <label className="text-on-surface-variant block mb-1 text-[10px] sm:text-xs">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Kasun Wickramasinghe"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-on-surface-variant block mb-1 text-[10px] sm:text-xs">Your Title / Role / Cohort</label>
                    <input
                      type="text"
                      value={studentRole}
                      onChange={(e) => setStudentRole(e.target.value)}
                      placeholder="e.g. Founder & CEO / BMB Cohort 12"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-on-surface-variant block mb-1 text-[10px] sm:text-xs">Star Rating *</label>
                    <div className="flex gap-2 text-2xl cursor-pointer flex-wrap">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className={star <= reviewRating ? 'text-[#FFB800]' : 'text-gray-600'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-on-surface-variant block mb-1 text-[10px] sm:text-xs">Headline (Optional)</label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="e.g. Game-changing mindset shift"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-on-surface-variant block mb-1 text-[10px] sm:text-xs">Your Review &amp; Experience *</label>
                    <textarea
                      required
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Detail the tactical breakthroughs and value you gained from this program..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none resize-none text-xs"
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-variant/30 text-on-surface hover:bg-surface-variant text-center font-mono-data text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary text-black font-bold hover:bg-secondary-container flex items-center justify-center gap-1.5 text-xs text-center cursor-pointer"
                    >
                      {isSubmittingReview ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                          <span>SAVING...</span>
                        </>
                      ) : (
                        <span>TRANSMIT REVIEW</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};
