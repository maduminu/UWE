import React from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';

interface ReviewsTabProps {
  adminReviews: any[];
  setAdminReviews: React.Dispatch<React.SetStateAction<any[]>>;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
  adminReviews,
  setAdminReviews,
  addToast,
}) => {
  const handleToggleReview = async (reviewId: string, currentApproved: boolean) => {
    try {
      await api.toggleReviewApproval(reviewId, !currentApproved);
      setAdminReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, isApproved: !currentApproved } : r))
      );
      addToast(`Review visibility updated`);
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await api.deleteReview(reviewId);
      setAdminReviews((prev) => prev.filter((r) => r.id !== reviewId));
      addToast('Review deleted');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="reviews"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 flex-wrap gap-4">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold">Student Reviews &amp; Social Proof</h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Moderate student ratings, approve reviews, and publish to course pages.
          </p>
        </div>
        <button
          onClick={() => exportToCSV('uwe_reviews', adminReviews, addToast)}
          className="px-3.5 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 text-xs font-mono-data text-on-surface font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          <span>EXPORT CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminReviews.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-on-surface-variant font-mono-data text-sm bg-[#0E131F] rounded-2xl border border-outline-variant/30">
            No submitted reviews yet. Reviews submitted from the student portal will appear here.
          </div>
        ) : (
          adminReviews.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-[#0E131F] border border-outline-variant/30 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-base font-bold text-on-surface">{r.studentName}</h4>
                    <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-mono-data text-[10px] font-bold uppercase">
                      {r.courseSlug?.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-mono-data text-[11px] text-on-surface-variant">
                    {r.studentRole || 'Verified Operative'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#FFB800] font-mono-data text-sm">{'★'.repeat(r.rating)}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold uppercase ${
                      r.isApproved ? 'bg-[#00FF66]/15 text-[#00FF66]' : 'bg-[#FFB800]/15 text-[#FFB800]'
                    }`}
                  >
                    {r.isApproved ? 'LIVE' : 'PENDING'}
                  </span>
                </div>
              </div>

              <p className="font-body-md text-xs text-on-surface leading-relaxed italic bg-[#111624] p-3 rounded-xl border border-outline-variant/20">
                "{r.comment}"
              </p>

              <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20 text-xs font-mono-data">
                <span className="text-on-surface-variant">{new Date(r.createdAt).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleReview(r.id, r.isApproved)}
                    className={`px-3 py-1 rounded font-bold cursor-pointer ${
                      r.isApproved ? 'bg-red-500/15 text-red-400' : 'bg-[#00FF66]/15 text-[#00FF66]'
                    }`}
                  >
                    {r.isApproved ? 'Hide from Site' : 'Approve & Publish'}
                  </button>
                  <button
                    onClick={() => handleDeleteReview(r.id)}
                    className="p-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
