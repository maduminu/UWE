import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from '../layout/Navbar';
import { PageSEO } from '../ui/PageSEO';
import { api } from '../../services/api';
import { authService } from '../../services/auth';
import { safeGetStorage } from '../../utils/storage';

interface CareersPageProps {
  setActivePage?: (page: PageId) => void;
}

interface JobVacancy {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  incomeText: string;
  requirements: string;
  openPositions?: number;
  hiredCount?: number;
  hiringStatus?: 'HIRING' | 'HIRING_FINISHED' | 'PAUSED';
  isActive: boolean;
}

export const CareersPage: React.FC<CareersPageProps> = () => {
  const loggedInUser = authService.getStudentUser() || safeGetStorage<any>('uwe_user_account', null);
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobVacancy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const [applicant, setApplicant] = useState({
    name: loggedInUser?.name || '',
    phone: loggedInUser?.phone || '',
    email: loggedInUser?.email || '',
    experience: '',
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.getJobVacancies();
        if (res.data && res.data.length > 0) {
          setVacancies(res.data);
        } else {
          setVacancies([]);
        }
      } catch {
        setVacancies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const departments = ['all', ...Array.from(new Set(vacancies.map((v) => v.department)))];

  const filteredJobs = selectedDept === 'all'
    ? vacancies
    : vacancies.filter((v) => v.department === selectedDept);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenApply = (job: JobVacancy) => {
    const activeUser = authService.getStudentUser() || safeGetStorage<any>('uwe_user_account', null);
    setSelectedJob(job);
    setApplyModalOpen(true);
    setSuccessMessage(false);
    setErrorMessage(null);
    if (activeUser) {
      setApplicant((prev) => ({
        ...prev,
        name: prev.name || activeUser.name || '',
        phone: prev.phone || activeUser.phone || '',
        email: prev.email || activeUser.email || '',
      }));
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.applyForJob({
        vacancyId: selectedJob.id,
        name: applicant.name.trim(),
        phone: applicant.phone.trim(),
        email: applicant.email ? applicant.email.trim() : undefined,
        experience: applicant.experience.trim(),
      });
      setSuccessMessage(true);
      setTimeout(() => {
        setApplyModalOpen(false);
        setApplicant({ name: '', phone: '', email: '', experience: '' });
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Application could not be submitted. Please connect directly via WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative font-sans">
      <PageSEO
        title="Careers & Recruitment"
        description="Join the UWE syndicate. Explore open positions in training, sales, and operations."
        canonical="/careers"
      />
      {/* Header Banner */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-md relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-secondary/15 border border-secondary/40 text-secondary text-xs font-mono-data uppercase font-bold mb-3 shadow-[0_0_15px_rgba(255,184,0,0.2)]"
        >
          <span className="material-symbols-outlined text-sm">work</span>
          <span>JOIN THE UWE EMPIRE TALENT UNIT</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-5xl text-on-surface font-black mb-3"
        >
          Build the Future with <span className="text-secondary text-glow-gold">UWE Empire</span>
        </motion.h1>

        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto">
          We are recruiting ambitious sales operatives, creative marketing strategists, and training coordinators to transform minds and power Sri Lanka's leading personal growth ecosystem.
        </p>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8 mb-10 text-left font-mono-data">
          <div className="p-4 rounded-xl bg-[#0D111A] border border-secondary/30 space-y-1">
            <span className="material-symbols-outlined text-secondary text-2xl">home_work</span>
            <h4 className="text-on-surface text-sm font-bold">Flexible Remote / Hybrid</h4>
            <p className="text-on-surface-variant text-xs">Work from anywhere with high performance autonomy and digital tools.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0D111A] border border-secondary/30 space-y-1">
            <span className="material-symbols-outlined text-[#2ED573] text-2xl">payments</span>
            <h4 className="text-on-surface text-sm font-bold">High Commission & Rewards</h4>
            <p className="text-on-surface-variant text-xs">Lucrative uncapped commissions, bonuses, and rapid progression tracks.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0D111A] border border-secondary/30 space-y-1">
            <span className="material-symbols-outlined text-[#00D2FF] text-2xl">military_tech</span>
            <h4 className="text-on-surface text-sm font-bold">Free Empire Masterclasses</h4>
            <p className="text-on-surface-variant text-xs">Full complimentary access to BMB, Leadership, and IGNIT accelerator training.</p>
          </div>
        </div>

        {/* Department Filters */}
        <div className="flex justify-center gap-2 flex-wrap mb-8">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-xl font-label-caps text-xs uppercase transition-all cursor-pointer ${
                selectedDept === dept
                  ? 'bg-secondary text-black font-black shadow-[0_0_20px_rgba(255,184,0,0.5)]'
                  : 'bg-[#0E131F] text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
              }`}
            >
              {dept === 'all' ? 'All Roles' : dept}
            </button>
          ))}
        </div>
      </section>

      {/* Vacancy Cards List */}
      <section className="max-w-4xl mx-auto px-4 md:px-lg space-y-4 relative z-10">
        {loading ? (
          <div className="p-12 text-center font-mono-data text-secondary">LOADING EMPIRE VACANCIES...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center bg-[#0E131F] rounded-2xl border border-outline-variant/30 font-mono-data text-on-surface-variant">
            No active positions open in this department right now.
          </div>
        ) : (
          filteredJobs.map((job) => {
            const openPos = job.openPositions ?? 5;
            const hired = job.hiredCount ?? 0;
            const availablePositions = Math.max(0, openPos - hired);
            const isFinished = job.hiringStatus === 'HIRING_FINISHED' || availablePositions === 0 || !job.isActive;
            const isUrgent = !isFinished && availablePositions <= 2;

            return (
              <motion.div
                key={job.id}
                whileHover={{ y: -2 }}
                className={`bg-[#0E131F] border rounded-2xl p-6 transition-all shadow-xl space-y-4 ${
                  isFinished
                    ? 'border-rose-500/20 opacity-75'
                    : isUrgent
                    ? 'border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(255,184,0,0.1)]'
                    : 'border-emerald-500/30 hover:border-emerald-400 shadow-[0_0_20px_rgba(46,213,115,0.08)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant/20 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/40 font-bold uppercase">
                        {job.department}
                      </span>
                      <span className="font-mono-data text-xs text-[#00D2FF]">
                        {job.employmentType.replace(/_/g, ' ')}
                      </span>

                      {/* Dynamic Hiring Status Badge with Color */}
                      {isFinished ? (
                        <span className="inline-flex items-center gap-1 font-mono-data text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/50 text-rose-400 tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                          HIRING FINISHED (0 OPEN)
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1 font-mono-data text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          HIRING: ONLY {availablePositions} {availablePositions === 1 ? 'POSITION' : 'POSITIONS'} LEFT (URGENT)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono-data text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          HIRING ({availablePositions} POSITIONS OPEN)
                        </span>
                      )}
                    </div>
                    <h3 className="font-headline-md text-xl text-on-surface font-bold">{job.title}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="font-mono-data text-[10px] text-on-surface-variant uppercase block">Target Compensation</span>
                    <span className="font-mono-data text-sm text-[#2ED573] font-bold">{job.incomeText}</span>
                  </div>
                </div>

                <div className="font-mono-data text-xs text-on-surface-variant space-y-1">
                  <span className="text-secondary font-bold uppercase text-[11px] block">Role Requirements:</span>
                  <p>{job.requirements}</p>
                </div>

                {/* Slots & Progress Bar */}
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] font-mono-data mb-1">
                    <span className="text-on-surface-variant">Hiring Progress:</span>
                    <span className={isFinished ? 'text-rose-400 font-bold' : isUrgent ? 'text-amber-300 font-bold' : 'text-emerald-400 font-bold'}>
                      {hired} of {openPos} Filled ({availablePositions} Open)
                    </span>
                  </div>
                  <div className="w-full bg-[#1A2133] h-2 rounded-full overflow-hidden border border-outline-variant/20">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFinished ? 'bg-rose-500' : isUrgent ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, (hired / openPos) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <a
                    href={`https://wa.me/94717096386?text=Hello%20UWE%20Careers%2C%20I%20am%20interested%20in%20applying%20for%20the%20${encodeURIComponent(job.title)}%20position.`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/50 text-[#25D366] font-label-caps text-xs font-bold uppercase flex items-center justify-center gap-1.5 hover:bg-[#25D366] hover:text-black transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>APPLY VIA WHATSAPP</span>
                  </a>

                  {isFinished ? (
                    <button
                      disabled
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700 font-label-caps text-xs uppercase font-bold tracking-wider text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">lock</span>
                      <span>HIRING CLOSED</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenApply(job)}
                      className="w-full sm:w-auto btn-elite px-6 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black tracking-wider cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center justify-center gap-2"
                    >
                      <span>SUBMIT APPLICATION</span>
                      <span className="material-symbols-outlined text-sm">east</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </section>

      {/* Application Modal */}
      <AnimatePresence>
        {applyModalOpen && selectedJob && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div>
                  <span className="font-label-caps text-[10px] text-secondary font-bold uppercase">OFFICIAL TALENT APPLICATION</span>
                  <h3 className="font-headline-md text-lg text-on-surface font-black mt-0.5">{selectedJob.title}</h3>
                </div>
                <button onClick={() => setApplyModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/50 text-red-300 font-mono-data text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-400 text-base shrink-0 mt-0.5">warning</span>
                  <div>
                    <p className="font-bold text-red-200">Transmission Error</p>
                    <p className="text-[11px] text-red-300/80">{errorMessage}</p>
                  </div>
                </div>
              )}

              {successMessage ? (
                <div className="p-6 text-center space-y-3 font-mono-data">
                  <div className="w-12 h-12 rounded-full bg-[#2ED573]/20 border border-[#2ED573] text-[#2ED573] mx-auto flex items-center justify-center text-2xl">
                    ✓
                  </div>
                  <h4 className="font-headline-md text-lg text-on-surface font-bold">Application Received!</h4>
                  <p className="text-xs text-on-surface-variant">Our recruitment team will review your details and contact you via WhatsApp.</p>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-3 font-mono-data text-xs">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={applicant.name}
                      onChange={(e) => {
                        setApplicant({ ...applicant, name: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. Kasun Fernando"
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-secondary font-bold block mb-1">WhatsApp Phone *</label>
                      <input
                        type="tel"
                        required
                        value={applicant.phone}
                        onChange={(e) => {
                          setApplicant({ ...applicant, phone: e.target.value });
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="077 123 4567"
                        className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-on-surface-variant block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={applicant.email}
                        onChange={(e) => {
                          setApplicant({ ...applicant, email: e.target.value });
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="kasun@gmail.com"
                        className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-on-surface-variant block mb-1">Background / Experience Summary *</label>
                    <textarea
                      required
                      rows={3}
                      value={applicant.experience}
                      onChange={(e) => {
                        setApplicant({ ...applicant, experience: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Briefly describe your previous experience, skills, and why you want to join UWE Empire..."
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface"
                    />
                  </div>

                  <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                    <button
                      type="button"
                      onClick={() => setApplyModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#131929] text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`btn-elite px-6 py-2.5 rounded-xl font-label-caps font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center gap-2 ${
                        submitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-sm ${submitting ? 'animate-spin' : ''}`}>
                        {submitting ? 'progress_activity' : 'send'}
                      </span>
                      <span>{submitting ? 'TRANSMITTING...' : 'SUBMIT CANDIDATE RECORD'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
