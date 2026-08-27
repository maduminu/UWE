import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';

interface InstructorsTabProps {
  adminInstructors: any[];
  setAdminInstructors: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const InstructorsTab: React.FC<InstructorsTabProps> = ({
  adminInstructors,
  setAdminInstructors,
  saving,
  setSaving,
  addToast,
}) => {
  const [addInstructorModalOpen, setAddInstructorModalOpen] = useState(false);
  const [newInstructor, setNewInstructor] = useState({
    name: '',
    title: '',
    bio: '',
    credentials: '',
    specialties: '',
    courseSlugs: 'bmb,leadership,ignit',
    rating: '4.95',
    studentCount: '1000',
  });

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstructor.name || !newInstructor.title || !newInstructor.bio) {
      addToast('Name, Title, and Bio are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createInstructor(newInstructor);
      if (res.data) {
        setAdminInstructors((prev) => [...prev, res.data]);
        addToast(`🎉 Faculty member ${res.data.name} added!`);
        setAddInstructorModalOpen(false);
        setNewInstructor({
          name: '',
          title: '',
          bio: '',
          credentials: '',
          specialties: '',
          courseSlugs: 'bmb,leadership,ignit',
          rating: '4.95',
          studentCount: '1000',
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstructor = async (instId: string) => {
    if (!window.confirm('Delete this faculty member?')) return;
    try {
      await api.deleteInstructor(instId);
      setAdminInstructors((prev) => prev.filter((i) => i.id !== instId));
      addToast('Faculty member removed');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="instructors"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 flex-wrap gap-4">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold">Faculty &amp; Master Instructors</h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Manage coaching staff profiles, credentials, and course assignments.
          </p>
        </div>
        <button
          onClick={() => setAddInstructorModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-secondary text-black font-mono-data text-xs font-black uppercase hover:bg-secondary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>ADD INSTRUCTOR</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {adminInstructors.map((inst) => (
          <div
            key={inst.id}
            className="p-6 rounded-2xl bg-[#0E131F] border border-outline-variant/30 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 border border-secondary flex items-center justify-center font-display font-bold text-lg text-secondary">
                  {inst.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-on-surface">{inst.name}</h4>
                  <p className="font-mono-data text-xs text-secondary">{inst.title}</p>
                </div>
              </div>

              <p className="font-body-md text-xs text-on-surface-variant line-clamp-3">{inst.bio}</p>

              <div className="p-2.5 rounded-xl bg-[#111624] border border-outline-variant/20 text-xs font-mono-data space-y-1">
                <p className="text-[10px] text-on-surface-variant uppercase">Credentials:</p>
                <p className="text-on-surface truncate">{inst.credentials}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs font-mono-data">
              <span className="text-[#FFB800]">★ {inst.rating || 4.95}</span>
              <button
                onClick={() => handleDeleteInstructor(inst.id)}
                className="p-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ ADD INSTRUCTOR MODAL ━━━ */}
      <AnimatePresence>
        {addInstructorModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">person_celebrate</span>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                    ADD <span className="text-secondary">FACULTY MEMBER</span>
                  </h3>
                </div>
                <button
                  onClick={() => setAddInstructorModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateInstructor} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Instructor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newInstructor.name}
                    onChange={(e) => setNewInstructor({ ...newInstructor, name: e.target.value })}
                    placeholder="e.g. Commander Janith Perera"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Title / Designation *</label>
                  <input
                    type="text"
                    required
                    value={newInstructor.title}
                    onChange={(e) => setNewInstructor({ ...newInstructor, title: e.target.value })}
                    placeholder="Founder & Chief Mindset Architect"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Academic & Professional Credentials</label>
                  <input
                    type="text"
                    value={newInstructor.credentials}
                    onChange={(e) => setNewInstructor({ ...newInstructor, credentials: e.target.value })}
                    placeholder="B.Sc (Hons), Certified Master NLP, 10+ Yrs Experience"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Core Specialties</label>
                  <input
                    type="text"
                    value={newInstructor.specialties}
                    onChange={(e) => setNewInstructor({ ...newInstructor, specialties: e.target.value })}
                    placeholder="Subconscious Reprogramming, High-Ticket Negotiation"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Bio / Profile Summary</label>
                  <textarea
                    rows={3}
                    value={newInstructor.bio}
                    onChange={(e) => setNewInstructor({ ...newInstructor, bio: e.target.value })}
                    placeholder="Extensive background summary and achievements..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddInstructorModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">
                    {saving ? 'SAVING...' : 'REGISTER FACULTY'}
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
