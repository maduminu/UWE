import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';

interface StaffTabProps {
  staffMembers: any[];
  setStaffMembers: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  setStaffMembers,
  saving,
  setSaving,
  addToast,
}) => {
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    department: 'Operations',
    email: '',
    phone: '',
    photoUrl: '',
    bio: '',
    isActive: true,
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.role) {
      addToast('Staff Name and Role are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createStaff(newStaff);
      if (res.data) {
        setStaffMembers((prev) => [res.data, ...prev]);
        addToast(`🎉 Staff Member "${res.data.name}" added to Empire Roster!`);
        setAddStaffModalOpen(false);
        setNewStaff({
          name: '',
          role: '',
          department: 'Operations',
          email: '',
          phone: '',
          photoUrl: '',
          bio: '',
          isActive: true,
        });
      }
    } catch (err: any) {
      addToast(`❌ Failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStaffActive = async (staffId: string, currentIsActive: boolean) => {
    try {
      const res = await api.updateStaff(staffId, { isActive: !currentIsActive });
      if (res.data) {
        setStaffMembers((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, isActive: !currentIsActive } : s))
        );
        addToast(`Staff status set to ${!currentIsActive ? 'ACTIVE' : 'INACTIVE'}`);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member from the roster?')) return;
    try {
      await api.deleteStaff(staffId);
      setStaffMembers((prev) => prev.filter((s) => s.id !== staffId));
      addToast('🗑️ Staff member removed from roster');
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  const handleOpenEditStaff = (staff: any) => {
    setEditingStaff({
      id: staff.id,
      name: staff.name || '',
      role: staff.role || '',
      department: staff.department || 'Operations',
      email: staff.email || '',
      phone: staff.phone || '',
      photoUrl: staff.photoUrl || '',
      bio: staff.bio || '',
      isActive: typeof staff.isActive === 'boolean' ? staff.isActive : true,
    });
    setEditStaffModalOpen(true);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.name || !editingStaff.role) {
      addToast('Staff Name and Role are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateStaff(editingStaff.id, editingStaff);
      if (res.data) {
        setStaffMembers((prev) =>
          prev.map((s) => (s.id === editingStaff.id ? res.data : s))
        );
        addToast(`✅ Staff Member "${res.data.name}" updated!`);
        setEditStaffModalOpen(false);
        setEditingStaff(null);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="staff"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Staff Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0E131F] p-4 rounded-xl border border-secondary/30 shadow-lg">
          <span className="font-mono-data text-[10px] text-on-surface-variant uppercase block">Total Roster</span>
          <span className="font-mono-data text-2xl text-secondary font-black">{staffMembers.length}</span>
        </div>
        <div className="bg-[#0E131F] p-4 rounded-xl border border-[#2ED573]/30 shadow-lg">
          <span className="font-mono-data text-[10px] text-on-surface-variant uppercase block">Active Duty</span>
          <span className="font-mono-data text-2xl text-[#2ED573] font-black">
            {staffMembers.filter((s) => s.isActive).length}
          </span>
        </div>
        <div className="bg-[#0E131F] p-4 rounded-xl border border-[#00D2FF]/30 shadow-lg">
          <span className="font-mono-data text-[10px] text-on-surface-variant uppercase block">Departments</span>
          <span className="font-mono-data text-2xl text-[#00D2FF] font-black">
            {new Set(staffMembers.map((s) => s.department)).size}
          </span>
        </div>
        <div className="bg-[#0E131F] p-4 rounded-xl border border-outline-variant/40 shadow-lg">
          <span className="font-mono-data text-[10px] text-on-surface-variant uppercase block">Inactive</span>
          <span className="font-mono-data text-2xl text-on-surface-variant font-black">
            {staffMembers.filter((s) => !s.isActive).length}
          </span>
        </div>
      </div>

      {/* Staff Directory Container */}
      <div className="bg-[#0E131F] rounded-2xl border border-secondary/30 overflow-hidden shadow-2xl">
        <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">groups</span>
              Empire Staff Members & Team Directory
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant">
              Manage UWE corporate staff, trainers, program coordinators, and executive team
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                exportToCSV(
                  'uwe_staff_roster',
                  staffMembers.map((s) => ({
                    ID: s.id,
                    Name: s.name,
                    Role: s.role,
                    Department: s.department,
                    Email: s.email || 'N/A',
                    Phone: s.phone || 'N/A',
                    Status: s.isActive ? 'ACTIVE' : 'INACTIVE',
                    Joined: new Date(s.joinDate || s.createdAt).toLocaleDateString(),
                  })),
                  addToast
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
            </button>
            <button
              onClick={() => setAddStaffModalOpen(true)}
              className="btn-elite px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>+ ADD STAFF MEMBER</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {staffMembers.length === 0 ? (
            <div className="p-12 text-center font-mono-data text-xs text-on-surface-variant space-y-3">
              <span className="material-symbols-outlined text-4xl text-secondary opacity-60">badge</span>
              <p>No staff members registered in the database yet.</p>
              <button
                onClick={() => setAddStaffModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-secondary/10 border border-secondary text-secondary font-bold hover:bg-secondary hover:text-black transition-all inline-flex items-center gap-1"
              >
                + REGISTER FIRST STAFF MEMBER
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className={`p-5 rounded-2xl bg-[#131929] border transition-all space-y-4 shadow-lg ${
                    staff.isActive
                      ? 'border-outline-variant/40 hover:border-secondary/60'
                      : 'border-outline-variant/20 opacity-60 bg-[#0B0F19]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {staff.photoUrl ? (
                        <img
                          src={staff.photoUrl}
                          alt={staff.name}
                          className="w-12 h-12 rounded-xl object-cover border border-secondary/40 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary font-black font-headline-md flex items-center justify-center text-lg shrink-0">
                          {staff.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-headline-md text-base text-on-surface font-bold">{staff.name}</h4>
                        <span className="font-mono-data text-xs text-secondary font-bold block">{staff.role}</span>
                        <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-[#0A0E17] text-on-surface-variant border border-outline-variant/30 mt-1 inline-block">
                          {staff.department}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStaffActive(staff.id, staff.isActive)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono-data font-bold border cursor-pointer transition-colors ${
                        staff.isActive
                          ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50 hover:bg-[#2ED573]/30'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      {staff.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  {staff.bio && (
                    <p className="font-mono-data text-xs text-on-surface-variant italic line-clamp-2">
                      "{staff.bio}"
                    </p>
                  )}

                  <div className="text-xs font-mono-data space-y-1 text-on-surface-variant pt-2 border-t border-outline-variant/20">
                    {staff.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant">Phone:</span>
                        <span className="text-on-surface font-bold">{staff.phone}</span>
                      </div>
                    )}
                    {staff.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant">Email:</span>
                        <span className="text-secondary truncate max-w-[180px]">{staff.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                    {staff.phone ? (
                      <a
                        href={`https://wa.me/${staff.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                          staff.name
                        )}%2C%20from%20UWE%20Command%20HQ.`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] font-mono-data text-xs font-bold hover:bg-[#25D366] hover:text-black transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span> WHATSAPP
                      </a>
                    ) : (
                      <div></div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditStaff(staff)}
                        className="px-3 py-1.5 rounded-lg bg-secondary/15 border border-secondary/40 text-secondary hover:bg-secondary hover:text-black transition-colors font-mono-data text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span> EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors font-mono-data text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> REMOVE
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ━━━ REGISTER NEW STAFF MEMBER MODAL ━━━ */}
      <AnimatePresence>
        {addStaffModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">badge</span>
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                    REGISTER <span className="text-secondary">STAFF MEMBER</span>
                  </h3>
                </div>
                <button
                  onClick={() => setAddStaffModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Full Name / Staff Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="e.g. Ruwan Weerasinghe"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Role / Designation *</label>
                    <input
                      type="text"
                      required
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      placeholder="e.g. Mind Division Lead Coach"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Department</label>
                    <select
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    >
                      <option value="Operations">Operations</option>
                      <option value="Training & Coaching">Training & Coaching</option>
                      <option value="Sales & Growth">Sales & Growth</option>
                      <option value="Marketing & Media">Marketing & Media</option>
                      <option value="Executive Command">Executive Command</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="ruwan@uwe.lk"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="077 123 4567"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Photo URL (Optional)</label>
                  <input
                    type="text"
                    value={newStaff.photoUrl}
                    onChange={(e) => setNewStaff({ ...newStaff, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Short Bio / Credentials</label>
                  <textarea
                    rows={2}
                    value={newStaff.bio}
                    onChange={(e) => setNewStaff({ ...newStaff, bio: e.target.value })}
                    placeholder="Specialist in subconscious neural reprogramming with 8+ years coaching experience..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddStaffModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">
                    {saving ? 'SAVING...' : 'REGISTER TO ROSTER'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ EDIT STAFF MEMBER MODAL ━━━ */}
      <AnimatePresence>
        {editStaffModalOpen && editingStaff && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                    EDIT <span className="text-secondary">STAFF MEMBER</span>
                  </h3>
                </div>
                <button
                  onClick={() => setEditStaffModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSaveEditStaff} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Full Name / Staff Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    placeholder="e.g. Ruwan Weerasinghe"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Role / Designation *</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.role}
                      onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                      placeholder="e.g. Mind Division Lead Coach"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Department</label>
                    <select
                      value={editingStaff.department}
                      onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    >
                      <option value="Operations">Operations</option>
                      <option value="Training & Coaching">Training & Coaching</option>
                      <option value="Sales & Growth">Sales & Growth</option>
                      <option value="Marketing & Media">Marketing & Media</option>
                      <option value="Executive Command">Executive Command</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingStaff.email || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                      placeholder="ruwan@uwe.lk"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={editingStaff.phone || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                      placeholder="077 123 4567"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Photo URL</label>
                  <input
                    type="text"
                    value={editingStaff.photoUrl || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Short Bio / Credentials</label>
                  <textarea
                    rows={2}
                    value={editingStaff.bio || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bio: e.target.value })}
                    placeholder="Coaching credentials and tactical profile..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editStaffActive"
                    checked={editingStaff.isActive}
                    onChange={(e) => setEditingStaff({ ...editingStaff, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
                  />
                  <label htmlFor="editStaffActive" className="text-on-surface font-bold cursor-pointer">
                    Active Duty Member (Visible on Active Roster)
                  </label>
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setEditStaffModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">
                    {saving ? 'SAVING...' : 'UPDATE STAFF MEMBER'}
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
