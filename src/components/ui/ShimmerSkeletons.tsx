import React from 'react';

interface ShimmerBlockProps {
  className?: string;
  variant?: 'default' | 'gold' | 'cyan';
  children?: React.ReactNode;
}

/**
 * Fundamental animated glassmorphism shimmer block.
 * Uses hardware-accelerated sweeping gradients with gold/cyan luminescence.
 */
export const ShimmerBlock: React.FC<ShimmerBlockProps> = ({
  className = '',
  variant = 'default',
  children,
}) => {
  const sweepClass = variant === 'gold' ? 'shimmer-sweep-gold' : 'shimmer-sweep';
  const glowBorder =
    variant === 'gold'
      ? 'border-[#FFB800]/25 shadow-[0_0_15px_rgba(255,184,0,0.1)]'
      : variant === 'cyan'
      ? 'border-[#00D2FF]/25 shadow-[0_0_15px_rgba(0,210,255,0.08)]'
      : 'border-white/[0.08]';

  return (
    <div
      className={`glass-skeleton ${sweepClass} ${glowBorder} ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 1. LEADERBOARD SKELETON (PODIUM CARDS + CORPS ROSTER TABLE)           */
/* ═════════════════════════════════════════════════════════════════════ */

export const LeaderboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse-glow" aria-label="Loading operative standings...">
      {/* ── Top 3 Podium Cards Skeleton ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Rank #1 Champion (Center-weighted Gold) */}
        <div className="p-4 rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/[0.04] flex flex-col items-center text-center relative shimmer-sweep-gold shadow-[0_0_25px_rgba(255,215,0,0.08)]">
          <div className="w-7 h-4 rounded bg-[#FFD700]/20 absolute top-2 left-2.5" />
          <div className="w-10 h-3 rounded bg-amber-400/20 absolute top-2 right-2" />

          {/* Avatar Circle */}
          <div className="w-12 h-12 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 my-2 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-[#FFD700]/20" />
          </div>

          {/* Name & ID */}
          <div className="w-24 h-4 rounded bg-white/15 my-1" />
          <div className="w-16 h-2.5 rounded bg-white/10 mb-2" />

          {/* Rank Badge */}
          <div className="w-20 h-5 rounded bg-[#FFD700]/20 border border-[#FFD700]/30 mb-2" />

          {/* XP */}
          <div className="w-14 h-4 rounded bg-[#FFD700]/30" />
        </div>

        {/* Rank #2 Silver */}
        <div className="p-4 rounded-xl border border-white/20 bg-white/[0.03] flex flex-col items-center text-center relative shimmer-sweep shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <div className="w-7 h-4 rounded bg-white/20 absolute top-2 left-2.5" />
          <div className="w-10 h-3 rounded bg-white/10 absolute top-2 right-2" />

          {/* Avatar Circle */}
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 my-2 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/15" />
          </div>

          <div className="w-20 h-4 rounded bg-white/15 my-1" />
          <div className="w-14 h-2.5 rounded bg-white/10 mb-2" />
          <div className="w-20 h-5 rounded bg-blue-500/20 border border-blue-500/30 mb-2" />
          <div className="w-14 h-4 rounded bg-white/20" />
        </div>

        {/* Rank #3 Bronze */}
        <div className="p-4 rounded-xl border border-[#CD7F32]/30 bg-[#CD7F32]/[0.03] flex flex-col items-center text-center relative shimmer-sweep">
          <div className="w-7 h-4 rounded bg-[#CD7F32]/20 absolute top-2 left-2.5" />
          <div className="w-10 h-3 rounded bg-white/10 absolute top-2 right-2" />

          {/* Avatar Circle */}
          <div className="w-12 h-12 rounded-full bg-[#CD7F32]/15 border border-[#CD7F32]/30 my-2 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-[#CD7F32]/20" />
          </div>

          <div className="w-22 h-4 rounded bg-white/15 my-1" />
          <div className="w-14 h-2.5 rounded bg-white/10 mb-2" />
          <div className="w-20 h-5 rounded bg-purple-500/20 border border-purple-500/30 mb-2" />
          <div className="w-14 h-4 rounded bg-white/20" />
        </div>
      </div>

      {/* ── Table Rows Skeleton (Reserve & Active Corps) ── */}
      <div className="space-y-2">
        <div className="w-32 h-3 rounded bg-white/15 mb-3" />

        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 shimmer-sweep flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Standings Number */}
              <div className="w-6 h-4 rounded bg-white/10" />

              {/* Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 shrink-0" />

              <div className="space-y-1.5 min-w-0">
                <div className="w-28 sm:w-40 h-3.5 rounded bg-white/15" />
                <div className="w-20 sm:w-28 h-2.5 rounded bg-white/10" />
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="w-10 h-3 rounded bg-amber-400/20 hidden sm:block" />
              <div className="w-14 h-3.5 rounded bg-secondary/30" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-[10px] font-mono-data text-secondary/80">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
        <span>SYNCING SUPABASE LEDGER WITH QUANTUM FREQUENCY MATRIX...</span>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 2. COURSE REVIEWS SKELETON (GLASS REVIEW CARDS)                       */
/* ═════════════════════════════════════════════════════════════════════ */

export const CourseReviewsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 space-y-3.5 shimmer-sweep shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
        >
          {/* Header Row: Student Info + Stars */}
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <div className="w-32 h-4 rounded bg-white/20" />
              <div className="w-24 h-2.5 rounded bg-secondary/30" />
            </div>
            {/* Star Placeholders */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="w-3 h-3 rounded-full bg-[#FFB800]/30" />
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="w-48 h-3.5 rounded bg-white/15" />

          {/* Quote / Comment lines */}
          <div className="space-y-2">
            <div className="w-full h-3 rounded bg-white/10" />
            <div className="w-5/6 h-3 rounded bg-white/10" />
            <div className="w-3/4 h-3 rounded bg-white/10" />
          </div>

          {/* Footer badge & Date */}
          <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center">
            <div className="w-20 h-2.5 rounded bg-[#00FF66]/20" />
            <div className="w-16 h-2.5 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 3. PROGRAM VIDEOS & SERIES SKELETON                                   */
/* ═════════════════════════════════════════════════════════════════════ */

export const ProgramSeriesSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <div className="space-y-8" aria-label="Loading classified video series...">
      {Array.from({ length: count }).map((_, sIdx) => (
        <div
          key={sIdx}
          className="glass-card rounded-2xl border border-outline-variant/30 p-6 space-y-6 shimmer-sweep bg-[#0B0E14]/80 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        >
          {/* Series Header & LMS Progress Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-outline-variant/30">
            <div className="space-y-2.5 w-full max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-24 h-5 rounded bg-secondary/20 border border-secondary/30" />
                <div className="w-32 h-5 rounded bg-[#2ED573]/15 border border-[#2ED573]/30" />
              </div>
              <div className="w-3/4 h-7 rounded bg-white/20" />
              <div className="w-full h-4 rounded bg-white/10" />

              {/* Progress bar skeleton */}
              <div className="w-full max-w-md bg-[#131929] h-2 rounded-full overflow-hidden mt-3 border border-outline-variant/30">
                <div className="w-1/3 h-full bg-secondary/40 rounded-full" />
              </div>
            </div>

            <div className="w-36 h-9 rounded-xl bg-secondary/20 border border-secondary/30 hidden md:block" />
          </div>

          {/* Episode Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((eIdx) => (
              <div
                key={eIdx}
                className="rounded-xl border border-outline-variant/30 bg-[#070A12] overflow-hidden flex flex-col shimmer-sweep"
              >
                {/* 16:9 Thumbnail Skeleton */}
                <div className="relative aspect-video bg-[#121724] flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/40 text-xl">play_arrow</span>
                  </div>
                  <div className="absolute top-2 left-2 w-8 h-4 rounded bg-black/60" />
                  <div className="absolute bottom-2 right-2 w-12 h-4 rounded bg-black/60" />
                </div>

                {/* Module Details */}
                <div className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="w-full h-3.5 rounded bg-white/15" />
                    <div className="w-2/3 h-3 rounded bg-white/10" />
                  </div>
                  <div className="w-full h-6 rounded bg-white/5 border border-white/10 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 4. SECURE VIDEO PLAYER SKELETON (VIEWPORT + TELEMETRY CONTROLS)       */
/* ═════════════════════════════════════════════════════════════════════ */

export const VideoPlayerSkeleton: React.FC = () => {
  return (
    <div className="w-full aspect-video bg-[#04060A] rounded-xl overflow-hidden relative border border-secondary/30 shimmer-sweep flex flex-col justify-between p-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
      {/* Top Telemetry Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary animate-ping" />
          <div className="w-36 h-4 rounded bg-white/20" />
          <div className="w-14 h-4 rounded bg-[#00D2FF]/20 border border-[#00D2FF]/30" />
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10" />
      </div>

      {/* Center Cybernetic Radar Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border border-dashed border-secondary/40 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="w-20 h-20 rounded-full border border-secondary/60 bg-secondary/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,184,0,0.3)]">
            <span className="material-symbols-outlined text-secondary text-3xl">play_circle</span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Deck Skeleton */}
      <div className="z-10 space-y-2 pt-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 rounded-lg">
        {/* Progress Bar Line */}
        <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="w-1/4 h-full bg-secondary rounded-full" />
        </div>

        {/* Controls Row */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white/20" />
            <div className="w-16 h-3 rounded bg-white/20" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-5 rounded bg-white/10" />
            <div className="w-6 h-6 rounded bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 5. COURSE DETAIL PAGE SKELETON                                        */
/* ═════════════════════════════════════════════════════════════════════ */

export const CourseDetailPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070A12] text-on-surface py-6 sm:py-10 pb-32 lg:pb-12 px-3.5 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-10 w-full overflow-x-hidden">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-3.5 rounded bg-white/15" />
        <span className="text-white/20">/</span>
        <div className="w-20 h-3.5 rounded bg-secondary/30" />
        <span className="text-white/20">/</span>
        <div className="w-36 h-3.5 rounded bg-white/15" />
      </div>

      {/* Hero Overview Header & Pricing Card Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start w-full">
        {/* Left 2 Cols: Main Info */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-28 h-6 rounded-full bg-secondary/20 border border-secondary/40" />
            <div className="w-24 h-4 rounded bg-[#FFB800]/20" />
            <div className="w-20 h-4 rounded bg-white/10" />
          </div>

          <div className="w-5/6 h-10 sm:h-14 rounded-lg bg-white/20" />
          <div className="w-2/3 h-5 sm:h-6 rounded bg-secondary/30" />

          <div className="space-y-2">
            <div className="w-full h-4 rounded bg-white/10" />
            <div className="w-11/12 h-4 rounded bg-white/10" />
            <div className="w-4/5 h-4 rounded bg-white/10" />
          </div>

          {/* Instructor Snapshot */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0C1220] border border-outline-variant/30 flex items-center gap-4 shimmer-sweep">
            <div className="w-12 h-12 rounded-full bg-secondary/20 border border-secondary/40 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="w-28 h-3 rounded bg-secondary/30" />
              <div className="w-44 h-4 rounded bg-white/20" />
            </div>
          </div>
        </div>

        {/* Right Col: Instant Enrollment Action Card */}
        <div className="rounded-2xl bg-gradient-to-b from-[#0E1528] to-[#080C16] border border-secondary/50 p-6 shadow-[0_0_40px_rgba(255,184,0,0.1)] space-y-6 shimmer-sweep-gold w-full">
          <div className="space-y-2 pb-4 border-b border-outline-variant/30">
            <div className="w-24 h-3 rounded bg-white/15" />
            <div className="w-40 h-8 rounded bg-secondary/40" />
            <div className="w-48 h-3 rounded bg-[#00FF66]/20" />
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-[#0A0E18] border border-outline-variant/20">
            <div className="flex justify-between">
              <div className="w-24 h-3 rounded bg-white/15" />
              <div className="w-24 h-3 rounded bg-secondary/30" />
            </div>
            <div className="w-full h-2 rounded-full bg-[#161D2E] overflow-hidden">
              <div className="w-3/5 h-full bg-secondary/40 rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="w-full h-12 rounded-xl bg-gradient-to-r from-secondary/40 to-[#FFD700]/40" />
            <div className="w-full h-10 rounded-xl bg-[#00FF66]/15 border border-[#00FF66]/30" />
            <div className="w-full h-9 rounded-xl bg-surface-variant/40" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Skeleton */}
      <div className="border-b border-outline-variant/30 flex gap-4 md:gap-8 pb-2">
        <div className="w-32 h-6 rounded bg-secondary/30 border-b-2 border-secondary" />
        <div className="w-28 h-6 rounded bg-white/10" />
        <div className="w-24 h-6 rounded bg-white/10" />
        <div className="w-20 h-6 rounded bg-white/10" />
      </div>

      {/* Syllabus Modules Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((m) => (
          <div
            key={m}
            className="p-4 md:p-5 rounded-2xl bg-[#0B0F1C] border border-outline-variant/30 flex items-center justify-between gap-4 shimmer-sweep"
          >
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/40 shrink-0" />
              <div className="space-y-2">
                <div className="w-48 sm:w-72 h-4 rounded bg-white/20" />
                <div className="w-32 sm:w-48 h-3 rounded bg-white/10" />
              </div>
            </div>
            <div className="w-16 h-4 rounded bg-white/15 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 6. ROUTE / APP LEVEL SUSPENSE SKELETON                                */
/* ═════════════════════════════════════════════════════════════════════ */

export const RouteSuspenseSkeleton: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6 select-none">
      <div className="relative flex items-center justify-center">
        {/* Animated concentric scanning rings */}
        <div className="w-24 h-24 rounded-full border border-dashed border-secondary/50 animate-spin" style={{ animationDuration: '6s' }} />
        <div className="w-16 h-16 rounded-full border-2 border-[#00D2FF]/60 border-t-transparent animate-spin absolute" style={{ animationDuration: '3s' }} />
        <div className="w-10 h-10 rounded-full bg-secondary/15 border border-secondary flex items-center justify-center shadow-[0_0_25px_rgba(255,184,0,0.4)] absolute">
          <span className="material-symbols-outlined text-secondary text-xl">shield</span>
        </div>
      </div>

      <div className="space-y-2 max-w-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
          <h4 className="font-label-caps text-xs tracking-[0.25em] text-secondary font-black uppercase">
            CALIBRATING NEURAL TELEMETRY
          </h4>
        </div>
        <p className="font-mono-data text-[11px] text-on-surface-variant">
          Establishing encrypted connection with Supabase database vault &amp; Edge nodes...
        </p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════ */
/* 7. MASTERMIND Q&A SKELETON (TACTICAL TRANSMISSION CARDS)             */
/* ═════════════════════════════════════════════════════════════════════ */

export const MastermindQASkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" aria-label="Loading mastermind transmissions...">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 rounded-xl border border-outline-variant/30 bg-[#0E1322] space-y-3 shimmer-sweep"
        >
          {/* Question Top Row Skeleton */}
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-28 h-5 rounded bg-secondary/20 border border-secondary/30" />
              <div className="w-24 h-4 rounded bg-white/20" />
              <div className="w-16 h-3 rounded bg-white/10" />
              <div className="w-12 h-3 rounded bg-white/10" />
            </div>

            {/* Upvote Button Placeholder */}
            <div className="w-14 h-7 rounded-lg bg-surface-variant/30 border border-outline-variant/40" />
          </div>

          {/* Question Text Lines Skeleton */}
          <div className="space-y-2 py-1">
            <div className="w-full h-3.5 rounded bg-white/15" />
            <div className="w-5/6 h-3.5 rounded bg-white/10" />
            <div className="w-2/3 h-3.5 rounded bg-white/10" />
          </div>

          {/* Coach Transmission / Answer Box Skeleton */}
          <div className="p-3.5 rounded-lg bg-[#070A12]/90 border-l-2 border-secondary/40 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-secondary/30" />
              <div className="w-36 h-3.5 rounded bg-secondary/25" />
              <div className="w-20 h-3 rounded bg-white/10" />
            </div>
            <div className="w-4/5 h-3 rounded bg-white/10" />
            <div className="w-3/5 h-3 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
};

