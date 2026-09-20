import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';
import { useRealtimeEvent } from '../../../services/realtime';

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
  const [editJobModalOpen, setEditJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);

  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [appSelectedStatus, setAppSelectedStatus] = useState('ALL');

  const isAppFiltered = appSearchQuery.trim() !== '' || appSelectedStatus !== 'ALL';

  const resetAppFilters = () => {
    setAppSearchQuery('');
    setAppSelectedStatus('ALL');
  };

  const fetchJobsAndApps = useCallback(async () => {
    try {
      const [jobsRes, appsRes] = await Promise.allSettled([
        api.getJobVacancies(),
        api.getJobApplications(),
      ]);
      if (jobsRes.status === 'fulfilled' && jobsRes.value?.data) {
        setJobVacancies(jobsRes.value.data);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value?.data) {
        setJobApplications(appsRes.value.data);
      }
    } catch {
      // offline fallback
    }
  }, [setJobVacancies, setJobApplications]);

  useEffect(() => {
    fetchJobsAndApps();
  }, [fetchJobsAndApps]);

  useRealtimeEvent('job:updated', () => fetchJobsAndApps());
  useRealtimeEvent('job_app:updated', () => fetchJobsAndApps());

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

  const handleOpenEditJob = (job: any) => {
    setEditingJob({
      id: job.id,
      title: job.title || '',
      department: job.department || 'Sales & Growth',
      employmentType: job.employmentType || 'WORK_FROM_HOME',
      incomeText: job.incomeText || '',
      requirements: job.requirements || '',
      openPositions: job.openPositions ?? 5,
      isActive: job.isActive ?? true,
    });
    setEditJobModalOpen(true);
  };

  const handleSaveEditJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob?.id || !editingJob.title || !editingJob.incomeText) {
      addToast('Title and Income details are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateJobVacancy(editingJob.id, {
        title: editingJob.title,
        department: editingJob.department,
        employmentType: editingJob.employmentType,
        incomeText: editingJob.incomeText,
        requirements: editingJob.requirements,
        openPositions: Number(editingJob.openPositions) || 5,
        isActive: editingJob.isActive,
      });
      if (res.data) {
        setJobVacancies((prev) => prev.map((j) => (j.id === editingJob.id ? res.data : j)));
        addToast(`✅ Vacancy "${res.data.title}" updated!`);
        setEditJobModalOpen(false);
        setEditingJob(null);
      }
    } catch (err: any) {
      addToast(`❌ Edit failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (jobId: string, title: string) => {
    if (!window.confirm(`Permanently delete the "${title}" job opening?`)) return;
    try {
      await api.deleteJobVacancy(jobId);
      setJobVacancies((prev) => prev.filter((j) => j.id !== jobId));
      addToast(`🗑️ Job vacancy "${title}" removed.`);
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteApplication = async (appId: string, applicantName: string) => {
    if (!window.confirm(`Delete application for "${applicantName}"?`)) return;
    try {
      await api.deleteJobApplication(appId);
      setJobApplications((prev) => prev.filter((a) => a.id !== appId));
      addToast(`🗑️ Application for "${applicantName}" deleted.`);
      fetchJobsAndApps();
    } catch (err: any) {
      addToast(`❌ Delete failed: ${err.message}`, 'error');
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
      const res = await api.updateJobVacancy(jobId, { openPositions });
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
              Job Vacancies &amp; Live Hiring Sync
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
            <div className="col-span-2 p-8 text-center font-mono-data text-xs text-on-surface-variant border border-dashed border-outline-variant/30 rounded-xl bg-[#080C16]">
              No active job openings in database. Click <strong>+ PUBLISH VACANCY</strong> to create one.
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

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditJob(job)}
                      className="p-1.5 rounded-lg bg-[#1D253B] text-secondary hover:bg-secondary hover:text-black transition-all cursor-pointer"
                      title="Edit Vacancy"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Delete Vacancy"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                    <button
                      onClick={() => handleToggleJobActive(job.id, job.isActive)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-data font-bold border cursor-pointer transition-all ${
                        job.isActive
                          ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50 hover:bg-[#2ED573]/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
                      }`}
                    >
                      {job.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
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
                        className="w-6 h-6 rounded bg-[#1A2133] hover:bg-secondary/20 hover:text-secondary border border-outline-variant/40 flex items-center justify-center font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-secondary">{openPos}</span>
                      <button
                        onClick={() => handleUpdateJobSlots(job.id, openPos + 1)}
                        className="w-6 h-6 rounded bg-[#1A2133] hover:bg-secondary/20 hover:text-secondary border border-outline-variant/40 flex items-center justify-center font-bold cursor-pointer"
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

      {/* Recruitment Applications Section */}
      <div className="bg-[#0E131F] p-6 rounded-2xl border border-outline-variant/30 space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-outline-variant/30 pb-4">
          <div>
            <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">badge</span>
              Recruitment Job Applications &amp; Auto-Hiring Sync
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant">
              Setting an applicant status to <strong>HIRED</strong> auto-deducts available slots and closes vacancy when capacity is reached.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV('uwe_job_applications', jobApplications, addToast)}
              className="px-3.5 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 text-xs font-mono-data text-on-surface font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>EXPORT CSV</span>
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary font-mono-data text-xs font-bold">
              {displayedApplications.length} / {jobApplications.length} CANDIDATES
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search Candidate Name, Email, or Phone..."
              value={appSearchQuery}
              onChange={(e) => setAppSearchQuery(e.target.value)}
              className="input-field w-full pl-9 pr-3 py-2 text-xs font-mono-data rounded-xl bg-[#131929] border border-outline-variant/30"
            />
          </div>

          <select
            value={appSelectedStatus}
            onChange={(e) => setAppSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131929] border border-outline-variant/30 text-xs font-mono-data text-on-surface cursor-pointer"
          >
            <option value="ALL">All Application Statuses</option>
            <option value="NEW">NEW</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="INTERVIEW_SCHEDULED">INTERVIEW SCHEDULED</option>
            <option value="HIRED">HIRED (Auto-Slot Deduction)</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Applications List */}
        {displayedApplications.length === 0 ? (
          <div className="p-8 text-center font-mono-data text-xs text-on-surface-variant border border-dashed border-outline-variant/30 rounded-xl">
            {isAppFiltered ? 'No candidates match your current filter.' : 'No job applications submitted yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-xl bg-[#131929] border border-outline-variant/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-secondary/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-headline-md text-sm text-on-surface font-bold">{app.name}</h5>
                    <span className="font-mono-data text-[10px] px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                      {app.vacancy?.title || 'General Position'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono-data text-on-surface-variant flex-wrap">
                    <span>📧 {app.email || 'N/A'}</span>
                    <span>📞 {app.phone}</span>
                    <span>🕒 {new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                  {app.experience && (
                    <p className="font-mono-data text-xs text-on-surface-variant bg-[#0E131F] p-2 rounded-lg border border-outline-variant/20 max-w-xl">
                      "{app.experience}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <select
                    value={app.status}
                    onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#0E131F] border border-secondary/40 text-xs font-mono-data text-secondary font-bold cursor-pointer"
                  >
                    <option value="NEW">🟢 NEW</option>
                    <option value="REVIEWED">🟡 REVIEWED</option>
                    <option value="INTERVIEW_SCHEDULED">🔵 INTERVIEW</option>
                    <option value="HIRED">⭐ HIRED (SLOT -1)</option>
                    <option value="REJECTED">🔴 REJECTED</option>
                  </select>

                  <button
                    onClick={() => handleDeleteApplication(app.id, app.name)}
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    title="Delete Application"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━ ADD JOB VACANCY MODAL ━━━ */}
      <AnimatePresence>
        {addJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0E131F] border border-secondary/60 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">work</span>
                  <h3 className="font-display text-lg font-bold text-on-surface">Publish New Job Vacancy</h3>
                </div>
                <button
                  onClick={() => setAddJobModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4 font-mono-data text-xs">
                <div>
                  <label className="text-secondary font-bold block mb-1">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Senior Mind Transformation Coach"
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Department</label>
                    <select
                      value={newJob.department}
                      onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-on-surface"
                    >
                      <option value="Sales & Growth">Sales &amp; Growth</option>
                      <option value="Coaching & Training">Coaching &amp; Training</option>
                      <option value="Technology & Digital">Technology &amp; Digital</option>
                      <option value="Marketing & Branding">Marketing &amp; Branding</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-secondary font-bold block mb-1">Employment Type</label>
                    <select
                      value={newJob.employmentType}
                      onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-on-surface"
                    >
                      <option value="WORK_FROM_HOME">Work From Home</option>
                      <option value="FULL_TIME">Full Time (On-Site)</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Income / Salary Package *</label>
                    <input
                      type="text"
                      required
                      value={newJob.incomeText}
                      onChange={(e) => setNewJob({ ...newJob, incomeText: e.target.value })}
                      placeholder="RS. 60,000 - RS. 120,000"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-secondary font-bold block mb-1">Total Open Positions *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newJob.openPositions}
                      onChange={(e) => setNewJob({ ...newJob, openPositions: parseInt(e.target.value) || 1 })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Candidate Requirements</label>
                  <textarea
                    rows={3}
                    value={newJob.requirements}
                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                    placeholder="Key skills, experience and prerequisites..."
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setAddJobModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'PUBLISHING...' : 'PUBLISH VACANCY'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ EDIT JOB VACANCY MODAL ━━━ */}
      <AnimatePresence>
        {editJobModalOpen && editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0E131F] border border-secondary/60 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">edit</span>
                  <h3 className="font-display text-lg font-bold text-on-surface">Edit Job Vacancy</h3>
                </div>
                <button
                  onClick={() => setEditJobModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditJob} className="space-y-4 font-mono-data text-xs">
                <div>
                  <label className="text-secondary font-bold block mb-1">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={editingJob.title}
                    onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Department</label>
                    <select
                      value={editingJob.department}
                      onChange={(e) => setEditingJob({ ...editingJob, department: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-on-surface"
                    >
                      <option value="Sales & Growth">Sales &amp; Growth</option>
                      <option value="Coaching & Training">Coaching &amp; Training</option>
                      <option value="Technology & Digital">Technology &amp; Digital</option>
                      <option value="Marketing & Branding">Marketing &amp; Branding</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-secondary font-bold block mb-1">Employment Type</label>
                    <select
                      value={editingJob.employmentType}
                      onChange={(e) => setEditingJob({ ...editingJob, employmentType: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-on-surface"
                    >
                      <option value="WORK_FROM_HOME">Work From Home</option>
                      <option value="FULL_TIME">Full Time (On-Site)</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Income / Salary Package *</label>
                    <input
                      type="text"
                      required
                      value={editingJob.incomeText}
                      onChange={(e) => setEditingJob({ ...editingJob, incomeText: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-secondary font-bold block mb-1">Total Open Positions *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editingJob.openPositions}
                      onChange={(e) => setEditingJob({ ...editingJob, openPositions: parseInt(e.target.value) || 1 })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Candidate Requirements</label>
                  <textarea
                    rows={3}
                    value={editingJob.requirements}
                    onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-secondary/40"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setEditJobModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'SAVING...' : 'SAVE CHANGES'}
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
