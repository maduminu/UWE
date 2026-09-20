import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [activePreviewSlip, setActivePreviewSlip] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

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
      if (activePreviewSlip?.id === slip.id) {
        setActivePreviewSlip({ ...activePreviewSlip, status: 'VERIFIED' });
      }
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
      if (activePreviewSlip?.id === slipId) {
        setActivePreviewSlip({ ...activePreviewSlip, status: 'REJECTED' });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleDeleteSlip = async (slipId: string, studentName: string) => {
    if (!window.confirm(`Permanently delete payment slip for "${studentName}"?`)) return;
    try {
      await api.deleteSlip(slipId);
      setPaymentSlips((prev) => prev.filter((s) => s.id !== slipId));
      addToast(`🗑️ Payment slip for "${studentName}" deleted.`);
      if (activePreviewSlip?.id === slipId) {
        setActivePreviewSlip(null);
      }
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  const openReceiptViewer = (slip: any) => {
    setZoomLevel(1);
    setRotation(0);
    setActivePreviewSlip(slip);
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
            <h3 className="font-headline-md text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">receipt_long</span>
              Bank Transfer Slips (Verification Desk)
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant mt-0.5">
              Review and authenticate student bank payments, match reference codes, and approve batch enrollments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-xs px-3 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-bold">
              {paymentSlips.length} Total Submissions
            </span>
            <button
              onClick={() =>
                exportToCSV(
                  'uwe_bank_slips',
                  displayedSlips.map((s) => ({
                    ID: s.id,
                    Student: s.studentName,
                    Phone: s.studentPhone,
                    Email: s.studentEmail || '',
                    Course: s.courseSlug,
                    Amount: s.amount || '',
                    Reference: s.bankReference || '',
                    Status: s.status,
                    SubmittedAt: s.createdAt,
                    AdminNotes: s.adminNotes || '',
                  })),
                  addToast
                )
              }
              className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/50 text-on-surface hover:border-secondary transition-all font-mono-data text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-secondary">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-[#0A0E1A] border-b border-outline-variant/20 flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search by student name, phone, email, or bank reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/30 text-on-surface placeholder-on-surface-variant/50 text-xs font-mono-data focus:border-secondary focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#131929] p-1 rounded-xl border border-outline-variant/30">
            {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-mono-data text-[11px] font-bold transition-all cursor-pointer ${
                  selectedStatus === st
                    ? st === 'VERIFIED'
                      ? 'bg-[#2ED573] text-black shadow-sm'
                      : st === 'REJECTED'
                      ? 'bg-red-500 text-white shadow-sm'
                      : st === 'PENDING'
                      ? 'bg-yellow-400 text-black shadow-sm'
                      : 'bg-secondary text-primary font-black shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-1 bg-[#131929] p-1 rounded-xl border border-outline-variant/30">
            {['ALL', 'bmb', 'leadership', 'ignit'].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCourse(c)}
                className={`px-3 py-1.5 rounded-lg font-mono-data text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  selectedCourse === c
                    ? 'bg-secondary text-primary font-black shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {c}
              </button>
            ))}
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

          {displayedSlips.map((slip) => {
            const rawUrl = slip.imageUrl || slip.slipUrl || '';
            const isPdf = rawUrl.toLowerCase().includes('.pdf');

            return (
              <div
                key={slip.id}
                className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-[#131929]/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Slip Image Thumbnail / Viewer Trigger */}
                  <button
                    type="button"
                    onClick={() => openReceiptViewer(slip)}
                    className="w-16 h-16 rounded-xl bg-black border border-secondary/40 overflow-hidden shrink-0 group relative cursor-pointer flex items-center justify-center text-left"
                    title="Click to Inspect Receipt Fullscreen"
                  >
                    {isPdf ? (
                      <div className="w-full h-full bg-red-950/40 flex flex-col items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                        <span className="text-[9px] font-mono-data font-bold uppercase mt-0.5">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={sanitizeImageUrl(rawUrl)}
                        alt="Bank Slip"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        onError={(e) => {
                          // Fallback to placeholder icon if image fails
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `
                              <div class="w-full h-full flex flex-col items-center justify-center text-secondary/70">
                                <span class="material-symbols-outlined text-2xl">receipt_long</span>
                                <span class="text-[9px] font-mono-data font-bold uppercase mt-0.5">SLIP</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm text-secondary">zoom_in</span>
                    </div>
                  </button>

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
                      {slip.studentEmail && (
                        <span>
                          Email: <strong className="text-on-surface">{slip.studentEmail}</strong>
                        </span>
                      )}
                      {slip.amount && (
                        <span>
                          Amount: <strong className="text-[#2ED573]">RS. {Number(slip.amount).toLocaleString()}</strong>
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

                    {slip.adminNotes && (
                      <p className="font-mono-data text-xs text-secondary/90 bg-secondary/10 px-2 py-0.5 rounded inline-block mt-1 border border-secondary/20">
                        Admin Review: {slip.adminNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() => openReceiptViewer(slip)}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-secondary/40 text-secondary hover:bg-secondary/10 transition-colors font-mono-data text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span> VIEW SLIP
                  </button>

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

                  <button
                    onClick={() => handleDeleteSlip(slip.id, slip.studentName)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    title="Delete Slip Record"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HIGH-RESOLUTION RECEIPT LIGHTBOX MODAL ─────────────────────────── */}
      <AnimatePresence>
        {activePreviewSlip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActivePreviewSlip(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E131F] border border-secondary/40 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 bg-[#131929] border-b border-outline-variant/30 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-2xl">receipt_long</span>
                  <div>
                    <h3 className="font-headline-md text-base text-on-surface font-bold">
                      {activePreviewSlip.studentName} — Payment Slip
                    </h3>
                    <p className="font-mono-data text-xs text-on-surface-variant">
                      {activePreviewSlip.courseSlug?.toUpperCase()} Division • Ref: {activePreviewSlip.bankReference || 'N/A'} • Status: {activePreviewSlip.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                    className="p-2 rounded-lg bg-surface border border-outline-variant/40 text-on-surface hover:text-secondary text-xs"
                    title="Zoom In"
                  >
                    <span className="material-symbols-outlined text-sm">zoom_in</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                    className="p-2 rounded-lg bg-surface border border-outline-variant/40 text-on-surface hover:text-secondary text-xs"
                    title="Zoom Out"
                  >
                    <span className="material-symbols-outlined text-sm">zoom_out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-2 rounded-lg bg-surface border border-outline-variant/40 text-on-surface hover:text-secondary text-xs"
                    title="Rotate 90°"
                  >
                    <span className="material-symbols-outlined text-sm">rotate_right</span>
                  </button>
                  <a
                    href={sanitizeExternalUrl(activePreviewSlip.imageUrl || activePreviewSlip.slipUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-surface border border-outline-variant/40 text-on-surface hover:text-secondary text-xs flex items-center"
                    title="Open Fullscreen in New Tab"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setActivePreviewSlip(null)}
                    className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>

              {/* Body / Image Preview */}
              <div className="flex-1 overflow-auto bg-black/80 p-6 flex items-center justify-center min-h-[350px] max-h-[60vh] select-none">
                {activePreviewSlip.slipUrl?.toLowerCase().includes('.pdf') || activePreviewSlip.imageUrl?.toLowerCase().includes('.pdf') ? (
                  <div className="text-center p-8 space-y-4">
                    <span className="material-symbols-outlined text-6xl text-red-400">picture_as_pdf</span>
                    <h4 className="font-headline-md text-lg text-on-surface">PDF Document Receipt</h4>
                    <p className="font-mono-data text-xs text-on-surface-variant max-w-md">
                      This bank receipt was submitted as an authentic PDF document.
                    </p>
                    <a
                      href={sanitizeExternalUrl(activePreviewSlip.imageUrl || activePreviewSlip.slipUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-elite px-5 py-2.5 rounded-xl font-mono-data text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      VIEW / DOWNLOAD PDF RECEIPT
                    </a>
                  </div>
                ) : (
                  <img
                    src={sanitizeImageUrl(activePreviewSlip.imageUrl || activePreviewSlip.slipUrl)}
                    alt="Receipt Full Preview"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>

              {/* Footer Details & Verification Actions */}
              <div className="p-4 bg-[#131929] border-t border-outline-variant/30 flex items-center justify-between flex-wrap gap-3">
                <div className="font-mono-data text-xs text-on-surface-variant flex items-center gap-4 flex-wrap">
                  <span>Student: <strong className="text-on-surface">{activePreviewSlip.studentName}</strong></span>
                  <span>WhatsApp: <strong className="text-on-surface">{activePreviewSlip.studentPhone}</strong></span>
                  {activePreviewSlip.amount && (
                    <span>Amount: <strong className="text-[#2ED573]">RS. {Number(activePreviewSlip.amount).toLocaleString()}</strong></span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activePreviewSlip.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleVerifySlip(activePreviewSlip)}
                        className="btn-elite px-4 py-2 rounded-lg font-mono-data text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">check_circle</span> APPROVE &amp; ENROLL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSlip(activePreviewSlip.id)}
                        className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 font-mono-data text-xs font-bold cursor-pointer"
                      >
                        REJECT
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setActivePreviewSlip(null)}
                    className="px-4 py-2 rounded-lg bg-surface border border-outline-variant/40 text-on-surface hover:text-secondary font-mono-data text-xs font-bold"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
