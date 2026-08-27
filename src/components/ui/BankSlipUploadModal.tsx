import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface BankSlipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseSlug?: string;
  initialCourse?: string;
  initialAmount?: number;
  onSuccess?: () => void;
}

export const BankSlipUploadModal: React.FC<BankSlipUploadModalProps> = ({
  isOpen,
  onClose,
  defaultCourseSlug = 'bmb',
  initialCourse,
  initialAmount,
  onSuccess,
}) => {
  const [courseSlug, setCourseSlug] = useState(initialCourse || defaultCourseSlug);
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [bankReference, setBankReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  if (!isOpen) return null;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponMsg(null);

    try {
      const currentPrice = amount ? parseFloat(amount) : 15000;
      const res = await api.validateCoupon(couponCode.trim(), courseSlug, currentPrice);

      if (res.success && res.data) {
        setCouponDiscount(res.data.discountAmount);
        setAmount(String(res.data.finalPrice));
        setCouponMsg(`✓ Coupon Applied: Saved Rs. ${res.data.discountAmount.toLocaleString()}`);
      } else {
        setCouponDiscount(null);
        setCouponMsg(`⚠️ ${res.message || 'Invalid coupon code.'}`);
      }
    } catch (err: any) {
      setCouponDiscount(null);
      setCouponMsg('⚠️ Failed to validate coupon.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 3MB Client-side limit (base64 encoding adds ~33%, so 3MB file → ~4MB payload, safely within Vercel's 4.5MB limit)
    const MAX_FILE_BYTES = 3 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(`Receipt file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 3MB. Try taking a screenshot or compressing the image.`);
      e.target.value = '';
      return;
    }

    // Supported MIME types check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setErrorMessage('Unsupported file format. Please upload a JPG, PNG, WebP image, or PDF receipt.');
      e.target.value = '';
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSlipUrl(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try selecting a different file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentPhone.trim() || !slipUrl.trim()) {
      setErrorMessage('Please fill in your Name, WhatsApp Phone, and provide a bank slip receipt.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.createPaymentSlip({
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim(),
        studentEmail: studentEmail ? studentEmail.trim() : undefined,
        courseSlug,
        slipUrl,
        amount: amount ? parseFloat(amount) : undefined,
        bankReference: bankReference ? bankReference.trim() : undefined,
        notes: notes ? notes.trim() : undefined,
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit payment slip. Please send directly via WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full text-left shadow-[0_0_60px_rgba(255,184,0,0.2)] space-y-4 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/40 font-bold uppercase">
                  DIRECT BANK TRANSFER
                </span>
                <h3 className="font-headline-md text-lg text-on-surface font-black mt-0.5">Upload Payment Slip</h3>
              </div>
            </div>
            <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {submitted ? (
            <div className="p-8 text-center space-y-3 font-mono-data">
              <div className="w-14 h-14 rounded-full bg-[#2ED573]/20 border-2 border-[#2ED573] text-[#2ED573] mx-auto flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(46,213,115,0.4)]">
                ✓
              </div>
              <h4 className="font-headline-md text-xl text-on-surface font-bold">Slip Uploaded Successfully!</h4>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Our finance officers will verify your transfer and activate your <strong className="text-secondary uppercase">{courseSlug}</strong> Operative Access shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 font-mono-data text-xs">
              {/* Bank Account Details Banner */}
              <div className="p-3 rounded-xl bg-[#131929] border border-secondary/30 space-y-1 text-on-surface-variant text-[11px]">
                <span className="text-secondary font-bold uppercase block">Official Empire Bank Account:</span>
                <div className="flex justify-between text-on-surface font-bold">
                  <span>Commercial Bank / Sampath Bank</span>
                  <span>Acc: 1000 8472 9182</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Name:</span>
                  <span className="text-secondary">UNITY WARRIORS EMPIRE (PVT) LTD</span>
                </div>
              </div>

              <div>
                <label className="text-secondary font-bold block mb-1">Select Program Division *</label>
                <select
                  value={courseSlug}
                  onChange={(e) => setCourseSlug(e.target.value)}
                  className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                >
                  <option value="bmb">Blind Mind Breaker (BMB) — RS. 12,500</option>
                  <option value="leadership">UWE Leadership Academy — RS. 100,000</option>
                  <option value="ignit">UWE IGNIT Accelerator — RS. 45,000</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-secondary font-bold block mb-1">Student / Operative Name *</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Kasun Fernando"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">WhatsApp Phone *</label>
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="077 123 4567"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface font-bold"
                  />
                </div>
              </div>

              {/* Coupon / Promo Code Input */}
              <div className="p-3 rounded-xl bg-[#101626] border border-outline-variant/30 space-y-2">
                <label className="text-secondary font-bold block text-[11px] uppercase">
                  Have a Promo / Coupon Code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EMPIRE20"
                    className="input-field flex-1 p-2 rounded-lg bg-[#131929] border-secondary/40 text-secondary uppercase font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="px-3 py-2 rounded-lg bg-secondary/20 border border-secondary text-secondary font-bold text-xs hover:bg-secondary hover:text-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    {validatingCoupon ? '...' : 'APPLY'}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`text-[10px] ${couponDiscount ? 'text-[#00FF66]' : 'text-red-400'}`}>
                    {couponMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-on-surface-variant block mb-1">
                    Transfer Amount (RS.) {couponDiscount ? <span className="text-[#00FF66]">(Discounted)</span> : ''}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="12500"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Bank Reference / Txn No</label>
                  <input
                    type="text"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="Ref # / Slip No"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-on-surface-variant block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Special Note / Remarks</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid via online banking"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                  />
                </div>
              </div>

              {/* File Upload or Image URL */}
              <div>
                <label className="text-secondary font-bold block mb-1">Attach Bank Transfer Receipt / Slip *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-secondary/20 file:text-secondary hover:file:bg-secondary/30 cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant block mt-1">Or paste direct image URL below:</span>
                <input
                  type="text"
                  value={slipUrl.startsWith('data:') ? 'Slip Image Captured from File' : slipUrl}
                  onChange={(e) => setSlipUrl(e.target.value)}
                  placeholder="https://..."
                  className="input-field w-full p-2 rounded-lg bg-[#131929] border-secondary/30 text-on-surface text-xs mt-1"
                />
              </div>

              {errorMessage && (
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center">
                  {errorMessage}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-elite px-6 py-2.5 rounded-xl font-label-caps font-black uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                >
                  {submitting ? 'TRANSMITTING...' : 'SUBMIT PAYMENT SLIP'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
