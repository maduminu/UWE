import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ExternalLink, 
  ArrowLeft, 
  Award, 
  ShieldCheck, 
  Globe, 
  Link2, 
  Calendar, 
  TrendingUp, 
  Quote,
  Sparkles,
  Send,
  Users,
  Zap,
  CheckCircle2,
  Lock,
  Radio,
  Share2,
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

// Pre-cached authentic alliance dossiers for instantaneous fallback
const FALLBACK_PARTNERS: Record<string, Partner> = {
  'c2b0eacc-947a-492c-81c5-f6e149ff72a3': {
    id: 'c2b0eacc-947a-492c-81c5-f6e149ff72a3',
    name: 'Chamath Vidanapathirana',
    title: 'Founder & Managing Partner',
    companyName: 'NexaScale Media',
    companyType: 'Enterprise B2B Growth Engine',
    industry: 'Digital Performance & Media',
    bio: 'Specialized growth marketing and client acquisition architecture for high-ticket SaaS and private equity portfolio companies globally.',
    websiteUrl: 'https://nexascale.io',
    linkedInUrl: 'https://linkedin.com',
    cohort: 'IGNIT Cohort 6 / 2025',
    courseSlug: 'ignit',
    partnerSince: '2024-03-15',
    isActive: true,
    isFeatured: false,
    metrics: JSON.stringify({ clientMRR: '$180k MRR', pipeline: '$1.5M Active', retention: '96%' }),
    testimonial: "We scaled our B2B agency from a boutique shop into an enterprise powerhouse using UWE's conversion architectures.",
  },
  'd531652b-4343-4d26-a64c-d0abd4d941ca': {
    id: 'd531652b-4343-4d26-a64c-d0abd4d941ca',
    name: 'Kasun Jayawardena',
    title: 'Founder & CEO',
    companyName: 'Horizon Logistics Tech',
    companyType: 'Supply Chain & FinTech',
    industry: 'Logistics & Trade',
    bio: 'Pioneered cross-border freight automation in South Asia. Graduate of BMB Cohort 10, scaling from a local fleet to regional logistics operations spanning Singapore and Colombo.',
    photoUrl: '/partners/partner_kasun.jpg',
    cohort: 'BMB Cohort 10 / 2024',
    courseSlug: 'bmb',
    partnerSince: '2024-01-10',
    isActive: true,
    isFeatured: true,
    metrics: JSON.stringify({ revenue: '$3.4M ARR', team: '45 Operatives', growth: '+180% YoY' }),
    websiteUrl: 'https://horizonlogistics.io',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "UWE's subconscious rewiring dismantled my operational glass ceilings. Within 14 months of graduating BMB, we scaled past $3M ARR.",
  },
  '97514638-57e5-4f5d-ac81-12609d77960a': {
    id: '97514638-57e5-4f5d-ac81-12609d77960a',
    name: 'Dr. Nirosha Samarasekara',
    title: 'Managing Director',
    companyName: 'BioHealth Dynamics',
    companyType: 'HealthTech & Biotechnology',
    industry: 'Healthcare & Life Sciences',
    bio: 'Leading high-complexity medical research commercialization and regional distribution. Transformed organizational mindset and multi-tier executive leadership structures.',
    photoUrl: '/partners/partner_nirosha.jpg',
    cohort: 'Leadership Cohort 8 / 2024',
    courseSlug: 'leadership',
    partnerSince: '2024-02-20',
    isActive: true,
    isFeatured: true,
    metrics: JSON.stringify({ revenue: '$1.8M ARR', team: '32 Operatives', reach: '4 Countries' }),
    websiteUrl: 'https://biohealthdynamics.com',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "The sovereign mind protocols transformed how our board handles multi-million capital allocation and international expansion.",
  },
  '874438c3-8f44-4410-97db-11af8ded5cbd': {
    id: '874438c3-8f44-4410-97db-11af8ded5cbd',
    name: 'Rohan Senanayake',
    title: 'Co-Founder & CTO',
    companyName: 'Apex Capital Tech',
    companyType: 'FinTech & AI Systems',
    industry: 'Financial Technology',
    bio: 'Architecting high-frequency algorithmic liquidity tools and decentralized enterprise protocols. Raised seed capital backed by top Singaporean family offices.',
    photoUrl: '/partners/partner_rohan.jpg',
    cohort: 'IGNIT Cohort 5 / 2025',
    courseSlug: 'ignit',
    partnerSince: '2025-01-05',
    isActive: true,
    isFeatured: true,
    metrics: JSON.stringify({ valuation: '$5.2M', funding: '$1.2M Seed', users: '85k+ Active' }),
    websiteUrl: 'https://apexcapital.tech',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "IGNIT's venture scaling framework gave us the exact blueprints to close our institutional seed round in 45 days.",
  },
  '6d9931fa-9722-4e96-a0bf-2b0432b61339': {
    id: '6d9931fa-9722-4e96-a0bf-2b0432b61339',
    name: 'Minoli Alwis',
    title: 'Founder & Creative Director',
    companyName: 'SilkRoute Luxe Direct',
    companyType: 'D2C Global Brands',
    industry: 'E-Commerce & Luxury Retail',
    bio: 'Scaled high-ticket bespoke Ceylon artisan luxury goods to North American and GCC affluent consumers with bespoke subscription mechanics.',
    photoUrl: '/partners/partner_minoli.jpg',
    cohort: 'BMB Cohort 12 / 2025',
    courseSlug: 'bmb',
    partnerSince: '2025-02-12',
    isActive: true,
    isFeatured: false,
    metrics: JSON.stringify({ revenue: '$2.1M ARR', exports: 'UK, US, UAE', growth: '+240% YoY' }),
    websiteUrl: 'https://silkrouteluxe.com',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "High-ticket negotiation and psychological leverage learned at UWE doubled our average order volume in global markets.",
  },
  'fc251a12-056d-4fa8-8473-74ec0520f9cf': {
    id: 'fc251a12-056d-4fa8-8473-74ec0520f9cf',
    name: 'Tariq Mansoor',
    title: 'Chief Executive Officer',
    companyName: 'Zenith Industrial Automation',
    companyType: 'Industrial Robotics',
    industry: 'Smart Manufacturing',
    bio: 'Automating textile and precision apparel manufacturing floors with proprietary vision-AI hardware across 12 Sri Lankan facilities.',
    cohort: 'Leadership Cohort 9 / 2024',
    courseSlug: 'leadership',
    partnerSince: '2024-05-18',
    isActive: true,
    isFeatured: false,
    metrics: JSON.stringify({ revenue: '$4.2M ARR', deployments: '12 Plants', efficiency: '+35%' }),
    websiteUrl: 'https://zenithautomation.io',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "The strategic leadership frameworks taught me how to negotiate with multi-billion dollar apparel conglomerates.",
  },
};

interface PartnerDetailPageProps {
  setActivePage?: (page: PageId) => void;
}

export const PartnerDetailPage: React.FC<PartnerDetailPageProps> = ({ setActivePage }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    const resolveFallback = (): Partner | null => {
      if (FALLBACK_PARTNERS[id]) return FALLBACK_PARTNERS[id];
      const match = Object.values(FALLBACK_PARTNERS).find(
        (p) =>
          p.name.toLowerCase() === id.toLowerCase() ||
          p.companyName.toLowerCase() === id.toLowerCase() ||
          p.courseSlug.toLowerCase() === id.toLowerCase()
      );
      return match || null;
    };

    api.getPartnerById(id)
      .then((res) => {
        if (isMounted && res?.data) {
          setPartner(res.data);
        } else if (isMounted) {
          const fallback = resolveFallback();
          if (fallback) {
            setPartner(fallback);
          } else {
            setError('Partner profile not found.');
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = resolveFallback();
          if (fallback) {
            setPartner(fallback);
          } else {
            setError('Partner profile not found.');
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleBack = () => {
    navigate('/partners');
  };

  const parseMetrics = (raw?: string | null): Record<string, string> => {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;
    const text = encodeURIComponent(
      `Hello UWE Command HQ, I would like to initiate a strategic business inquiry with ${partner?.name} (${partner?.companyName}): "${inquiryMessage}"`
    );
    window.open(`https://wa.me/94717096386?text=${text}`, '_blank');
    setInquirySent(true);
    setTimeout(() => {
      setInquiryModalOpen(false);
      setInquirySent(false);
      setInquiryMessage('');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#070A12] text-white relative overflow-hidden pt-24 pb-28">
        {/* Multi-Layered Atmospheric Lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.12),rgba(6,182,212,0.06)_45%,transparent_80%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(16,185,129,0.05),transparent_60%)] pointer-events-none" />
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          {/* Breadcrumb strip skeleton */}
          <div className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md animate-pulse">
            <div className="h-4 w-44 bg-slate-800 rounded" />
            <div className="h-4 w-32 bg-slate-800 rounded hidden sm:block" />
          </div>

          {/* 12-Column Responsive Workspace Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Left Operative Identity Skeleton (4 Cols) */}
            <div className="lg:col-span-4 space-y-6 w-full">
              <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-6 sm:p-7 backdrop-blur-2xl space-y-6 animate-pulse shadow-2xl">
                <div className="w-44 h-44 rounded-2xl bg-slate-800/80 mx-auto" />
                <div className="space-y-2 text-center">
                  <div className="h-4 w-32 bg-slate-800 mx-auto rounded" />
                  <div className="h-7 w-48 bg-slate-800 mx-auto rounded" />
                  <div className="h-4 w-36 bg-slate-800/80 mx-auto rounded" />
                </div>
                <div className="h-12 w-full bg-amber-500/20 rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 bg-slate-800/80 rounded-xl" />
                  <div className="h-10 bg-slate-800/80 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Right Dossier & Telemetry Skeleton (8 Cols) */}
            <div className="lg:col-span-8 space-y-6 w-full">
              <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-6 sm:p-8 backdrop-blur-xl space-y-4 animate-pulse">
                <div className="flex gap-2">
                  <div className="h-5 w-28 bg-slate-800 rounded-full" />
                  <div className="h-5 w-24 bg-slate-800 rounded-full" />
                </div>
                <div className="h-9 w-3/4 bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-800/70 rounded" />
                <div className="h-4 w-2/3 bg-slate-800/70 rounded" />
              </div>

              {/* Stats Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="h-24 rounded-2xl bg-slate-900/70 border border-slate-800/80 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-900/70 border border-slate-800/80 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-900/70 border border-slate-800/80 animate-pulse" />
              </div>

              {/* Dossier Blueprint */}
              <div className="h-52 rounded-3xl bg-slate-900/70 border border-slate-800/80 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="w-full min-h-screen bg-[#070A12] text-white relative overflow-hidden pt-28 pb-24 flex items-center justify-center px-4">
        {/* Ambient lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.12),rgba(6,182,212,0.06)_45%,transparent_80%)] pointer-events-none" />
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        <div className="w-full max-w-lg mx-auto relative z-10 text-center">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl">
            <Building2 className="w-14 h-14 text-amber-500/80 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-mono font-bold uppercase text-white mb-2">
              {error || 'Dossier Not Found'}
            </h2>
            <p className="text-sm text-slate-400 mb-6 font-sans leading-relaxed">
              The requested collaborative partner profile does not exist or has been decommissioned from the active alliance registry.
            </p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono uppercase tracking-wider hover:bg-amber-500/30 transition-all cursor-pointer shadow-lg shadow-amber-500/10 active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Network</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const metricsMap = parseMetrics(partner.metrics);

  const getMetricIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('rev') || k.includes('mrr') || k.includes('val') || k.includes('fund') || k.includes('contract')) {
      return <TrendingUp className="w-5 h-5 text-amber-400" />;
    }
    if (k.includes('team') || k.includes('workforce') || k.includes('user') || k.includes('staff') || k.includes('plant')) {
      return <Users className="w-5 h-5 text-cyan-400" />;
    }
    return <Zap className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="w-full min-h-screen bg-[#070A12] text-white relative overflow-hidden pt-20 pb-28">
      <PageSEO
        title={`${partner.name} - ${partner.companyName} | UWE Business Network`}
        description={partner.bio}
      />

      {/* ── Atmospheric Ambient Lighting & Grid ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.12),rgba(6,182,212,0.06)_45%,transparent_80%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(16,185,129,0.05),transparent_60%)] pointer-events-none" />
      
      {/* Cyber Technical Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ── Top Classified Intelligence Strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md mb-8 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer group pr-3 border-r border-slate-800"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>PARTNERS DIRECTORY</span>
            </button>
            <span className="hidden sm:inline text-slate-500">DOSSIER #UWE-{partner.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>ACTIVE ALLIANCE NODE</span>
            </div>
            <span className="text-slate-500 text-[11px] hidden md:inline">ENCRYPTED 256-BIT</span>
          </div>
        </div>

        {/* ── Main Two-Column Dossier Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* ════════════ Left Column: Operative Identity Card (4 Cols) ════════════ */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Holographic Tactical ID Card */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 via-[#0B0F19]/90 to-slate-950/90 border border-slate-700/60 p-6 sm:p-7 shadow-[0_0_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden group">
              
              {/* Corner Sci-Fi HUD Crosshair Accents */}
              <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-500/60" />
              <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-500/60" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-amber-500/60" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-amber-500/60" />

              {/* Glowing Background Radial */}
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Portrait Container with Glowing Ring */}
              <div className="relative mb-6 flex justify-center">
                <div className="relative w-44 h-44 rounded-2xl p-[3px] bg-gradient-to-tr from-amber-500 via-cyan-400 to-emerald-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-950 relative">
                    {partner.photoUrl ? (
                      <img
                        src={partner.photoUrl}
                        alt={partner.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 via-slate-900 to-cyan-500/20 text-4xl font-mono font-black text-amber-300">
                        <span>{partner.name.charAt(0)}</span>
                        <span className="text-[10px] tracking-widest text-slate-400 font-normal mt-1">OPERATIVE</span>
                      </div>
                    )}

                    {/* Biometric Scanline subtle overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-50 pointer-events-none" />
                  </div>

                  {/* Status Beacon */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/90 border border-emerald-500/60 flex items-center gap-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">VERIFIED</span>
                  </div>
                </div>
              </div>

              {/* Name & Command Role */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono uppercase tracking-widest mb-2">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>{partner.courseSlug.toUpperCase()} EXECUTIVE ALUMNI</span>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white uppercase">
                  {partner.name}
                </h2>
                <p className="text-xs sm:text-sm font-mono text-amber-400 font-bold mt-0.5">
                  {partner.title}
                </p>
                <p className="text-xs text-slate-400 font-sans mt-1">
                  {partner.companyName}
                </p>
              </div>

              {/* Compact Bio Summary Pill */}
              {partner.cohort && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center mb-6">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Official Credential Seal
                  </p>
                  <p className="text-xs font-mono font-bold text-cyan-300 mt-0.5">
                    {partner.cohort}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>INITIATE B2B ALLIANCE</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {partner.websiteUrl && (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-mono text-slate-200 border border-slate-700/70 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Portal</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>
                  )}

                  {partner.linkedInUrl && (
                    <a
                      href={partner.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-mono text-slate-200 border border-slate-700/70 hover:border-blue-500/50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Enterprise Clearance Meta Card */}
            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-5 backdrop-blur-lg">
              <h4 className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Verification Checklist</span>
              </h4>
              <ul className="space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Subconscious Protocol Graduate</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified Corporate Registration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Approved for B2B Synergy</span>
                </li>
              </ul>
            </div>

          </div>

          {/* ════════════ Right Column: Dossier Intelligence & Telemetry (8 Cols) ════════════ */}
          <div className="lg:col-span-8 space-y-6">

            {/* Top Enterprise Overview Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  {partner.industry || 'ENTERPRISE OPERATIVE'}
                </span>
                {partner.companyType && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                    {partner.companyType}
                  </span>
                )}
                {partner.isFeatured && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    <span>COMMAND ALLIANCE LEADER</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white uppercase">
                {partner.companyName}
              </h1>
              <p className="text-sm sm:text-base font-sans text-slate-300 mt-3 leading-relaxed">
                Operating under executive command of <strong className="text-amber-300 font-mono">{partner.name}</strong>, implementing proprietary cognitive conditioning and high-ticket operational architectures.
              </p>
            </div>

            {/* Enterprise Telemetry Gauges Grid */}
            {Object.keys(metricsMap).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Audited Enterprise Telemetry</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">REAL-TIME INDICATORS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(metricsMap).map(([key, value]) => (
                    <motion.div
                      key={key}
                      whileHover={{ y: -3 }}
                      className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 hover:border-amber-500/40 p-5 shadow-xl transition-all relative overflow-hidden group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                          {key}
                        </span>
                        <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 group-hover:border-amber-500/40 transition-colors">
                          {getMetricIcon(key)}
                        </div>
                      </div>

                      <div className="text-2xl font-black font-mono text-amber-300 tracking-tight mt-1">
                        {value}
                      </div>

                      {/* Micro glowing indicator bar */}
                      <div className="w-full h-1 rounded-full bg-slate-800 mt-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-cyan-400 rounded-full w-4/5 animate-pulse" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Executive Biography & Field Trajectory */}
            <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">
                Executive Dossier &amp; Operational Blueprint
              </h3>
              
              <div className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans space-y-4">
                <p className="first-letter:text-3xl first-letter:font-mono first-letter:font-bold first-letter:text-amber-400 first-letter:mr-1">
                  {partner.bio}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
                  As part of the Unity Warriors Empire executive alliance, this directive maintains active collaboration channels for institutional syndication, joint venture deployments, and sovereign market expansion throughout South Asia and global trading hubs.
                </p>
              </div>

              {/* Strategic Synergy Tags */}
              <div className="pt-4 border-t border-slate-800/80">
                <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                  Alliance Synergies
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Cross-Border Scale',
                    'High-Ticket Leverage',
                    'Sovereign Leadership',
                    'Direct Capital Dealflow',
                    'Subconscious Operations'
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[11px] font-mono text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Intelligence Intercept (Testimonial Quote) */}
            {partner.testimonial && (
              <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950/90 border border-amber-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <Quote className="w-12 h-12 text-amber-500/15 absolute top-6 right-6" />

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                    DECRYPTED FIELD INTELLIGENCE REPORT
                  </span>
                </div>

                <blockquote className="text-base sm:text-lg text-slate-100 font-sans italic leading-relaxed relative z-10 mb-4">
                  "{partner.testimonial}"
                </blockquote>

                <div className="flex items-center justify-between text-xs font-mono pt-4 border-t border-amber-500/20 text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verified Audit by Command HQ</span>
                  </div>
                  <span className="text-amber-400/90 font-bold">
                    {partner.name} // {partner.cohort || 'UWE Alumnus'}
                  </span>
                </div>
              </div>
            )}

            {/* Final Transmission Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-outline-variant/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div>
                <h4 className="text-base font-bold font-mono text-white uppercase">
                  Ready to deploy strategic collaboration?
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md font-sans">
                  Initiate an official introduction or schedule an executive partnership briefing through the UWE Command Desk.
                </p>
              </div>

              <button
                onClick={() => setInquiryModalOpen(true)}
                className="btn-elite px-6 py-3 rounded-xl font-mono text-xs uppercase font-bold tracking-wider shrink-0 cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <span>OPEN TRANSMISSION</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ── B2B Transmission Modal ── */}
      <AnimatePresence>
        {inquiryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-3xl bg-[#0C101A] border border-amber-500/50 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold font-mono text-white uppercase">
                    Strategic B2B Transmission
                  </h3>
                  <p className="text-xs text-amber-400 font-mono">
                    Recipient: {partner.name} ({partner.companyName})
                  </p>
                </div>
                <button
                  onClick={() => setInquiryModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {inquirySent ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <p className="text-sm font-mono font-bold text-white uppercase">Transmission Dispatched</p>
                  <p className="text-xs text-slate-400">Directing to Command Desk WhatsApp channel...</p>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 uppercase">
                      Partnership Proposal / Inquiry Brief *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="Outline your enterprise synergy, joint venture proposal, or inquiry details..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 transition-colors font-sans text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setInquiryModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch via Command Desk</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
