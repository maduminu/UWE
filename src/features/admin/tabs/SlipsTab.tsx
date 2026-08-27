import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';
import { sanitizeExternalUrl, sanitizeImageUrl } from '../../../utils/urlSecurity';

interface SlipsTabProps {
  paymentSlips: any[];
  setPaymentSlips: React.Dispatch<React.SetStateAction<any[]>>;
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SlipsTab: React.FC<SlipsTabProps> = ({
  paymentSlips,
  setPaymentSlips,
  setUsers,
  saving: _saving,
  setSaving,
  addToast,
}) => {
  const handleVerifySlip = async (slip: any) => {
    setSaving(true);
    try {
      await api.updateSlipStatus(slip.id, 'VERIFIED');
      setPaymentSlips((prev) =>
        prev.map((s) => (s.id === slip.id ? { ...s, status: 'VERIFIED' } : s))
      );
      const uRes = await api.getUsers().catch(() => null);
      if (uRes?.data) setUsers(uRes.data);
      addToast(
        `🎉 Payment Verified! Operative ${slip.studentName} enrolled in ${slip.courseSlug?.toUpperCase()}!`
      );
    } catch (err: any) {
      addToast(`❌ Verification failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSlip = async (slipId: string) => {
    if (!window.confirm('Reject this payment slip?')) return;
    try {
      await api.updateSlipStatus(slipId, 'REJECTED');
      setPaymentSlips((prev) =>
        prev.map((s) => (s.id === slipId ? { ...s, status: 'REJECTED' } : s))
      );
      addToast('Payment slip marked as REJECTED');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  const isFiltered = searchQuery.trim() !== '' || selectedStatus !== 'ALL' || selectedCourse !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedCourse('ALL');
  };

  const displayedSlips = paymentSlips.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = (s.studentName || '').toLowerCase().includes(q);
      const matchesEmail = (s.studentEmail || '').toLowerCase().includes(q);
      const matchesPhone = (s.studentPhone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      const matchesRef = (s.bankReference || '').toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesPhone && !matchesRef) return false;
    }

    if (selectedStatus !== 'ALL') {
      if (s.status !== selectedStatus) return false;
    }

    if (selectedCourse !== 'ALL') {
      const slug = (s.courseSlug || '').toLowerCase();
      if (!slug.includes(selectedCourse.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <motion.div
      key="slips"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="bg-[#0E131F] rounded-2xl border border-secondary/30 overflow-hidden">
        <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">receipt_long</span>
              Direct Bank Transfer Slips &amp; Verification
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant">
              Review uploaded student bank slips and 1-click verify to auto-enroll operative
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                exportToCSV(
                  'uwe_payment_slips',
                  displayedSlips.map((s) => ({
                    ID: s.id,
                    StudentName: s.studentName,
                    Phone: s.studentPhone,
                    Email: s.studentEmail || 'N/A',
                    Course: s.courseSlug?.toUpperCase(),
                    Amount: s.amount ? `RS. ${s.amount.toLocaleString()}` : 'N/A',
                    BankReference: s.bankReference || 'N/A',
                    Status: s.status,
                    Date: new Date(s.createdAt).toLocaleString(),
                  })),
                  addToast
                )
              }
              className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
            </button>
            <span className="px-2.5 py-1 rounded bg-[#131929] border border-outline-variant/40 font-mono-data text-xs text-secondary font-bold">
              {displayedSlips.length} / {paymentSlips.length} SLIPS
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
              placeholder="Search by Student Name, Phone, Email, or Bank Ref..."
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

          {/* Course Directive Filter Dropdown */}
          <div className="min-w-[160px]">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Courses</option>
              <option value="bmb">BMB Mind Division</option>
              <option value="leadership">Leadership Academy</option>
              <option value="ignit">IGNIT Incubator</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="min-w-[160px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Slip Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
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
          {displayedSlips.length === 0 && (
            <div className="p-12 text-center font-mono-data text-sm text-on-surface-variant">
              {isFiltered
                ? 'No payment slips match your filter criteria. Try adjusting your query or resetting filters.'
                : 'No payment slips uploaded yet. When students upload receipts, they will appear here for verification.'}
            </div>
          )}

          {displayedSlips.map((slip) => (
            <div
              key={slip.id}
              className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-[#131929]/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Slip Image Thumbnail */}
                <a
                  href={sanitizeExternalUrl(slip.slipUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-16 h-16 rounded-xl bg-black border border-secondary/40 overflow-hidden shrink-0 group relative cursor-pointer"
                  title="View Slip Fullscreen"
                >
                  <img
                    src={sanitizeImageUrl(slip.slipUrl)}
                    alt="Bank Slip"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-xs text-white">open_in_new</span>
                  </div>
                </a>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-headline-md text-base text-on-surface font-bold">{slip.studentName}</h4>
                    <span className="font-mono-data text-xs px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/40 font-bold uppercase">
                      {slip.courseSlug} DIVISION
                    </span>
                    <span
                      className={`font-mono-data text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        slip.status === 'VERIFIED'
                          ? 'bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40'
                          : slip.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      }`}
                    >
                      {slip.status}
                    </span>
                  </div>

                  <div className="font-mono-data text-xs text-on-surface-variant flex items-center gap-3 flex-wrap">
                    <span>
                      Phone: <strong className="text-on-surface">{slip.studentPhone}</strong>
                    </span>
                    {slip.amount && (
                      <span>
                        Amount: <strong className="text-[#2ED573]">RS. {slip.amount.toLocaleString()}</strong>
                      </span>
                    )}
                    {slip.bankReference && (
                      <span>
                        Ref: <strong className="text-secondary">{slip.bankReference}</strong>
                      </span>
                    )}
                    <span>Date: {new Date(slip.createdAt).toLocaleDateString()}</span>
                  </div>

                  {slip.notes && (
                    <p className="font-mono-data text-xs text-on-surface-variant italic mt-1">
                      Note: {slip.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                <a
                  href={`https://wa.me/${slip.studentPhone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                    slip.studentName
                  )}%2C%20Command%20HQ%20received%20your%20payment%20slip%20for%20${slip.courseSlug?.toUpperCase()}.`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#25D366]/15 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366] hover:text-black transition-colors font-mono-data text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">chat</span> WHATSAPP
                </a>

                {slip.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleVerifySlip(slip)}
                      className="btn-elite px-4 py-1.5 rounded-lg font-mono-data text-xs font-bold uppercase cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span> APPROVE &amp; ENROLL
                    </button>
                    <button
                      onClick={() => handleRejectSlip(slip.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-colors font-mono-data text-xs font-bold cursor-pointer"
                    >
                      REJECT
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
