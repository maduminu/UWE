import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { safeGetStorage, safeSetStorage } from '../../utils/storage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  enrolledCourseSlugs?: string | string[];
}

interface UserProfileModalProps {
  isOpen: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onLogout: () => void;
  onNavigateToVideos?: () => void;
  onNavigateToDashboard?: () => void;
  onUserUpdate?: (updatedUser: AuthUser) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onLogout,
  onNavigateToVideos,
  onNavigateToDashboard,
  onUserUpdate,
}) => {
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const enrolledSlugsStr = Array.isArray(user.enrolledCourseSlugs)
    ? user.enrolledCourseSlugs.join(',')
    : user.enrolledCourseSlugs || 'bmb,leadership,ignit';

  const hasBmb = enrolledSlugsStr.toLowerCase().includes('bmb');
  const hasLeadership = enrolledSlugsStr.toLowerCase().includes('leadership');
  const hasIgnit = enrolledSlugsStr.toLowerCase().includes('ignit');

  const handleStartEditPhone = () => {
    setPhoneValue(user.phone || '');
    setEditingPhone(true);
    setSaveMessage(null);
  };

  const handleSavePhone = async () => {
    if (!phoneValue.trim()) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.updateUser(user.id, { phone: phoneValue.trim() });
      // Update localStorage session with new phone safely
      const stored = safeGetStorage<any>('uwe_user_account', user);
      const updatedUser = { ...stored, phone: phoneValue.trim() };
      safeSetStorage('uwe_user_account', updatedUser);

      if (onUserUpdate) onUserUpdate(updatedUser);
      setEditingPhone(false);
      setSaveMessage('✅ Mobile number updated!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage(`❌ Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEditPhone = () => {
    setEditingPhone(false);
    setSaveMessage(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 sm:p-7 max-w-md w-full text-left shadow-[0_0_50px_rgba(255,184,0,0.2)] space-y-5 relative overflow-hidden"
        >
          {/* Subtle Ambient Gold Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary/20 border border-secondary text-secondary flex items-center justify-center text-xl font-bold font-mono-data shadow-[0_0_15px_rgba(255,184,0,0.4)]">
                ⚡
              </div>
              <div>
                <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/40 font-bold uppercase tracking-wider">
                  AUTHENTICATED OPERATIVE
                </span>
                <h3 className="font-headline-md text-lg text-on-surface font-black mt-0.5">{user.name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-variant/40 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Profile Details */}
          <div className="space-y-3 font-mono-data text-xs">
            <div className="bg-[#131929] p-3.5 rounded-xl border border-outline-variant/30 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Email Address:</span>
                <strong className="text-secondary">{user.email}</strong>
              </div>

              {/* Phone / WhatsApp — Editable */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-on-surface-variant shrink-0">Phone / WhatsApp:</span>
                {editingPhone ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      placeholder="077 123 4567"
                      autoFocus
                      className="w-[130px] px-2 py-1 rounded-lg bg-[#0D111A] border border-secondary/50 text-secondary text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary/60"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={saving}
                      className="px-2 py-1 rounded-lg bg-[#2ED573]/20 border border-[#2ED573]/40 text-[#2ED573] hover:bg-[#2ED573]/30 transition-colors cursor-pointer text-[10px] font-bold"
                    >
                      {saving ? '...' : 'SAVE'}
                    </button>
                    <button
                      onClick={handleCancelEditPhone}
                      className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <strong className="text-on-surface">{user.phone || 'Not set'}</strong>
                    <button
                      onClick={handleStartEditPhone}
                      className="p-0.5 rounded text-secondary/60 hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                      title="Edit phone number"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Save feedback message */}
              {saveMessage && (
                <div className={`text-[11px] font-bold text-center py-1 rounded ${saveMessage.startsWith('✅') ? 'text-[#2ED573]' : 'text-red-400'}`}>
                  {saveMessage}
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Access Status:</span>
                <strong className="text-[#2ED573] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2ED573] animate-pulse" /> ACTIVE MEMBER
                </strong>
              </div>
            </div>

            {/* Enrolled Divisions */}
            <div className="space-y-2">
              <span className="font-label-caps text-xs text-on-surface font-bold uppercase tracking-wider block">
                Enrolled Program Divisions
              </span>
              <div className="grid grid-cols-1 gap-2">
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasBmb ? 'bg-[#00D2FF]/10 border-[#00D2FF]/40 text-[#00D2FF]' : 'bg-[#131929] border-outline-variant/20 text-on-surface-variant opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">psychology</span>
                    <span className="font-bold">Blind Mind Breaker (BMB)</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{hasBmb ? 'ACTIVE ACCESS' : 'LOCKED'}</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasLeadership ? 'bg-[#FFB800]/10 border-[#FFB800]/40 text-[#FFB800]' : 'bg-[#131929] border-outline-variant/20 text-on-surface-variant opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">military_tech</span>
                    <span className="font-bold">UWE Leadership Academy</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{hasLeadership ? 'ACTIVE ACCESS' : 'LOCKED'}</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasIgnit ? 'bg-[#FF4757]/10 border-[#FF4757]/40 text-[#FF4757]' : 'bg-[#131929] border-outline-variant/20 text-on-surface-variant opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                    <span className="font-bold">UWE IGNIT Accelerator</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase">{hasIgnit ? 'ACTIVE ACCESS' : 'LOCKED'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            {onNavigateToDashboard && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToDashboard();
                }}
                className="btn-elite py-3 rounded-xl font-label-caps text-xs uppercase font-black tracking-wider cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">school</span>
                <span>OPEN MY STUDENT PORTAL &amp; CERTIFICATES</span>
              </button>
            )}

            {onNavigateToVideos && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToVideos();
                }}
                className="w-full py-2.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary font-mono-data text-xs font-bold uppercase hover:bg-secondary hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">play_circle</span>
                <span>ENTER GATED VIDEO VAULT</span>
              </button>
            )}

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 font-mono-data text-xs font-bold hover:bg-red-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>LOGOUT OPERATIVE SESSION</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
