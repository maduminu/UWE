import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ExternalLink, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Award, 
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Radio,
  Globe,
  Zap,
  ChevronRight
} from 'lucide-react';
import type { PageId } from '../layout/Navbar';
import { PageSEO } from '../ui/PageSEO';
import { api } from '../../services/api';

interface Partner {
  id: string;
  name: string;
  title: string;
  companyName: string;
  companyType?: string | null;
  industry?: string | null;
  bio: string;
  photoUrl?: string | null;
  companyLogoUrl?: string | null;
  websiteUrl?: string | null;
  linkedInUrl?: string | null;
  cohort?: string | null;
  courseSlug: string;
  partnerSince: string;
  isActive: boolean;
  isFeatured: boolean;
  metrics?: string | null;
  testimonial?: string | null;
}

interface PartnersPageProps {
  setActivePage?: (page: PageId) => void;
}

export const PartnersPage: React.FC<PartnersPageProps> = ({ setActivePage }) => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getPartners({
      courseSlug: filterCourse !== 'all' ? filterCourse : undefined,
      isFeatured: featuredOnly ? true : undefined,
      search: searchQuery.trim() || undefined,
    })
      .then((res) => {
        if (isMounted && res?.data) {
          setPartners(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load partners:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filterCourse, featuredOnly, searchQuery]);

  const handleCardClick = (id: string) => {
    navigate(`/partners/${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const parseMetrics = (raw?: string | null): Record<string, string> => {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const getSlugMeta = (slug: string) => {
    const s = (slug || '').toLowerCase();
    if (s.includes('bmb')) {
      return { label: 'BMB ALUMNI', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    }
    if (s.includes('leadership')) {
      return { label: 'LEADERSHIP TACTICIAN', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    }
    return { label: 'IGNIT INCUBATED', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-white pt-24 pb-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <PageSEO
        title="Collaborative Business Network | Unity Warriors Empire"
        description="Explore the directory of elite business enterprises and founders forged through Unity Warriors Empire protocols."
      />

      {/* ── Multi-Layered Atmospheric Lighting ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,158,11,0.12),rgba(6,182,212,0.06)_40%,transparent_80%)] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Cyber Technical Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* ── Hero Section ── */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono tracking-widest uppercase mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>AUTHENTICATED ALLIANCE DIRECTORY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight uppercase text-white">
            Collaborative Business Network
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-sans max-w-2xl mx-auto">
            High-caliber commercial enterprises, tech startups, and executive directives commanded by certified 
            graduates of the Unity Warriors Empire subconscious &amp; leadership frameworks.
          </p>

          {/* Quick Alliance Stats Strip */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mt-8 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div>
              <div className="text-lg sm:text-xl font-mono font-black text-amber-400">$18M+</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Collective ARR</div>
            </div>
            <div className="border-x border-slate-800">
              <div className="text-lg sm:text-xl font-mono font-black text-cyan-400">100%</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Audited Proof</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-mono font-black text-emerald-400">450+</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Allied Staff</div>
            </div>
          </div>
        </div>

        {/* ── Filter & Search Control Command Bar ── */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-2xl p-4 sm:p-5 mb-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Directive Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Directives' },
              { id: 'bmb', label: 'Beyond Mind Boundaries' },
              { id: 'leadership', label: 'Leadership' },
              { id: 'ignit', label: 'IGNIT Venture' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCourse(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  filterCourse === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 font-bold shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Featured Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setFeaturedOnly(!featuredOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                featuredOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaders Only</span>
            </button>

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search operatives or firms..."
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
            </div>
          </div>
        </div>

        {/* ── Partners Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-900/40 border border-slate-800/80 animate-pulse" />
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <Building2 className="w-14 h-14 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-mono font-bold text-white uppercase">No Operative Partners Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              No verified enterprises match your active filter criteria. Clear filters or adjust your search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => {
              const slugMeta = getSlugMeta(partner.courseSlug);
              const metricsMap = parseMetrics(partner.metrics);

              return (
                <motion.div
                  key={partner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => handleCardClick(partner.id)}
                  className="group relative rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl border border-slate-800 hover:border-amber-500/50 p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:shadow-[0_0_35px_rgba(245,158,11,0.15)] overflow-hidden"
                >
                  {/* Subtle top edge glow on hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/0 to-transparent group-hover:via-amber-500/80 transition-all duration-500" />

                  <div>
                    {/* Header Tags */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${slugMeta.badgeClass}`}>
                        {slugMeta.label}
                      </span>
                      {partner.isFeatured && (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          <span>ALLIANCE LEADER</span>
                        </span>
                      )}
                    </div>

                    {/* Operative Portrait & Title */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative w-16 h-16 rounded-2xl p-[2px] bg-gradient-to-tr from-amber-500 via-cyan-400 to-emerald-400 shrink-0 shadow-lg group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-shadow">
                        <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-950">
                          {partner.photoUrl ? (
                            <img
                              src={partner.photoUrl}
                              alt={partner.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono font-bold text-amber-300 text-xl">
                              {partner.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="overflow-hidden">
                        <h3 className="text-base font-bold text-white font-mono tracking-tight group-hover:text-amber-400 transition-colors truncate">
                          {partner.name}
                        </h3>
                        <p className="text-xs text-amber-300/90 font-mono truncate">
                          {partner.title}
                        </p>
                        <p className="text-xs text-slate-400 font-sans flex items-center gap-1 mt-1 truncate">
                          <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="font-medium text-slate-300">{partner.companyName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Cohort Credential Chip */}
                    {partner.cohort && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2.5 py-0.5 rounded-lg border border-cyan-800/40 mb-3">
                        <Award className="w-3 h-3 text-cyan-400" />
                        <span>{partner.cohort}</span>
                      </div>
                    )}

                    {/* Bio Excerpt */}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4 font-sans">
                      {partner.bio}
                    </p>

                    {/* Key Telemetry Badges */}
                    {Object.keys(metricsMap).length > 0 && (
                      <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-4">
                        {Object.entries(metricsMap).slice(0, 3).map(([k, v]) => (
                          <div key={k} className="text-center overflow-hidden">
                            <p className="text-[10px] uppercase font-mono text-slate-500 truncate">{k}</p>
                            <p className="text-xs font-mono font-black text-amber-300 truncate">{v}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 text-[11px]">
                      {partner.industry || partner.companyType || 'Enterprise'}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all font-bold">
                      <span>VIEW DOSSIER</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
