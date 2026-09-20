import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { PageId } from '../layout/Navbar';
import { TiltCard } from '../ui/TiltCard';
import { PageSEO } from '../ui/PageSEO';
import heroEmblemAsset from '../../assets/images/uwe_shield_isolated.png';
import heroEmblemWebp from '../../assets/images/uwe_shield_isolated.webp';
import heroEmblemWebpMd from '../../assets/images/uwe_shield_isolated-md.webp';
import heroEmblemWebpSm from '../../assets/images/uwe_shield_isolated-sm.webp';
import { OptimizedPicture } from '../ui/OptimizedPicture';
import { TestimonialsMarquee } from '../ui/TestimonialsMarquee';

interface HomePageProps {
  setActivePage: (page: PageId) => void;
}

// Framer Motion variants matching portfolio specs
const heroTextVariants: Variants = {
  initial: { opacity: 0, y: 30, skewY: 2 },
  animate: {
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] },
  },
};

const staggerContainerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const HomePage: React.FC<HomePageProps> = ({ setActivePage }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Portfolio-style cursor glow tracking with Framer Motion spring physics
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const glowX = useSpring(mouseX, { damping: 20, stiffness: 100 });
  const glowY = useSpring(mouseY, { damping: 20, stiffness: 100 });

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const hero = document.getElementById('hero-section');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        setIsHovered(true);
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setTilt({
          x: (x / (rect.width / 2)) * 18,
          y: (y / (rect.height / 2)) * -18,
        });
      } else {
        setIsHovered(false);
        setTilt({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="flex-grow pt-[100px] relative">
      <PageSEO
        title="Home"
        description="Unity Warriors Empire — unlock your ultimate potential through mind optimization, tactical leadership, and enterprise incubation programs in Sri Lanka."
        canonical="/"
      />
      {/* Framer Motion Mouse-Follow Ambient Glow (matching Home.jsx L52-65) */}
      <motion.div
        style={{
          x: glowX,
          y: glowY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        className="fixed w-[500px] h-[500px] bg-radial from-[#00D2FF]/10 via-[#FFB800]/5 to-transparent rounded-full blur-3xl pointer-events-none z-0"
      />

      {/* Hero Section */}
      <section
        id="hero-section"
        className="relative w-full min-h-[90vh] flex items-center justify-center py-8 md:py-xl overflow-hidden"
      >
        <div className="w-full max-w-container-max px-4 sm:px-lg relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-lg items-center w-full">
            <motion.div
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
              className="flex flex-col gap-4 sm:gap-md text-center lg:text-left items-center lg:items-start"
            >
              <motion.h1
                variants={heroTextVariants}
                className="font-display-xl text-3xl sm:text-4xl md:text-5xl lg:text-display-xl text-on-surface text-glow-gold leading-tight font-black"
              >
                Unleash Your <br />
                <span className="text-secondary-container">Ultimate Potential</span>
              </motion.h1>
              <motion.p
                variants={heroTextVariants}
                className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-2xl"
              >
                Transforming ambitious individuals into visionary leaders and resilient entrepreneurs through elite Sri Lankan coaching programs.
              </motion.p>
              <motion.div
                variants={heroTextVariants}
                className="flex gap-3 sm:gap-sm mt-2 sm:mt-sm flex-wrap justify-center lg:justify-start w-full sm:w-auto"
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePage('product')}
                  className="btn-elite min-h-[46px] px-5 py-3 rounded font-label-caps text-xs sm:text-label-caps border border-secondary-container bg-secondary-container/10 text-secondary-container hover:bg-secondary-container hover:text-surface-container-lowest transition-all shadow-[0_0_20px_rgba(255,184,0,0.2)] uppercase cursor-pointer relative overflow-hidden group"
                >
                  <span className="relative z-10">Explore Programs</span>
                  {/* CTA Button Shine Sweep effect from portfolio */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePage('demos')}
                  className="glass-panel min-h-[46px] px-5 py-3 rounded font-label-caps text-xs sm:text-label-caps text-secondary hover:bg-secondary/15 transition-all uppercase flex items-center justify-center gap-xs cursor-pointer border border-secondary/40 active-press hover:border-secondary shadow-[0_0_15px_rgba(255,184,0,0.2)]"
                >
                  <span className="material-symbols-outlined text-[18px]">movie</span>
                  Watch Demo Reels
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Seamless Floating Emblem with 2.5D Micro-Motion Tilt */}
            <div className="relative h-[280px] sm:h-[380px] md:h-[480px] w-full flex items-center justify-center pointer-events-auto mt-4 lg:mt-0">
              <div className="absolute w-60 sm:w-80 h-60 sm:h-80 bg-radial from-secondary-container/25 via-primary/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
              
              <div
                className="relative w-full h-full flex items-center justify-center animate-micro-float"
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(${isHovered ? 1.08 : 1}) translateZ(30px)`,
                  transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <OptimizedPicture
                  webpSrcSet={`${heroEmblemWebpSm} 320w, ${heroEmblemWebpMd} 640w, ${heroEmblemWebp} 1024w`}
                  fallbackSrc={heroEmblemAsset}
                  alt="Unity Warriors Empire Isolated Metallic Shield Emblem"
                  priority={true}
                  className="w-full h-full object-contain p-2 relative z-10 drop-shadow-[0_20px_45px_rgba(0,102,255,0.45)] filter"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Divisions with Stagger & Framer Motion Cards */}
      <section className="px-lg py-xl max-w-container-max mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-xl"
        >
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Elite Divisions</h2>
          <div className="w-24 h-1 bg-secondary-container mx-auto rounded-full shadow-[0_0_10px_rgba(255,184,0,0.5)]" />
        </motion.div>

        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-md"
        >
          {/* Pillar 1 */}
          <motion.div variants={cardVariants} whileHover={{ y: -8, scale: 1.02 }}>
            <TiltCard
              onClick={() => setActivePage('product')}
              className="glass-panel rounded-lg p-md flex flex-col gap-sm relative overflow-hidden group border-tertiary/30 hover:border-tertiary transition-colors cursor-pointer h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-tertiary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start z-10">
                <span className="material-symbols-outlined text-tertiary text-4xl group-hover:rotate-12 transition-transform duration-300">psychology</span>
                <span className="font-label-caps text-label-caps bg-tertiary/20 text-tertiary px-2 py-1 rounded border border-tertiary/50">
                  Break Mental Limits
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface z-10 mt-sm">
                Blind Mind Breaker (BMB)
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant z-10">
                Subconscious Mind Optimization Protocol.
              </p>
            </TiltCard>
          </motion.div>

          {/* Pillar 2 */}
          <motion.div variants={cardVariants} whileHover={{ y: -8, scale: 1.02 }}>
            <TiltCard
              onClick={() => setActivePage('product')}
              className="glass-panel rounded-lg p-md flex flex-col gap-sm relative overflow-hidden group border-error-container/30 hover:border-error-container transition-colors cursor-pointer h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-error-container/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start z-10">
                <span className="material-symbols-outlined text-error-container text-4xl group-hover:rotate-12 transition-transform duration-300">military_tech</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface z-10 mt-sm">
                UWE Leadership Academy
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant z-10">
                Tactical Command &amp; Control Strategies.
              </p>
            </TiltCard>
          </motion.div>

          {/* Pillar 3 */}
          <motion.div variants={cardVariants} whileHover={{ y: -8, scale: 1.02 }}>
            <TiltCard
              onClick={() => setActivePage('product')}
              className="glass-panel rounded-lg p-md flex flex-col gap-sm relative overflow-hidden group border-secondary-container/30 hover:border-secondary-container transition-colors cursor-pointer h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary-container/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start z-10">
                <span className="material-symbols-outlined text-secondary-container text-4xl group-hover:rotate-12 transition-transform duration-300">local_fire_department</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface z-10 mt-sm">
                UWE IGNIT
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant z-10">
                Sri Lankan Entrepreneurial Incubator Ecosystem.
              </p>
            </TiltCard>
          </motion.div>
        </motion.div>
      </section>

      {/* Featured Demo Reels Section */}
      <section className="px-lg py-xl max-w-container-max mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-center mb-xl gap-4"
        >
          <div className="text-center md:text-left">
            <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface mb-xs font-bold">
              Featured Demo Showcase
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant">
              Experience tactical demonstrations of subconscious rewiring &amp; crisis simulations.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePage('demos')}
            className="glass-panel px-5 py-2.5 rounded font-label-caps text-xs text-secondary border border-secondary/40 hover:border-secondary transition-all cursor-pointer flex items-center gap-2"
          >
            <span>VIEW ALL DEMO REELS</span>
            <span className="material-symbols-outlined text-sm">east</span>
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Featured Video 1 */}
          <motion.div
            whileHover={{ y: -6 }}
            onClick={() => setActivePage('demos')}
            className="glass-card rounded-xl overflow-hidden border border-outline-variant/30 hover:border-secondary/50 transition-all shadow-xl cursor-pointer group"
          >
            <div className="relative aspect-video bg-surface-container-high overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80"
                alt="BMB Mind Optimization"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-secondary/90 text-surface-container-lowest flex items-center justify-center shadow-[0_0_20px_rgba(255,184,0,0.8)] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl ml-1">play_arrow</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <span className="font-label-caps text-xs text-secondary font-bold">BMB MIND DIVISION • 01:45</span>
              <h3 className="font-headline-md text-lg text-on-surface font-bold mt-1 group-hover:text-secondary transition-colors">
                BMB Subconscious Paradigm Shift
              </h3>
            </div>
          </motion.div>

          {/* Featured Video 2 */}
          <motion.div
            whileHover={{ y: -6 }}
            onClick={() => setActivePage('demos')}
            className="glass-card rounded-xl overflow-hidden border border-outline-variant/30 hover:border-secondary/50 transition-all shadow-xl cursor-pointer group"
          >
            <div className="relative aspect-video bg-surface-container-high overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"
                alt="Tactical Crisis Simulation"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-secondary/90 text-surface-container-lowest flex items-center justify-center shadow-[0_0_20px_rgba(255,184,0,0.8)] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl ml-1">play_arrow</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <span className="font-label-caps text-xs text-secondary font-bold">COMMAND DIVISION • 02:10</span>
              <h3 className="font-headline-md text-lg text-on-surface font-bold mt-1 group-hover:text-secondary transition-colors">
                Tactical Crisis Simulation &amp; Voice Command
              </h3>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section with Framer Motion Stagger Reveal */}
      <section className="bg-surface-container/60 backdrop-blur-md py-xl border-y border-outline-variant/30 relative overflow-hidden">
        <div className="max-w-container-max mx-auto px-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-lg text-center"
          >
            <div className="flex flex-col gap-xs">
              <span className="font-mono-data text-4xl text-tertiary text-glow-blue font-bold">5,000+</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                Minds Transformed
              </span>
            </div>
            <div className="flex flex-col gap-xs">
              <span className="font-mono-data text-4xl text-secondary-container text-glow-gold font-bold">120+</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                Workshops
              </span>
            </div>
            <div className="flex flex-col gap-xs">
              <span className="font-mono-data text-4xl text-primary font-bold">98%</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                Success Rate
              </span>
            </div>
            <div className="flex flex-col gap-xs">
              <span className="font-mono-data text-4xl text-error-container font-bold">15+</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                Ventures Launched
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Verified Operative Testimonials Infinite Marquee */}
      <TestimonialsMarquee onNavigatePartners={() => setActivePage('partners')} />

      {/* CTA Section */}
      <section className="py-xl px-lg max-w-container-max mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-panel rounded-xl p-lg md:p-xl text-center relative overflow-hidden flex flex-col items-center gap-md border border-secondary-container/50 shadow-[0_0_30px_rgba(255,184,0,0.1)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-container/10 via-surface/50 to-surface-container-lowest -z-10" />
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Ready to Step Into Your Full Power?
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            The empire awaits those bold enough to claim it. Begin your transformation today.
          </p>
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePage('contact')}
            className="btn-elite px-lg py-md mt-sm rounded font-label-caps text-label-caps uppercase tracking-widest text-lg cursor-pointer"
          >
            ENROLL NOW
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};
