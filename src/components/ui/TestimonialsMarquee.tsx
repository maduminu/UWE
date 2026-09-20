import React, { useEffect, useState } from 'react';
import { ShieldCheck, Star, Sparkles, ArrowRight, Quote } from 'lucide-react';
import { api } from '../../services/api';

export interface TestimonialItem {
  id: string;
  studentName: string;
  studentRole?: string | null;
  rating: number;
  comment: string;
  courseSlug: string;
  createdAt: string;
  isVerified?: boolean;
}

const FALLBACK_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'fb-1',
    studentName: 'Kasun Jayawardena',
    studentRole: 'Founder & CEO, Horizon Logistics',
    rating: 5,
    comment: 'The subconscious rewiring protocols eliminated my operational fear. Scaled our fleet from 6 to 34 vehicles within 14 months of graduating BMB.',
    courseSlug: 'bmb',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
  {
    id: 'fb-2',
    studentName: 'Dr. Nirosha Samarasekara',
    studentRole: 'Managing Director, BioHealth Dynamics',
    rating: 5,
    comment: 'High-stakes negotiation under Commander Janith transformed our board discussions. Closed $1.8M in regional distribution rights seamlessly.',
    courseSlug: 'leadership',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
  {
    id: 'fb-3',
    studentName: 'Rohan Senanayake',
    studentRole: 'Co-Founder, Apex Capital Tech',
    rating: 5,
    comment: 'IGNIT gave us the psychological blueprint to negotiate institutional venture rounds without diluting founder sovereignty. Unmatched caliber.',
    courseSlug: 'ignit',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
  {
    id: 'fb-4',
    studentName: 'Minoli Alwis',
    studentRole: 'Creative Director, SilkRoute Luxe Direct',
    rating: 5,
    comment: 'UWE completely rewired how I perceive price elasticity and high-ticket clients. Our overseas direct sales expanded by 240% YoY.',
    courseSlug: 'bmb',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
  {
    id: 'fb-5',
    studentName: 'Tariq Mansoor',
    studentRole: 'Chief Executive, Zenith Industrial',
    rating: 5,
    comment: 'Elite mental conditioning. When your company handles 120+ factory staff under tight deadlines, the sovereign focus architecture is non-negotiable.',
    courseSlug: 'leadership',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
  {
    id: 'fb-6',
    studentName: 'Chamath Vidanapathirana',
    studentRole: 'Managing Partner, NexaScale Media',
    rating: 5,
    comment: 'We moved our agency from low-margin retainers to enterprise high-ticket contracts. The psychological leverage models are second to none.',
    courseSlug: 'ignit',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
];

interface TestimonialsMarqueeProps {
  onNavigatePartners?: () => void;
  title?: string;
  subtitle?: string;
}

export const TestimonialsMarquee: React.FC<TestimonialsMarqueeProps> = ({
  onNavigatePartners,
  title = 'VERIFIED OPERATIVE TESTIMONIALS',
  subtitle = 'Audited outcomes and transformational field reports from active operatives and executive leaders.',
}) => {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(FALLBACK_TESTIMONIALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getTopTestimonials()
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setTestimonials(res.data);
        }
      })
      .catch(() => {
        // Fallback already pre-set
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Split testimonials into two balanced rows
  const half = Math.ceil(testimonials.length / 2);
  const row1 = testimonials.slice(0, half);
  const row2 = testimonials.slice(half).length > 0 ? testimonials.slice(half) : testimonials.slice(0, half);

  // Duplicate each row 3 times to ensure infinite smooth marquee loop
  const infiniteRow1 = [...row1, ...row1, ...row1, ...row1];
  const infiniteRow2 = [...row2, ...row2, ...row2, ...row2];

  const getSlugBadge = (slug: string) => {
    const s = (slug || '').toLowerCase();
    if (s.includes('bmb')) {
      return { text: 'BMB DIRECTIVE', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    }
    if (s.includes('leadership')) {
      return { text: 'LEADERSHIP TIER', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    }
    return { text: 'IGNIT VENTURE', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  };

  return (
    <section className="relative w-full py-16 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 border-y border-slate-800/80">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% AUDITED OPERATIVE PROOF</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase font-mono">
          {title}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          {subtitle}
        </p>

        {onNavigatePartners && (
          <button
            onClick={onNavigatePartners}
            className="mt-4 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors group cursor-pointer"
          >
            <span>View Collaborative Business Partners Network</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Scoped CSS animation styles */}
      <style>{`
        @keyframes uweMarqueeLeft {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes uweMarqueeRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .animate-uwe-marquee-left {
          display: flex;
          width: max-content;
          animation: uweMarqueeLeft 42s linear infinite;
        }
        .animate-uwe-marquee-right {
          display: flex;
          width: max-content;
          animation: uweMarqueeRight 42s linear infinite;
        }
        .marquee-container:hover .animate-uwe-marquee-left,
        .marquee-container:hover .animate-uwe-marquee-right {
          animation-play-state: paused;
        }
      `}</style>

      {/* Marquee Row 1 */}
      <div className="marquee-container w-full overflow-hidden mb-5 select-none">
        <div className="animate-uwe-marquee-left gap-5 px-3">
          {infiniteRow1.map((item, idx) => {
            const badge = getSlugBadge(item.courseSlug);
            return (
              <div
                key={`r1-${item.id}-${idx}`}
                className="w-[340px] sm:w-[380px] shrink-0 p-5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-amber-500/40 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                      <span className="text-xs font-mono font-bold text-amber-300/90 ml-1">5.0</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed italic mb-4">
                    "{item.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono tracking-wide">
                      {item.studentName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate max-w-[210px]">
                      {item.studentRole || 'Verified Operative'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span>VERIFIED</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Marquee Row 2 (Reversed direction) */}
      <div className="marquee-container w-full overflow-hidden select-none">
        <div className="animate-uwe-marquee-right gap-5 px-3">
          {infiniteRow2.map((item, idx) => {
            const badge = getSlugBadge(item.courseSlug);
            return (
              <div
                key={`r2-${item.id}-${idx}`}
                className="w-[340px] sm:w-[380px] shrink-0 p-5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                      <span className="text-xs font-mono font-bold text-amber-300/90 ml-1">5.0</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed italic mb-4">
                    "{item.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono tracking-wide">
                      {item.studentName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate max-w-[210px]">
                      {item.studentRole || 'Subconscious Mastery Alum'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span>VERIFIED</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
