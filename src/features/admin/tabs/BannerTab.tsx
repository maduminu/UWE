import React from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';

interface AnnouncementState {
  id: string;
  enabled: boolean;
  text: string;
  type: string;
  dirty: boolean;
}

interface BannerTabProps {
  announcement: AnnouncementState;
  setAnnouncement: React.Dispatch<React.SetStateAction<AnnouncementState>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const BannerTab: React.FC<BannerTabProps> = ({
  announcement,
  setAnnouncement,
  saving,
  setSaving,
  addToast,
}) => {
  const saveBanner = async () => {
    setSaving(true);
    try {
      const bannerType = ['URGENT', 'PROMO', 'INFO'].includes(announcement.type)
        ? announcement.type
        : 'URGENT';

      if (announcement.id) {
        await api.updateBanner(announcement.id, {
          message: announcement.text,
          isActive: announcement.enabled,
          bannerType,
        });
      } else {
        const res = await api.createBanner({
          message: announcement.text,
          isActive: announcement.enabled,
          bannerType,
        });
        if (res.data) setAnnouncement((prev) => ({ ...prev, id: res.data.id }));
      }
      setAnnouncement((prev) => ({ ...prev, dirty: false, type: bannerType }));
      addToast('✅ Banner alert updated');
    } catch {
      addToast('❌ Failed to update banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="banner"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 space-y-6"
    >
      <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold">Live Ticker Announcement</h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Edit the ticker message & toggle visibility. Click SAVE to push to Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnnouncement((prev) => ({ ...prev, enabled: !prev.enabled, dirty: true }))}
            className={`px-4 py-2 rounded font-label-caps text-xs uppercase font-bold transition-all cursor-pointer ${
              announcement.enabled
                ? 'bg-[#2ED573] text-black shadow-[0_0_15px_rgba(46,213,115,0.4)]'
                : 'bg-[#131929] text-on-surface-variant border border-outline-variant/40'
            }`}
          >
            {announcement.enabled ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>
      </div>

      <div>
        <label className="font-mono-data text-xs text-secondary font-bold block mb-2">
          Announcement Text
        </label>
        <textarea
          rows={3}
          value={announcement.text}
          onChange={(e) => setAnnouncement((prev) => ({ ...prev, text: e.target.value, dirty: true }))}
          className="input-field w-full p-3 rounded-lg text-sm font-mono-data text-on-surface focus:border-secondary bg-[#131929]"
        />
      </div>

      {/* Live Preview */}
      <div>
        <span className="font-mono-data text-xs text-on-surface-variant block mb-2">Visitor Preview:</span>
        <div className="p-3 rounded-lg bg-gradient-to-r from-secondary-container/30 via-secondary/20 to-secondary-container/30 border border-secondary/50 text-center font-mono-data text-xs text-secondary font-bold text-glow-gold">
          {announcement.enabled ? announcement.text : '(Banner hidden)'}
        </div>
      </div>

      {/* Save Banner Button */}
      <button
        onClick={saveBanner}
        disabled={!announcement.dirty || saving}
        className={`w-full py-3 rounded-xl font-label-caps text-sm uppercase font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
          announcement.dirty
            ? 'bg-secondary text-black shadow-[0_0_25px_rgba(255,184,0,0.5)] hover:scale-[1.02]'
            : 'bg-[#131929] text-on-surface-variant border border-outline-variant/30 cursor-not-allowed'
        }`}
      >
        <span className="material-symbols-outlined text-base">{saving ? 'sync' : 'cloud_upload'}</span>
        <span>
          {saving
            ? 'SAVING TO SUPABASE...'
            : announcement.dirty
            ? 'SAVE BANNER TO DATABASE'
            : 'NO UNSAVED CHANGES'}
        </span>
      </button>
    </motion.div>
  );
};
