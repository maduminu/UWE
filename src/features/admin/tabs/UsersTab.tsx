import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';
import type { PageId } from '../../../components/layout/Navbar';

interface UsersTabProps {
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  setActivePage?: (page: PageId) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  setUsers,
  saving,
  setSaving,
  addToast,
  setActivePage,
}) => {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    enrolledCourseSlugs: 'bmb,leadership,ignit',
    isEnrolled: true,
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      addToast('Name and Email are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createUser(newUser);
      if (res.data) {
        setUsers((prev) => [res.data, ...prev]);
        addToast(`🎉 User Operative "${res.data.name}" registered!`);
        setAddUserModalOpen(false);
        setNewUser({
          name: '',
          email: '',
          phone: '',
          password: 'password123',
          enrolledCourseSlugs: 'bmb,leadership,ignit',
          isEnrolled: true,
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      addToast('🗑️ User account deleted');
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  const handleLoginAsUser = (u: any) => {
    localStorage.setItem(
      'uwe_user_account',
      JSON.stringify({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        enrolledCourseSlugs: u.enrolledCourseSlugs,
      })
    );
    addToast(`⚡ Logged in as Operative ${u.name}! Returning to website...`);
    if (setActivePage) {
      setTimeout(() => {
        setActivePage('home');
      }, 1200);
    }
  };

  const [coachModalUser, setCoachModalUser] = useState<any | null>(null);
  const [availableCoaches, setAvailableCoaches] = useState<Array<{ id: string; name: string; title: string }>>([]);
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [coachForm, setCoachForm] = useState({
    assignedCoachId: '',
    assignedCoachName: '',
    cohortTag: '',
  });

  const loadCoaches = async () => {
    setCoachesLoading(true);
    try {
      const res = await api.getAvailableCoaches();
      if (res.success && Array.isArray(res.data)) {
        setAvailableCoaches(res.data);
      }
    } catch {
      // Fallback default list if offline
      setAvailableCoaches([
        { id: 'inst-1', name: 'Commander Janith Perera', title: 'Chief Mindset Architect' },
        { id: 'inst-2', name: 'Suranjith Godagama', title: 'Enterprise Growth Strategist' },
        { id: 'inst-3', name: 'Dilshan Madusanka', title: 'Lead Incubator Tactician' },
      ]);
    } finally {
      setCoachesLoading(false);
    }
  };

  const handleOpenCoachModal = (u: any) => {
    setCoachModalUser(u);
    setCoachForm({
      assignedCoachId: u.assignedCoachId || '',
      assignedCoachName: u.assignedCoachName || '',
      cohortTag: u.cohortTag || 'ALPHA-COHORT-2026',
    });
    loadCoaches();
  };

  const handleSaveCoachAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachModalUser) return;
    setSaving(true);
    try {
      const res = await api.assignCoachToUser(coachModalUser.id, {
        assignedCoachId: coachForm.assignedCoachId || null,
        assignedCoachName: coachForm.assignedCoachName.trim() || null,
        cohortTag: coachForm.cohortTag.trim() || null,
      });
      if (res.data) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === coachModalUser.id
              ? {
                  ...u,
                  assignedCoachId: coachForm.assignedCoachId || null,
                  assignedCoachName: coachForm.assignedCoachName.trim() || null,
                  cohortTag: coachForm.cohortTag.trim() || null,
                }
              : u
          )
        );
        addToast(`🎯 Assigned Coach ${coachForm.assignedCoachName || 'None'} to ${coachModalUser.name}!`);
        setCoachModalUser(null);
      }
    } catch (err: any) {
      addToast(`❌ Assignment failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('ALL');
  const [selectedCoach, setSelectedCoach] = useState('ALL');

  const isFiltered = searchQuery.trim() !== '' || selectedProgram !== 'ALL' || selectedCoach !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedProgram('ALL');
    setSelectedCoach('ALL');
  };

  const displayedUsers = users.filter((u: any) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = (u.name || '').toLowerCase().includes(q);
      const matchesEmail = (u.email || '').toLowerCase().includes(q);
      const matchesPhone = (u.phone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      if (!matchesName && !matchesEmail && !matchesPhone) return false;
    }

    if (selectedProgram !== 'ALL') {
      const enrolled = (u.enrolledCourseSlugs || '').toLowerCase();
      if (!enrolled.includes(selectedProgram.toLowerCase())) return false;
    }

    if (selectedCoach !== 'ALL') {
      if (selectedCoach === 'UNASSIGNED') {
        if (u.assignedCoachName) return false;
      } else {
        if (u.assignedCoachName !== selectedCoach) return false;
      }
    }

    return true;
  });

  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="bg-[#0E131F] rounded-2xl border border-secondary/30 overflow-hidden">
        <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">manage_accounts</span>
              Registered Operatives & Multi-Coach Directory
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant">
              Manage authenticated student accounts, XP progression, and assigned Command Coaches
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                exportToCSV(
                  'uwe_operatives',
                  displayedUsers.map((u) => ({
                    ID: u.id,
                    Name: u.name,
                    Email: u.email,
                    Phone: u.phone || 'N/A',
                    XP: u.xp || 0,
                    Rank: u.rankTitle || 'Novice Operative',
                    AssignedCoach: u.assignedCoachName || 'Unassigned',
                    Cohort: u.cohortTag || 'N/A',
                    EnrolledPrograms: u.enrolledCourseSlugs || 'None',
                    IsEnrolled: u.isEnrolled ? 'YES' : 'NO',
                    RegisteredDate: new Date(u.createdAt).toLocaleString(),
                  })),
                  addToast
                )
              }
              className="px-3.5 py-2 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
            </button>
            <span className="px-2.5 py-1 rounded bg-[#131929] border border-outline-variant/40 font-mono-data text-xs text-secondary font-bold">
              {displayedUsers.length} / {users.length} OPERATIVES
            </span>
            <button
              onClick={() => setAddUserModalOpen(true)}
              className="btn-elite px-5 py-2 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>+ REGISTER OPERATIVE</span>
            </button>
          </div>
        </div>

        {/* ── Contextual Tactical Search & Filter Bar ── */}
        <div className="p-4 bg-[#0A0E18] border-b border-outline-variant/30 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Operative Name, Email, or Phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Program Filter Dropdown */}
          <div className="min-w-[160px]">
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Directives</option>
              <option value="bmb">BMB Mind Division</option>
              <option value="leadership">Leadership Academy</option>
              <option value="ignit">IGNIT Incubator</option>
            </select>
          </div>

          {/* Coach Filter Dropdown */}
          <div className="min-w-[170px]">
            <select
              value={selectedCoach}
              onChange={(e) => setSelectedCoach(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Assigned Coaches</option>
              <option value="UNASSIGNED">[ Unassigned Operatives ]</option>
              {availableCoaches.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">filter_alt_off</span>
              RESET
            </button>
          )}
        </div>

        <div className="divide-y divide-outline-variant/20">
          {displayedUsers.length === 0 && (
            <div className="p-8 text-center font-mono-data text-sm text-on-surface-variant">
              {isFiltered
                ? 'No operatives match your filter criteria. Try adjusting your query or resetting filters.'
                : 'No registered student operatives found in database.'}
            </div>
          )}
          {displayedUsers.map((u: any) => {
            const slugs = (u.enrolledCourseSlugs || '').toLowerCase();
            const hasBmb = slugs.includes('bmb');
            const hasLeadership = slugs.includes('leadership');
            const hasIgnit = slugs.includes('ignit');

            const toggleAccess = async (slug: string, currentlyHas: boolean) => {
              let newSlugs = slugs
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
              if (currentlyHas) {
                newSlugs = newSlugs.filter((s: string) => s !== slug);
              } else {
                newSlugs.push(slug);
              }
              const newSlugStr = newSlugs.join(',');
              try {
                const res = await api.updateUser(u.id, {
                  enrolledCourseSlugs: newSlugStr,
                  isEnrolled: newSlugs.length > 0,
                });
                if (res.data) {
                  setUsers((prev) =>
                    prev.map((usr) =>
                      usr.id === u.id
                        ? { ...usr, enrolledCourseSlugs: newSlugStr, isEnrolled: newSlugs.length > 0 }
                        : usr
                    )
                  );
                  addToast(
                    `⚡ ${u.name}'s ${slug.toUpperCase()} access ${currentlyHas ? 'REVOKED' : 'GRANTED'}`
                  );
                }
              } catch (err: any) {
                addToast(`❌ Failed: ${err.message}`, 'error');
              }
            };

            return (
              <div
                key={u.id}
                className="p-4 hover:bg-[#131929]/60 transition-colors border-b border-outline-variant/10 last:border-0"
              >
                {/* Top row: avatar + details + actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">verified_user</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-headline-md text-sm text-on-surface font-bold">
                          {u.name}
                        </h4>
                        {u.isEnrolled ? (
                          <span className="px-2 py-0.5 rounded bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 text-[10px] font-mono-data font-bold">
                            ENROLLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-400/40 text-[10px] font-mono-data font-bold">
                            NO ACCESS
                          </span>
                        )}
                        {/* XP and Rank Badge */}
                        <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 text-[10px] font-mono-data font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">bolt</span>
                          {u.xp || 0} XP • {u.rankTitle || 'Novice Operative'}
                        </span>
                        {/* Assigned Coach Badge */}
                        {u.assignedCoachName ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono-data font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">school</span>
                            COACH: {u.assignedCoachName} ({u.cohortTag || 'ALPHA'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 text-[10px] font-mono-data">
                            NO COACH ASSIGNED
                          </span>
                        )}
                      </div>
                      <span className="font-mono-data text-xs text-on-surface-variant">
                        {u.email} • {u.phone || 'No phone'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Coach Assignment Button */}
                    <button
                      onClick={() => handleOpenCoachModal(u)}
                      className="px-3 py-1.5 rounded bg-blue-500/15 border border-blue-500/40 text-blue-300 hover:bg-blue-500/25 transition-colors font-mono-data text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">assignment_ind</span>
                      <span>ASSIGN COACH</span>
                    </button>

                    <button
                      onClick={() => handleLoginAsUser(u)}
                      className="px-3 py-1.5 rounded bg-secondary/15 border border-secondary/50 text-secondary font-mono-data text-xs font-bold hover:bg-secondary hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">login</span>
                      <span>LOGIN AS USER</span>
                    </button>
                    <a
                      href={`https://wa.me/94717096386?text=Hello%20Operative%20${encodeURIComponent(u.name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded bg-[#25D366] text-black font-label-caps text-[11px] font-bold uppercase hover:scale-105 transition-transform flex items-center gap-1"
                    >
                      WHATSAPP <span className="material-symbols-outlined text-xs">east</span>
                    </a>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded text-red-400 hover:bg-red-500/10 cursor-pointer"
                      title="Delete User"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>

                {/* Program Access Toggles */}
                <div className="mt-3 ml-13 pl-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Program Access:
                  </span>

                  {/* BMB Toggle */}
                  <button
                    onClick={() => toggleAccess('bmb', hasBmb)}
                    className={`px-3 py-1 rounded-full font-mono-data text-[10px] font-bold uppercase flex items-center gap-1 border transition-all cursor-pointer ${
                      hasBmb
                        ? 'bg-[#00D2FF]/20 border-[#00D2FF]/60 text-[#00D2FF] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400'
                        : 'bg-[#131929] border-outline-variant/30 text-on-surface-variant hover:bg-[#00D2FF]/20 hover:border-[#00D2FF]/60 hover:text-[#00D2FF]'
                    }`}
                    title={hasBmb ? 'Revoke BMB access' : 'Grant BMB access'}
                  >
                    <span className="material-symbols-outlined text-xs">{hasBmb ? 'lock_open' : 'lock'}</span>
                    BMB
                  </button>

                  {/* Leadership Toggle */}
                  <button
                    onClick={() => toggleAccess('leadership', hasLeadership)}
                    className={`px-3 py-1 rounded-full font-mono-data text-[10px] font-bold uppercase flex items-center gap-1 border transition-all cursor-pointer ${
                      hasLeadership
                        ? 'bg-[#FFB800]/20 border-[#FFB800]/60 text-[#FFB800] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400'
                        : 'bg-[#131929] border-outline-variant/30 text-on-surface-variant hover:bg-[#FFB800]/20 hover:border-[#FFB800]/60 hover:text-[#FFB800]'
                    }`}
                    title={hasLeadership ? 'Revoke Leadership access' : 'Grant Leadership access'}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {hasLeadership ? 'lock_open' : 'lock'}
                    </span>
                    LEADERSHIP
                  </button>

                  {/* IGNIT Toggle */}
                  <button
                    onClick={() => toggleAccess('ignit', hasIgnit)}
                    className={`px-3 py-1 rounded-full font-mono-data text-[10px] font-bold uppercase flex items-center gap-1 border transition-all cursor-pointer ${
                      hasIgnit
                        ? 'bg-[#FF4757]/20 border-[#FF4757]/60 text-[#FF4757] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400'
                        : 'bg-[#131929] border-outline-variant/30 text-on-surface-variant hover:bg-[#FF4757]/20 hover:border-[#FF4757]/60 hover:text-[#FF4757]'
                    }`}
                    title={hasIgnit ? 'Revoke IGNIT access' : 'Grant IGNIT access'}
                  >
                    <span className="material-symbols-outlined text-xs">{hasIgnit ? 'lock_open' : 'lock'}</span>
                    IGNIT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━ REGISTER NEW OPERATIVE USER MODAL ━━━ */}
      <AnimatePresence>
        {addUserModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                  REGISTER STUDENT <span className="text-secondary">OPERATIVE</span>
                </h3>
                <button
                  onClick={() => setAddUserModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Full Name / Operative Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Kasun Fernando"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="kasun@gmail.com"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="077 123 4567"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Password</label>
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="password123"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">
                    Enrolled Program Slugs (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newUser.enrolledCourseSlugs}
                    onChange={(e) => setNewUser({ ...newUser, enrolledCourseSlugs: e.target.value })}
                    placeholder="bmb,leadership,ignit"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddUserModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">
                    {saving ? 'SAVING...' : 'REGISTER OPERATIVE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ ASSIGN COMMAND COACH MODAL ━━━ */}
      <AnimatePresence>
        {coachModalUser && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-blue-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">school</span>
                  <h3 className="font-headline-md text-base text-on-surface font-black uppercase">
                    ASSIGN COMMAND COACH
                  </h3>
                </div>
                <button
                  onClick={() => setCoachModalUser(null)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#131929] border border-outline-variant/30 text-xs font-mono-data">
                <p className="text-on-surface font-bold">{coachModalUser.name}</p>
                <p className="text-on-surface-variant">{coachModalUser.email}</p>
              </div>

              <form onSubmit={handleSaveCoachAssignment} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-blue-300 font-bold block mb-1">Select Coach from Database *</label>
                  <select
                    value={coachForm.assignedCoachName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matchedCoach = availableCoaches.find((c) => c.name === selectedName);
                      setCoachForm({
                        ...coachForm,
                        assignedCoachName: selectedName,
                        assignedCoachId: matchedCoach ? matchedCoach.id : '',
                      });
                    }}
                    className="w-full p-2.5 rounded-lg bg-[#131929] border border-blue-500/40 text-on-surface focus:border-blue-400 outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Coach from Database --</option>
                    {availableCoaches.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.title})
                      </option>
                    ))}
                    <option value="">[ CLEAR / UNASSIGN COACH ]</option>
                  </select>
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Loaded live from active Empire coaches & instructors in database.
                  </p>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Custom Coach Name (Optional Override)</label>
                  <input
                    type="text"
                    value={coachForm.assignedCoachName}
                    onChange={(e) => setCoachForm({ ...coachForm, assignedCoachName: e.target.value })}
                    placeholder="e.g. Commander Janith Perera"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-outline-variant/40 text-blue-300"
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Cohort / Squad Tag</label>
                  <input
                    type="text"
                    value={coachForm.cohortTag}
                    onChange={(e) => setCoachForm({ ...coachForm, cohortTag: e.target.value })}
                    placeholder="e.g. ALPHA-COHORT-2026"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-outline-variant/40"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setCoachModalUser(null)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'ASSIGNING...' : 'CONFIRM ASSIGNMENT'}
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
