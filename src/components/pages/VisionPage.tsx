import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { PageSEO } from '../ui/PageSEO';
import type { PageId } from '../layout/Navbar';

interface VisionPageProps {
  setActivePage: (page: PageId) => void;
}

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export const VisionPage: React.FC<VisionPageProps> = ({ setActivePage }) => {
  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative overflow-hidden">
      <PageSEO
        title="Our Vision"
        description="Discover the UWE vision — building an empire of high-performance operatives through psychological reprogramming, command leadership, and entrepreneurial excellence."
        canonical="/vision"
      />
      {/* Background radial glow */}
      <div className="radial-bg absolute inset-0 pointer-events-none" />

      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg md:py-xl text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-md tracking-tighter drop-shadow-[0_0_20px_rgba(179,197,255,0.2)] font-black"
        >
          Architecting the Future of <br />
          <span className="text-secondary text-glow-gold">Human Excellence</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed"
        >
          Our strategic roadmap to forge a new paradigm of leaders, entrepreneurs, and resilient minds across Sri Lanka and beyond.
        </motion.p>
      </section>

      {/* Dual Highlight Section: Vision & Mission */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg relative z-10">
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-lg"
        >
          {/* Vision Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.01 }}
            className="glass-card rounded-xl p-6 sm:p-lg md:p-xl border-l-4 border-l-tertiary flex flex-col justify-between glow-primary hover:shadow-[0_10px_30px_rgba(0,210,255,0.2)] transition-all duration-300"
          >
            <div>
              <div className="flex items-center gap-2 mb-md">
                <span className="material-symbols-outlined text-tertiary text-3xl">visibility</span>
                <span className="font-label-caps text-xs sm:text-label-caps text-tertiary uppercase tracking-widest font-bold">OUR VISION</span>
              </div>
              <h2 className="font-headline-lg text-xl sm:text-headline-md md:text-headline-lg text-on-surface mb-md font-bold">
                Global Beacon of Excellence
              </h2>
              <p className="font-body-lg text-sm sm:text-body-lg text-on-surface-variant leading-relaxed">
                To establish Sri Lanka as a global beacon of elite leadership, mental fortitude, and groundbreaking entrepreneurial power—proving that world-class mind optimization originates from our soil.
              </p>
            </div>
            <div className="mt-lg pt-md border-t border-outline-variant/30 flex justify-between items-center text-xs font-mono-data text-outline">
              <span>TARGET 2030</span>
              <span>TACTICAL HORIZON</span>
            </div>
          </motion.div>

          {/* Mission Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.01 }}
            className="glass-card rounded-xl p-6 sm:p-lg md:p-xl border-l-4 border-l-secondary flex flex-col justify-between glow-secondary hover:shadow-[0_10px_30px_rgba(255,184,0,0.2)] transition-all duration-300"
          >
            <div>
              <div className="flex items-center gap-2 mb-md">
                <span className="material-symbols-outlined text-secondary text-3xl">target</span>
                <span className="font-label-caps text-xs sm:text-label-caps text-secondary uppercase tracking-widest font-bold">OUR MISSION</span>
              </div>
              <h2 className="font-headline-lg text-xl sm:text-headline-md md:text-headline-lg text-on-surface mb-md font-bold">
                Systematic Human Evolution
              </h2>
              <p className="font-body-lg text-sm sm:text-body-lg text-on-surface-variant leading-relaxed">
                To systematically deconstruct human limitations through neuro-cognitive protocols, tactical leadership frameworks, and high-impact enterprise incubators that transform ambitious visionaries into unstoppable industry commanders.
              </p>
            </div>
            <div className="mt-lg pt-md border-t border-outline-variant/30 flex justify-between items-center text-xs font-mono-data text-outline">
              <span>ACTIVE OPERATION</span>
              <span>UNCOMPROMISING EXECUTION</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Strategic Roadmap Section */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-xl relative z-10">
        <div className="text-center mb-xl">
          <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-secondary mb-sm font-bold">STRATEGIC ROADMAP</h2>
          <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant max-w-xl mx-auto">
            The multi-phase deployment protocol for national transformation.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-md relative"
        >
          {/* Phase 1 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6 }}
            className="glass-panel rounded-lg p-6 flex flex-col gap-sm border-t-2 border-t-tertiary relative hover:border-tertiary transition-colors duration-300 shadow-xl"
          >
            <span className="font-mono-data text-xs text-tertiary font-bold tracking-widest uppercase">PHASE 01 // FOUNDATION</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-xs font-bold">Cognitive Rewiring</h3>
            <p className="font-body-md text-sm text-on-surface-variant">
              Nationwide deployment of BMB mind-optimization protocols to unlock peak mental performance across 10,000+ individuals.
            </p>
          </motion.div>

          {/* Phase 2 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6 }}
            className="glass-panel rounded-lg p-6 flex flex-col gap-sm border-t-2 border-t-secondary relative hover:border-secondary transition-colors duration-300 shadow-xl"
          >
            <span className="font-mono-data text-xs text-secondary font-bold tracking-widest uppercase">PHASE 02 // EXPANSION</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-xs font-bold">Tactical Leadership</h3>
            <p className="font-body-md text-sm text-on-surface-variant">
              Establishing high-intensity leadership academies across South Asia to train command-level executives and entrepreneurs.
            </p>
          </motion.div>

          {/* Phase 3 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6 }}
            className="glass-panel rounded-lg p-6 flex flex-col gap-sm border-t-2 border-t-primary-container relative hover:border-primary-container transition-colors duration-300 shadow-xl"
          >
            <span className="font-mono-data text-xs text-primary-container font-bold tracking-widest uppercase">PHASE 03 // EMPIRE</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-xs font-bold">Venture Incubator</h3>
            <p className="font-body-md text-sm text-on-surface-variant">
              Launching the UWE Venture Fund &amp; global warrior network to back high-growth startups launched by academy graduates.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Commitment to Sri Lanka */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-xl p-6 sm:p-lg md:p-xl text-center border border-outline-variant/30 flex flex-col items-center gap-md shadow-2xl"
        >
          <span className="material-symbols-outlined text-secondary text-5xl animate-pulse-glow">flag</span>
          <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface font-bold">
            Proudly Sri Lankan. Globally Dominant.
          </h2>
          <p className="font-body-lg text-sm sm:text-body-lg text-on-surface-variant max-w-2xl">
            Rooted in rich heritage and driven by futuristic innovation, Unity Warriors Empire is committed to building Sri Lanka's greatest leaders.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePage('contact')}
            className="btn-elite min-h-[46px] px-8 py-3 rounded font-label-caps text-label-caps uppercase tracking-widest text-base sm:text-lg mt-sm cursor-pointer"
          >
            JOIN THE MOVEMENT
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};
