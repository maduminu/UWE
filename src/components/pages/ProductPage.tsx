import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from '../layout/Navbar';
import { PageSEO } from '../ui/PageSEO';
import { TiltCard } from '../ui/TiltCard';
import { BankSlipUploadModal } from '../ui/BankSlipUploadModal';
import { parsePrice, formatPrice } from '../../utils/priceFormatter';
import { api } from '../../services/api';
import { useRealtimeEvent } from '../../services/realtime';
import { TestimonialsMarquee } from '../ui/TestimonialsMarquee';

interface ProductPageProps {
  setActivePage: (page: PageId) => void;
  onSelectCourse?: (courseSlug: string) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({ setActivePage, onSelectCourse }) => {
  const [filter, setFilter] = useState<'all' | 'bmb' | 'leadership' | 'ignit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedCourseForSlip, setSelectedCourseForSlip] = useState('bmb');

  const defaultPrograms = [
    {
      id: 'bmb',
      category: 'bmb',
      title: 'Beyond Mind Boundaries (BMB)',
      subtitle: 'Subconscious Mind Optimization Protocol',
      duration: '5 Days Intensive',
      price: 'RS. 15,000',
      period: 'per operative',
      icon: 'psychology',
      color: 'tertiary',
      borderColor: 'border-secondary/50',
      rating: 4.98,
      instructor: 'Commander Janith Perera',
      description: 'Deconstruct subconscious mental barriers, eliminate fear responses, and install peak-performance neural patterns.',
      features: [
        'Subconscious Paradigm Rewiring',
        'Fear & Anxiety Elimination',
        'Peak State Anchoring & Triggers',
        'Daily Neuro-Coaching Protocols',
        'Official Verified Certificate Included',
      ],
      badge: 'MIND DIVISION',
      seatsLeft: 6,
    },
    {
      id: 'leadership',
      category: 'leadership',
      title: 'UWE Leadership Academy',
      subtitle: 'Command & Control Training',
      duration: '4-Week Tactical Program',
      price: 'RS. 25,000',
      period: 'per officer',
      icon: 'military_tech',
      color: 'error-container',
      borderColor: 'border-[#00D2FF]/50',
      rating: 4.95,
      instructor: 'Suranjith Godagama',
      description: 'Master tactical decision-making under high stakes, command authority with integrity, and build high-cohesion units.',
      features: [
        'Tactical Command & Control Frameworks',
        'High-Stakes Crisis Management',
        'Unit Cohesion & Dynamic Leadership',
        'Executive Presence & Voice Command',
        'Live Boardroom Simulations',
      ],
      badge: 'COMMAND DIVISION',
      seatsLeft: 4,
    },
    {
      id: 'ignit',
      category: 'ignit',
      title: 'UWE IGNIT Enterprise Incubator',
      subtitle: 'Venture Creation & AI Systems',
      duration: '6-Week Accelerator',
      price: 'RS. 35,000',
      period: 'per founder',
      icon: 'rocket_launch',
      color: 'tertiary',
      borderColor: 'border-[#00FF66]/50',
      rating: 4.92,
      instructor: 'Dilshan Madusanka',
      description: 'Zero-to-one venture creation blueprint equipping founders with AI automation pipelines, digital systems, and investor pitch models.',
      features: [
        'Venture Validation in 30 Days',
        'AI Automation & No-Code Pipelines',
        'Unit Economics & Customer Acquisition',
        'Venture Pitch Deck & Investor Prep',
        'Incubator Mentorship Access',
      ],
      badge: 'ENTERPRISE DIVISION',
      seatsLeft: 8,
    },
  ];

  const [programs, setPrograms] = useState(defaultPrograms);

  const fetchLivePrices = useCallback(async () => {
    try {
      const json = await api.getCourses();
      if (json.data && json.data.length > 0) {
        const mapped = json.data.map((c: any) => {
          const numericPrice = parsePrice(c.price);
          const defaultMatch = defaultPrograms.find((p) => p.id === c.slug);
          const category = c.category?.toLowerCase() || (c.slug === 'leadership' ? 'leadership' : c.slug === 'ignit' ? 'ignit' : 'bmb');
          const upcomingBatch = c.batches?.find((b: any) => b.status === 'UPCOMING' || b.status === 'ACTIVE') || c.batches?.[0];
          return {
            id: c.slug,
            category,
            title: c.title,
            subtitle: c.subtitle || defaultMatch?.subtitle || 'Tactical Directive',
            duration: c.duration || defaultMatch?.duration || '5 Days Intensive',
            price: formatPrice(numericPrice, c.currency || 'RS.'),
            period: 'per operative',
            icon: c.slug === 'leadership' ? 'military_tech' : c.slug === 'ignit' ? 'rocket_launch' : 'psychology',
            color: c.slug === 'leadership' ? 'error-container' : 'tertiary',
            borderColor: c.slug === 'leadership' ? 'border-[#00D2FF]/50' : c.slug === 'ignit' ? 'border-[#00FF66]/50' : 'border-secondary/50',
            rating: defaultMatch?.rating || 4.95,
            instructor: defaultMatch?.instructor || 'Commander Janith Perera',
            description: c.description || defaultMatch?.description || 'Tactical mind and command protocol.',
            features: defaultMatch?.features || [
              'Subconscious Paradigm Rewiring',
              'Tactical Command & Control',
              'Official Verified Certificate Included',
            ],
            badge: c.badge || defaultMatch?.badge || 'MIND DIVISION',
            seatsLeft: upcomingBatch?.availableSeats ?? defaultMatch?.seatsLeft ?? 20,
          };
        });
        setPrograms(mapped);
      }
    } catch {
      // API offline
    }
  }, []);

  useRealtimeEvent('course:updated', () => fetchLivePrices());

  // Fetch live courses from Supabase via API
  useEffect(() => {
    fetchLivePrices();
  }, [fetchLivePrices]);

  const filteredPrograms = programs.filter((p) => {
    const matchesCategory = filter === 'all' || p.category === filter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      <PageSEO
        title="Training Programs"
        description="Explore UWE transformational programs: Blind Mind Breaker (BMB), Leadership Academy, and IGNIT Startup Accelerator."
        canonical="/programs"
      />
      {/* Header & Filter Tabs */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-sm font-black"
        >
          Elite Training <span className="text-secondary text-glow-gold">Directives</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-6"
        >
          Battle-tested protocols designed to optimize mind, command leadership, and launch dominant enterprise ventures.
        </motion.p>

        {/* Search Bar & Instant Autocomplete */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search syllabus, directives, keywords..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F1422]/90 border border-outline-variant/40 font-mono-data text-xs text-on-surface placeholder:text-on-surface-variant focus:border-secondary focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs font-mono-data"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Interactive Filter Tabs */}
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
              className={`relative min-h-[44px] px-4 sm:px-md py-2 rounded-xl font-label-caps text-xs uppercase transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-secondary text-surface-container-lowest font-bold shadow-[0_0_20px_rgba(255,184,0,0.5)]'
                  : 'glass-panel text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Animated Program Cards Grid */}
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
                  className={`glass-card rounded-2xl p-6 md:p-lg flex flex-col justify-between border ${prog.borderColor} hover:shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-colors duration-300 h-full`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-md">
                      <span className="material-symbols-outlined text-4xl text-secondary">
                        {prog.icon}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-xs text-[#FFB800] font-bold">
                          ★ {prog.rating}
                        </span>
                        <span className="font-label-caps text-xs px-2.5 py-1 rounded bg-surface-variant text-on-surface-variant border border-outline-variant/30">
                          {prog.badge}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">
                      {prog.title}
                    </h3>
                    <p className="font-mono-data text-xs text-secondary mb-md font-semibold">
                      {prog.subtitle}
                    </p>

                    <p className="font-mono-data text-[11px] text-on-surface-variant mb-2">
                      Lead Faculty: <strong className="text-on-surface">{prog.instructor}</strong>
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
                        CURRICULUM INCLUDED:
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
                    {/* View Details / Syllabus Button */}
                    <button
                      onClick={() => onSelectCourse ? onSelectCourse(prog.id) : setActivePage('contact')}
                      className="w-full py-2.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary hover:bg-secondary hover:text-black transition-all font-mono-data text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.15)]"
                    >
                      <span className="material-symbols-outlined text-sm">menu_book</span>
                      <span>VIEW SYLLABUS &amp; DETAILS</span>
                    </button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActivePage('contact')}
                      className="btn-elite min-h-[40px] w-full py-2 rounded-xl font-label-caps text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                    >
                      APPLY FOR ADMISSION
                    </motion.button>

                    <button
                      onClick={() => {
                        setSelectedCourseForSlip(prog.id);
                        setSlipModalOpen(true);
                      }}
                      className="w-full py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 transition-all font-mono-data text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-secondary">receipt_long</span>
                      <span>Upload Bank Transfer Receipt</span>
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

      {/* Verified Operative Testimonials Marquee Strip */}
      <TestimonialsMarquee 
        onNavigatePartners={() => setActivePage('partners')} 
        title="AUDITED DIRECTIVE OUTCOMES"
        subtitle="Real-world results and sovereign breakthroughs reported across all UWE training tiers."
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
