import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from '../layout/Navbar';
import { TiltCard } from '../ui/TiltCard';
import { BankSlipUploadModal } from '../ui/BankSlipUploadModal';
import { parsePrice, formatPrice } from '../../utils/priceFormatter';

interface ProductPageProps {
  setActivePage: (page: PageId) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({ setActivePage }) => {
  const [filter, setFilter] = useState<'all' | 'bmb' | 'leadership' | 'ignit'>('all');
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedCourseForSlip, setSelectedCourseForSlip] = useState('bmb');

  const defaultPrograms = [
    {
      id: 'bmb',
      category: 'bmb',
      title: 'Blind Mind Breaker (BMB)',
      subtitle: 'Subconscious Mind Optimization Protocol',
      duration: '5 Days Intensive',
      price: 'RS. 12,000',
      period: 'per operative',
      icon: 'psychology',
      color: 'tertiary',
      borderColor: 'border-tertiary/50',
      description: 'Deconstruct subconscious mental barriers, eliminate fear responses, and install peak-performance neural patterns.',
      features: [
        'Subconscious Paradigm Rewiring',
        'Fear & Anxiety Elimination',
        'Peak State Anchoring & Triggers',
        'Daily Neuro-Coaching Protocols',
        '1-on-1 Cognitive Assessment',
      ],
      badge: 'MIND DIVISION',
      seatsLeft: 6,
    },
    {
      id: 'leadership',
      category: 'leadership',
      title: 'UWE Leadership Academy',
      subtitle: 'Command & Control Training',
      duration: '8-Week Tactical Program',
      price: 'RS. 100,000',
      period: 'per officer',
      icon: 'military_tech',
      color: 'error-container',
      borderColor: 'border-error-container/50',
      description: 'Master tactical decision-making under high stakes, command authority with integrity, and build high-cohesion units.',
      features: [
        'Tactical Command & Control Frameworks',
        'High-Stakes Crisis Management',
        'Unit Cohesion & Dynamic Leadership',
        'Executive Presence & Voice Command',
        'Live Simulated Combat & Simulations',
      ],
      badge: 'COMMAND DIVISION',
      seatsLeft: 4,
    },
  ];

  const [programs, setPrograms] = useState(defaultPrograms);

  // Fetch live prices & seat counts from Supabase via API
  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const res = await fetch('http://localhost:5005/api/courses');
        if (!res.ok) return;
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setPrograms((prev) =>
            prev.map((p) => {
              const dbCourse = json.data.find((c: any) => c.slug === p.id);
              if (dbCourse) {
                const numericPrice = parsePrice(dbCourse.price);
                return {
                  ...p,
                  price: formatPrice(numericPrice, dbCourse.currency || 'RS.'),
                  duration: dbCourse.duration || p.duration,
                  seatsLeft: dbCourse.batches?.[0]?.availableSeats ?? p.seatsLeft,
                };
              }
              return p;
            })
          );
        }
      } catch {
        // API offline — use hardcoded defaults
      }
    };
    fetchLivePrices();
  }, []);

  const filteredPrograms = filter === 'all'
    ? programs
    : programs.filter((p) => p.category === filter);

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      {/* Header & Filter Tabs */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-sm font-black"
        >
          Elite Training <span className="text-secondary text-glow-gold">Programs</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-lg"
        >
          Battle-tested protocols designed to optimize mind, command leadership, and launch dominant business empires.
        </motion.p>

        {/* Interactive Filter Tabs with Framer Motion layout transition */}
        <div className="flex justify-center gap-2 sm:gap-xs flex-wrap mb-xl">
          {[
            { id: 'all', label: 'All Divisions' },
            { id: 'bmb', label: 'BMB (Mind)' },
            { id: 'leadership', label: 'Leadership' },
            { id: 'ignit', label: 'IGNIT (Incubator)' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(tab.id as any)}
              className={`relative min-h-[44px] px-4 sm:px-md py-2 rounded font-label-caps text-xs sm:text-label-caps uppercase transition-all cursor-pointer ${filter === tab.id
                ? 'bg-secondary text-surface-container-lowest font-bold shadow-[0_0_20px_rgba(255,184,0,0.5)]'
                : 'glass-panel text-on-surface-variant hover:text-on-surface'
                }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Animated Program Cards Grid with Layout Animations matching Projects.jsx */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg mb-xl">
        <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-lg">
          <AnimatePresence mode="popLayout">
            {filteredPrograms.map((prog) => (
              <motion.div
                key={prog.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                whileHover={{ y: -8 }}
                className="h-full"
              >
                <TiltCard
                  className={`glass-card rounded-xl p-6 md:p-lg flex flex-col justify-between border ${prog.borderColor} hover:shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-colors duration-300 h-full`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-md">
                      <span className="material-symbols-outlined text-4xl text-secondary">
                        {prog.icon}
                      </span>
                      <span className="font-label-caps text-xs px-2.5 py-1 rounded bg-surface-variant text-on-surface-variant border border-outline-variant/30">
                        {prog.badge}
                      </span>
                    </div>

                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">
                      {prog.title}
                    </h3>
                    <p className="font-mono-data text-xs text-secondary mb-md font-semibold">
                      {prog.subtitle}
                    </p>

                    <div className="flex items-baseline gap-xs mb-md">
                      <span className="font-display-xl text-3xl font-extrabold text-on-surface">
                        {prog.price}
                      </span>
                      <span className="font-body-md text-xs text-on-surface-variant">
                        / {prog.period}
                      </span>
                    </div>

                    <p className="font-body-md text-body-md text-on-surface-variant mb-md leading-relaxed">
                      {prog.description}
                    </p>

                    <div className="border-t border-outline-variant/20 pt-md mb-md">
                      <span className="font-label-caps text-xs text-on-surface uppercase tracking-wider block mb-sm">
                        CORE MODULES INCLUDED:
                      </span>
                      <ul className="space-y-2">
                        {prog.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-xs font-body-md text-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-xs text-secondary">check_circle</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-sm">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActivePage('contact')}
                      className="btn-elite min-h-[44px] w-full py-2.5 rounded-lg font-label-caps text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                    >
                      APPLY FOR ADMISSION
                    </motion.button>
                    <button
                      onClick={() => {
                        setSelectedCourseForSlip(prog.id);
                        setSlipModalOpen(true);
                      }}
                      className="w-full py-2 rounded-lg bg-[#131929] border border-secondary/40 text-secondary hover:bg-secondary/20 transition-all font-mono-data text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      <span>UPLOAD BANK SLIP</span>
                    </button>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Bank Transfer Slip Upload Modal */}
      <BankSlipUploadModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        defaultCourseSlug={selectedCourseForSlip}
      />

      {/* Comparison Matrix Section */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-lg"
        >
          <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg text-on-surface mb-xs font-bold">
            Division Comparison Matrix
          </h2>
          <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant">
            Compare parameters across UWE coaching programs.
          </p>
        </motion.div>

        <div className="glass-panel rounded-xl overflow-x-auto border border-outline-variant/30 shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container/80">
                <th className="p-4 font-label-caps text-label-caps text-on-surface">PARAMETER</th>
                <th className="p-4 font-label-caps text-label-caps text-tertiary">BMB (MIND)</th>
                <th className="p-4 font-label-caps text-label-caps text-error-container">LEADERSHIP</th>
                {/* <th className="p-4 font-label-caps text-label-caps text-secondary-container">IGNIT (INCUBATOR)</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body-md text-sm text-on-surface-variant">
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="p-4 font-semibold text-on-surface">Target Audience</td>
                <td className="p-4">All Ambitious Individuals</td>
                <td className="p-4">Executives &amp; Team Leaders</td>
                {/* <td className="p-4">Entrepreneurs &amp; Founders</td> */}
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="p-4 font-semibold text-on-surface">Duration</td>
                <td className="p-4">5 Days</td>
                <td className="p-4">4 Weeks</td>
                {/* <td className="p-4">12 Weeks</td> */}
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="p-4 font-semibold text-on-surface">Intensity Level</td>
                <td className="p-4 text-tertiary font-bold">High (Cognitive)</td>
                <td className="p-4 text-error-container font-bold">Extreme (Tactical)</td>
                {/* <td className="p-4 text-secondary-container font-bold">Relentless (Execution)</td> */}
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="p-4 font-semibold text-on-surface">Certification</td>
                <td className="p-4">BMB Mind Practitioner</td>
                <td className="p-4">UWE Command Officer</td>
                {/* <td className="p-4">UWE Venture Founder</td> */}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
