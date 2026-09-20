import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type LoaderMode = 'public' | 'admin';

interface CustomLoaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
  mode?: LoaderMode;
}

const publicMilestones = [
  { at: 0, text: 'INITIALIZING SUBCONSCIOUS MIND PROTOCOLS...' },
  { at: 28, text: 'CALIBRATING NEURAL PERFORMANCE MATRIX...' },
  { at: 58, text: 'SYNCHRONIZING EMPIRE DIVISIONS & PROGRAMS...' },
  { at: 82, text: 'ACTIVATING QUANTUM FREQUENCY FIELDS...' },
  { at: 100, text: 'UWE PLATFORM READY // WELCOME WARRIOR' },
];

const adminMilestones = [
  { at: 0, text: 'INITIALIZING SECURITY CLEARANCE PROTOCOLS...' },
  { at: 28, text: 'CONNECTING SUPABASE ENCRYPTED POSTGRESQL VAULT...' },
  { at: 58, text: 'AUTHENTICATING LEVEL-5 COMMANDER ACCESS...' },
  { at: 82, text: 'DECRYPTING ROSTER & FINANCIAL LEDGERS...' },
  { at: 100, text: 'CLEARANCE VERIFIED // COMMAND PROTOCOLS UNLOCKED' },
];

export const CustomLoader: React.FC<CustomLoaderProps> = ({
  onComplete,
  forceShow = false,
  mode = 'public',
}) => {
  const isPublic = mode === 'public';
  const statusMilestones = isPublic ? publicMilestones : adminMilestones;

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(statusMilestones[0].text);
  const [isFinished, setIsFinished] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'charging' | 'overdrive' | 'splitting'>('loading');

  useEffect(() => {
    const sessionKey = isPublic ? 'uwe_public_intro_seen' : 'uwe_admin_intro_seen';
    const hasSeen = sessionStorage.getItem(sessionKey);
    const isReturning = hasSeen === 'true' && !forceShow;

    // Background Asset Preloader (silently caches high-res Hero assets in memory)
    const preloadAssets = () => {
      const shieldImg = new Image();
      // Preload lightweight WebP variant (81% smaller than PNG)
      shieldImg.src = '/uwe_shield_isolated.webp';
      const img2 = new Image();
      img2.src = 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80';
    };
    preloadAssets();

    // Fast-track for returning visitors in same session (420ms micro-burst)
    const computeDuration = isReturning ? 420 : 1380;
    const startTime = performance.now();

    const updateFrame = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / computeDuration);

      // Non-linear "burst" easing curve
      let eased: number;
      if (t < 0.25) {
        eased = (t / 0.25) * 42;
      } else if (t < 0.75) {
        const subT = (t - 0.25) / 0.5;
        eased = 42 + Math.pow(subT, 0.85) * 43;
      } else {
        const subT = (t - 0.75) / 0.25;
        eased = 85 + Math.pow(subT, 1.2) * 15;
      }

      const roundedProgress = Math.min(100, Math.floor(eased));
      setProgress(roundedProgress);

      for (let i = statusMilestones.length - 1; i >= 0; i--) {
        if (roundedProgress >= statusMilestones[i].at) {
          setStatusText(statusMilestones[i].text);
          break;
        }
      }

      if (t < 1) {
        requestAnimationFrame(updateFrame);
      } else {
        setProgress(100);
        setStatusText(
          isPublic
            ? 'UWE PLATFORM READY // WELCOME WARRIOR'
            : 'CLEARANCE VERIFIED // ACCESS GRANTED'
        );
        sessionStorage.setItem(sessionKey, 'true');

        // Stage 1: Kinetic Alignment & Charge-up (260ms)
        setPhase('charging');

        // Stage 2: Detailed HUD Overdrive & Radial Shockwave Expansion (950ms)
        setTimeout(() => {
          setPhase('overdrive');
        }, 260);

        // Stage 3: Mechanical Vault Shutter Split & Anamorphic Photon Reveal (800ms)
        setTimeout(() => {
          setPhase('splitting');
        }, 1200);

        // Stage 4: Seamless Reveal into Live Site (total 2000ms)
        setTimeout(() => {
          setIsFinished(true);
          onComplete?.();
        }, 2000);
      }
    };

    const animId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animId);
  }, [onComplete, forceShow, isPublic, statusMilestones]);

  const isOverdrive = phase === 'overdrive' || phase === 'splitting';
  const isSplitting = phase === 'splitting';

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="uwe-burst-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'linear' } }}
          className="fixed inset-0 z-[999999] pointer-events-none select-none overflow-hidden will-change-transform transform-gpu"
        >
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 1. LEFT MECHANICAL VAULT BLAST SHUTTER */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: isSplitting ? '-100%' : 0 }}
            transition={{
              duration: 0.8,
              ease: [0.77, 0, 0.175, 1],
            }}
            className="absolute inset-y-0 left-0 w-1/2 bg-[#06080D] border-r border-[#FFB800]/40 z-30 flex items-center justify-end overflow-hidden will-change-transform transform-gpu"
          >
            {/* Shutter Texture Grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `linear-gradient(#FFB800 1px, transparent 1px), linear-gradient(90deg, #FFB800 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />

            {/* Left Telemetry HUD Marks */}
            <div className="absolute left-6 top-6 font-mono-data text-[9px] text-secondary/60 space-y-0.5 uppercase tracking-widest hidden sm:block">
              <div>{isPublic ? '// PROTOCOL: UWE-NEURAL-OS' : '// PROTOCOL: UWE-OMEGA-9'}</div>
              <div>{isPublic ? '// SECTOR: MIND OPTIMIZER' : '// VAULT SECTOR: COMMAND-WING'}</div>
              <div>{isPublic ? '// CLEARANCE: PUBLIC WARRIOR' : '// CLEARANCE: LEVEL-5 COMMANDER'}</div>
            </div>

            {/* Left Split Seam Glow Line */}
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-[#FFB800] to-transparent shadow-[0_0_15px_#FFB800]" />
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 2. RIGHT MECHANICAL VAULT BLAST SHUTTER */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: isSplitting ? '100%' : 0 }}
            transition={{
              duration: 0.8,
              ease: [0.77, 0, 0.175, 1],
            }}
            className="absolute inset-y-0 right-0 w-1/2 bg-[#06080D] border-l border-[#FFB800]/40 z-30 flex items-center justify-start overflow-hidden will-change-transform transform-gpu"
          >
            {/* Shutter Texture Grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `linear-gradient(#FFB800 1px, transparent 1px), linear-gradient(90deg, #FFB800 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />

            {/* Right Telemetry HUD Marks */}
            <div className="absolute right-6 top-6 text-right font-mono-data text-[9px] text-[#00D2FF]/60 space-y-0.5 uppercase tracking-widest hidden sm:block">
              <div>// LAT: 06°55'55" N</div>
              <div>// LON: 79°50'52" E</div>
              <div>{isPublic ? '// UWE MATRIX: ONLINE' : '// SUPABASE CLOUD: CONNECTED'}</div>
            </div>

            {/* Right Split Seam Glow Line */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-[#00D2FF] to-transparent shadow-[0_0_15px_#00D2FF]" />
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 3. ANAMORPHIC HORIZONTAL PHOTON FLARE & VERTICAL LASER BLADE */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {/* Vertical Laser Ignition Blade (Pre-mounted for Zero Jitter) */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0, width: '4px' }}
              animate={{
                scaleY: isSplitting ? 1.6 : 0,
                opacity: isSplitting ? [0, 1, 0.8, 0] : 0,
                width: isSplitting ? ['4px', '28px', '120px'] : '4px',
              }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FFB800] via-white to-[#00D2FF] blur-[2px] shadow-[0_0_60px_rgba(255,184,0,0.9)] will-change-transform transform-gpu"
            />

            {/* Horizontal Anamorphic Lens Flare Beam */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0, height: '4px' }}
              animate={{
                scaleX: isSplitting ? 1 : 0,
                opacity: isSplitting ? [0, 1, 0.7, 0] : 0,
                height: isSplitting ? ['4px', '12px', '32px'] : '4px',
              }}
              transition={{ duration: 0.7, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-1/2 inset-x-0 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300 via-white to-transparent blur-[2px] shadow-[0_0_70px_rgba(0,210,255,0.9)] will-change-transform transform-gpu"
            />
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 4. MULTI-LAYER SHOCKWAVE RADIAL FIELD */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-hidden">
            {/* Layer 1: Core Gold Laser Ring */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{
                scale: isOverdrive ? 7.5 : 0.2,
                opacity: isOverdrive ? [0, 1, 0] : 0,
              }}
              transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-72 h-72 rounded-full border border-secondary bg-radial from-secondary/30 via-secondary/10 to-transparent shadow-[0_0_80px_rgba(255,184,0,0.8)] will-change-transform transform-gpu"
            />

            {/* Layer 2: Secondary Cyan Sonar Wave */}
            <motion.div
              initial={{ scale: 0.1, opacity: 0, rotate: 0 }}
              animate={{
                scale: isOverdrive ? 6.2 : 0.1,
                opacity: isOverdrive ? [0, 0.9, 0] : 0,
                rotate: isOverdrive ? 120 : 0,
              }}
              transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-80 h-80 rounded-full border-2 border-dashed border-[#00D2FF] shadow-[0_0_60px_rgba(0,210,255,0.6)] will-change-transform transform-gpu"
            />
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 5. MAIN FOREGROUND HUD & HARDWARE-ACCELERATED SPLIT */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 pointer-events-auto">
            {/* Ambient Background Aura */}
            <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#FFB800]/20 via-[#00D2FF]/15 to-transparent blur-[120px] pointer-events-none" />

            <div className="relative flex flex-col items-center max-w-md w-full text-center space-y-6">
              {/* Top Brand Header (Slides up upon Split) */}
              <motion.div
                animate={{
                  y: isSplitting ? -220 : 0,
                  opacity: isSplitting ? 0 : 1,
                  scale: isSplitting ? 0.85 : 1,
                }}
                transition={{ duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
                className="space-y-1 will-change-transform transform-gpu"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="h-[1px] w-8 bg-secondary/50" />
                  <span className="font-label-caps text-[10px] tracking-[0.3em] text-secondary font-black uppercase">
                    UNITY WARRIORS EMPIRE
                  </span>
                  <span className="h-[1px] w-8 bg-secondary/50" />
                </div>
                <h2 className="font-headline-md text-2xl text-on-surface font-black tracking-wider uppercase">
                  {isPublic ? (
                    <>
                      EMPIRE <span className="text-secondary text-glow-gold">PORTAL</span>
                    </>
                  ) : (
                    <>
                      COMMAND <span className="text-secondary text-glow-gold">HQ</span>
                    </>
                  )}
                </h2>
              </motion.div>

              {/* Central HUD Chamber with Hardware-Accelerated Splitting Halves */}
              <div className="relative w-48 h-48 flex items-center justify-center overflow-visible">
                {/* Rotating Cybernetic Rings */}
                <motion.div
                  animate={{
                    rotate: isOverdrive ? 540 : 360,
                    scale: isSplitting ? 1.8 : isOverdrive ? 1.4 : 1,
                    opacity: isSplitting ? 0 : 1,
                  }}
                  transition={{
                    rotate: {
                      duration: isOverdrive ? 1.3 : 6,
                      repeat: isOverdrive ? 0 : Infinity,
                      ease: isOverdrive ? [0.16, 1, 0.3, 1] : 'linear',
                    },
                    scale: { duration: isSplitting ? 0.65 : 1.3, ease: 'easeOut' },
                    opacity: { duration: isSplitting ? 0.5 : 1 },
                  }}
                  className="absolute inset-0 rounded-full border border-dashed border-[#FFB800]/60 shadow-[0_0_25px_rgba(255,184,0,0.25)] will-change-transform transform-gpu"
                />

                <motion.div
                  animate={{
                    rotate: isOverdrive ? -540 : -360,
                    scale: isSplitting ? 1.6 : isOverdrive ? 1.3 : 1,
                    opacity: isSplitting ? 0 : 1,
                  }}
                  transition={{
                    rotate: {
                      duration: isOverdrive ? 1.3 : 4,
                      repeat: isOverdrive ? 0 : Infinity,
                      ease: isOverdrive ? [0.16, 1, 0.3, 1] : 'linear',
                    },
                    scale: { duration: isSplitting ? 0.65 : 1.3, ease: 'easeOut' },
                    opacity: { duration: isSplitting ? 0.5 : 1 },
                  }}
                  className="absolute inset-2 rounded-full border-2 border-t-[#00D2FF] border-r-transparent border-b-[#00D2FF]/50 border-l-transparent shadow-[0_0_20px_rgba(0,210,255,0.3)] will-change-transform transform-gpu"
                />

                {/* ── LEFT HALF (High-Performance Overflow Splitting) ── */}
                <motion.div
                  animate={{
                    x: isSplitting ? -450 : 0,
                    y: isSplitting ? -25 : 0,
                    rotate: isSplitting ? -18 : 0,
                    opacity: isSplitting ? 0 : 1,
                    scale: isSplitting ? 0.75 : isOverdrive ? 1.25 : phase === 'charging' ? 0.88 : 1,
                  }}
                  transition={{
                    duration: isSplitting ? 0.75 : 0.4,
                    ease: isSplitting ? [0.77, 0, 0.175, 1] : 'easeOut',
                  }}
                  className="absolute left-0 top-0 bottom-0 w-1/2 overflow-hidden flex items-center justify-end pointer-events-none will-change-transform transform-gpu"
                >
                  <div className="relative w-48 h-48 flex items-center justify-center translate-x-1/2">
                    <div className="absolute w-36 h-36 border-2 border-secondary/80 bg-secondary/15 shadow-[0_0_25px_rgba(255,184,0,0.3)]">
                      <span className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-secondary shadow-[0_0_10px_#FFB800]" />
                      <span className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-secondary shadow-[0_0_10px_#FFB800]" />
                      <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_#FFF]" />
                    </div>
                    <span className="material-symbols-outlined text-6xl text-secondary text-glow-gold relative z-10">
                      shield
                    </span>
                  </div>
                </motion.div>

                {/* ── RIGHT HALF (High-Performance Overflow Splitting) ── */}
                <motion.div
                  animate={{
                    x: isSplitting ? 450 : 0,
                    y: isSplitting ? 25 : 0,
                    rotate: isSplitting ? 18 : 0,
                    opacity: isSplitting ? 0 : 1,
                    scale: isSplitting ? 0.75 : isOverdrive ? 1.25 : phase === 'charging' ? 0.88 : 1,
                  }}
                  transition={{
                    duration: isSplitting ? 0.75 : 0.4,
                    ease: isSplitting ? [0.77, 0, 0.175, 1] : 'easeOut',
                  }}
                  className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden flex items-center justify-start pointer-events-none will-change-transform transform-gpu"
                >
                  <div className="relative w-48 h-48 flex items-center justify-center -translate-x-1/2">
                    <div className="absolute w-36 h-36 border-2 border-secondary/80 bg-secondary/15 shadow-[0_0_25px_rgba(255,184,0,0.3)]">
                      <span className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-secondary shadow-[0_0_10px_#FFB800]" />
                      <span className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-secondary shadow-[0_0_10px_#FFB800]" />
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_#FFF]" />
                    </div>
                    <span className="material-symbols-outlined text-6xl text-secondary text-glow-gold relative z-10">
                      shield
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Status Deck (Slides Down upon Split) */}
              <motion.div
                animate={{
                  y: isSplitting ? 220 : 0,
                  opacity: isSplitting ? 0 : 1,
                  scale: isSplitting ? 0.85 : 1,
                }}
                transition={{ duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
                className="w-full space-y-3 will-change-transform transform-gpu"
              >
                {/* Progress Bar */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono-data">
                    <span className="text-[11px] text-secondary/90 flex items-center gap-1.5 font-bold">
                      <span className={`w-2 h-2 rounded-full ${isOverdrive ? 'bg-secondary' : 'bg-[#2ED573]'} animate-ping`} />
                      {isOverdrive ? (isPublic ? 'PORTAL ACTIVE' : 'COMMAND UNLOCKED') : 'SYSTEM SYNC'}
                    </span>
                    <span className="font-bold text-secondary font-headline-md text-sm tracking-wider">
                      {progress}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-[#111622] border border-secondary/40 p-[1px] overflow-hidden shadow-[0_0_20px_rgba(255,184,0,0.2)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FFB800] via-[#00D2FF] to-[#2ED573] transition-all duration-75 relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/90 blur-[2px]" />
                    </div>
                  </div>
                </div>

                {/* Status Readout */}
                <div className="min-h-[22px] flex items-center justify-center">
                  <span className="font-mono-data text-xs text-[#00D2FF] tracking-wider uppercase flex items-center gap-1.5 font-bold">
                    <span className={`material-symbols-outlined text-xs ${isOverdrive ? 'text-secondary' : 'animate-spin'}`}>
                      {isOverdrive ? 'verified' : 'sync'}
                    </span>
                    {statusText}
                  </span>
                </div>

                {/* Skip Option */}
                <button
                  onClick={() => {
                    sessionStorage.setItem(isPublic ? 'uwe_public_intro_seen' : 'uwe_admin_intro_seen', 'true');
                    setIsFinished(true);
                    onComplete?.();
                  }}
                  className="font-mono-data text-[10px] text-on-surface-variant/50 hover:text-secondary uppercase tracking-widest transition-colors cursor-pointer pt-1"
                >
                  {isPublic ? '[ ENTER UWE EMPIRE ]' : '[ CLICK TO SKIP INTRO ]'}
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
