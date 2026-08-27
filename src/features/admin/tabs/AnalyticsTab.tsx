import React from 'react';
import { motion } from 'framer-motion';
import { parsePrice } from '../../../utils/priceFormatter';
import { exportToCSV } from '../utils/exportCsv';
import type { CourseRecord, LeadRecord, AdminTab } from '../types/admin.types';

interface AnalyticsTabProps {
  courses: CourseRecord[];
  leads: LeadRecord[];
  paymentSlips: any[];
  staffMembers: any[];
  jobVacancies: any[];
  jobApplications: any[];
  users: any[];
  setActiveTab: (tab: AdminTab) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  courses,
  leads,
  paymentSlips,
  staffMembers,
  jobVacancies,
  jobApplications,
  users,
  setActiveTab,
  addToast,
}) => {
  const verifiedSlips = paymentSlips.filter((s) => s.status === 'VERIFIED');
  const enrolledLeads = leads.filter((l) => l.status === 'ENROLLED');

  // Financial Ledger Calculations — based on actual payment slip data
  const estimatedGrossRevenue = verifiedSlips.reduce(
    (acc, s) => acc + (typeof s.amount === 'number' ? s.amount : 0), 0
  );

  const pendingRevenue = paymentSlips
    .filter((s) => s.status === 'PENDING')
    .reduce((acc, s) => acc + (typeof s.amount === 'number' ? s.amount : 0), 0);


  const conversionRate = leads.length > 0 ? ((enrolledLeads.length / leads.length) * 100).toFixed(1) : '0';
  const activeStaffCount = staffMembers.filter((s) => s.isActive).length;
  const totalOpenSlots = jobVacancies.reduce((a, j) => a + (j.openPositions || 1), 0);
  const totalHiredSlots = jobVacancies.reduce((a, j) => a + (j.hiredCount || 0), 0);

  // Synthesize Live Chronological Radar Events
  const radarEvents = [
    ...verifiedSlips.map((s) => ({
      id: `slip-${s.id}`,
      type: 'PAYMENT',
      title: `Bank Slip Verified: ${s.studentName}`,
      subtitle: `Enrolled into ${s.courseSlug?.toUpperCase() || 'BMB'} division`,
      badge: 'VERIFIED (+RS. 15,000)',
      badgeColor: 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50',
      icon: 'verified',
      iconColor: 'text-[#2ED573]',
      time: s.createdAt
        ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recent',
    })),
    ...leads.slice(0, 4).map((l) => ({
      id: `lead-${l.id}`,
      type: 'LEAD',
      title: `New Inquiry: ${l.name}`,
      subtitle: `Registered for ${l.program} • ${l.status}`,
      badge: l.status === 'ENROLLED' ? 'ENROLLED' : l.status === 'CONTACTED' ? 'CONTACTED' : 'NEW LEAD',
      badgeColor:
        l.status === 'ENROLLED'
          ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50'
          : 'bg-secondary/20 text-secondary border-secondary/50',
      icon: 'trending_up',
      iconColor: 'text-secondary',
      time: l.date || 'Today',
    })),
    ...jobApplications.slice(0, 3).map((a) => ({
      id: `app-${a.id}`,
      type: 'CAREER',
      title: `Job Applicant: ${a.name}`,
      subtitle: `Applied for ${a.vacancy?.title || 'Tactical Role'} • Status: ${a.status}`,
      badge: a.status === 'HIRED' ? 'HIRED TO ROSTER' : 'APPLICATION',
      badgeColor:
        a.status === 'HIRED'
          ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50'
          : 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/50',
      icon: 'badge',
      iconColor: 'text-[#00D2FF]',
      time: a.createdAt
        ? new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recent',
    })),
  ].slice(0, 6);

  const handleExportExecutiveReport = () => {
    const verifiedSlipsCount = paymentSlips.filter((s) => s.status === 'VERIFIED').length;
    const enrolledLeadsCount = leads.filter((l) => l.status === 'ENROLLED').length;

    const reportRows = [
      {
        Category: 'FINANCIAL LEDGER',
        Metric: 'Estimated Gross Verified Revenue',
        Value: `RS. ${estimatedGrossRevenue.toLocaleString('en-US')}`,
        Notes: 'Calculated across active batches',
      },
      {
        Category: 'FINANCIAL LEDGER',
        Metric: 'Verified Payment Slips',
        Value: verifiedSlipsCount,
        Notes: 'Approved bank transfer slips',
      },
      {
        Category: 'CONVERSION FUNNEL',
        Metric: 'Total Registered Leads',
        Value: leads.length,
        Notes: 'Inquiries captured across all landing pages',
      },
      {
        Category: 'CONVERSION FUNNEL',
        Metric: 'WhatsApp Contacted Leads',
        Value: leads.filter((l) => l.status === 'CONTACTED' || l.status === 'ENROLLED').length,
        Notes: 'Operatives engaged in direct consultation',
      },
      {
        Category: 'CONVERSION FUNNEL',
        Metric: 'Total Enrolled Operatives',
        Value: enrolledLeadsCount,
        Notes: `${leads.length > 0 ? ((enrolledLeadsCount / leads.length) * 100).toFixed(1) : 0}% Conversion Rate`,
      },
      {
        Category: 'DIVISION CAPACITY',
        Metric: 'Total Active Courses',
        Value: courses.length,
        Notes: 'BMB, Leadership, IGNIT divisions',
      },
      {
        Category: 'DIVISION CAPACITY',
        Metric: 'Total Open Seats Remaining',
        Value: courses.reduce((a, c) => a + c.seatsLeft, 0),
        Notes: 'Across all active upcoming batches',
      },
      {
        Category: 'HR & RECRUITMENT',
        Metric: 'Active Staff Members',
        Value: staffMembers.filter((s) => s.isActive).length,
        Notes: `Out of ${staffMembers.length} total roster`,
      },
      {
        Category: 'HR & RECRUITMENT',
        Metric: 'Open Job Positions',
        Value: jobVacancies.reduce((a, j) => a + (j.openPositions || 1), 0),
        Notes: `With ${jobApplications.length} total applications received`,
      },
    ];

    exportToCSV('uwe_executive_command_report', reportRows, addToast);
  };

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* ━━━ 1. REAL-TIME REVENUE & COMMAND FINANCIAL LEDGER ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Verified Revenue */}
        <div className="bg-[#0E131F] p-5 rounded-2xl border border-secondary/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Gross Verified Revenue
            </span>
            <span className="p-1.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">payments</span>
            </span>
          </div>
          <div className="font-mono-data text-2xl sm:text-3xl font-black text-secondary text-glow-gold tracking-tight">
            RS. {estimatedGrossRevenue.toLocaleString('en-US')}
          </div>
          <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
            <span className="text-[#2ED573] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span> {verifiedSlips.length} Verified {verifiedSlips.length === 1 ? 'Slip' : 'Slips'}
            </span>
            <span className="text-on-surface-variant text-[11px]">
              Pending: RS. {pendingRevenue.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Card 2: Conversion Funnel Rate */}
        <div className="bg-[#0E131F] p-5 rounded-2xl border border-[#2ED573]/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#2ED573]/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Conversion Velocity
            </span>
            <span className="p-1.5 rounded-lg bg-[#2ED573]/15 text-[#2ED573] border border-[#2ED573]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">conversion_path</span>
            </span>
          </div>
          <div className="font-mono-data text-2xl sm:text-3xl font-black text-[#2ED573] tracking-tight">
            {conversionRate}%
          </div>
          <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
            <span className="text-on-surface font-bold">{enrolledLeads.length} Enrolled</span>
            <span className="text-on-surface-variant text-[11px]">From {leads.length} Total Leads</span>
          </div>
        </div>

        {/* Card 3: Total Enrolled Operatives */}
        <div className="bg-[#0E131F] p-5 rounded-2xl border border-[#00D2FF]/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D2FF]/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Active Operatives
            </span>
            <span className="p-1.5 rounded-lg bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">school</span>
            </span>
          </div>
          <div className="font-mono-data text-2xl sm:text-3xl font-black text-[#00D2FF] tracking-tight">
            {users.length || enrolledLeads.length}
          </div>
          <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
            <span className="text-[#00D2FF] font-bold">{verifiedSlips.length} Verified Slips</span>
            <span className="text-on-surface-variant text-[11px]">Across 3 Divisions</span>
          </div>
        </div>

        {/* Card 4: Recruitment & Staff Readiness */}
        <div className="bg-[#0E131F] p-5 rounded-2xl border border-[#FF4757]/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF4757]/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Team & Capacity
            </span>
            <span className="p-1.5 rounded-lg bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">groups</span>
            </span>
          </div>
          <div className="font-mono-data text-2xl sm:text-3xl font-black text-[#FF4757] tracking-tight flex items-baseline gap-1.5">
            {activeStaffCount} <span className="text-xs text-on-surface-variant font-normal">Staff</span>
            <span className="text-lg text-secondary">/</span>
            <span className="text-secondary">{totalOpenSlots - totalHiredSlots}</span>{' '}
            <span className="text-xs text-on-surface-variant font-normal">Slots Open</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
            <span className="text-[#2ED573] font-bold">{totalHiredSlots} Hired</span>
            <span className="text-on-surface-variant text-[11px]">{jobApplications.length} Applicants</span>
          </div>
        </div>
      </div>

      {/* ━━━ 2. MIDDLE ROW: TODAY'S ACTION ITEMS & DIVISION CAPACITY GAUGES ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 Cols): Today's Action Items */}
        <div className="lg:col-span-7 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-5">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">task_alt</span>
                Today's Action Items
              </h3>
              <p className="font-mono-data text-xs text-on-surface-variant">
                Items requiring your immediate attention — all backed by live database records
              </p>
            </div>
            <span className="font-label-caps text-xs px-2.5 py-1 rounded bg-secondary/20 text-secondary font-bold border border-secondary/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              {leads.filter((l) => l.status === 'NEW').length +
                paymentSlips.filter((s) => s.status === 'PENDING').length +
                jobApplications.filter((a) => a.status === 'PENDING' || a.status === 'NEW').length}{' '}
              PENDING
            </span>
          </div>

          <div className="space-y-3">
            {/* Unread Leads */}
            {(() => {
              const newLeads = leads.filter((l) => l.status === 'NEW');
              return (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    newLeads.length > 0
                      ? 'bg-[#131929] border-secondary/40 shadow-[0_0_12px_rgba(255,184,0,0.1)]'
                      : 'bg-[#131929]/60 border-outline-variant/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          newLeads.length > 0
                            ? 'bg-secondary/15 border border-secondary/40'
                            : 'bg-[#0E131F] border border-outline-variant/30'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-xl ${
                            newLeads.length > 0 ? 'text-secondary' : 'text-on-surface-variant'
                          }`}
                        >
                          chat
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                          Unread Leads — Need WhatsApp Reply
                          {newLeads.length > 0 && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
                        </h5>
                        <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                          {newLeads.length > 0
                            ? `${newLeads
                                .slice(0, 3)
                                .map((l) => l.name)
                                .join(', ')}${newLeads.length > 3 ? ` and ${newLeads.length - 3} more` : ''}`
                            : 'All leads have been contacted ✓'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-data text-2xl font-black ${
                          newLeads.length > 0 ? 'text-secondary' : 'text-[#2ED573]'
                        }`}
                      >
                        {newLeads.length}
                      </span>
                      {newLeads.length > 0 && (
                        <button
                          onClick={() => setActiveTab('leads')}
                          className="px-3 py-1.5 rounded-lg bg-secondary/15 border border-secondary/50 text-secondary font-mono-data text-[10px] font-bold uppercase hover:bg-secondary hover:text-black transition-all cursor-pointer"
                        >
                          VIEW →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pending Slips */}
            {(() => {
              const pendingSlips = paymentSlips.filter((s) => s.status === 'PENDING');
              return (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    pendingSlips.length > 0
                      ? 'bg-[#131929] border-[#2ED573]/40 shadow-[0_0_12px_rgba(46,213,115,0.1)]'
                      : 'bg-[#131929]/60 border-outline-variant/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          pendingSlips.length > 0
                            ? 'bg-[#2ED573]/15 border border-[#2ED573]/40'
                            : 'bg-[#0E131F] border border-outline-variant/30'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-xl ${
                            pendingSlips.length > 0 ? 'text-[#2ED573]' : 'text-on-surface-variant'
                          }`}
                        >
                          receipt_long
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                          Bank Slips — Waiting for Verification
                          {pendingSlips.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#2ED573] animate-pulse" />
                          )}
                        </h5>
                        <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                          {pendingSlips.length > 0
                            ? `${pendingSlips
                                .slice(0, 3)
                                .map((s) => s.studentName)
                                .join(', ')}${pendingSlips.length > 3 ? ` and ${pendingSlips.length - 3} more` : ''}`
                            : 'All payment slips have been processed ✓'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-data text-2xl font-black ${
                          pendingSlips.length > 0 ? 'text-[#2ED573]' : 'text-[#2ED573]'
                        }`}
                      >
                        {pendingSlips.length}
                      </span>
                      {pendingSlips.length > 0 && (
                        <button
                          onClick={() => setActiveTab('slips')}
                          className="px-3 py-1.5 rounded-lg bg-[#2ED573]/15 border border-[#2ED573]/50 text-[#2ED573] font-mono-data text-[10px] font-bold uppercase hover:bg-[#2ED573] hover:text-black transition-all cursor-pointer"
                        >
                          VERIFY →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pending Job Apps */}
            {(() => {
              const pendingApps = jobApplications.filter((a) => a.status === 'PENDING' || a.status === 'NEW');
              return (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    pendingApps.length > 0
                      ? 'bg-[#131929] border-[#00D2FF]/40 shadow-[0_0_12px_rgba(0,210,255,0.1)]'
                      : 'bg-[#131929]/60 border-outline-variant/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          pendingApps.length > 0
                            ? 'bg-[#00D2FF]/15 border border-[#00D2FF]/40'
                            : 'bg-[#0E131F] border border-outline-variant/30'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-xl ${
                            pendingApps.length > 0 ? 'text-[#00D2FF]' : 'text-on-surface-variant'
                          }`}
                        >
                          work
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                          Job Applications — Pending Review
                          {pendingApps.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse" />
                          )}
                        </h5>
                        <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                          {pendingApps.length > 0
                            ? `${pendingApps
                                .slice(0, 3)
                                .map((a) => a.name)
                                .join(', ')}${pendingApps.length > 3 ? ` and ${pendingApps.length - 3} more` : ''}`
                            : 'No pending job applications ✓'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-data text-2xl font-black ${
                          pendingApps.length > 0 ? 'text-[#00D2FF]' : 'text-[#2ED573]'
                        }`}
                      >
                        {pendingApps.length}
                      </span>
                      {pendingApps.length > 0 && (
                        <button
                          onClick={() => setActiveTab('jobs')}
                          className="px-3 py-1.5 rounded-lg bg-[#00D2FF]/15 border border-[#00D2FF]/50 text-[#00D2FF] font-mono-data text-[10px] font-bold uppercase hover:bg-[#00D2FF] hover:text-black transition-all cursor-pointer"
                        >
                          REVIEW →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Contacted Leads */}
            {(() => {
              const awaitingPayment = leads.filter((l) => l.status === 'CONTACTED');
              return (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    awaitingPayment.length > 0
                      ? 'bg-[#131929] border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.1)]'
                      : 'bg-[#131929]/60 border-outline-variant/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          awaitingPayment.length > 0
                            ? 'bg-purple-500/15 border border-purple-500/40'
                            : 'bg-[#0E131F] border border-outline-variant/30'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-xl ${
                            awaitingPayment.length > 0 ? 'text-purple-400' : 'text-on-surface-variant'
                          }`}
                        >
                          hourglass_top
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                          Contacted Leads — Awaiting Payment
                        </h5>
                        <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                          {awaitingPayment.length > 0
                            ? `${awaitingPayment
                                .slice(0, 3)
                                .map((l) => l.name)
                                .join(', ')}${awaitingPayment.length > 3 ? ` and ${awaitingPayment.length - 3} more` : ''}`
                            : 'No leads stuck in contacted stage ✓'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-data text-2xl font-black ${
                          awaitingPayment.length > 0 ? 'text-purple-400' : 'text-[#2ED573]'
                        }`}
                      >
                        {awaitingPayment.length}
                      </span>
                      {awaitingPayment.length > 0 && (
                        <button
                          onClick={() => setActiveTab('leads')}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/50 text-purple-400 font-mono-data text-[10px] font-bold uppercase hover:bg-purple-500 hover:text-black transition-all cursor-pointer"
                        >
                          FOLLOW UP →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right (5 Cols): Division Breakdown & Seat Capacity Gauges */}
        <div className="lg:col-span-5 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-5">
          <div className="border-b border-outline-variant/20 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">pie_chart</span>
                Division Capacity & Seats
              </h3>
              <p className="font-mono-data text-xs text-on-surface-variant">
                Seat fill rates & live revenue generation per batch
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {courses.map((course) => {
              const totalBatchSeats = 20;
              const seatsLeft = typeof course.seatsLeft === 'number' && !isNaN(course.seatsLeft) ? course.seatsLeft : 20;
              const bookedSeats = Math.max(0, totalBatchSeats - seatsLeft);
              const fillPercent = Math.min(100, Math.max(0, Math.round((bookedSeats / totalBatchSeats) * 100))) || 0;
              const rawPrice = typeof course.price === 'number' && !isNaN(course.price) && course.price > 0 ? course.price : parsePrice(course.priceDisplay);
              const price = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 15000;
              const divisionRevenue = bookedSeats * price;
              const batchDate = course.nextBatchDate || '2026-09-15 (Zoom Live)';
              const feeDisplay = course.priceDisplay || `RS. ${price.toLocaleString('en-US')}`;

              return (
                <div key={course.id} className="p-4 rounded-xl bg-[#131929] border border-outline-variant/30 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/15 text-secondary font-black border border-secondary/30">
                        {course.badge || `${(course.slug || 'BMB').toUpperCase()} DIVISION`}
                      </span>
                      <h4 className="font-headline-md text-sm text-on-surface font-bold truncate max-w-[150px]">
                        {course.name || (course as any).title || 'Division Program'}
                      </h4>
                    </div>
                    <span className="font-mono-data text-xs font-bold text-secondary">
                      RS. {divisionRevenue.toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-mono-data">
                      <span className="text-on-surface-variant">
                        {bookedSeats} of {totalBatchSeats} Seats Booked ({seatsLeft} Left)
                      </span>
                      <span
                        className={`font-bold ${
                          fillPercent >= 80
                            ? 'text-[#FF4757]'
                            : fillPercent >= 50
                            ? 'text-secondary'
                            : 'text-[#2ED573]'
                        }`}
                      >
                        {fillPercent}% FULL
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/50 border border-outline-variant/20 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          fillPercent >= 80
                            ? 'bg-gradient-to-r from-amber-500 to-[#FF4757]'
                            : fillPercent >= 50
                            ? 'bg-gradient-to-r from-cyan-400 to-secondary'
                            : 'bg-gradient-to-r from-emerald-500 to-[#2ED573]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono-data text-on-surface-variant pt-1 border-t border-outline-variant/10">
                    <span>
                      Batch: <strong className="text-on-surface">{batchDate}</strong>
                    </span>
                    <span>
                      Fee: <strong className="text-secondary">{feeDisplay}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━ 3. BOTTOM ROW: LIVE COMMAND RADAR STREAM & EXECUTIVE EXPORT DECK ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 Cols): Live Tactical Command Radar Stream */}
        <div className="lg:col-span-7 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
            <div>
              <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2ED573] animate-pulse">radar</span>
                Live Command Radar (Real-Time Activity)
              </h3>
              <p className="font-mono-data text-xs text-on-surface-variant">
                Chronological tactical events synthesized across all operational divisions
              </p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ED573] animate-ping" />
          </div>

          <div className="space-y-3">
            {radarEvents.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant font-mono-data text-xs italic">
                No recent tactical radar events logged.
              </div>
            ) : (
              radarEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl bg-[#131929] border border-outline-variant/30 flex items-center justify-between gap-3 hover:border-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-black/40 border border-outline-variant/30 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined text-lg ${evt.iconColor}`}>{evt.icon}</span>
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h5 className="font-headline-md text-xs font-bold text-on-surface truncate">{evt.title}</h5>
                      <p className="font-mono-data text-[11px] text-on-surface-variant truncate">{evt.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono-data text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${evt.badgeColor}`}>
                      {evt.badge}
                    </span>
                    <span className="font-mono-data text-[10px] text-on-surface-variant hidden sm:inline">
                      {evt.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right (5 Cols): Recruitment Intelligence & Executive CSV Export Deck */}
        <div className="lg:col-span-5 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-outline-variant/20 pb-3">
              <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">terminal</span>
                Executive Intelligence & Reporting
              </h3>
              <p className="font-mono-data text-xs text-on-surface-variant">
                Export complete tactical ledger and business metrics
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#131929] border border-outline-variant/30 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono-data">
                <span className="text-secondary font-bold uppercase">Recruitment Throughput</span>
                <span className="text-[#2ED573] font-bold">
                  {totalHiredSlots} of {totalOpenSlots} Filled
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/50 border border-outline-variant/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-[#2ED573]"
                  style={{ width: `${totalOpenSlots > 0 ? (totalHiredSlots / totalOpenSlots) * 100 : 0}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono-data text-on-surface-variant">
                <div>
                  Active Staff: <strong className="text-on-surface">{activeStaffCount} / {staffMembers.length}</strong>
                </div>
                <div>
                  Job Applicants: <strong className="text-secondary">{jobApplications.length} Candidates</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-outline-variant/20">
            <button
              onClick={handleExportExecutiveReport}
              className="btn-elite w-full py-3 rounded-xl font-label-caps text-xs font-black uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,184,0,0.35)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>EXPORT EXECUTIVE COMMAND REPORT (CSV)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-[#131929] border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-secondary transition-all font-mono-data text-xs uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>PRINT / SAVE AS PDF SUMMARY</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
