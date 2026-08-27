import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { PageSEO } from '../ui/PageSEO';
import type { PageId } from '../layout/Navbar';
import { api } from '../../services/api';

interface DemoPageProps {
  setActivePage: (page: PageId) => void;
}

interface DemoVideo {
  id: string;
  category: 'all' | 'bmb' | 'leadership' | 'ignit' | 'testimonial';
  title: string;
  subtitle: string;
  duration: string;
  poster: string;
  videoUrl: string;
  badge: string;
  color: string;
  description: string;
}

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

export const DemoPage: React.FC<DemoPageProps> = ({ setActivePage }) => {
  const [filter, setFilter] = useState<'all' | 'bmb' | 'leadership' | 'ignit' | 'testimonial'>('all');
  const [activeVideo, setActiveVideo] = useState<DemoVideo | null>(null);

  const [demoVideos, setDemoVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDemos = async () => {
      try {
        const json = await api.getDemos();
        if (json.data && json.data.length > 0) {
          const mapped: DemoVideo[] = json.data.map((d: any) => {
            const cat = (d.category || 'BMB').toUpperCase();
            const divisionColor =
              cat === 'BMB'
                ? '#00D2FF'
                : cat === 'LEADERSHIP'
                ? '#FFB800'
                : cat === 'IGNIT'
                ? '#00FF66'
                : '#2ED573';

            return {
              id: d.id,
              category: d.category ? d.category.toLowerCase() : 'bmb',
              title: d.title,
              subtitle: d.subtitle,
              duration: d.duration || '02:30',
              poster: d.posterUrl || d.thumbnailUrl || d.poster || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
              videoUrl: d.videoUrl,
              badge: d.badge || `${cat} DIVISION`,
              color: divisionColor,
              description: d.description || '',
            };
          });
          setDemoVideos(mapped);
        } else {
          setDemoVideos([]);
        }
      } catch {
        setDemoVideos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDemos();
  }, []);

  const filteredVideos = filter === 'all'
    ? demoVideos
    : demoVideos.filter((v) => v.category === filter);

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      <PageSEO
        title="Live Demonstrations"
        description="Watch UWE operative mind breakthroughs, tactical command drills, and live program transformations."
        canonical="/demos"
      />
      {/* Header Section */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-xs font-black"
        >
          Tactical <span className="text-secondary text-glow-gold">Demo Vault</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-2xl mx-auto"
        >
          Watch live tactical demonstrations, subconscious mind rewiring drills, and executive pitch nights.
        </motion.p>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 sm:gap-xs flex-wrap mt-lg mb-xl">
          {[
            { id: 'all', label: 'All Demos' },
            { id: 'bmb', label: 'BMB (Mind)' },
            { id: 'leadership', label: 'Leadership' },
            { id: 'ignit', label: 'IGNIT Incubator' },
            { id: 'testimonial', label: 'Alumni Reels' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(tab.id as any)}
              className={`relative min-h-[44px] px-4 sm:px-md py-2 rounded font-label-caps text-xs sm:text-label-caps uppercase transition-all cursor-pointer ${
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

      {/* Video Cards Grid */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg mb-xl relative z-10">
        {filteredVideos.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant font-mono-data text-sm bg-[#0B0F1C] rounded-2xl border border-outline-variant/30">
            No demonstration transmissions recorded for this category yet.
          </div>
        ) : (
          <motion.div layout variants={containerVariants} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-lg">
            <AnimatePresence mode="popLayout">
              {filteredVideos.map((video) => (
              <motion.div
                key={video.id}
                layout
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -6 }}
                className="glass-card rounded-xl overflow-hidden border border-outline-variant/30 hover:border-secondary/50 transition-all shadow-2xl flex flex-col justify-between group cursor-pointer"
                onClick={() => setActiveVideo(video)}
              >
                {/* Poster / Play Overlay Container */}
                <div className="relative aspect-video bg-surface-container-high overflow-hidden">
                  <img
                    src={video.poster}
                    alt={video.title}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent opacity-90" />

                  {/* Top Badge & Duration */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                    <span className="font-label-caps text-xs px-2.5 py-1 rounded bg-[#0B0E14]/80 backdrop-blur-md text-secondary border border-secondary/40 font-bold">
                      {video.badge}
                    </span>
                    <span className="font-mono-data text-xs px-2 py-0.5 rounded bg-[#0B0E14]/80 text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      <span>{video.duration}</span>
                    </span>
                  </div>

                  {/* Center Glowing Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-16 h-16 rounded-full bg-secondary/90 text-surface-container-lowest flex items-center justify-center shadow-[0_0_25px_rgba(255,184,0,0.8)] group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
                    </div>
                  </div>
                </div>

                {/* Video Info Details */}
                <div className="p-5 flex flex-col gap-2">
                  <h3 className="font-headline-md text-xl text-on-surface font-bold group-hover:text-secondary transition-colors">
                    {video.title}
                  </h3>
                  <p className="font-mono-data text-xs text-secondary font-semibold">
                    {video.subtitle}
                  </p>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    {video.description}
                  </p>
                  <div className="pt-3 mt-1 border-t border-outline-variant/20 flex justify-between items-center text-xs font-mono-data text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">movie</span>
                      <span>CLICK TO WATCH DEMO</span>
                    </span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">east</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        )}
      </section>

      {/* Interactive Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9995] bg-[#0B0E14]/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-lg"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-card w-full max-w-4xl rounded-2xl overflow-hidden border border-secondary/50 shadow-[0_0_50px_rgba(255,184,0,0.3)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-surface-container/90 border-b border-outline-variant/30 flex justify-between items-center">
                <div>
                  <h3 className="font-headline-md text-lg sm:text-xl text-on-surface font-bold">
                    {activeVideo.title}
                  </h3>
                  <p className="font-mono-data text-xs text-secondary">{activeVideo.badge} • {activeVideo.duration}</p>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-secondary hover:border-secondary transition-all cursor-pointer active-press"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video bg-black">
                {activeVideo.videoUrl.includes('youtube') || activeVideo.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={
                      activeVideo.videoUrl.includes('embed/')
                        ? `${activeVideo.videoUrl}?autoplay=1`
                        : `https://www.youtube.com/embed/${
                            activeVideo.videoUrl.match(/(?:v=|\/)([\w-]{11})/)?.[1] || 'JQypYNVzS3Q'
                          }?autoplay=1&rel=0`
                    }
                    title={activeVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeVideo.videoUrl}
                    poster={activeVideo.poster}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Modal Footer Description */}
              <div className="p-4 sm:p-5 bg-surface-container-lowest/90 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="font-body-md text-sm text-on-surface-variant max-w-xl">
                  {activeVideo.description}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setActiveVideo(null);
                    setActivePage('contact');
                  }}
                  className="btn-elite px-5 py-2.5 rounded font-label-caps text-xs uppercase tracking-widest cursor-pointer whitespace-nowrap"
                >
                  APPLY FOR THIS DIVISION
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
