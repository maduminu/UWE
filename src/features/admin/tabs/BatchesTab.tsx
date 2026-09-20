import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { parsePrice, formatPrice } from '../../../utils/priceFormatter';
import { sanitizeExternalUrl } from '../../../utils/urlSecurity';
import type { CourseRecord, CourseBatchRecord } from '../types/admin.types';

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
  // Modal State for New Program vs New Batch
  const [addProgramModalOpen, setAddProgramModalOpen] = useState(false);
  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [selectedCourseForBatch, setSelectedCourseForBatch] = useState<CourseRecord | null>(null);

  // New Program Form
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

  // New Batch Form
  const [newBatch, setNewBatch] = useState({
    batchNumber: 1,
    scheduleText: '2026-09-25 (Zoom Live 8:30 PM)',
    startDate: new Date().toISOString().split('T')[0],
    totalSeats: 20,
    availableSeats: 20,
    zoomLink: '',
    status: 'UPCOMING' as 'UPCOMING' | 'ACTIVE' | 'COMPLETED',
    assignedCoachName: '',
  });

  const reloadAllCourses = async () => {
    try {
      const res = await api.getCourses();
      if (res.data) {
        const colorMap: Record<string, string> = {
          bmb: '#00D2FF',
          leadership: '#FFB800',
          ignit: '#FF4757',
        };
        const mapped = res.data.map((c: any) => {
          const upcoming = c.batches?.find((b: any) => b.status === 'UPCOMING') || c.batches?.[0];
          const rawPrice = typeof c.price === 'number' ? c.price : parsePrice(c.price);
          const priceNum = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 0;
          return {
            id: c.id,
            slug: c.slug,
            name: c.title || c.name,
            badge: c.badge || '',
            price: priceNum,
            priceDisplay: `${c.currency || 'RS.'} ${priceNum.toLocaleString('en-US')}`,
            currency: c.currency || 'RS.',
            nextBatchDate: upcoming?.scheduleText || 'TBA',
            seatsLeft: typeof upcoming?.availableSeats === 'number' ? upcoming.availableSeats : 20,
            totalSeats: typeof upcoming?.totalSeats === 'number' ? upcoming.totalSeats : 20,
            zoomLink: upcoming?.zoomLink || '',
            batchId: upcoming?.id,
            batches: c.batches || [],
            color: colorMap[c.slug?.toLowerCase()] || '#FFB800',
            dirty: false,
          };
        });
        setCourses(mapped);
      }
    } catch { /* silent */ }
  };

  const handleOpenAddBatch = (course: CourseRecord) => {
    setSelectedCourseForBatch(course);
    const existingBatches = course.batches || [];
    const highestNum = existingBatches.reduce((max, b) => Math.max(max, b.batchNumber || 0), 0);
    setNewBatch({
      batchNumber: highestNum + 1,
      scheduleText: `2026-09-25 (Zoom Live 8:30 PM)`,
      startDate: new Date().toISOString().split('T')[0],
      totalSeats: 20,
      availableSeats: 20,
      zoomLink: course.zoomLink || '',
      status: 'UPCOMING',
      assignedCoachName: '',
    });
    setAddBatchModalOpen(true);
  };

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForBatch) return;

    setSaving(true);
    try {
      await api.createBatch({
        courseId: selectedCourseForBatch.id,
        courseSlug: selectedCourseForBatch.slug,
        batchNumber: Number(newBatch.batchNumber) || 1,
        scheduleText: newBatch.scheduleText.trim(),
        startDate: newBatch.startDate,
        totalSeats: Number(newBatch.totalSeats) || 20,
        availableSeats: Number(newBatch.availableSeats) || 20,
        zoomLink: newBatch.zoomLink.trim() || null,
        status: newBatch.status,
        assignedCoachName: newBatch.assignedCoachName.trim() || null,
      });

      addToast(`🎉 Batch #${newBatch.batchNumber} created for ${selectedCourseForBatch.name}!`);
      setAddBatchModalOpen(false);
      await reloadAllCourses();
    } catch (err: any) {
      addToast(`❌ Failed to create batch: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBatchDirect = async (batchId: string, updates: Partial<CourseBatchRecord>) => {
    try {
      await api.updateBatch(batchId, updates);
      addToast(`✅ Batch updated in real time!`);
      await reloadAllCourses();
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    }
  };

  const handleQuickSeatChange = async (batch: CourseBatchRecord, delta: number) => {
    const newSeats = Math.max(0, Math.min(batch.totalSeats, batch.availableSeats + delta));
    try {
      await api.updateBatchSeats(batch.id, newSeats);
      addToast(`✅ Batch #${batch.batchNumber} capacity adjusted to ${newSeats} seats!`);
      await reloadAllCourses();
    } catch (err: any) {
      addToast(`❌ Seat update failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteBatch = async (batchId: string, batchNumber: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete Batch #${batchNumber}?`)) return;

    try {
      await api.deleteBatch(batchId);
      addToast(`🗑️ Batch #${batchNumber} deleted from database.`);
      await reloadAllCourses();
    } catch (err: any) {
      addToast(`❌ Failed to delete batch: ${err.message}`, 'error');
    }
  };

  const handleSaveCoursePrice = async (course: CourseRecord) => {
    setSaving(true);
    try {
      const numericPrice = parsePrice(course.priceDisplay);
      if (numericPrice > 0) {
        await api.updateCourse(course.id, { price: numericPrice });
        addToast(`✅ ${course.name} tuition updated to RS. ${numericPrice.toLocaleString('en-US')}`);
        await reloadAllCourses();
      }
    } catch (err: any) {
      addToast(`❌ Failed to update price: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
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
      await api.createCourse({
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

      addToast(`🎉 Program "${newProgram.title}" created in Supabase DB!`);
      setAddProgramModalOpen(false);
      await reloadAllCourses();
    } catch (err: any) {
      addToast(`❌ Create failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="batches"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
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
            Course Batches, Capacity &amp; Zoom Masterminds
          </h2>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Create and manage individual cohorts (Batch 1, 2, 3...), live seat capacities, and status (Upcoming, Active, Completed).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddProgramModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary font-label-caps text-xs uppercase font-black hover:bg-secondary hover:text-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.25)]"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ NEW PROGRAM DIVISION</span>
          </button>
        </div>
      </div>

      {/* ── Courses & Batches List ── */}
      <div className="space-y-6">
        {courses.map((course) => {
          const batches = course.batches && course.batches.length > 0
            ? course.batches
            : course.batchId
            ? [
                {
                  id: course.batchId,
                  courseId: course.id,
                  batchNumber: 1,
                  scheduleText: course.nextBatchDate,
                  totalSeats: course.totalSeats || 20,
                  availableSeats: course.seatsLeft,
                  zoomLink: course.zoomLink,
                  status: 'UPCOMING' as const,
                  assignedCoachName: null,
                },
              ]
            : [];

          return (
            <div
              key={course.id}
              className="bg-[#0B0F1C] p-6 rounded-2xl border border-outline-variant/30 space-y-6 shadow-xl relative overflow-hidden"
            >
              {/* Top Course Division Bar */}
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
                  <h3 className="font-display text-xl font-black text-on-surface">
                    {course.name}
                  </h3>
                  <span className="text-xs font-mono-data text-on-surface-variant">
                    ({batches.length} {batches.length === 1 ? 'Batch' : 'Batches'} Configured)
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Tuition Price Input */}
                  <div className="flex items-center gap-2 bg-[#080C16] px-3 py-1.5 rounded-xl border border-outline-variant/30">
                    <span className="text-xs font-mono-data text-on-surface-variant uppercase">Fee:</span>
                    <input
                      type="text"
                      value={course.priceDisplay}
                      onChange={(e) =>
                        setCourses((prev) =>
                          prev.map((c) => (c.id === course.id ? { ...c, priceDisplay: e.target.value } : c))
                        )
                      }
                      className="w-28 bg-transparent text-sm font-mono-data text-secondary font-bold outline-none border-b border-secondary/40 focus:border-secondary"
                    />
                    <button
                      onClick={() => handleSaveCoursePrice(course)}
                      className="px-2 py-1 rounded bg-secondary/20 hover:bg-secondary text-secondary hover:text-black font-mono-data text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Save Price
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenAddBatch(course)}
                    className="px-3.5 py-2 rounded-xl bg-[#00FF66]/15 hover:bg-[#00FF66] border border-[#00FF66]/50 text-[#00FF66] hover:text-black font-mono-data text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.15)]"
                  >
                    <span className="material-symbols-outlined text-sm">add_box</span>
                    <span>+ ADD NEW BATCH</span>
                  </button>
                </div>
              </div>

              {/* Batches Table / Cards Grid */}
              {batches.length === 0 ? (
                <div className="p-8 text-center bg-[#080C16] rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant font-mono-data text-xs space-y-2">
                  <p>No active cohorts or batches created for this division yet.</p>
                  <button
                    onClick={() => handleOpenAddBatch(course)}
                    className="text-secondary hover:underline font-bold"
                  >
                    + Create Batch #1 Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {batches.map((batch) => {
                    const total = batch.totalSeats || 20;
                    const available = batch.availableSeats;
                    const booked = Math.max(0, total - available);
                    const fillPercent = Math.min(100, Math.round((booked / total) * 100));

                    const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
                      UPCOMING: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' },
                      ACTIVE: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/40' },
                      COMPLETED: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/40' },
                    };
                    const badgeStyle = statusStyles[batch.status] || statusStyles.UPCOMING;

                    return (
                      <div
                        key={batch.id}
                        className="bg-[#080C16] p-4 sm:p-5 rounded-xl border border-outline-variant/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:border-secondary/30 transition-all shadow-md"
                      >
                        {/* Batch Title & Status */}
                        <div className="space-y-1.5 min-w-[220px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-secondary/15 text-secondary border border-secondary/40 font-mono-data text-xs font-black uppercase">
                              BATCH #{batch.batchNumber}
                            </span>

                            {/* Status Selector Dropdown */}
                            <select
                              value={batch.status}
                              onChange={(e) =>
                                handleUpdateBatchDirect(batch.id, {
                                  status: e.target.value as 'UPCOMING' | 'ACTIVE' | 'COMPLETED',
                                })
                              }
                              className={`px-2.5 py-0.5 rounded-full font-mono-data text-[11px] font-bold border outline-none cursor-pointer ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                              <option value="UPCOMING">🟢 UPCOMING</option>
                              <option value="ACTIVE">🔵 IN-PROGRESS / ACTIVE</option>
                              <option value="COMPLETED">⚪ COMPLETED / GRADUATED</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono-data text-on-surface">
                            <span className="material-symbols-outlined text-sm text-[#00FF66]">calendar_month</span>
                            <input
                              type="text"
                              defaultValue={batch.scheduleText}
                              onBlur={(e) => {
                                if (e.target.value !== batch.scheduleText) {
                                  handleUpdateBatchDirect(batch.id, { scheduleText: e.target.value });
                                }
                              }}
                              className="bg-transparent border-b border-transparent hover:border-outline-variant focus:border-secondary outline-none text-xs text-on-surface font-bold"
                              title="Click to edit schedule text"
                            />
                          </div>
                        </div>

                        {/* Capacity & Live Seat Adjustment Controls */}
                        <div className="p-3 rounded-xl bg-[#0E1424] border border-outline-variant/20 space-y-1.5 min-w-[260px] w-full lg:w-auto">
                          <div className="flex justify-between items-center text-xs font-mono-data">
                            <span className="text-on-surface-variant">Capacity Fill:</span>
                            <span className="font-bold text-secondary">
                              {booked} Booked • {available} Left (of {total})
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-[#161D2E] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-secondary to-[#00FF66]"
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>

                          {/* Quick Increment / Decrement Buttons */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono-data text-on-surface-variant">Adjust Seats:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleQuickSeatChange(batch, -1)}
                                className="w-7 h-7 rounded bg-[#1A2133] hover:bg-secondary/20 hover:text-secondary border border-outline-variant/40 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                title="Decrease Available Seats (-1)"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-xs text-secondary font-mono-data">
                                {available}
                              </span>
                              <button
                                onClick={() => handleQuickSeatChange(batch, 1)}
                                className="w-7 h-7 rounded bg-[#1A2133] hover:bg-secondary/20 hover:text-secondary border border-outline-variant/40 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                title="Increase Available Seats (+1)"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Zoom Meeting Link & Coach */}
                        <div className="space-y-1.5 min-w-[200px] w-full lg:w-auto">
                          <div className="flex items-center gap-1.5 text-xs font-mono-data">
                            <span className="material-symbols-outlined text-sm text-[#00D2FF]">video_camera_front</span>
                            <input
                              type="text"
                              defaultValue={batch.zoomLink || ''}
                              placeholder="Add Zoom URL..."
                              onBlur={(e) => {
                                if (e.target.value !== (batch.zoomLink || '')) {
                                  handleUpdateBatchDirect(batch.id, { zoomLink: e.target.value || null });
                                }
                              }}
                              className="bg-[#111728] px-2.5 py-1 rounded-lg border border-outline-variant/30 text-xs font-mono-data text-[#00D2FF] outline-none focus:border-secondary w-full"
                            />
                            {batch.zoomLink && (
                              <a
                                href={sanitizeExternalUrl(batch.zoomLink)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500 hover:text-white transition-colors"
                                title="Test Zoom Meeting Link"
                              >
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end lg:self-center">
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                            className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-mono-data text-xs transition-colors cursor-pointer"
                            title="Delete Batch"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ━━━ CREATE NEW BATCH MODAL ━━━ */}
      <AnimatePresence>
        {addBatchModalOpen && selectedCourseForBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0E131F] border border-secondary/60 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">add_business</span>
                  <h3 className="font-display text-lg font-bold text-on-surface">
                    Create New Cohort Batch for {selectedCourseForBatch.name}
                  </h3>
                </div>
                <button
                  onClick={() => setAddBatchModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBatchSubmit} className="space-y-4 font-mono-data text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Batch Number *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newBatch.batchNumber}
                      onChange={(e) => setNewBatch({ ...newBatch, batchNumber: parseInt(e.target.value) || 1 })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-on-surface-variant block mb-1">Status</label>
                    <select
                      value={newBatch.status}
                      onChange={(e) =>
                        setNewBatch({ ...newBatch, status: e.target.value as 'UPCOMING' | 'ACTIVE' | 'COMPLETED' })
                      }
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-on-surface"
                    >
                      <option value="UPCOMING">🟢 UPCOMING</option>
                      <option value="ACTIVE">🔵 IN-PROGRESS / ACTIVE</option>
                      <option value="COMPLETED">⚪ COMPLETED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-secondary font-bold block mb-1">Cohort Schedule Text *</label>
                  <input
                    type="text"
                    required
                    value={newBatch.scheduleText}
                    onChange={(e) => setNewBatch({ ...newBatch, scheduleText: e.target.value })}
                    placeholder="e.g. 2026-09-25 (Zoom Live 8:30 PM)"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Total Capacity (Seats) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newBatch.totalSeats}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 20;
                        setNewBatch({ ...newBatch, totalSeats: val, availableSeats: val });
                      }}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-secondary font-bold block mb-1">Available Seats *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newBatch.availableSeats}
                      onChange={(e) => setNewBatch({ ...newBatch, availableSeats: parseInt(e.target.value) || 0 })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Zoom Meeting Channel URL</label>
                  <input
                    type="text"
                    value={newBatch.zoomLink}
                    onChange={(e) => setNewBatch({ ...newBatch, zoomLink: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-[#00D2FF]"
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Assigned Mastermind Coach Name (Optional)</label>
                  <input
                    type="text"
                    value={newBatch.assignedCoachName}
                    onChange={(e) => setNewBatch({ ...newBatch, assignedCoachName: e.target.value })}
                    placeholder="Commander Janith Perera"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddBatchModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'CREATING...' : 'PUBLISH BATCH'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ ADD NEW PROGRAM DIVISION MODAL ━━━ */}
      <AnimatePresence>
        {addProgramModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0E131F] border border-secondary/60 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">add_circle</span>
                  <h3 className="font-display text-lg font-bold text-on-surface">Create New Program Division</h3>
                </div>
                <button
                  onClick={() => setAddProgramModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProgram} className="space-y-4 font-mono-data text-xs">
                <div>
                  <label className="text-secondary font-bold block mb-1">Program Title *</label>
                  <input
                    type="text"
                    required
                    value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="e.g. Tactical Sovereign Mind (TSM)"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Tuition Price (LKR) *</label>
                    <input
                      type="text"
                      required
                      value={newProgram.price}
                      onChange={(e) => setNewProgram({ ...newProgram, price: e.target.value })}
                      placeholder="15000"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Category</label>
                    <select
                      value={newProgram.category}
                      onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value as any })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-on-surface"
                    >
                      <option value="MIND">MIND DIVISION</option>
                      <option value="COMMAND">COMMAND DIVISION</option>
                      <option value="ENTERPRISE">ENTERPRISE DIVISION</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-secondary font-bold block mb-1">Cohort Schedule Text *</label>
                  <input
                    type="text"
                    required
                    value={newProgram.nextBatchDate}
                    onChange={(e) => setNewProgram({ ...newProgram, nextBatchDate: e.target.value })}
                    placeholder="2026-09-15 (Zoom Live 8:30 PM)"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddProgramModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'CREATING...' : 'PUBLISH PROGRAM'}
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
