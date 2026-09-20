import React from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';
import type { LeadRecord } from '../types/admin.types';

interface LeadsTabProps {
  leads: LeadRecord[];
  setLeads: React.Dispatch<React.SetStateAction<LeadRecord[]>>;
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  fetchAllData: () => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const LeadsTab: React.FC<LeadsTabProps> = ({
  leads,
  setLeads,
  users,
  setUsers,
  fetchAllData,
  addToast,
}) => {
  const [filterAbandoned, setFilterAbandoned] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProgram, setSelectedProgram] = React.useState('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState('ALL');

  const statusColor = (s: string) =>
    s === 'NEW'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      : s === 'CONTACTED'
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      : s === 'ENROLLED'
      ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50'
      : 'bg-red-500/20 text-red-400 border-red-500/50';

  const updateLeadStatus = async (lead: LeadRecord, newStatus: string) => {
    try {
      await api.updateLeadStatus(lead.fullId, newStatus);
      setLeads((prev) =>
        prev.map((l) => (l.fullId === lead.fullId ? { ...l, status: newStatus as any } : l))
      );
      addToast(`✅ ${lead.name} status → ${newStatus}`);
    } catch {
      addToast(`❌ Failed to update ${lead.name}`, 'error');
    }
  };

  const handleDeleteLead = async (lead: LeadRecord) => {
    if (!window.confirm(`Delete lead record for "${lead.name}"?`)) return;
    try {
      await api.deleteLead(lead.fullId);
      setLeads((prev) => prev.filter((l) => l.fullId !== lead.fullId));
      addToast(`🗑️ Lead "${lead.name}" deleted successfully.`);
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  const handleConvertLeadToUser = async (lead: LeadRecord) => {
    try {
      const cleanPhone = lead.phone ? lead.phone.replace(/\s+/g, '') : '';
      const email = lead.email ? lead.email.trim().toLowerCase() : `${cleanPhone}@uwe.lk`;

      // Check if user already exists in state
      const existingUser = users.find(
        (u) =>
          (u.email && u.email.toLowerCase() === email) ||
          (cleanPhone && u.phone && u.phone.replace(/\s+/g, '') === cleanPhone)
      );

      if (existingUser) {
        // Just enroll existing user and update lead
        await updateLeadStatus(lead, 'ENROLLED');
        addToast(`✅ Linked lead "${lead.name}" to existing Operative profile!`);
        return;
      }

      const res = await api.createUser({
        name: lead.name,
        email,
        phone: lead.phone,
        password: 'password123',
        enrolledCourseSlugs: lead.program ? lead.program.toLowerCase() : 'bmb',
        isEnrolled: true,
      });

      if (res.data) {
        setUsers((prev) => [res.data, ...prev]);
        await updateLeadStatus(lead, 'ENROLLED');
        addToast(`🎉 Guest lead "${lead.name}" converted to Registered Operative!`);
      }
    } catch (err: any) {
      addToast(`❌ Conversion failed: ${err.message}`, 'error');
    }
  };

  const handleUnconvertLead = async (lead: LeadRecord) => {
    try {
      await updateLeadStatus(lead, 'NEW');
      addToast(`🔄 Status reset to NEW for "${lead.name}"`);
    } catch (err: any) {
      addToast(`❌ Reset failed: ${err.message}`, 'error');
    }
  };

  const handleReplyLead = async (lead: LeadRecord) => {
    const rawDigits = lead.phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('94')
      ? rawDigits
      : rawDigits.startsWith('0')
      ? '94' + rawDigits.substring(1)
      : '94' + rawDigits;
    const msg = encodeURIComponent(
      `Hello ${lead.name}, this is Command HQ from UWE Empire regarding your ${lead.program} inquiry.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');

    if (lead.status === 'NEW') {
      try {
        await api.updateLeadStatus(lead.fullId, 'CONTACTED');
        setLeads((prev) =>
          prev.map((l) => (l.fullId === lead.fullId ? { ...l, status: 'CONTACTED' as any } : l))
        );
        addToast(`✅ ${lead.name} marked as CONTACTED`);
      } catch {
        /* ignore */
      }
    }
  };

  const handleAbandonedFollowup = async (lead: LeadRecord) => {
    const rawDigits = lead.phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('94')
      ? rawDigits
      : rawDigits.startsWith('0')
      ? '94' + rawDigits.substring(1)
      : '94' + rawDigits;
    const msg = encodeURIComponent(
      `Greetings ${lead.name}! This is Command HQ at UWE. We noticed your transmission for the ${lead.program} Division was initiated, but your proof of transfer hasn't arrived at the Command Gateway yet.\n\nUpcoming batch seats are strictly limited. Complete your enrollment or upload your slip to reserve your operative seat: https://uwe.lk/programs\n\nNeed assistance? Reply directly to this transmission.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');

    try {
      await api.recordAbandonedReminder(lead.fullId);
      setLeads((prev) =>
        prev.map((l) => (l.fullId === lead.fullId ? { ...l, status: 'CONTACTED' as any } : l))
      );
      addToast(`📡 Retention reminder logged for ${lead.name}`);
    } catch {
      /* ignore */
    }
  };

  const abandonedCount = leads.filter(
    (l: any) => l.isAbandoned || (l.status === 'NEW' && (l.hoursPending || 0) >= 24)
  ).length;

  const isFiltered = searchQuery.trim() !== '' || selectedProgram !== 'ALL' || selectedStatus !== 'ALL' || filterAbandoned;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedProgram('ALL');
    setSelectedStatus('ALL');
    setFilterAbandoned(false);
  };

  const displayedLeads = leads.filter((l: any) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = (l.name || '').toLowerCase().includes(q);
      const matchesEmail = (l.email || '').toLowerCase().includes(q);
      const matchesPhone = (l.phone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      if (!matchesName && !matchesEmail && !matchesPhone) return false;
    }

    if (selectedProgram !== 'ALL') {
      const prog = (l.program || '').toUpperCase();
      if (!prog.includes(selectedProgram.toUpperCase())) return false;
    }

    if (selectedStatus !== 'ALL') {
      if (l.status !== selectedStatus) return false;
    }

    if (filterAbandoned) {
      const isAb = l.isAbandoned || (l.status === 'NEW' && (l.hoursPending || 0) >= 24);
      if (!isAb) return false;
    }

    return true;
  });

  return (
    <motion.div
      key="leads"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
    >
      <div className="bg-[#0E131F] rounded-2xl border border-outline-variant/30 overflow-hidden">
        {/* Header Title & Global Actions */}
        <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#25D366]">whatsapp</span>
              Live CRM Leads & Pipeline
            </h3>
            {/* Abandoned Slip Filter Button */}
            <button
              onClick={() => setFilterAbandoned(!filterAbandoned)}
              className={`px-3 py-1 rounded-xl font-mono-data text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                filterAbandoned
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant/40 hover:text-amber-300 hover:border-amber-500/40'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-amber-400">warning</span>
              ABANDONED SLIPS (&gt;24H)
              {abandonedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-extrabold ml-1">
                  {abandonedCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                exportToCSV(
                  'uwe_leads',
                  displayedLeads.map((l) => ({
                    ID: l.id,
                    Name: l.name,
                    Phone: l.phone,
                    Email: l.email || 'N/A',
                    Program: l.program,
                    Value: l.value,
                    Status: l.status,
                    Date: l.date,
                  })),
                  addToast
                )
              }
              className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
            </button>
            <button
              onClick={fetchAllData}
              className="px-3 py-1.5 rounded bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>REFRESH
            </button>
            <span className="px-2.5 py-1 rounded bg-[#131929] border border-outline-variant/40 font-mono-data text-xs text-secondary font-bold">
              {displayedLeads.length} / {leads.length} LEADS
            </span>
          </div>
        </div>

        {/* ── Contextual Tactical Search & Filter Bar ── */}
        <div className="p-4 bg-[#0A0E18] border-b border-outline-variant/30 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Email, or Phone number..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Program Filter Dropdown */}
          <div className="min-w-[160px]">
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Programs</option>
              <option value="BMB">BMB Mind Division</option>
              <option value="LEADERSHIP">Leadership Command</option>
              <option value="IGNIT">IGNIT Incubator</option>
              <option value="CORPORATE">Corporate Directive</option>
              <option value="GENERAL">General Inquiries</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="ENROLLED">ENROLLED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">filter_alt_off</span>
              RESET
            </button>
          )}
        </div>

        <div className="divide-y divide-outline-variant/20">
          {displayedLeads.length === 0 && (
            <div className="p-8 text-center font-mono-data text-sm text-on-surface-variant">
              {isFiltered
                ? 'No leads match your search criteria. Try adjusting your query or resetting filters.'
                : 'No lead records yet. Dispatches from the Contact page will appear live here.'}
            </div>
          )}
          {displayedLeads.map((lead: any) => {
            const matchingUser = users.find(
              (u) =>
                (lead.email && u.email && u.email.toLowerCase() === lead.email.toLowerCase()) ||
                (lead.phone &&
                  u.phone &&
                  u.phone.replace(/\s+/g, '') === lead.phone.replace(/\s+/g, ''))
            );

            const isAbandoned = lead.isAbandoned || (lead.status === 'NEW' && (lead.hoursPending || 0) >= 24);

            return (
              <div
                key={lead.id}
                className={`p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 transition-colors ${
                  isAbandoned
                    ? 'bg-amber-950/20 border-l-4 border-l-amber-500 hover:bg-amber-950/30'
                    : 'hover:bg-[#131929]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isAbandoned ? 'bg-amber-500/20 text-amber-400' : 'bg-[#25D366]/20 text-[#25D366]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isAbandoned ? 'hourglass_empty' : 'person'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-headline-md text-sm text-on-surface font-bold flex items-center gap-2">
                        {lead.name}
                        {lead.callLockUntil && new Date(lead.callLockUntil) > new Date() && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold animate-pulse flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">lock</span>
                            {lead.callLockBy}
                          </span>
                        )}
                        {lead.funnelStage && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[10px] font-bold">
                            {lead.funnelStage.replace('_', ' ')}
                          </span>
                        )}
                      </h4>
                      {isAbandoned && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono-data font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          {lead.hoursPending ? `${lead.hoursPending}H+ SLIP PENDING` : '24H+ SLIP PENDING'}
                        </span>
                      )}
                      {matchingUser ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 text-[10px] font-mono-data font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span> OPERATIVE:{' '}
                            {matchingUser.name}
                          </span>
                          <button
                            onClick={() => handleUnconvertLead(lead)}
                            title="Reset operative link back to NEW status"
                            className="px-1.5 py-0.5 rounded bg-surface-variant/40 hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 border border-outline-variant/40 text-[9px] font-mono-data cursor-pointer transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConvertLeadToUser(lead)}
                          className="px-2 py-0.5 rounded bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-colors text-[10px] font-mono-data font-bold uppercase cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">person_add</span> CONVERT TO OPERATIVE
                        </button>
                      )}
                    </div>
                    <span className="font-mono-data text-xs text-on-surface-variant">
                      {lead.phone} • {lead.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono-data text-xs text-secondary font-bold">{lead.program}</span>
                  <span className="font-mono-data text-xs text-on-surface">{lead.value}</span>

                  {/* Status Dropdown */}
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead, e.target.value)}
                    className={`px-2 py-1 rounded text-[11px] font-mono-data font-bold border cursor-pointer ${statusColor(
                      lead.status
                    )} bg-transparent`}
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="ENROLLED">ENROLLED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>

                  {/* 1-Click Abandoned Slip Follow-up */}
                  {isAbandoned && (
                    <button
                      onClick={() => handleAbandonedFollowup(lead)}
                      title="Send WhatsApp Abandoned Slip Follow-up Reminder"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-label-caps text-[11px] font-extrabold uppercase hover:bg-amber-400 transition-all flex items-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    >
                      <span className="material-symbols-outlined text-xs">notifications_active</span>
                      RETENTION WA
                    </button>
                  )}

                  <button
                    onClick={() => handleReplyLead(lead)}
                    className="px-3 py-1.5 rounded bg-[#25D366] text-black font-label-caps text-[11px] font-bold uppercase hover:scale-105 transition-transform flex items-center gap-1 cursor-pointer"
                  >
                    REPLY <span className="material-symbols-outlined text-xs">east</span>
                  </button>

                  {/* Delete Lead Button */}
                  <button
                    onClick={() => handleDeleteLead(lead)}
                    title="Delete lead record"
                    className="p-1.5 rounded-lg bg-surface-variant/30 border border-outline-variant/30 text-on-surface-variant hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
