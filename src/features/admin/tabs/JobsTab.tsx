import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';

interface JobsTabProps {
  jobVacancies: any[];
  setJobVacancies: React.Dispatch<React.SetStateAction<any[]>>;
  jobApplications: any[];
  setJobApplications: React.Dispatch<React.SetStateAction<any[]>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobVacancies,
  setJobVacancies,
  jobApplications,
  setJobApplications,
  saving,
  setSaving,
  addToast,
}) => {
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [appSelectedStatus, setAppSelectedStatus] = useState('ALL');

  const isAppFiltered = appSearchQuery.trim() !== '' || appSelectedStatus !== 'ALL';

  const resetAppFilters = () => {
    setAppSearchQuery('');
    setAppSelectedStatus('ALL');
  };

  const displayedApplications = jobApplications.filter((a) => {
    if (appSearchQuery.trim()) {
      const q = appSearchQuery.toLowerCase().trim();
      const matchesName = (a.name || '').toLowerCase().includes(q);
      const matchesEmail = (a.email || '').toLowerCase().includes(q);
      const matchesPhone = (a.phone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      const matchesVacancy = (a.vacancy?.title || '').toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesPhone && !matchesVacancy) return false;
    }

    if (appSelectedStatus !== 'ALL') {
      if (a.status !== appSelectedStatus) return false;
    }

    return true;
  });

  const [newJob, setNewJob] = useState({
    title: '',
    department: 'Sales & Growth',
    employmentType: 'WORK_FROM_HOME',
    incomeText: 'RS. 45,000 - RS. 120,000 + High Commission',
    requirements: 'Strong interpersonal communication skills, basic WhatsApp fluency, self-motivated.',
    openPositions: 5,
    isActive: true,
  });

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.incomeText) {
      addToast('Title and Income details are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createJobVacancy({
        ...newJob,
        openPositions: Number(newJob.openPositions) || 5,
      });
      if (res.data) {
        setJobVacancies((prev) => [res.data, ...prev]);
        addToast(`🎉 Job vacancy "${res.data.title}" published!`);
        setAddJobModalOpen(false);
        setNewJob({
          title: '',
          department: 'Sales & Growth',
          employmentType: 'WORK_FROM_HOME',
          incomeText: 'RS. 45,000 - RS. 120,000 + High Commission',
          requirements: 'Strong interpersonal communication skills, basic WhatsApp fluency, self-motivated.',
          openPositions: 5,
          isActive: true,
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleJobActive = async (jobId: string, currentIsActive: boolean) => {
    try {
      const res = await api.updateJobVacancy(jobId, { isActive: !currentIsActive });
      if (res.data) {
        setJobVacancies((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, isActive: !currentIsActive } : j))
        );
        addToast(`Job status set to ${!currentIsActive ? 'ACTIVE' : 'CLOSED'}`);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    }
  };

  const handleUpdateJobSlots = async (jobId: string, openPositions: number) => {
    try {
      const res = await api.updateJob(jobId, { openPositions });
      if (res.data) {
        setJobVacancies((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  openPositions,
                  hiringStatus: res.data.hiringStatus,
                  isActive: res.data.isActive,
                }
              : j
          )
        );
        addToast(`✅ Vacancy slots updated to ${openPositions}`);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const res = await api.updateJobApplicationStatus(appId, newStatus);
      if (res.data) {
        setJobApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );
        // Re-sync job vacancies to reflect updated hired counts & hiring status
        const updatedJobs = await api.getJobVacancies().catch(() => null);
        if (updatedJobs?.data) setJobVacancies(updatedJobs.data);

        addToast(`Applicant status updated to ${newStatus} & synced with Job Vacancies!`);
      }
    } catch (err: any) {
      addToast(`❌ Update failed: ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="jobs"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      {/* Job Vacancies Section */}
      <div className="bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-outline-variant/30 pb-4">
          <div>
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">work</span>
              Job Vacancies & Live Hiring Sync
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant">
              Automatic slot calculation: Available Positions = Total Slots − Hired Applicants
            </p>
          </div>
          <button
            onClick={() => setAddJobModalOpen(true)}
            className="btn-elite px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]"
          >
            <span className="material-symbols-outlined text-sm">add_business</span>
            <span>+ PUBLISH VACANCY</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobVacancies.length === 0 && (
            <div className="col-span-2 p-6 text-center font-mono-data text-xs text-on-surface-variant">
              No active job openings. Click <strong>+ PUBLISH VACANCY</strong> to create one.
            </div>
          )}
          {jobVacancies.map((job) => {
            const openPos = job.openPositions ?? 5;
            const hired = job.hiredCount ?? 0;
            const availableSlots = Math.max(0, openPos - hired);
            const isFinished = job.hiringStatus === 'HIRING_FINISHED' || availableSlots === 0 || !job.isActive;
            const isUrgent = !isFinished && availableSlots <= 2;

            return (
              <div
                key={job.id}
                className={`p-5 rounded-2xl bg-[#131929] border transition-all space-y-4 shadow-lg ${
                  isFinished
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : isUrgent
                    ? 'border-amber-500/50 bg-amber-950/10 shadow-[0_0_15px_rgba(255,184,0,0.1)]'
                    : 'border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_15px_rgba(46,213,115,0.08)]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary font-bold border border-secondary/30">
                        {job.department}
                      </span>

                      {/* Live Color Coded Status Badge */}
                      {isFinished ? (
                        <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          HIRING FINISHED
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          HIRING (URGENT • {availableSlots} LEFT)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          HIRING ({availableSlots} OPEN)
                        </span>
                      )}
                    </div>
                    <h4 className="font-headline-md text-base text-on-surface font-bold">{job.title}</h4>
                  </div>

                  <button
                    onClick={() => handleToggleJobActive(job.id, job.isActive)}
                    className={`px-3 py-1 rounded text-xs font-mono-data font-bold border cursor-pointer transition-all ${
                      job.isActive
                        ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50 hover:bg-[#2ED573]/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
                    }`}
                  >
                    {job.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>

                {/* Slots & Live Progress Bar */}
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-outline-variant/30 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono-data">
                    <span className="text-on-surface-variant">Position Capacity:</span>
                    <span className="font-bold text-on-surface">
                      <span className="text-secondary">{hired} Hired</span> / {openPos} Total Slots (
                      <strong className={isFinished ? 'text-rose-400' : isUrgent ? 'text-amber-300' : 'text-emerald-400'}>
                        {availableSlots} Available
                      </strong>
                      )
                    </span>
                  </div>

                  <div className="w-full bg-[#1A2133] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFinished ? 'bg-rose-500' : isUrgent ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, (hired / openPos) * 100)}%` }}
                    />
                  </div>

                  {/* Quick Adjuster for Total Slots */}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono-data">
                    <span className="text-on-surface-variant">Adjust Total Open Positions:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateJobSlots(job.id, Math.max(1, openPos - 1))}
                        className="w-6 h-6 rounded bg-[#1A2133] hover:bg-secondary/20 hover:text-secondary border border-outline-variant/40 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-secondary">{openPos}</span>
                      <button
                        onClick={() => handleUpdateJobSlots(job.id, openPos + 1)}
                        className="w-6 h-6 rounded bg-[#1A2133] hover:bg-secondary/20 hover:text-secondary border border-outline-variant/40 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono-data space-y-1 text-on-surface-variant">
                  <div>
                    Type: <strong className="text-on-surface">{job.employmentType}</strong>
                  </div>
                  <div>
                    Income: <strong className="text-secondary">{job.incomeText}</strong>
                  </div>
                  <div>
                    Applications: <strong className="text-on-surface">{job._count?.applications ?? 0} applied</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recruitment Applications Table */}
      <div className="bg-[#0E131F] rounded-2xl border border-outline-variant/30 overflow-hidden">
        <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">assignment_ind</span>
              Recruitment Job Applications & Auto-Hiring Sync
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant">
              Setting an applicant status to <strong>HIRED</strong> auto-deducts available slots and closes vacancy when
              capacity is reached.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                exportToCSV(
                  'uwe_job_applicants',
                  displayedApplications.map((a) => ({
                    ID: a.id,
                    Name: a.name,
                    Phone: a.phone,
                    Email: a.email || 'N/A',
                    AppliedFor: a.vacancy?.title || 'General Vacancy',
                    Experience: a.experience || 'N/A',
                    Status: a.status,
                    Date: new Date(a.createdAt).toLocaleString(),
                  })),
                  addToast
                )
              }
              className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
            </button>
            <span className="px-2.5 py-1 rounded bg-[#131929] border border-outline-variant/40 font-mono-data text-xs text-secondary font-bold">
              {displayedApplications.length} / {jobApplications.length} CANDIDATES
            </span>
          </div>
        </div>

        {/* ── Contextual Tactical Search & Filter Bar for Candidates ── */}
        <div className="p-4 bg-[#0A0E18] border-b border-outline-variant/30 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
              search
            </span>
            <input
              type="text"
              value={appSearchQuery}
              onChange={(e) => setAppSearchQuery(e.target.value)}
              placeholder="Search Candidate Name, Email, or Phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary focus:outline-none transition-colors"
            />
            {appSearchQuery && (
              <button
                onClick={() => setAppSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Application Status Filter Dropdown */}
          <div className="min-w-[170px]">
            <select
              value={appSelectedStatus}
              onChange={(e) => setAppSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface focus:border-secondary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Application Statuses</option>
              <option value="APPLIED">APPLIED</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="HIRED">HIRED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isAppFiltered && (
            <button
              onClick={resetAppFilters}
              className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">filter_alt_off</span>
              RESET
            </button>
          )}
        </div>

        <div className="divide-y divide-outline-variant/20">
          {displayedApplications.length === 0 && (
            <div className="p-8 text-center font-mono-data text-sm text-on-surface-variant">
              {isAppFiltered
                ? 'No candidate applications match your search criteria. Try resetting filters.'
                : 'No job applications submitted yet.'}
            </div>
          )}
          {displayedApplications.map((app) => (
            <div
              key={app.id}
              className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 hover:bg-[#131929]/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    app.status === 'HIRED'
                      ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50'
                      : 'bg-secondary/20 text-secondary border border-secondary/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {app.status === 'HIRED' ? 'verified' : 'badge'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline-md text-sm text-on-surface font-bold">{app.name}</h4>
                    {app.status === 'HIRED' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 font-mono-data text-[10px] font-black">
                        HIRED OPERATIVE
                      </span>
                    )}
                  </div>
                  <span className="font-mono-data text-xs text-on-surface-variant">
                    {app.phone} • {app.email || 'No Email'}
                  </span>
                  <span className="font-mono-data text-xs text-secondary block mt-0.5">
                    Applied for: {app.vacancy?.title || 'General Vacancy'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xs font-mono-data text-on-surface-variant max-w-xs truncate">
                  Exp: <span className="text-on-surface">{app.experience}</span>
                </div>

                {/* Status Select with Auto-Sync */}
                <select
                  value={app.status}
                  onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-data font-bold border cursor-pointer transition-colors ${
                    app.status === 'HIRED'
                      ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/60'
                      : 'bg-[#131929] text-secondary border-secondary/40'
                  }`}
                >
                  <option value="APPLIED">APPLIED</option>
                  <option value="REVIEWED">REVIEWED</option>
                  <option value="SHORTLISTED">SHORTLISTED</option>
                  <option value="HIRED">HIRED (Auto-Deduct Position)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                <a
                  href={`https://wa.me/94717096386?text=Hello%20${encodeURIComponent(
                    app.name
                  )}%2C%20regarding%20your%20application%20for%20${encodeURIComponent(app.vacancy?.title || 'position')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded bg-[#25D366] text-black font-label-caps text-[11px] font-bold uppercase hover:scale-105 transition-transform flex items-center gap-1"
                >
                  WHATSAPP <span className="material-symbols-outlined text-xs">east</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ PUBLISH JOB VACANCY MODAL ━━━ */}
      <AnimatePresence>
        {addJobModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                  PUBLISH JOB <span className="text-secondary">VACANCY</span>
                </h3>
                <button
                  onClick={() => setAddJobModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Sales & Growth Officer"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Department</label>
                    <input
                      type="text"
                      value={newJob.department}
                      onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                      placeholder="Sales & Growth"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Employment Type</label>
                    <select
                      value={newJob.employmentType}
                      onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    >
                      <option value="WORK_FROM_HOME">WORK FROM HOME</option>
                      <option value="FULL_TIME">FULL TIME</option>
                      <option value="PART_TIME">PART TIME</option>
                      <option value="HYBRID">HYBRID</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Income & Salary Text *</label>
                    <input
                      type="text"
                      required
                      value={newJob.incomeText}
                      onChange={(e) => setNewJob({ ...newJob, incomeText: e.target.value })}
                      placeholder="RS. 45,000 - RS. 120,000"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-secondary font-bold block mb-1">Total Open Slots *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newJob.openPositions}
                      onChange={(e) => setNewJob({ ...newJob, openPositions: parseInt(e.target.value) || 1 })}
                      placeholder="5"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Requirements & Qualifications</label>
                  <textarea
                    rows={2}
                    value={newJob.requirements}
                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                    placeholder="Key skills required..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddJobModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant"
                  >
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">
                    {saving ? 'SAVING...' : 'PUBLISH VACANCY'}
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
