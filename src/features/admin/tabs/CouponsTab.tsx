import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';

interface CouponsTabProps {
  coupons: any[];
  setCoupons: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CouponsTab: React.FC<CouponsTabProps> = ({
  coupons,
  setCoupons,
  saving,
  setSaving,
  addToast,
}) => {
  const [addCouponModalOpen, setAddCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercent: '20',
    discountAmount: '',
    courseSlug: '',
    maxUses: '100',
    description: '',
  });

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      addToast('Coupon code is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createCoupon({
        code: newCoupon.code.trim().toUpperCase(),
        discountPercent: newCoupon.discountPercent ? parseFloat(newCoupon.discountPercent) : null,
        discountAmount: newCoupon.discountAmount ? parseFloat(newCoupon.discountAmount) : null,
        courseSlug: newCoupon.courseSlug ? newCoupon.courseSlug.trim().toLowerCase() : null,
        maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses, 10) : 100,
        description: newCoupon.description.trim() || null,
      });

      if (res.data) {
        setCoupons((prev) => [res.data, ...prev]);
        addToast(`🎉 Coupon ${res.data.code} created!`);
        setAddCouponModalOpen(false);
        setNewCoupon({
          code: '',
          discountPercent: '20',
          discountAmount: '',
          courseSlug: '',
          maxUses: '100',
          description: '',
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, currentStatus: boolean) => {
    try {
      await api.updateCoupon(couponId, { isActive: !currentStatus });
      setCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, isActive: !currentStatus } : c))
      );
      addToast(`Coupon status updated`);
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Delete this coupon code permanently?')) return;
    try {
      await api.deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      addToast('Coupon code deleted');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="coupons"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 flex-wrap gap-4">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold">Discount Coupons &amp; Promos</h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Create and manage coupon promo codes for instant tuition discounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV('uwe_coupons', coupons, addToast)}
            className="px-3.5 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 text-xs font-mono-data text-on-surface font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={() => setAddCouponModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-secondary text-black font-mono-data text-xs font-black uppercase hover:bg-secondary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>CREATE COUPON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coupons.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-on-surface-variant font-mono-data text-sm bg-[#0E131F] rounded-2xl border border-outline-variant/30">
            No active coupon codes created yet. Click "CREATE COUPON" above.
          </div>
        ) : (
          coupons.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-[#0E131F] border border-outline-variant/30 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-lg bg-secondary/20 border border-secondary/50 font-mono-data text-sm font-black text-secondary tracking-wider">
                    {c.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold uppercase ${
                      c.isActive ? 'bg-[#00FF66]/15 text-[#00FF66]' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {c.isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <p className="font-display text-xl font-bold text-on-surface mt-3">
                  {c.discountPercent
                    ? `${c.discountPercent}% OFF`
                    : `RS. ${c.discountAmount?.toLocaleString()} OFF`}
                </p>
                <p className="font-mono-data text-xs text-on-surface-variant mt-0.5">
                  {c.courseSlug ? `Valid for: ${c.courseSlug.toUpperCase()}` : 'Valid across ALL courses'}
                </p>
                {c.description && (
                  <p className="font-mono-data text-xs text-on-surface-variant italic mt-2">{c.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs font-mono-data">
                <span className="text-on-surface-variant">
                  Used:{' '}
                  <strong className="text-on-surface">
                    {c.usedCount} / {c.maxUses}
                  </strong>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleCoupon(c.id, c.isActive)}
                    className="px-2.5 py-1 rounded bg-[#131929] border border-outline-variant/40 text-on-surface hover:text-secondary cursor-pointer"
                  >
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(c.id)}
                    className="px-2 py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ━━━ CREATE NEW COUPON MODAL ━━━ */}
      <AnimatePresence>
        {addCouponModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">local_offer</span>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                    CREATE <span className="text-secondary">PROMO COUPON</span>
                  </h3>
                </div>
                <button
                  onClick={() => setAddCouponModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Coupon Code (Uppercase) *</label>
                  <input
                    type="text"
                    required
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. EMPIRE25"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold tracking-wider"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newCoupon.discountPercent}
                      onChange={(e) =>
                        setNewCoupon({ ...newCoupon, discountPercent: e.target.value, discountAmount: '' })
                      }
                      placeholder="20"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">OR Flat Discount (RS.)</label>
                    <input
                      type="number"
                      value={newCoupon.discountAmount}
                      onChange={(e) =>
                        setNewCoupon({ ...newCoupon, discountAmount: e.target.value, discountPercent: '' })
                      }
                      placeholder="2500"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Applicable Course</label>
                    <select
                      value={newCoupon.courseSlug}
                      onChange={(e) => setNewCoupon({ ...newCoupon, courseSlug: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    >
                      <option value="">ALL COURSES</option>
                      <option value="bmb">BMB Only</option>
                      <option value="leadership">Leadership Only</option>
                      <option value="ignit">IGNIT Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Max Usages</label>
                    <input
                      type="number"
                      min={1}
                      value={newCoupon.maxUses}
                      onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                      placeholder="100"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Promo Description</label>
                  <input
                    type="text"
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    placeholder="e.g. Flash sale 20% discount for August cohort"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddCouponModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">
                    {saving ? 'SAVING...' : 'SAVE COUPON'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
