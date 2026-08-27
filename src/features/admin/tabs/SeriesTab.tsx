import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { ImageUploadInput } from '../../../components/ui/ImageUploadInput';
import { sanitizeExternalUrl } from '../../../utils/urlSecurity';

interface SeriesTabProps {
  videoSeriesList: any[];
  setVideoSeriesList: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SeriesTab: React.FC<SeriesTabProps> = ({
  videoSeriesList,
  setVideoSeriesList,
  saving,
  setSaving,
  addToast,
}) => {
  const [addSeriesModalOpen, setAddSeriesModalOpen] = useState(false);
  const [editSeriesModalOpen, setEditSeriesModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<any | null>(null);

  const [addModuleModalOpen, setAddModuleModalOpen] = useState(false);
  const [targetSeriesId, setTargetSeriesId] = useState('');

  const [newSeries, setNewSeries] = useState({
    courseSlug: 'bmb',
    seriesTitle: '',
    category: 'Subconscious Mind Optimization',
    description: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
  });

  const [newModule, setNewModule] = useState({
    episodeNumber: 1,
    title: '',
    duration: '03:45',
    videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
    isFreePreview: true,
    description: '',
  });

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeries.seriesTitle) {
      addToast('Series Title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createVideoSeries(newSeries);
      if (res.data) {
        setVideoSeriesList((prev) => [...prev, res.data]);
        addToast(`🎉 Series "${res.data.seriesTitle}" created with custom cover!`);
        setAddSeriesModalOpen(false);
        setNewSeries({
          courseSlug: 'bmb',
          seriesTitle: '',
          category: 'Subconscious Mind Optimization',
          description: '',
          thumbnailUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditSeries = (series: any) => {
    setEditingSeries({
      ...series,
      thumbnailUrl: series.thumbnailUrl || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
    });
    setEditSeriesModalOpen(true);
  };

  const handleSaveEditSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeries?.id || !editingSeries.seriesTitle) {
      addToast('Series Title is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateVideoSeries(editingSeries.id, {
        seriesTitle: editingSeries.seriesTitle,
        category: editingSeries.category,
        description: editingSeries.description,
        thumbnailUrl: editingSeries.thumbnailUrl,
        courseSlug: editingSeries.courseSlug,
      });

      if (res.data) {
        setVideoSeriesList((prev) =>
          prev.map((s) => (s.id === editingSeries.id ? { ...s, ...res.data } : s))
        );
        addToast(`✅ Cover image & details updated in DB for "${res.data.seriesTitle}"!`);
        setEditSeriesModalOpen(false);
        setEditingSeries(null);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (!window.confirm('Delete this entire video series and its episode modules?')) return;
    try {
      await api.deleteVideoSeries(seriesId);
      setVideoSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
      addToast('🗑️ Video series deleted');
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModule.title || !newModule.videoUrl || !targetSeriesId) {
      addToast('Title, Video URL, and Series selection are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createVideoModule({
        ...newModule,
        seriesId: targetSeriesId,
      });
      if (res.data) {
        setVideoSeriesList((prev) =>
          prev.map((s) =>
            s.id === targetSeriesId ? { ...s, modules: [...(s.modules || []), res.data] } : s
          )
        );
        addToast(`✅ Episode "${res.data.title}" added to series!`);
        setAddModuleModalOpen(false);
        setNewModule({
          episodeNumber: 1,
          title: '',
          duration: '03:45',
          videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
          isFreePreview: true,
          description: '',
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string, seriesId: string) => {
    if (!window.confirm('Are you sure you want to delete this episode module?')) return;
    try {
      await api.deleteVideoModule(moduleId);
      setVideoSeriesList((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? { ...s, modules: (s.modules || []).filter((m: any) => m.id !== moduleId) }
            : s
        )
      );
      addToast('🗑️ Episode module deleted');
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="series"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">video_library</span>
            Program Video Series &amp; Gated LMS Vault
          </h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Upload custom cover art, manage series modules, and persist directly to Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddSeriesModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary font-label-caps text-xs uppercase font-black hover:bg-secondary hover:text-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.2)]"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>+ NEW SERIES</span>
          </button>
          <button
            onClick={() => {
              if (videoSeriesList.length > 0) setTargetSeriesId(videoSeriesList[0].id);
              setAddModuleModalOpen(true);
            }}
            className="btn-elite px-4 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
          >
            <span className="material-symbols-outlined text-sm">play_circle</span>
            <span>+ ADD EPISODE</span>
          </button>
        </div>
      </div>

      {videoSeriesList.length === 0 && (
        <div className="bg-[#0E131F] p-8 rounded-2xl border border-outline-variant/30 text-center font-mono-data text-sm text-on-surface-variant">
          No video series found. Click <strong>+ NEW SERIES</strong> to create one.
        </div>
      )}

      <div className="space-y-6">
        {videoSeriesList.map((series) => (
          <div key={series.id} className="bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 space-y-4 shadow-xl">
            <div className="flex justify-between items-start flex-wrap gap-4 border-b border-outline-variant/30 pb-4">
              <div className="flex gap-4 items-start">
                {/* Series Thumbnail Preview with Upload Action */}
                <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-outline-variant/40 relative group/thumb">
                  <img
                    src={
                      series.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={series.seriesTitle}
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleOpenEditSeries(series)}
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white font-mono-data text-[10px] font-bold cursor-pointer"
                  >
                    Upload Cover
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary font-bold uppercase border border-secondary/40">
                      {series.courseSlug?.toUpperCase()} DIVISION
                    </span>
                    <span className="font-mono-data text-xs text-on-surface-variant">{series.category}</span>
                  </div>
                  <h4 className="font-headline-md text-xl text-on-surface font-bold">{series.seriesTitle}</h4>
                  <p className="font-body-md text-xs text-on-surface-variant mt-1">{series.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditSeries(series)}
                  className="px-3 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-on-surface text-xs font-mono-data flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-secondary">upload_file</span>
                  <span>UPLOAD COVER</span>
                </button>
                <button
                  onClick={() => {
                    setTargetSeriesId(series.id);
                    setAddModuleModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary text-xs font-mono-data font-bold hover:bg-secondary hover:text-black transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span> ADD EPISODE
                </button>
                <button
                  onClick={() => handleDeleteSeries(series.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                  title="Delete Series"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>

            {/* Modules List */}
            <div className="space-y-2">
              <h5 className="font-mono-data text-xs text-secondary font-bold uppercase tracking-wider">
                Episodes ({series.modules?.length || 0})
              </h5>
              <div className="divide-y divide-outline-variant/20 bg-[#131929] rounded-xl border border-outline-variant/30 overflow-hidden">
                {(series.modules || []).length === 0 && (
                  <div className="p-4 text-center font-mono-data text-xs text-on-surface-variant">
                    No episode modules added yet. Click <strong>+ ADD EPISODE</strong> above.
                  </div>
                )}
                {(series.modules || []).map((mod: any) => (
                  <div
                    key={mod.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#1A2235] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black/60 border border-secondary/40 text-secondary font-mono-data font-bold text-xs flex items-center justify-center">
                        E{mod.episodeNumber}
                      </div>
                      <div>
                        <h6 className="font-headline-md text-sm text-on-surface font-bold flex items-center gap-2">
                          {mod.title}
                          {mod.isFreePreview && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 font-mono-data font-bold">
                              FREE PREVIEW
                            </span>
                          )}
                        </h6>
                        <p className="font-mono-data text-[11px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                          <span>⏱️ {mod.duration}</span>
                          <span>•</span>
                          <span className="truncate max-w-xs">{mod.description || 'No notes'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={sanitizeExternalUrl(mod.videoUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-secondary/15 text-secondary hover:bg-secondary hover:text-black transition-colors text-xs font-mono-data font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">play_arrow</span> WATCH
                      </a>
                      <button
                        onClick={() => handleDeleteModule(mod.id, series.id)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Episode"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ EDIT SERIES & THUMBNAIL MODAL ━━━ */}
      <AnimatePresence>
        {editSeriesModalOpen && editingSeries && (
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
                    UPLOAD COVER <span className="text-secondary">&amp; EDIT SERIES</span>
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setEditSeriesModalOpen(false);
                    setEditingSeries(null);
                  }}
                  className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEditSeries} className="space-y-3.5 text-xs font-mono-data">
                {/* Reusable Image Upload Input */}
                <ImageUploadInput
                  label="Series Cover Image (Drag & Drop or Choose File)"
                  value={editingSeries.thumbnailUrl || ''}
                  onChange={(url) => setEditingSeries({ ...editingSeries, thumbnailUrl: url })}
                />

                <div>
                  <label className="text-secondary font-bold block mb-1">Series Title *</label>
                  <input
                    type="text"
                    required
                    value={editingSeries.seriesTitle}
                    onChange={(e) => setEditingSeries({ ...editingSeries, seriesTitle: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Division Program</label>
                    <select
                      value={editingSeries.courseSlug}
                      onChange={(e) => setEditingSeries({ ...editingSeries, courseSlug: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 text-on-surface"
                    >
                      <option value="bmb">BMB (Mind)</option>
                      <option value="leadership">Leadership Academy</option>
                      <option value="ignit">IGNIT Incubator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Category</label>
                    <input
                      type="text"
                      value={editingSeries.category || ''}
                      onChange={(e) => setEditingSeries({ ...editingSeries, category: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editingSeries.description || ''}
                    onChange={(e) => setEditingSeries({ ...editingSeries, description: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 resize-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => {
                      setEditSeriesModalOpen(false);
                      setEditingSeries(null);
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
                    {saving ? 'SAVING TO DB...' : 'SAVE & PERSIST TO DB'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ ADD NEW SERIES MODAL ━━━ */}
      <AnimatePresence>
        {addSeriesModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                  CREATE NEW <span className="text-secondary">VIDEO SERIES</span>
                </h3>
                <button
                  onClick={() => setAddSeriesModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateSeries} className="space-y-3.5 text-xs font-mono-data">
                {/* Reusable Image Upload Input */}
                <ImageUploadInput
                  label="Series Cover Image (Drag & Drop or Choose File)"
                  value={newSeries.thumbnailUrl}
                  onChange={(url) => setNewSeries({ ...newSeries, thumbnailUrl: url })}
                />

                <div>
                  <label className="text-secondary font-bold block mb-1">Series Title *</label>
                  <input
                    type="text"
                    required
                    value={newSeries.seriesTitle}
                    onChange={(e) => setNewSeries({ ...newSeries, seriesTitle: e.target.value })}
                    placeholder="e.g. 5-Day Subconscious Neural Rewiring Masterclass"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Division Program *</label>
                    <select
                      value={newSeries.courseSlug}
                      onChange={(e) => setNewSeries({ ...newSeries, courseSlug: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    >
                      <option value="bmb">BMB (Mind)</option>
                      <option value="leadership">Leadership Academy</option>
                      <option value="ignit">IGNIT Incubator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Category</label>
                    <input
                      type="text"
                      value={newSeries.category}
                      onChange={(e) => setNewSeries({ ...newSeries, category: e.target.value })}
                      placeholder="e.g. Subconscious Mind Optimization"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newSeries.description}
                    onChange={(e) => setNewSeries({ ...newSeries, description: e.target.value })}
                    placeholder="Comprehensive description of the masterclass series..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddSeriesModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase cursor-pointer">
                    {saving ? 'SAVING...' : 'CREATE SERIES'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ ADD NEW EPISODE MODULE MODAL ━━━ */}
      <AnimatePresence>
        {addModuleModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                  ADD EPISODE <span className="text-secondary">MODULE</span>
                </h3>
                <button
                  onClick={() => setAddModuleModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateModule} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Select Video Series *</label>
                  <select
                    value={targetSeriesId}
                    onChange={(e) => setTargetSeriesId(e.target.value)}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                  >
                    {videoSeriesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.courseSlug.toUpperCase()}] {s.seriesTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Episode #</label>
                    <input
                      type="number"
                      value={newModule.episodeNumber}
                      onChange={(e) => setNewModule({ ...newModule, episodeNumber: parseInt(e.target.value, 10) || 1 })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-on-surface-variant block mb-1">Duration (MM:SS)</label>
                    <input
                      type="text"
                      value={newModule.duration}
                      onChange={(e) => setNewModule({ ...newModule, duration: e.target.value })}
                      placeholder="18:40"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Episode Title *</label>
                  <input
                    type="text"
                    required
                    value={newModule.title}
                    onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                    placeholder="e.g. Day 1: Deconstructing Subconscious Fear Traps"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Video Stream URL *</label>
                  <input
                    type="text"
                    required
                    value={newModule.videoUrl}
                    onChange={(e) => setNewModule({ ...newModule, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=JQypYNVzS3Q or MP4 URL"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                  />
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#131929] border border-outline-variant/30">
                  <input
                    type="checkbox"
                    id="isFreePreviewCheck"
                    checked={newModule.isFreePreview}
                    onChange={(e) => setNewModule({ ...newModule, isFreePreview: e.target.checked })}
                    className="w-4 h-4 rounded text-secondary focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isFreePreviewCheck" className="text-xs text-on-surface cursor-pointer">
                    Set as <strong>FREE PREVIEW</strong> (Accessible without student login)
                  </label>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Episode Description / Key Takeaways</label>
                  <textarea
                    rows={2}
                    value={newModule.description}
                    onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                    placeholder="Short summary of what is taught in this module..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddModuleModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase cursor-pointer">
                    {saving ? 'SAVING...' : 'ADD EPISODE'}
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
