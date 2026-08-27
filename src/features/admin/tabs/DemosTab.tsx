import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { ImageUploadInput } from '../../../components/ui/ImageUploadInput';
import { sanitizeExternalUrl } from '../../../utils/urlSecurity';

interface DemosTabProps {
  demos: any[];
  setDemos: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const DemosTab: React.FC<DemosTabProps> = ({
  demos,
  setDemos,
  saving,
  setSaving,
  addToast,
}) => {
  const [addDemoModalOpen, setAddDemoModalOpen] = useState(false);
  const [editDemoModalOpen, setEditDemoModalOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState<any | null>(null);

  const [newDemo, setNewDemo] = useState({
    title: '',
    subtitle: '',
    duration: '02:30',
    posterUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
    badge: 'BMB MIND DIVISION',
    category: 'BMB',
    description: '',
    isFeatured: false,
  });

  const handleCreateDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemo.title || !newDemo.videoUrl) {
      addToast('Title and Video URL are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createDemo(newDemo);
      if (res.data) {
        setDemos((prev) => [...prev, res.data]);
        addToast(`🎉 Demo video "${res.data.title}" published with custom thumbnail!`);
        setAddDemoModalOpen(false);
        setNewDemo({
          title: '',
          subtitle: '',
          duration: '02:30',
          posterUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
          videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
          badge: 'BMB MIND DIVISION',
          category: 'BMB',
          description: '',
          isFeatured: false,
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (demo: any) => {
    setEditingDemo({
      ...demo,
      posterUrl: demo.posterUrl || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
    });
    setEditDemoModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDemo?.id || !editingDemo.title || !editingDemo.videoUrl) {
      addToast('Title and Video URL are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateDemo(editingDemo.id, {
        title: editingDemo.title,
        subtitle: editingDemo.subtitle,
        duration: editingDemo.duration,
        posterUrl: editingDemo.posterUrl,
        videoUrl: editingDemo.videoUrl,
        badge: editingDemo.badge,
        category: editingDemo.category,
        description: editingDemo.description,
      });

      if (res.data) {
        setDemos((prev) => prev.map((d) => (d.id === editingDemo.id ? res.data : d)));
        addToast(`✅ Thumbnail uploaded & saved to database for "${res.data.title}"!`);
        setEditDemoModalOpen(false);
        setEditingDemo(null);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDemo = async (demoId: string) => {
    if (!window.confirm('Are you sure you want to delete this demo video?')) return;
    try {
      await api.deleteDemo(demoId);
      setDemos((prev) => prev.filter((d) => d.id !== demoId));
      addToast('🗑️ Demo video deleted');
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="demos"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">play_circle</span>
            Public Demo Video Reels &amp; Thumbnail Uploader
          </h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Upload custom image thumbnails or stream links stored directly in Supabase PostgreSQL
          </p>
        </div>
        <button
          onClick={() => setAddDemoModalOpen(true)}
          className="btn-elite px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          <span>+ ADD DEMO REEL</span>
        </button>
      </div>

      {demos.length === 0 && (
        <div className="bg-[#0E131F] p-8 rounded-2xl border border-outline-variant/30 text-center font-mono-data text-sm text-on-surface-variant">
          No demo videos found in database. Click <strong>+ ADD DEMO REEL</strong> to publish one.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demos.map((d) => (
          <div
            key={d.id}
            className="bg-[#0E131F] rounded-2xl border border-outline-variant/30 overflow-hidden flex flex-col justify-between group hover:border-secondary/50 transition-all shadow-xl"
          >
            {/* Thumbnail Poster with Live Fallback */}
            <div className="relative aspect-video bg-black overflow-hidden group/img">
              <img
                src={
                  d.posterUrl ||
                  'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80'
                }
                alt={d.title}
                onError={(e) => {
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E131F] via-transparent to-transparent opacity-80" />

              <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                <span className="font-mono-data text-[10px] px-2.5 py-0.5 rounded bg-black/80 text-secondary font-bold border border-secondary/40">
                  {d.badge || d.category}
                </span>
                <span className="font-mono-data text-[10px] px-2 py-0.5 rounded bg-black/80 text-white font-bold">
                  {d.duration}
                </span>
              </div>

              {/* Quick Change Thumbnail Button Overlay */}
              <button
                onClick={() => handleOpenEdit(d)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-mono-data text-xs font-bold cursor-pointer backdrop-blur-xs"
              >
                <span className="material-symbols-outlined text-base text-secondary">cloud_upload</span>
                <span>Upload New Thumbnail</span>
              </button>
            </div>

            <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
              <div>
                <span className="font-mono-data text-[10px] text-secondary font-bold uppercase">
                  {d.category} DIVISION
                </span>
                <h4 className="font-headline-md text-base text-on-surface font-bold group-hover:text-secondary transition-colors mt-0.5">
                  {d.title}
                </h4>
                <p className="font-mono-data text-xs text-on-surface-variant line-clamp-1">{d.subtitle}</p>
                <p className="font-body-md text-xs text-on-surface-variant mt-1 line-clamp-2">{d.description}</p>
              </div>

              <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <a
                    href={sanitizeExternalUrl(d.videoUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary hover:bg-secondary hover:text-black transition-colors text-xs font-mono-data font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                    <span>STREAM</span>
                  </a>
                  <button
                    onClick={() => handleOpenEdit(d)}
                    className="px-3 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-on-surface text-xs font-mono-data flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs text-secondary">upload_file</span>
                    <span>UPLOAD THUMBNAIL</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteDemo(d.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                  title="Delete Demo"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ EDIT DEMO REEL & THUMBNAIL MODAL ━━━ */}
      <AnimatePresence>
        {editDemoModalOpen && editingDemo && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D111A] border border-secondary/50 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">cloud_upload</span>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                    UPLOAD THUMBNAIL <span className="text-secondary">&amp; EDIT REEL</span>
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setEditDemoModalOpen(false);
                    setEditingDemo(null);
                  }}
                  className="text-on-surface-variant hover:text-on-surface p-1"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs font-mono-data">
                {/* Reusable Drag & Drop Image Uploader */}
                <ImageUploadInput
                  label="Thumbnail / Cover Image (Drag & Drop or Choose File)"
                  value={editingDemo.posterUrl || ''}
                  onChange={(url) => setEditingDemo({ ...editingDemo, posterUrl: url })}
                />

                <div>
                  <label className="text-secondary font-bold block mb-1">Demo Title *</label>
                  <input
                    type="text"
                    required
                    value={editingDemo.title}
                    onChange={(e) => setEditingDemo({ ...editingDemo, title: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={editingDemo.subtitle || ''}
                      onChange={(e) => setEditingDemo({ ...editingDemo, subtitle: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40"
                    />
                  </div>
                  <div>
                    <label className="text-secondary font-bold block mb-1">Category *</label>
                    <select
                      value={editingDemo.category}
                      onChange={(e) => setEditingDemo({ ...editingDemo, category: e.target.value as any })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 text-on-surface"
                    >
                      <option value="BMB">BMB Mind Division</option>
                      <option value="LEADERSHIP">Leadership Command</option>
                      <option value="IGNIT">IGNIT Accelerator</option>
                      <option value="TESTIMONIAL">Alumni Testimonial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={editingDemo.badge || ''}
                      onChange={(e) => setEditingDemo({ ...editingDemo, badge: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Duration (MM:SS)</label>
                    <input
                      type="text"
                      value={editingDemo.duration || ''}
                      onChange={(e) => setEditingDemo({ ...editingDemo, duration: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 text-secondary font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-secondary font-bold block mb-1">Video Stream URL *</label>
                  <input
                    type="text"
                    required
                    value={editingDemo.videoUrl}
                    onChange={(e) => setEditingDemo({ ...editingDemo, videoUrl: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 text-secondary"
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editingDemo.description || ''}
                    onChange={(e) => setEditingDemo({ ...editingDemo, description: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 resize-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => {
                      setEditDemoModalOpen(false);
                      setEditingDemo(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:bg-surface-variant cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'UPLOADING TO DB...' : 'SAVE & PERSIST TO DB'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ ADD NEW DEMO REEL MODAL ━━━ */}
      <AnimatePresence>
        {addDemoModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                  PUBLISH DEMO <span className="text-secondary">VIDEO REEL</span>
                </h3>
                <button
                  onClick={() => setAddDemoModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateDemo} className="space-y-3.5 text-xs font-mono-data">
                {/* Reusable Drag & Drop Image Uploader */}
                <ImageUploadInput
                  label="Thumbnail / Cover Image (Drag & Drop or Choose File)"
                  value={newDemo.posterUrl}
                  onChange={(url) => setNewDemo({ ...newDemo, posterUrl: url })}
                />

                <div>
                  <label className="text-secondary font-bold block mb-1">Demo Title *</label>
                  <input
                    type="text"
                    required
                    value={newDemo.title}
                    onChange={(e) => setNewDemo({ ...newDemo, title: e.target.value })}
                    placeholder="e.g. BMB Subconscious Paradigm Shift"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={newDemo.subtitle}
                      onChange={(e) => setNewDemo({ ...newDemo, subtitle: e.target.value })}
                      placeholder="Mind Optimization Protocol"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-secondary font-bold block mb-1">Category *</label>
                    <select
                      value={newDemo.category}
                      onChange={(e) => setNewDemo({ ...newDemo, category: e.target.value as any })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    >
                      <option value="BMB">BMB Mind Division</option>
                      <option value="LEADERSHIP">Leadership Command</option>
                      <option value="IGNIT">IGNIT Accelerator</option>
                      <option value="TESTIMONIAL">Alumni Testimonial</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={newDemo.badge}
                      onChange={(e) => setNewDemo({ ...newDemo, badge: e.target.value })}
                      placeholder="BMB MIND DIVISION"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Duration (MM:SS)</label>
                    <input
                      type="text"
                      value={newDemo.duration}
                      onChange={(e) => setNewDemo({ ...newDemo, duration: e.target.value })}
                      placeholder="01:45"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Video Stream URL (YouTube or MP4) *</label>
                  <input
                    type="text"
                    required
                    value={newDemo.videoUrl}
                    onChange={(e) => setNewDemo({ ...newDemo, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=JQypYNVzS3Q"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newDemo.description}
                    onChange={(e) => setNewDemo({ ...newDemo, description: e.target.value })}
                    placeholder="Short description of what the video demonstrates..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddDemoModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase cursor-pointer">
                    {saving ? 'SAVING...' : 'PUBLISH DEMO REEL'}
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
