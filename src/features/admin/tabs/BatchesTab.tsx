import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { parsePrice, formatPrice } from '../../../utils/priceFormatter';
import { sanitizeExternalUrl } from '../../../utils/urlSecurity';
import type { CourseRecord } from '../types/admin.types';

interface BatchesTabProps {
  courses: CourseRecord[];
  setCourses: React.Dispatch<React.SetStateAction<CourseRecord[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const BatchesTab: React.FC<BatchesTabProps> = ({
  courses,
  setCourses,
  saving,
  setSaving,
  addToast,
}) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '',
    subtitle: '',
    badge: 'MIND DIVISION',
    category: 'MIND' as 'MIND' | 'COMMAND' | 'ENTERPRISE',
    price: '15000',
    duration: '5 Days Intensive',
    nextBatchDate: '2026-09-15 (Zoom Live)',
    zoomLink: 'https://zoom.us/join',
    seats: 20,
    description: '',
  });

  const editCourseField = (id: string, field: Partial<CourseRecord>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...field, dirty: true } : c)));
  };

  const saveCourse = async (course: CourseRecord) => {
    setSaving(true);
    try {
      const numericPrice = parsePrice(course.priceDisplay);
      if (numericPrice > 0) {
        await api.updateCourse(course.id, { price: numericPrice });
      }
      if (course.batchId) {
        await api.updateBatch(course.batchId, {
          availableSeats: course.seatsLeft,
          scheduleText: course.nextBatchDate,
          zoomLink: course.zoomLink || null,
        });
      }
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id
            ? {
                ...c,
                price: numericPrice,
                priceDisplay: formatPrice(numericPrice, c.currency),
                dirty: false,
              }
            : c
        )
      );
      addToast(`✅ ${course.name} saved (RS. ${numericPrice.toLocaleString('en-US')})`);
    } catch {
      addToast(`❌ Failed to save ${course.name}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAllCourses = async () => {
    const dirtyOnes = courses.filter((c) => c.dirty);
    if (dirtyOnes.length === 0) {
      addToast('No unsaved changes to push', 'info');
      return;
    }
    for (const c of dirtyOnes) await saveCourse(c);
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgram.title || !newProgram.price) {
      addToast('Please provide program Title and Price', 'error');
      return;
    }

    setSaving(true);
    try {
      const numericPrice = parsePrice(newProgram.price);
      const res = await api.createCourse({
        title: newProgram.title,
        subtitle: newProgram.subtitle || 'Tactical Mind & Command Protocol',
        badge: newProgram.badge || 'MIND DIVISION',
        category: newProgram.category,
        price: numericPrice,
        currency: 'RS.',
        duration: newProgram.duration,
        nextBatchDate: newProgram.nextBatchDate,
        zoomLink: newProgram.zoomLink,
        seats: newProgram.seats,
        description: newProgram.description || 'Tactical training program.',
      });

      if (res.data) {
        const c = res.data;
        const newRecord: CourseRecord = {
          id: c.id,
          slug: c.slug,
          name: c.title,
          badge: c.badge,
          price: numericPrice,
          priceDisplay: formatPrice(numericPrice, c.currency || 'RS.'),
          currency: c.currency || 'RS.',
          nextBatchDate: c.batches?.[0]?.scheduleText || newProgram.nextBatchDate,
          seatsLeft: c.batches?.[0]?.availableSeats ?? newProgram.seats,
          zoomLink: c.batches?.[0]?.zoomLink || newProgram.zoomLink,
          batchId: c.batches?.[0]?.id,
          color: c.slug === 'bmb' ? '#00D2FF' : c.slug === 'leadership' ? '#FFB800' : '#FF4757',
          dirty: false,
        };
        setCourses((prev) => [...prev, newRecord]);
        addToast(`🎉 Program "${c.title}" created in Supabase DB!`);
        setAddModalOpen(false);
        setNewProgram({
          title: '',
          subtitle: '',
          badge: 'MIND DIVISION',
          category: 'MIND',
          price: '15000',
          duration: '5 Days Intensive',
          nextBatchDate: '2026-09-15 (Zoom Live)',
          zoomLink: 'https://zoom.us/join',
          seats: 20,
          description: '',
        });
      }
    } catch (err: any) {
      addToast(`❌ Create failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalSeatsAll = courses.reduce((acc, c) => acc + (c.seatsLeft || 0), 0);
  const zoomConfiguredCount = courses.filter((c) => !!c.zoomLink?.trim()).length;

  return (
    <motion.div
      key="batches"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* ── Top Command Summary & Action Bar ── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C1220] via-[#0E162B] to-[#070A12] border border-secondary/40 p-5 md:p-6 shadow-[0_0_40px_rgba(255,184,0,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary/20 border border-secondary/50 font-mono-data text-[10px] text-secondary font-bold uppercase tracking-wider">
              COMMAND HQ • COHORT MATRIX
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-on-surface uppercase tracking-wide">
            Course Batches, Tuition &amp; Zoom Masterminds
          </h2>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Live database sync: Edits to prices, schedules, and Zoom meeting links reflect immediately across student dashboards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary font-label-caps text-xs uppercase font-black hover:bg-secondary hover:text-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.25)]"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>ADD PROGRAM</span>
          </button>

          <button
            onClick={saveAllCourses}
            disabled={saving || !courses.some((c) => c.dirty)}
            className={`px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer transition-all ${
              courses.some((c) => c.dirty)
                ? 'bg-secondary text-black shadow-[0_0_25px_rgba(255,184,0,0.5)] hover:scale-105'
                : 'bg-[#131929] text-on-surface-variant border border-outline-variant/30 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">{saving ? 'sync' : 'cloud_upload'}</span>
            <span>{saving ? 'SAVING...' : 'SAVE ALL TO DB'}</span>
          </button>
        </div>
      </div>

      {/* ── Quick KPI Stat Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-data">
        <div className="p-3.5 rounded-xl bg-[#0B0F1C] border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase">ACTIVE PROGRAMS</p>
            <p className="font-display text-lg font-bold text-on-surface mt-0.5">{courses.length}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F1C] border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">event_available</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase">UPCOMING COHORTS</p>
            <p className="font-display text-lg font-bold text-[#00FF66] mt-0.5">{courses.length} Live</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F1C] border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">video_camera_front</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase">ZOOM CHANNELS</p>
            <p className="font-display text-lg font-bold text-[#00D2FF] mt-0.5">{zoomConfiguredCount} of {courses.length} Configured</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F1C] border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">airline_seat_recline_normal</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase">TOTAL SEATS LEFT</p>
            <p className="font-display text-lg font-bold text-purple-300 mt-0.5">{totalSeatsAll} Open</p>
          </div>
        </div>
      </div>

      {/* ── Program Cards ── */}
      <div className="space-y-4">
        {courses.map((course) => {
          const hasZoom = !!course.zoomLink?.trim();

          return (
            <motion.div
              key={course.id}
              whileHover={{ scale: [null, 1.002] }}
              className={`bg-[#0B0F1C] p-5 sm:p-6 rounded-2xl border transition-all space-y-5 relative overflow-hidden shadow-xl ${
                course.dirty
                  ? 'border-secondary/80 shadow-[0_0_30px_rgba(255,184,0,0.25)]'
                  : 'border-outline-variant/30 hover:border-secondary/40'
              }`}
            >
              {/* Top Card Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/20">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="font-mono-data text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: `${course.color || '#FFB800'}15`,
                      borderColor: `${course.color || '#FFB800'}50`,
                      color: course.color || '#FFB800',
                    }}
                  >
                    {course.badge || 'TACTICAL DIVISION'}
                  </span>

                  <h3 className="font-display text-lg sm:text-xl font-black text-on-surface">
                    {course.name}
                  </h3>

                  {/* Zoom Status Tag */}
                  {hasZoom ? (
                    <span className="px-2.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/40 text-blue-300 font-mono-data text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      ZOOM LIVE LINK CONFIGURED
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 font-mono-data text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      NO ZOOM URL SET
                    </span>
                  )}

                  {course.dirty && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/60 font-mono-data font-bold animate-pulse">
                      ● UNSAVED CHANGES
                    </span>
                  )}
                </div>

                {/* Per-Course Save Button */}
                <button
                  onClick={() => saveCourse(course)}
                  disabled={!course.dirty || saving}
                  className={`px-4 py-2 rounded-xl font-mono-data text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                    course.dirty
                      ? 'bg-secondary text-black shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:scale-105'
                      : 'bg-[#131929] text-on-surface-variant border border-outline-variant/30 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'save'}</span>
                  <span>{saving ? 'SAVING...' : 'SAVE TO DB'}</span>
                </button>
              </div>

              {/* 4-Column Grid for Batch Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#080C16] p-4 rounded-xl border border-outline-variant/20">
                {/* 1. Tuition Price */}
                <div>
                  <label className="font-mono-data text-[11px] text-on-surface-variant flex items-center gap-1 mb-1.5">
                    <span className="material-symbols-outlined text-xs text-secondary">payments</span>
                    <span>Tuition Fee</span>
                  </label>
                  <input
                    type="text"
                    value={course.priceDisplay}
                    onChange={(e) => editCourseField(course.id, { priceDisplay: e.target.value })}
                    className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-data text-secondary font-bold focus:border-secondary bg-[#111728] border border-outline-variant/30 outline-none"
                  />
                </div>

                {/* 2. Cohort Schedule */}
                <div>
                  <label className="font-mono-data text-[11px] text-on-surface-variant flex items-center gap-1 mb-1.5">
                    <span className="material-symbols-outlined text-xs text-[#00FF66]">calendar_month</span>
                    <span>Next Cohort Schedule</span>
                  </label>
                  <input
                    type="text"
                    value={course.nextBatchDate}
                    onChange={(e) => editCourseField(course.id, { nextBatchDate: e.target.value })}
                    placeholder="2026-08-25 (Zoom Live 8:30 PM)"
                    className="input-field w-full px-3.5 py-2.5 rounded-xl text-xs font-mono-data text-on-surface focus:border-secondary bg-[#111728] border border-outline-variant/30 outline-none"
                  />
                </div>

                {/* 3. Available Seats */}
                <div>
                  <label className="font-mono-data text-[11px] text-on-surface-variant flex items-center gap-1 mb-1.5">
                    <span className="material-symbols-outlined text-xs text-purple-300">group</span>
                    <span>Available Seats</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editCourseField(course.id, { seatsLeft: Math.max(0, course.seatsLeft - 1) })}
                      className="w-10 h-10 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface font-bold hover:bg-secondary hover:text-black transition-colors cursor-pointer flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-mono-data text-base font-bold text-secondary w-10 text-center">
                      {course.seatsLeft}
                    </span>
                    <button
                      onClick={() => editCourseField(course.id, { seatsLeft: course.seatsLeft + 1 })}
                      className="w-10 h-10 rounded-xl bg-[#111728] border border-outline-variant/40 text-on-surface font-bold hover:bg-secondary hover:text-black transition-colors cursor-pointer flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Zoom Mastermind Link */}
                <div>
                  <label className="font-mono-data text-[11px] text-on-surface-variant flex items-center gap-1 mb-1.5">
                    <span className="material-symbols-outlined text-xs text-[#00D2FF]">video_camera_front</span>
                    <span>Live Zoom Mastermind URL</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={course.zoomLink || ''}
                      onChange={(e) => editCourseField(course.id, { zoomLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="input-field w-full px-3.5 py-2.5 rounded-xl text-xs font-mono-data text-[#00D2FF] focus:border-secondary bg-[#111728] border border-outline-variant/30 outline-none"
                    />
                    {course.zoomLink && (
                      <a
                        href={sanitizeExternalUrl(course.zoomLink)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500 hover:text-white flex items-center justify-center shrink-0 transition-colors"
                        title="Test Zoom Meeting Link"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ━━━ ADD NEW PROGRAM MODAL ━━━ */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D121F] border border-secondary/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 text-left shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary border border-secondary/50 flex items-center justify-center shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                    <span className="material-symbols-outlined text-xl">add_box</span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black text-on-surface uppercase">
                      ADD NEW <span className="text-secondary">DIRECTIVE PROGRAM</span>
                    </h3>
                    <p className="font-mono-data text-[11px] text-on-surface-variant">
                      Creates program division &amp; live batch record in Supabase PostgreSQL
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateProgram} className="space-y-4 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Program Title *</label>
                  <input
                    type="text"
                    required
                    value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="e.g. Subconscious Mastery Protocol"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Price (LKR) *</label>
                    <input
                      type="text"
                      required
                      value={newProgram.price}
                      onChange={(e) => setNewProgram({ ...newProgram, price: e.target.value })}
                      placeholder="15000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-secondary font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Badge Tag</label>
                    <input
                      type="text"
                      value={newProgram.badge}
                      onChange={(e) => setNewProgram({ ...newProgram, badge: e.target.value })}
                      placeholder="MIND DIVISION"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Category</label>
                    <select
                      value={newProgram.category}
                      onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface cursor-pointer outline-none"
                    >
                      <option value="MIND">MIND</option>
                      <option value="COMMAND">COMMAND</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Duration</label>
                    <input
                      type="text"
                      value={newProgram.duration}
                      onChange={(e) => setNewProgram({ ...newProgram, duration: e.target.value })}
                      placeholder="5 Days Intensive"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Next Cohort Date</label>
                    <input
                      type="text"
                      value={newProgram.nextBatchDate}
                      onChange={(e) => setNewProgram({ ...newProgram, nextBatchDate: e.target.value })}
                      placeholder="2026-09-15 (Zoom Live)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Initial Seats</label>
                    <input
                      type="number"
                      value={newProgram.seats}
                      onChange={(e) => setNewProgram({ ...newProgram, seats: parseInt(e.target.value, 10) || 20 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Zoom Live Meeting URL</label>
                  <input
                    type="text"
                    value={newProgram.zoomLink}
                    onChange={(e) => setNewProgram({ ...newProgram, zoomLink: e.target.value })}
                    placeholder="https://zoom.us/j/987654321"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-[#00D2FF] outline-none"
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    placeholder="Brief description..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070A12] border border-outline-variant/40 focus:border-secondary text-on-surface outline-none resize-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-surface-variant/40 text-on-surface hover:bg-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-secondary text-black font-black uppercase shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:bg-secondary-container transition-all cursor-pointer"
                  >
                    {saving ? 'Creating...' : 'Create Program'}
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
