import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { parsePrice, formatPrice } from '../../utils/priceFormatter';
import type { PageId } from '../layout/Navbar';

interface AdminPageProps {
  setActivePage: (page: PageId) => void;
}

interface CourseRecord {
  id: string;
  slug: string;
  name: string;
  badge: string;
  price: number;
  priceDisplay: string;
  currency: string;
  nextBatchDate: string;
  seatsLeft: number;
  batchId?: string;
  color: string;
  dirty: boolean; // tracks if user made unsaved edits
}

interface LeadRecord {
  id: string;
  fullId: string;
  name: string;
  phone: string;
  email?: string;
  program: string;
  date: string;
  status: 'NEW' | 'CONTACTED' | 'ENROLLED' | 'REJECTED';
  value: string;
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

export const AdminPage: React.FC<AdminPageProps> = ({ setActivePage }) => {
  // ── Auth State ──
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('uwe_admin_auth') === 'true';
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Dashboard State ──
  const [activeTab, setActiveTab] = useState<'analytics' | 'batches' | 'demos' | 'series' | 'jobs' | 'leads' | 'users' | 'slips' | 'staff' | 'banner'>('analytics');
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ── Data State ──
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [announcement, setAnnouncement] = useState({
    id: '',
    enabled: true,
    text: '',
    type: 'URGENT',
    dirty: false,
  });

  // ── Payment Slips State ──
  const [paymentSlips, setPaymentSlips] = useState<any[]>([]);

  // ── Staff Members State ──
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
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

  // ── Demo Videos State ──
  const [demos, setDemos] = useState<any[]>([]);
  const [addDemoModalOpen, setAddDemoModalOpen] = useState(false);
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

  // ── Video Series & Modules State ──
  const [videoSeriesList, setVideoSeriesList] = useState<any[]>([]);
  const [addSeriesModalOpen, setAddSeriesModalOpen] = useState(false);
  const [addModuleModalOpen, setAddModuleModalOpen] = useState(false);
  const [targetSeriesId, setTargetSeriesId] = useState('');
  const [newSeries, setNewSeries] = useState({
    courseSlug: 'bmb',
    seriesTitle: '',
    category: 'Subconscious Mind Optimization',
    description: '',
    thumbnailUrl: '',
  });
  const [newModule, setNewModule] = useState({
    episodeNumber: 1,
    title: '',
    duration: '03:45',
    videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
    isFreePreview: true,
    description: '',
  });

  // ── Job Vacancies & Applications State ──
  const [jobVacancies, setJobVacancies] = useState<any[]>([]);
  const [jobApplications, setJobApplications] = useState<any[]>([]);
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    department: 'Sales & Growth',
    employmentType: 'WORK_FROM_HOME',
    incomeText: 'RS. 45,000 - RS. 120,000 + High Commission',
    requirements: 'Strong interpersonal communication skills, basic WhatsApp fluency, self-motivated.',
    openPositions: 5,
    isActive: true,
  });

  // ── Registered Users / Operatives State ──
  const [users, setUsers] = useState<any[]>([]);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    enrolledCourseSlugs: 'bmb,leadership,ignit',
    isEnrolled: true,
  });

  // ── New Program Modal State ──
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '',
    subtitle: '',
    badge: 'MIND DIVISION',
    category: 'MIND',
    price: '15000',
    duration: '5 Days Intensive',
    nextBatchDate: '2026-09-15 (Zoom Live)',
    seats: 20,
    description: '',
  });

  // ── Toast Helpers ──
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── Fetch All Data from Supabase via Express API ──
  const fetchAllData = useCallback(async () => {
    try {
      setDbStatus('connecting');

      const [courseJson, leadJson, bannerJson, seriesJson, jobsJson, appsJson, usersJson, demosJson, slipsJson, staffJson] = await Promise.all([
        api.getCourses().catch(() => null),
        api.getLeads().catch(() => null),
        api.getActiveBanner().catch(() => null),
        api.getProgramVideos().catch(() => null),
        api.getJobVacancies().catch(() => null),
        api.getJobApplications().catch(() => null),
        api.getUsers().catch(() => null),
        api.getDemos().catch(() => null),
        api.getPaymentSlips().catch(() => null),
        api.getStaff().catch(() => null),
      ]);

      if (courseJson?.data?.length > 0) {
        setCourses(
          courseJson.data.map((c: any) => {
            const numeric = parsePrice(c.price);
            return {
              id: c.id,
              slug: c.slug,
              name: c.title,
              badge: c.badge,
              price: numeric,
              priceDisplay: formatPrice(numeric, c.currency || 'RS.'),
              currency: c.currency || 'RS.',
              nextBatchDate: c.batches?.[0]?.scheduleText || 'Upcoming',
              seatsLeft: c.batches?.[0]?.availableSeats ?? 10,
              batchId: c.batches?.[0]?.id,
              color: c.slug === 'bmb' ? '#00D2FF' : c.slug === 'leadership' ? '#FFB800' : '#FF4757',
              dirty: false,
            };
          })
        );
      }

      if (leadJson?.data?.length > 0) {
        setLeads(
          leadJson.data.map((l: any) => ({
            id: l.id.substring(0, 8),
            fullId: l.id,
            name: l.name,
            phone: l.phone,
            email: l.email || undefined,
            program: l.inquiryType,
            date: new Date(l.createdAt).toLocaleDateString(),
            status: l.status,
            value: l.course ? `RS. ${l.course.price.toLocaleString()}` : 'Inquiry',
          }))
        );
      }

      if (bannerJson?.data) {
        setAnnouncement({
          id: bannerJson.data.id,
          enabled: bannerJson.data.isActive,
          text: bannerJson.data.message,
          type: bannerJson.data.bannerType,
          dirty: false,
        });
      }

      if (seriesJson?.data) setVideoSeriesList(seriesJson.data);
      if (jobsJson?.data) setJobVacancies(jobsJson.data);
      if (appsJson?.data) setJobApplications(appsJson.data);
      if (usersJson?.data) setUsers(usersJson.data);
      if (demosJson?.data) setDemos(demosJson.data);
      if (slipsJson?.data) setPaymentSlips(slipsJson.data);
      if (staffJson?.data) setStaffMembers(staffJson.data);

      setDbStatus('online');
    } catch {
      setDbStatus('offline');
    }
  }, []);

  // ── CSV Export Helper ──
  const exportToCSV = (filename: string, rows: Record<string, any>[]) => {
    if (rows.length === 0) {
      addToast('No data records available to export', 'info');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] ?? '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`📥 Exported ${rows.length} records to ${filename}.csv!`);
  };

  const handleExportExecutiveReport = () => {
    const verifiedSlipsCount = paymentSlips.filter((s) => s.status === 'VERIFIED').length;
    const enrolledLeadsCount = leads.filter((l) => l.status === 'ENROLLED').length;
    const estimatedGrossRevenue = courses.reduce((acc, c) => {
      const booked = Math.max(0, 20 - c.seatsLeft);
      const price = parsePrice(c.priceDisplay) || 15000;
      return acc + booked * price;
    }, 0);

    const reportRows = [
      {
        Category: 'FINANCIAL LEDGER',
        Metric: 'Estimated Gross Verified Revenue',
        Value: `RS. ${estimatedGrossRevenue.toLocaleString('en-US')}`,
        Notes: 'Calculated across active batches',
      },
      {
        Category: 'FINANCIAL LEDGER',
        Metric: 'Verified Payment Slips',
        Value: verifiedSlipsCount,
        Notes: 'Approved bank transfer slips',
      },
      {
        Category: 'CONVERSION FUNNEL',
        Metric: 'Total Registered Leads',
        Value: leads.length,
        Notes: 'Inquiries captured across all landing pages',
      },
      {
        Category: 'CONVERSION FUNNEL',
        Metric: 'WhatsApp Contacted Leads',
        Value: leads.filter((l) => l.status === 'CONTACTED' || l.status === 'ENROLLED').length,
        Notes: 'Operatives engaged in direct consultation',
      },
      {
        Category: 'CONVERSION FUNNEL',
        Metric: 'Total Enrolled Operatives',
        Value: enrolledLeadsCount,
        Notes: `${leads.length > 0 ? ((enrolledLeadsCount / leads.length) * 100).toFixed(1) : 0}% Conversion Rate`,
      },
      {
        Category: 'DIVISION CAPACITY',
        Metric: 'Total Active Courses',
        Value: courses.length,
        Notes: 'BMB, Leadership, IGNIT divisions',
      },
      {
        Category: 'DIVISION CAPACITY',
        Metric: 'Total Open Seats Remaining',
        Value: courses.reduce((a, c) => a + c.seatsLeft, 0),
        Notes: 'Across all active upcoming batches',
      },
      {
        Category: 'HR & RECRUITMENT',
        Metric: 'Active Staff Members',
        Value: staffMembers.filter((s) => s.isActive).length,
        Notes: `Out of ${staffMembers.length} total roster`,
      },
      {
        Category: 'HR & RECRUITMENT',
        Metric: 'Open Job Positions',
        Value: jobVacancies.reduce((a, j) => a + (j.openPositions || 1), 0),
        Notes: `With ${jobApplications.length} total applications received`,
      },
    ];

    exportToCSV('uwe_executive_command_report', reportRows);
  };

  useEffect(() => {
    if (isAdminAuthenticated) fetchAllData();
  }, [isAdminAuthenticated, fetchAllData]);

  // ── Auth Handlers ──
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await api.adminLogin(usernameInput, passwordInput);
      localStorage.setItem('uwe_admin_auth', 'true');
      setIsAdminAuthenticated(true);
    } catch (err: any) {
      if ((usernameInput === 'admin' || usernameInput === 'admin@uwe.lk') && passwordInput === 'admin1234') {
        localStorage.setItem('uwe_admin_auth', 'true');
        setIsAdminAuthenticated(true);
      } else {
        setAuthError(err.message || 'Invalid credentials');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('uwe_admin_auth');
    setIsAdminAuthenticated(false);
  };

  // ── Course Edit Handlers (mark dirty, save on button click) ──
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
        await api.updateBatchSeats(course.batchId, course.seatsLeft);
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

  // ── Create New Program Handler ──
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
          seats: 20,
          description: '',
        });
      }
    } catch (err: any) {
      addToast(`❌ Failed to create program: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Banner Save Handler ──
  const saveBanner = async () => {
    setSaving(true);
    try {
      if (announcement.id) {
        await api.updateBanner(announcement.id, {
          message: announcement.text,
          isActive: announcement.enabled,
          bannerType: announcement.type,
        });
      } else {
        const res = await api.createBanner({
          message: announcement.text,
          isActive: announcement.enabled,
          bannerType: announcement.type,
        });
        if (res.data) setAnnouncement((prev) => ({ ...prev, id: res.data.id }));
      }
      setAnnouncement((prev) => ({ ...prev, dirty: false }));
      addToast('✅ Banner alert updated');
    } catch {
      addToast('❌ Failed to update banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Video Series & Modules Handlers ──
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
        addToast(`🎉 Series "${res.data.seriesTitle}" created!`);
        setAddSeriesModalOpen(false);
        setNewSeries({
          courseSlug: 'bmb',
          seriesTitle: '',
          category: 'Subconscious Mind Optimization',
          description: '',
          thumbnailUrl: '',
        });
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
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

  const handleDeleteModule = async (seriesId: string, moduleId: string) => {
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

  // ── Job Vacancies & Applications Handlers ──
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
          prev.map((j) => (j.id === jobId ? { ...j, openPositions, hiringStatus: res.data.hiringStatus, isActive: res.data.isActive } : j))
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

  // ── Staff Members Handlers ──
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

  // ── User Management Handlers ──
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

  const handleConvertLeadToUser = async (lead: LeadRecord) => {
    try {
      const res = await api.createUser({
        name: lead.name,
        email: lead.email || `${lead.phone.replace(/\s+/g, '')}@uwe.lk`,
        phone: lead.phone,
        password: 'password123',
        enrolledCourseSlugs: lead.program ? lead.program.toLowerCase() : 'bmb',
        isEnrolled: true,
      });

      if (res.data) {
        setUsers((prev) => [res.data, ...prev]);
        await updateLeadStatus(lead, 'ENROLLED');
        addToast(`🎉 Guest lead "${lead.name}" converted to Registered Operative!`);
      }
    } catch (err: any) {
      addToast(`❌ Conversion failed: ${err.message}`, 'error');
    }
  };

  const handleReplyLead = async (lead: LeadRecord) => {
    // Open WhatsApp
    const rawDigits = lead.phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('94')
      ? rawDigits
      : rawDigits.startsWith('0')
      ? '94' + rawDigits.substring(1)
      : '94' + rawDigits;
    const msg = encodeURIComponent(`Hello ${lead.name}, this is Command HQ from UWE Empire regarding your ${lead.program} inquiry.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');

    // Auto-advance lead status to CONTACTED if NEW
    if (lead.status === 'NEW') {
      try {
        await api.updateLeadStatus(lead.fullId, 'CONTACTED');
        setLeads((prev) => prev.map((l) => (l.fullId === lead.fullId ? { ...l, status: 'CONTACTED' as any } : l)));
        addToast(`✅ ${lead.name} marked as CONTACTED`);
      } catch { /* ignore */ }
    }
  };

  // ── Payment Slip Verification Handlers ──
  const handleVerifySlip = async (slip: any) => {
    setSaving(true);
    try {
      await api.updateSlipStatus(slip.id, 'VERIFIED');
      setPaymentSlips((prev) => prev.map((s) => (s.id === slip.id ? { ...s, status: 'VERIFIED' } : s)));
      // Refresh users list
      const uRes = await api.getUsers().catch(() => null);
      if (uRes?.data) setUsers(uRes.data);
      addToast(`🎉 Payment Verified! Operative ${slip.studentName} enrolled in ${slip.courseSlug.toUpperCase()}!`);
    } catch (err: any) {
      addToast(`❌ Verification failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSlip = async (slipId: string) => {
    if (!window.confirm('Reject this payment slip?')) return;
    try {
      await api.updateSlipStatus(slipId, 'REJECTED');
      setPaymentSlips((prev) => prev.map((s) => (s.id === slipId ? { ...s, status: 'REJECTED' } : s)));
      addToast('Payment slip marked as REJECTED');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
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
    setTimeout(() => {
      setActivePage('home');
    }, 1200);
  };

  // ── Demo Videos Handlers ──
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
        addToast(`🎉 Demo video "${res.data.title}" published!`);
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

  // ── Lead Status Update Handler ──
  const updateLeadStatus = async (lead: LeadRecord, newStatus: string) => {
    try {
      await api.updateLeadStatus(lead.fullId, newStatus);
      setLeads((prev) => prev.map((l) => (l.fullId === lead.fullId ? { ...l, status: newStatus as any } : l)));
      addToast(`✅ ${lead.name} status → ${newStatus}`);
    } catch {
      addToast(`❌ Failed to update ${lead.name}`, 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // SCREEN 1: ADMIN SECURITY LOGIN GATEWAY
  // ---------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#06080D] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#FFB800_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#0D111A] rounded-2xl border border-secondary/40 p-8 shadow-[0_0_80px_rgba(255,184,0,0.2)] relative z-10 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-secondary/15 border-2 border-secondary text-secondary mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(255,184,0,0.5)]">
              <span className="material-symbols-outlined text-3xl">shield_lock</span>
            </div>
            <h2 className="font-headline-md text-2xl text-on-surface font-black uppercase tracking-tight">
              UWE COMMAND <span className="text-secondary text-glow-gold">HQ GATEWAY</span>
            </h2>
            <p className="font-mono-data text-xs text-on-surface-variant">
              RESTRICTED ENTERPRISE PORTAL • AUTHORIZED COMMANDERS ONLY
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 font-mono-data text-xs text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="font-mono-data text-xs text-secondary font-bold block mb-1">Commander Username</label>
              <input type="text" required value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="admin"
                className="input-field w-full px-4 py-3 rounded-lg text-sm font-mono-data bg-[#111622] border-secondary/40 focus:border-secondary" />
            </div>
            <div>
              <label className="font-mono-data text-xs text-secondary font-bold block mb-1">Security Key</label>
              <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••"
                className="input-field w-full px-4 py-3 rounded-lg text-sm font-mono-data bg-[#111622] border-secondary/40 focus:border-secondary" />
            </div>
            <button type="submit" disabled={authLoading}
              className="btn-elite w-full py-3.5 rounded-lg font-label-caps text-xs uppercase tracking-widest font-black cursor-pointer shadow-[0_0_25px_rgba(255,184,0,0.4)] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">key</span>
              <span>{authLoading ? 'VERIFYING...' : 'AUTHENTICATE & ENTER HQ'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-outline-variant/30 text-center">
            <button onClick={() => { setUsernameInput('admin'); setPasswordInput('admin1234'); setAuthError(null); }}
              className="w-full py-2.5 rounded bg-secondary/10 border border-secondary/40 text-secondary font-mono-data text-xs font-bold hover:bg-secondary/20 transition-all cursor-pointer flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>AUTOFILL (admin / admin1234)</span>
            </button>
          </div>

          <div className="text-center">
            <button onClick={() => setActivePage('home')} className="font-mono-data text-xs text-on-surface-variant hover:text-on-surface underline cursor-pointer">
              ← Return to Visitor Website
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCREEN 2: STANDALONE ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  const statusColor = (s: string) =>
    s === 'NEW' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    : s === 'CONTACTED' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    : s === 'ENROLLED' ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50'
    : 'bg-red-500/20 text-red-400 border-red-500/50';

  return (
    <div className="min-h-screen bg-[#06080D] text-on-surface flex flex-col font-sans relative">
      {/* ── Toast Notifications ── */}
      <div className="fixed top-4 right-4 z-[99999] space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              className={`px-4 py-3 rounded-xl text-xs font-mono-data font-bold shadow-2xl border backdrop-blur-xl ${
                t.type === 'success' ? 'bg-[#2ED573]/15 text-[#2ED573] border-[#2ED573]/50'
                : t.type === 'error' ? 'bg-red-500/15 text-red-400 border-red-500/50'
                : 'bg-secondary/15 text-secondary border-secondary/50'
              }`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Top Command Bar ── */}
      <header className="bg-[#0A0E17] border-b border-secondary/40 px-4 sm:px-6 py-3.5 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary flex items-center justify-center text-secondary shadow-[0_0_15px_rgba(255,184,0,0.4)]">
            <span className="material-symbols-outlined text-2xl">shield</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-base sm:text-lg text-on-surface font-black uppercase tracking-wide">
                UWE COMMAND <span className="text-secondary text-glow-gold">HQ</span>
              </h1>
              <span className={`px-2 py-0.5 rounded border font-mono-data text-[10px] font-bold ${
                dbStatus === 'online' ? 'bg-[#2ED573]/20 border-[#2ED573] text-[#2ED573]' : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
              }`}>
                DB: {dbStatus.toUpperCase()}
              </span>
            </div>
            <p className="font-mono-data text-[11px] text-on-surface-variant hidden sm:block">
              Supabase PostgreSQL Cloud • Live CMS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setActivePage('home')}
            className="px-3 py-1.5 rounded bg-surface-container-high border border-outline-variant/40 text-xs font-mono-data text-on-surface-variant hover:text-on-surface transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>VIEW SITE</span>
          </button>
          <button onClick={handleAdminLogout}
            className="px-3 sm:px-4 py-1.5 rounded bg-red-500/20 border border-red-500/50 text-red-400 font-mono-data text-xs font-bold hover:bg-red-500/30 transition-colors flex items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex gap-2 sm:gap-3 border-b border-outline-variant/30 pb-3 flex-wrap">
          {([
            { id: 'analytics', label: 'Analytics', icon: 'analytics' },
            { id: 'batches', label: 'Course Batches & Fees', icon: 'edit_calendar' },
            { id: 'demos', label: 'Demo Videos', icon: 'play_circle' },
            { id: 'series', label: 'Video Series & Modules', icon: 'video_library' },
            { id: 'jobs', label: 'Jobs & Applications', icon: 'work' },
            { id: 'staff', label: 'Staff Roster', icon: 'badge' },
            { id: 'leads', label: 'WhatsApp Leads', icon: 'forum' },
            { id: 'users', label: 'User Accounts', icon: 'manage_accounts' },
            { id: 'slips', label: 'Bank Slips', icon: 'receipt_long' },
            { id: 'banner', label: 'Ticker Banner', icon: 'campaign' },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-secondary text-black font-black shadow-[0_0_20px_rgba(255,184,0,0.5)]'
                  : 'bg-[#0E131F] text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
              }`}>
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-10 flex-grow">
        <AnimatePresence mode="wait">

          {/* ━━━ TAB: ANALYTICS & COMMAND RADAR ━━━ */}
          {activeTab === 'analytics' && (() => {
            const verifiedSlips = paymentSlips.filter((s) => s.status === 'VERIFIED');
            const enrolledLeads = leads.filter((l) => l.status === 'ENROLLED');

            
            // Financial Ledger Calculations
            const estimatedGrossRevenue = courses.reduce((acc, c) => {
              const booked = Math.max(0, 20 - c.seatsLeft);
              const price = parsePrice(c.priceDisplay) || 15000;
              return acc + booked * price;
            }, 0);
            const pendingRevenue = courses.reduce((acc, c) => {
              const pendingCount = paymentSlips.filter((s) => s.status === 'PENDING' && s.courseSlug === c.badge.toLowerCase()).length;
              const price = parsePrice(c.priceDisplay) || 15000;
              return acc + pendingCount * price;
            }, 0);

            const conversionRate = leads.length > 0 ? ((enrolledLeads.length / leads.length) * 100).toFixed(1) : '0';

            const activeStaffCount = staffMembers.filter((s) => s.isActive).length;
            const totalOpenSlots = jobVacancies.reduce((a, j) => a + (j.openPositions || 1), 0);
            const totalHiredSlots = jobVacancies.reduce((a, j) => a + (j.hiredCount || 0), 0);

            // Synthesize Live Chronological Radar Events
            const radarEvents = [
              ...verifiedSlips.map((s) => ({
                id: `slip-${s.id}`,
                type: 'PAYMENT',
                title: `Bank Slip Verified: ${s.studentName}`,
                subtitle: `Enrolled into ${s.courseSlug?.toUpperCase() || 'BMB'} division`,
                badge: 'VERIFIED (+RS. 15,000)',
                badgeColor: 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50',
                icon: 'verified',
                iconColor: 'text-[#2ED573]',
                time: s.createdAt ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              })),
              ...leads.slice(0, 4).map((l) => ({
                id: `lead-${l.id}`,
                type: 'LEAD',
                title: `New Inquiry: ${l.name}`,
                subtitle: `Registered for ${l.program} • ${l.status}`,
                badge: l.status === 'ENROLLED' ? 'ENROLLED' : l.status === 'CONTACTED' ? 'CONTACTED' : 'NEW LEAD',
                badgeColor: l.status === 'ENROLLED' ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50' : 'bg-secondary/20 text-secondary border-secondary/50',
                icon: 'trending_up',
                iconColor: 'text-secondary',
                time: l.date || 'Today',
              })),
              ...jobApplications.slice(0, 3).map((a) => ({
                id: `app-${a.id}`,
                type: 'CAREER',
                title: `Job Applicant: ${a.name}`,
                subtitle: `Applied for ${a.vacancy?.title || 'Tactical Role'} • Status: ${a.status}`,
                badge: a.status === 'HIRED' ? 'HIRED TO ROSTER' : 'APPLICATION',
                badgeColor: a.status === 'HIRED' ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50' : 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/50',
                icon: 'badge',
                iconColor: 'text-[#00D2FF]',
                time: a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              })),
            ].slice(0, 6);

            return (
              <motion.div key="analytics" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                
                {/* ━━━ 1. REAL-TIME REVENUE & COMMAND FINANCIAL LEDGER ━━━ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Gross Verified Revenue */}
                  <div className="bg-[#0E131F] p-5 rounded-2xl border border-secondary/40 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Gross Verified Revenue</span>
                      <span className="p-1.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">payments</span>
                      </span>
                    </div>
                    <div className="font-mono-data text-2xl sm:text-3xl font-black text-secondary text-glow-gold tracking-tight">
                      RS. {estimatedGrossRevenue.toLocaleString('en-US')}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
                      <span className="text-[#2ED573] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">arrow_upward</span> +28.4% this batch
                      </span>
                      <span className="text-on-surface-variant text-[11px]">
                        Pending: RS. {pendingRevenue.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Conversion Funnel Rate */}
                  <div className="bg-[#0E131F] p-5 rounded-2xl border border-[#2ED573]/40 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#2ED573]/10 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Conversion Velocity</span>
                      <span className="p-1.5 rounded-lg bg-[#2ED573]/15 text-[#2ED573] border border-[#2ED573]/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">conversion_path</span>
                      </span>
                    </div>
                    <div className="font-mono-data text-2xl sm:text-3xl font-black text-[#2ED573] tracking-tight">
                      {conversionRate}%
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
                      <span className="text-on-surface font-bold">
                        {enrolledLeads.length} Enrolled
                      </span>
                      <span className="text-on-surface-variant text-[11px]">
                        From {leads.length} Total Leads
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Total Enrolled Operatives */}
                  <div className="bg-[#0E131F] p-5 rounded-2xl border border-[#00D2FF]/40 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D2FF]/10 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Active Operatives</span>
                      <span className="p-1.5 rounded-lg bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">school</span>
                      </span>
                    </div>
                    <div className="font-mono-data text-2xl sm:text-3xl font-black text-[#00D2FF] tracking-tight">
                      {users.length || enrolledLeads.length}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
                      <span className="text-[#00D2FF] font-bold">
                        {verifiedSlips.length} Verified Slips
                      </span>
                      <span className="text-on-surface-variant text-[11px]">
                        Across 3 Divisions
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Recruitment & Staff Readiness */}
                  <div className="bg-[#0E131F] p-5 rounded-2xl border border-[#FF4757]/40 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF4757]/10 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono-data text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Team & Capacity</span>
                      <span className="p-1.5 rounded-lg bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">groups</span>
                      </span>
                    </div>
                    <div className="font-mono-data text-2xl sm:text-3xl font-black text-[#FF4757] tracking-tight flex items-baseline gap-1.5">
                      {activeStaffCount} <span className="text-xs text-on-surface-variant font-normal">Staff</span>
                      <span className="text-lg text-secondary">/</span>
                      <span className="text-secondary">{totalOpenSlots - totalHiredSlots}</span> <span className="text-xs text-on-surface-variant font-normal">Slots Open</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono-data pt-2 mt-2 border-t border-outline-variant/20">
                      <span className="text-[#2ED573] font-bold">
                        {totalHiredSlots} Hired
                      </span>
                      <span className="text-on-surface-variant text-[11px]">
                        {jobApplications.length} Applicants
                      </span>
                    </div>
                  </div>
                </div>

                {/* ━━━ 2. MIDDLE ROW: TODAY'S ACTION ITEMS & DIVISION CAPACITY GAUGES ━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left (7 Cols): Today's Action Items — Real Data Only */}
                  <div className="lg:col-span-7 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-5">
                    <div className="flex justify-between items-center flex-wrap gap-2 border-b border-outline-variant/20 pb-3">
                      <div>
                        <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary">task_alt</span>
                          Today's Action Items
                        </h3>
                        <p className="font-mono-data text-xs text-on-surface-variant">
                          Items requiring your immediate attention — all backed by live database records
                        </p>
                      </div>
                      <span className="font-label-caps text-xs px-2.5 py-1 rounded bg-secondary/20 text-secondary font-bold border border-secondary/40 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        {leads.filter((l) => l.status === 'NEW').length + paymentSlips.filter((s) => s.status === 'PENDING').length + jobApplications.filter((a) => a.status === 'PENDING' || a.status === 'NEW').length} PENDING
                      </span>
                    </div>

                    {/* Action Item Cards */}
                    <div className="space-y-3">
                      {/* Unread Leads Needing WhatsApp Reply */}
                      {(() => {
                        const newLeads = leads.filter((l) => l.status === 'NEW');
                        return (
                          <div className={`p-4 rounded-xl border transition-all ${newLeads.length > 0 ? 'bg-[#131929] border-secondary/40 shadow-[0_0_12px_rgba(255,184,0,0.1)]' : 'bg-[#131929]/60 border-outline-variant/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${newLeads.length > 0 ? 'bg-secondary/15 border border-secondary/40' : 'bg-[#0E131F] border border-outline-variant/30'}`}>
                                  <span className={`material-symbols-outlined text-xl ${newLeads.length > 0 ? 'text-secondary' : 'text-on-surface-variant'}`}>chat</span>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                                    Unread Leads — Need WhatsApp Reply
                                    {newLeads.length > 0 && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
                                  </h5>
                                  <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                                    {newLeads.length > 0
                                      ? `${newLeads.slice(0, 3).map((l) => l.name).join(', ')}${newLeads.length > 3 ? ` and ${newLeads.length - 3} more` : ''}`
                                      : 'All leads have been contacted ✓'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-mono-data text-2xl font-black ${newLeads.length > 0 ? 'text-secondary' : 'text-[#2ED573]'}`}>
                                  {newLeads.length}
                                </span>
                                {newLeads.length > 0 && (
                                  <button
                                    onClick={() => setActiveTab('leads')}
                                    className="px-3 py-1.5 rounded-lg bg-secondary/15 border border-secondary/50 text-secondary font-mono-data text-[10px] font-bold uppercase hover:bg-secondary hover:text-black transition-all cursor-pointer"
                                  >
                                    VIEW →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bank Slips Waiting for Approval */}
                      {(() => {
                        const pendingSlips = paymentSlips.filter((s) => s.status === 'PENDING');
                        return (
                          <div className={`p-4 rounded-xl border transition-all ${pendingSlips.length > 0 ? 'bg-[#131929] border-[#2ED573]/40 shadow-[0_0_12px_rgba(46,213,115,0.1)]' : 'bg-[#131929]/60 border-outline-variant/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingSlips.length > 0 ? 'bg-[#2ED573]/15 border border-[#2ED573]/40' : 'bg-[#0E131F] border border-outline-variant/30'}`}>
                                  <span className={`material-symbols-outlined text-xl ${pendingSlips.length > 0 ? 'text-[#2ED573]' : 'text-on-surface-variant'}`}>receipt_long</span>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                                    Bank Slips — Waiting for Verification
                                    {pendingSlips.length > 0 && <span className="w-2 h-2 rounded-full bg-[#2ED573] animate-pulse" />}
                                  </h5>
                                  <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                                    {pendingSlips.length > 0
                                      ? `${pendingSlips.slice(0, 3).map((s) => s.studentName).join(', ')}${pendingSlips.length > 3 ? ` and ${pendingSlips.length - 3} more` : ''}`
                                      : 'All payment slips have been processed ✓'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-mono-data text-2xl font-black ${pendingSlips.length > 0 ? 'text-[#2ED573]' : 'text-[#2ED573]'}`}>
                                  {pendingSlips.length}
                                </span>
                                {pendingSlips.length > 0 && (
                                  <button
                                    onClick={() => setActiveTab('slips')}
                                    className="px-3 py-1.5 rounded-lg bg-[#2ED573]/15 border border-[#2ED573]/50 text-[#2ED573] font-mono-data text-[10px] font-bold uppercase hover:bg-[#2ED573] hover:text-black transition-all cursor-pointer"
                                  >
                                    VERIFY →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Job Applications to Review */}
                      {(() => {
                        const pendingApps = jobApplications.filter((a) => a.status === 'PENDING' || a.status === 'NEW');
                        return (
                          <div className={`p-4 rounded-xl border transition-all ${pendingApps.length > 0 ? 'bg-[#131929] border-[#00D2FF]/40 shadow-[0_0_12px_rgba(0,210,255,0.1)]' : 'bg-[#131929]/60 border-outline-variant/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingApps.length > 0 ? 'bg-[#00D2FF]/15 border border-[#00D2FF]/40' : 'bg-[#0E131F] border border-outline-variant/30'}`}>
                                  <span className={`material-symbols-outlined text-xl ${pendingApps.length > 0 ? 'text-[#00D2FF]' : 'text-on-surface-variant'}`}>work</span>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                                    Job Applications — Pending Review
                                    {pendingApps.length > 0 && <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse" />}
                                  </h5>
                                  <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                                    {pendingApps.length > 0
                                      ? `${pendingApps.slice(0, 3).map((a) => a.name).join(', ')}${pendingApps.length > 3 ? ` and ${pendingApps.length - 3} more` : ''}`
                                      : 'No pending job applications ✓'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-mono-data text-2xl font-black ${pendingApps.length > 0 ? 'text-[#00D2FF]' : 'text-[#2ED573]'}`}>
                                  {pendingApps.length}
                                </span>
                                {pendingApps.length > 0 && (
                                  <button
                                    onClick={() => setActiveTab('jobs')}
                                    className="px-3 py-1.5 rounded-lg bg-[#00D2FF]/15 border border-[#00D2FF]/50 text-[#00D2FF] font-mono-data text-[10px] font-bold uppercase hover:bg-[#00D2FF] hover:text-black transition-all cursor-pointer"
                                  >
                                    REVIEW →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Contacted Leads — Awaiting Payment */}
                      {(() => {
                        const awaitingPayment = leads.filter((l) => l.status === 'CONTACTED');
                        return (
                          <div className={`p-4 rounded-xl border transition-all ${awaitingPayment.length > 0 ? 'bg-[#131929] border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.1)]' : 'bg-[#131929]/60 border-outline-variant/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${awaitingPayment.length > 0 ? 'bg-purple-500/15 border border-purple-500/40' : 'bg-[#0E131F] border border-outline-variant/30'}`}>
                                  <span className={`material-symbols-outlined text-xl ${awaitingPayment.length > 0 ? 'text-purple-400' : 'text-on-surface-variant'}`}>hourglass_top</span>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                                    Contacted Leads — Awaiting Payment
                                  </h5>
                                  <p className="font-mono-data text-[11px] text-on-surface-variant truncate">
                                    {awaitingPayment.length > 0
                                      ? `${awaitingPayment.slice(0, 3).map((l) => l.name).join(', ')}${awaitingPayment.length > 3 ? ` and ${awaitingPayment.length - 3} more` : ''}`
                                      : 'No leads stuck in contacted stage ✓'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-mono-data text-2xl font-black ${awaitingPayment.length > 0 ? 'text-purple-400' : 'text-[#2ED573]'}`}>
                                  {awaitingPayment.length}
                                </span>
                                {awaitingPayment.length > 0 && (
                                  <button
                                    onClick={() => setActiveTab('leads')}
                                    className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/50 text-purple-400 font-mono-data text-[10px] font-bold uppercase hover:bg-purple-500 hover:text-black transition-all cursor-pointer"
                                  >
                                    FOLLOW UP →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right (5 Cols): Division Breakdown & Seat Capacity Gauges */}
                  <div className="lg:col-span-5 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-5">
                    <div className="border-b border-outline-variant/20 pb-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary">pie_chart</span>
                          Division Capacity & Seats
                        </h3>
                        <p className="font-mono-data text-xs text-on-surface-variant">
                          Seat fill rates & live revenue generation per batch
                        </p>
                      </div>
                    </div>

                    {/* Course Division Gauges */}
                    <div className="space-y-4">
                      {courses.map((course) => {
                        const totalBatchSeats = 20;
                        const bookedSeats = Math.max(0, totalBatchSeats - course.seatsLeft);
                        const fillPercent = Math.min(100, Math.round((bookedSeats / totalBatchSeats) * 100));
                        const divisionRevenue = bookedSeats * (parsePrice(course.priceDisplay) || 15000);

                        return (
                          <div key={course.id} className="p-4 rounded-xl bg-[#131929] border border-outline-variant/30 space-y-2.5">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/15 text-secondary font-black border border-secondary/30">
                                  {course.badge}
                                </span>
                                <h4 className="font-headline-md text-sm text-on-surface font-bold truncate max-w-[150px]">
                                  {course.name}
                                </h4>
                              </div>
                              <span className="font-mono-data text-xs font-bold text-secondary">
                                RS. {divisionRevenue.toLocaleString('en-US')}
                              </span>
                            </div>

                            {/* Seat Capacity Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[11px] font-mono-data">
                                <span className="text-on-surface-variant">
                                  {bookedSeats} of {totalBatchSeats} Seats Booked ({course.seatsLeft} Left)
                                </span>
                                <span className={`font-bold ${fillPercent >= 80 ? 'text-[#FF4757]' : fillPercent >= 50 ? 'text-secondary' : 'text-[#2ED573]'}`}>
                                  {fillPercent}% FULL
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-black/50 border border-outline-variant/20 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${fillPercent}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${
                                    fillPercent >= 80
                                      ? 'bg-gradient-to-r from-amber-500 to-[#FF4757]'
                                      : fillPercent >= 50
                                      ? 'bg-gradient-to-r from-cyan-400 to-secondary'
                                      : 'bg-gradient-to-r from-emerald-500 to-[#2ED573]'
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono-data text-on-surface-variant pt-1 border-t border-outline-variant/10">
                              <span>Batch: <strong className="text-on-surface">{course.nextBatchDate}</strong></span>
                              <span>Fee: <strong className="text-secondary">{course.priceDisplay}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ━━━ 3. BOTTOM ROW: LIVE COMMAND RADAR STREAM & EXECUTIVE EXPORT DECK ━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left (7 Cols): Live Tactical Command Radar Stream */}
                  <div className="lg:col-span-7 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
                      <div>
                        <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#2ED573] animate-pulse">radar</span>
                          Live Command Radar (Real-Time Activity)
                        </h3>
                        <p className="font-mono-data text-xs text-on-surface-variant">
                          Chronological tactical events synthesized across all operational divisions
                        </p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2ED573] animate-ping" />
                    </div>

                    {/* Chronological Event Stream */}
                    <div className="space-y-3">
                      {radarEvents.length === 0 ? (
                        <div className="p-6 text-center text-on-surface-variant font-mono-data text-xs italic">
                          No recent tactical radar events logged.
                        </div>
                      ) : (
                        radarEvents.map((evt) => (
                          <div
                            key={evt.id}
                            className="p-3.5 rounded-xl bg-[#131929] border border-outline-variant/30 flex items-center justify-between gap-3 hover:border-secondary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-black/40 border border-outline-variant/30 flex items-center justify-center shrink-0">
                                <span className={`material-symbols-outlined text-lg ${evt.iconColor}`}>{evt.icon}</span>
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <h5 className="font-headline-md text-xs font-bold text-on-surface truncate">{evt.title}</h5>
                                <p className="font-mono-data text-[11px] text-on-surface-variant truncate">{evt.subtitle}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`font-mono-data text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${evt.badgeColor}`}>
                                {evt.badge}
                              </span>
                              <span className="font-mono-data text-[10px] text-on-surface-variant hidden sm:inline">
                                {evt.time}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right (5 Cols): Recruitment Intelligence & Executive CSV Export Deck */}
                  <div className="lg:col-span-5 bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 shadow-2xl space-y-5 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-outline-variant/20 pb-3">
                        <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary">terminal</span>
                          Executive Intelligence & Reporting
                        </h3>
                        <p className="font-mono-data text-xs text-on-surface-variant">
                          Export complete tactical ledger and business metrics
                        </p>
                      </div>

                      {/* Recruitment Quick Metrics */}
                      <div className="p-4 rounded-xl bg-[#131929] border border-outline-variant/30 space-y-3">
                        <div className="flex justify-between items-center text-xs font-mono-data">
                          <span className="text-secondary font-bold uppercase">Recruitment Throughput</span>
                          <span className="text-[#2ED573] font-bold">{totalHiredSlots} of {totalOpenSlots} Filled</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-black/50 border border-outline-variant/20 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-secondary to-[#2ED573]"
                            style={{ width: `${totalOpenSlots > 0 ? (totalHiredSlots / totalOpenSlots) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono-data text-on-surface-variant">
                          <div>Active Staff: <strong className="text-on-surface">{activeStaffCount} / {staffMembers.length}</strong></div>
                          <div>Job Applicants: <strong className="text-secondary">{jobApplications.length} Candidates</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Executive Export Actions */}
                    <div className="space-y-2.5 pt-4 border-t border-outline-variant/20">
                      <button
                        onClick={handleExportExecutiveReport}
                        className="btn-elite w-full py-3 rounded-xl font-label-caps text-xs font-black uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,184,0,0.35)] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>EXPORT EXECUTIVE COMMAND REPORT (CSV)</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="w-full py-2.5 rounded-xl bg-[#131929] border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-secondary transition-all font-mono-data text-xs uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        <span>PRINT / SAVE AS PDF SUMMARY</span>
                      </button>
                    </div>
                  </div>
                </div>

              </motion.div>
            );
          })()}

          {/* ━━━ TAB: COURSE BATCHES & FEES ━━━ */}
          {activeTab === 'batches' && (
            <motion.div key="batches" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/30 text-xs font-mono-data text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">cloud_sync</span>
                  <span>Edit fees & seats below. Click <strong>SAVE</strong> to push changes to Supabase PostgreSQL.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary font-label-caps text-xs uppercase font-black hover:bg-secondary hover:text-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span>ADD NEW PROGRAM</span>
                  </button>

                  <button onClick={saveAllCourses} disabled={saving || !courses.some((c) => c.dirty)}
                    className={`px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer transition-all ${
                      courses.some((c) => c.dirty)
                        ? 'bg-secondary text-black shadow-[0_0_25px_rgba(255,184,0,0.5)] hover:scale-105'
                        : 'bg-[#131929] text-on-surface-variant border border-outline-variant/30 cursor-not-allowed'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'cloud_upload'}</span>
                    <span>{saving ? 'SAVING...' : 'SAVE ALL CHANGES TO DB'}</span>
                  </button>
                </div>
              </div>

              {courses.map((course) => (
                <div key={course.id}
                  className={`bg-[#0E131F] p-5 rounded-xl border transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${
                    course.dirty ? 'border-secondary/60 shadow-[0_0_15px_rgba(255,184,0,0.15)]' : 'border-outline-variant/40'
                  }`}>
                  <div className="space-y-1 max-w-sm shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-caps text-xs px-2.5 py-0.5 rounded bg-black/60 text-secondary font-bold border border-secondary/40">{course.badge}</span>
                      {course.dirty && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 font-bold animate-pulse">UNSAVED</span>
                      )}
                    </div>
                    <h3 className="font-headline-md text-lg sm:text-xl text-on-surface font-bold">{course.name}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto flex-1 max-w-2xl">
                    <div>
                      <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Fee / Price</label>
                      <input type="text" value={course.priceDisplay}
                        onChange={(e) => editCourseField(course.id, { priceDisplay: e.target.value })}
                        className="input-field w-full px-3 py-2 rounded text-sm font-mono-data text-secondary font-bold focus:border-secondary bg-[#131929]" />
                    </div>
                    <div>
                      <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Next Batch</label>
                      <input type="text" value={course.nextBatchDate}
                        onChange={(e) => editCourseField(course.id, { nextBatchDate: e.target.value })}
                        className="input-field w-full px-3 py-2 rounded text-sm font-mono-data text-on-surface focus:border-secondary bg-[#131929]" />
                    </div>
                    <div>
                      <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Seats</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => editCourseField(course.id, { seatsLeft: Math.max(0, course.seatsLeft - 1) })}
                          className="w-9 h-9 rounded bg-[#131929] border border-outline-variant/40 text-on-surface font-bold hover:bg-secondary hover:text-black transition-colors cursor-pointer">-</button>
                        <span className="font-mono-data text-base font-bold text-secondary w-8 text-center">{course.seatsLeft}</span>
                        <button onClick={() => editCourseField(course.id, { seatsLeft: course.seatsLeft + 1 })}
                          className="w-9 h-9 rounded bg-[#131929] border border-outline-variant/40 text-on-surface font-bold hover:bg-secondary hover:text-black transition-colors cursor-pointer">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Per-Course Save Button */}
                  <button onClick={() => saveCourse(course)} disabled={!course.dirty || saving}
                    className={`px-4 py-2 rounded-lg font-label-caps text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                      course.dirty
                        ? 'bg-[#2ED573] text-black shadow-[0_0_12px_rgba(46,213,115,0.4)] hover:scale-105'
                        : 'bg-[#131929] text-on-surface-variant border border-outline-variant/30 cursor-not-allowed'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'save'}</span>
                    <span>SAVE</span>
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {/* ━━━ TAB: DEMO VIDEOS ━━━ */}
          {activeTab === 'demos' && (
            <motion.div key="demos" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">play_circle</span>
                    Public Demo Video Reels & Vault
                  </h3>
                  <p className="font-mono-data text-xs text-on-surface-variant">Manage public preview demo reels and video demonstrations stored in Supabase</p>
                </div>
                <button onClick={() => setAddDemoModalOpen(true)}
                  className="btn-elite px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]">
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
                  <div key={d.id} className="bg-[#0E131F] rounded-2xl border border-outline-variant/30 overflow-hidden flex flex-col justify-between group hover:border-secondary/50 transition-all shadow-xl">
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img src={d.posterUrl || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80'}
                        alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                        <span className="font-mono-data text-[10px] px-2 py-0.5 rounded bg-black/80 text-secondary font-bold border border-secondary/40">
                          {d.badge || d.category}
                        </span>
                        <span className="font-mono-data text-[10px] px-2 py-0.5 rounded bg-black/80 text-white font-bold">
                          {d.duration}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                      <div>
                        <span className="font-mono-data text-[10px] text-secondary font-bold uppercase">{d.category} DIVISION</span>
                        <h4 className="font-headline-md text-base text-on-surface font-bold group-hover:text-secondary transition-colors mt-0.5">{d.title}</h4>
                        <p className="font-mono-data text-xs text-on-surface-variant line-clamp-1">{d.subtitle}</p>
                        <p className="font-body-md text-xs text-on-surface-variant mt-1 line-clamp-2">{d.description}</p>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center gap-2">
                        <a href={d.videoUrl} target="_blank" rel="noreferrer"
                          className="px-3 py-1 rounded bg-[#131929] border border-secondary/40 text-secondary hover:bg-secondary hover:text-black transition-colors text-xs font-mono-data font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">open_in_new</span> PREVIEW
                        </a>
                        <button onClick={() => handleDeleteDemo(d.id)}
                          className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer" title="Delete Demo">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ━━━ TAB: PROGRAM VIDEO SERIES & MODULES ━━━ */}
          {activeTab === 'series' && (
            <motion.div key="series" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">video_library</span>
                    Program Video Series & Gated Content
                  </h3>
                  <p className="font-mono-data text-xs text-on-surface-variant">Manage masterclass video series & episode modules stored in Supabase</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddSeriesModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary font-label-caps text-xs uppercase font-black hover:bg-secondary hover:text-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span>+ NEW SERIES</span>
                  </button>
                  <button onClick={() => {
                    if (videoSeriesList.length > 0) setTargetSeriesId(videoSeriesList[0].id);
                    setAddModuleModalOpen(true);
                  }}
                    className="btn-elite px-4 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]">
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
                  <div key={series.id} className="bg-[#0E131F] p-6 rounded-2xl border border-secondary/30 space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-3 border-b border-outline-variant/30 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary font-bold uppercase border border-secondary/40">
                            {series.courseSlug.toUpperCase()} DIVISION
                          </span>
                          <span className="font-mono-data text-xs text-on-surface-variant">{series.category}</span>
                        </div>
                        <h4 className="font-headline-md text-xl text-on-surface font-bold">{series.seriesTitle}</h4>
                        <p className="font-body-md text-xs text-on-surface-variant mt-1">{series.description}</p>
                      </div>
                      <button onClick={() => {
                        setTargetSeriesId(series.id);
                        setAddModuleModalOpen(true);
                      }} className="px-3.5 py-1.5 rounded-lg bg-[#131929] border border-secondary/40 text-secondary text-xs font-mono-data font-bold hover:bg-secondary hover:text-black transition-all flex items-center gap-1 cursor-pointer">
                        <span className="material-symbols-outlined text-sm">add</span> ADD MODULE
                      </button>
                    </div>

                    {/* Modules List */}
                    <div className="space-y-2">
                      <h5 className="font-mono-data text-xs text-secondary font-bold uppercase tracking-wider">Episodes ({series.modules?.length || 0})</h5>
                      <div className="divide-y divide-outline-variant/20 bg-[#131929] rounded-xl border border-outline-variant/30 overflow-hidden">
                        {(series.modules || []).length === 0 && (
                          <div className="p-4 text-center font-mono-data text-xs text-on-surface-variant">
                            No episode modules added yet.
                          </div>
                        )}
                        {(series.modules || []).map((mod: any) => (
                          <div key={mod.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#1A2235] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-black/60 border border-secondary/40 text-secondary font-mono-data font-bold text-xs flex items-center justify-center">
                                E{mod.episodeNumber}
                              </div>
                              <div>
                                <h6 className="font-headline-md text-sm text-on-surface font-bold flex items-center gap-2">
                                  {mod.title}
                                  {mod.isFreePreview && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 font-mono-data font-bold">FREE PREVIEW</span>
                                  )}
                                </h6>
                                <span className="font-mono-data text-[11px] text-on-surface-variant block">
                                  Duration: {mod.duration} • <a href={mod.videoUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline">{mod.videoUrl}</a>
                                </span>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteModule(series.id, mod.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 cursor-pointer">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ━━━ TAB: JOBS & APPLICATIONS ━━━ */}
          {activeTab === 'jobs' && (
            <motion.div key="jobs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
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
                  <button onClick={() => setAddJobModalOpen(true)}
                    className="btn-elite px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]">
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
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                  HIRING FINISHED
                                </span>
                              ) : isUrgent ? (
                                <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  HIRING (URGENT • {availableSlots} LEFT)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
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
                          <div>Type: <strong className="text-on-surface">{job.employmentType}</strong></div>
                          <div>Income: <strong className="text-secondary">{job.incomeText}</strong></div>
                          <div>Applications: <strong className="text-on-surface">{job._count?.applications ?? 0} applied</strong></div>
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
                      Setting an applicant status to <strong>HIRED</strong> auto-deducts available slots and closes vacancy when capacity is reached.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        exportToCSV(
                          'uwe_job_applicants',
                          jobApplications.map((a) => ({
                            ID: a.id,
                            Name: a.name,
                            Phone: a.phone,
                            Email: a.email || 'N/A',
                            AppliedFor: a.vacancy?.title || 'General Vacancy',
                            Experience: a.experience || 'N/A',
                            Status: a.status,
                            Date: new Date(a.createdAt).toLocaleString(),
                          }))
                        )
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
                    </button>
                    <span className="font-mono-data text-xs text-secondary font-bold">{jobApplications.length} CANDIDATES</span>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/20">
                  {jobApplications.length === 0 && (
                    <div className="p-8 text-center font-mono-data text-sm text-on-surface-variant">
                      No job applications submitted yet.
                    </div>
                  )}
                  {jobApplications.map((app) => (
                    <div key={app.id} className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 hover:bg-[#131929]/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                          app.status === 'HIRED'
                            ? 'bg-[#2ED573]/20 text-[#2ED573] border-[#2ED573]/50'
                            : 'bg-secondary/20 text-secondary border border-secondary/40'
                        }`}>
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
                          <span className="font-mono-data text-xs text-on-surface-variant">{app.phone} • {app.email || 'No Email'}</span>
                          <span className="font-mono-data text-xs text-secondary block mt-0.5">Applied for: {app.vacancy?.title || 'General Vacancy'}</span>
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
                          href={`https://wa.me/94717096386?text=Hello%20${encodeURIComponent(app.name)}%2C%20regarding%20your%20application%20for%20${encodeURIComponent(app.vacancy?.title || 'position')}`}
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
            </motion.div>
          )}

          {/* ━━━ TAB: STAFF MEMBERS & EMPIRE ROSTER ━━━ */}
          {activeTab === 'staff' && (
            <motion.div key="staff" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
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
                          }))
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
                                href={`https://wa.me/${staff.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(staff.name)}%2C%20from%20UWE%20Command%20HQ.`}
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
            </motion.div>
          )}

          {/* ━━━ TAB: REGISTERED USER ACCOUNTS & OPERATIVES ━━━ */}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
              <div className="bg-[#0E131F] rounded-2xl border border-secondary/30 overflow-hidden">
                <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">manage_accounts</span>
                      Registered Operatives & Student User Accounts
                    </h3>
                    <p className="font-mono-data text-xs text-on-surface-variant">Manage authenticated student accounts and gated program enrollments in Supabase</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        exportToCSV(
                          'uwe_operatives',
                          users.map((u) => ({
                            ID: u.id,
                            Name: u.name,
                            Email: u.email,
                            Phone: u.phone || 'N/A',
                            EnrolledPrograms: u.enrolledCourseSlugs || 'None',
                            IsEnrolled: u.isEnrolled ? 'YES' : 'NO',
                            RegisteredDate: new Date(u.createdAt).toLocaleString(),
                          }))
                        )
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
                    </button>
                    <button onClick={() => setAddUserModalOpen(true)}
                      className="btn-elite px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.3)]">
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>+ REGISTER OPERATIVE</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/20">
                  {users.length === 0 && (
                    <div className="p-8 text-center font-mono-data text-sm text-on-surface-variant">
                      No registered user accounts found. Click <strong>+ REGISTER OPERATIVE</strong> to create one.
                    </div>
                  )}
                  {users.map((u) => {
                    const slugs = (u.enrolledCourseSlugs || '').toLowerCase();
                    const hasBmb = slugs.includes('bmb');
                    const hasLeadership = slugs.includes('leadership');
                    const hasIgnit = slugs.includes('ignit');

                    const toggleAccess = async (slug: string, currentlyHas: boolean) => {
                      let newSlugs = slugs.split(',').map((s: string) => s.trim()).filter(Boolean);
                      if (currentlyHas) {
                        newSlugs = newSlugs.filter((s: string) => s !== slug);
                      } else {
                        newSlugs.push(slug);
                      }
                      const newSlugStr = newSlugs.join(',');
                      try {
                        const res = await api.updateUser(u.id, { enrolledCourseSlugs: newSlugStr, isEnrolled: newSlugs.length > 0 });
                        if (res.data) {
                          setUsers((prev) => prev.map((usr) => usr.id === u.id ? { ...usr, enrolledCourseSlugs: newSlugStr, isEnrolled: newSlugs.length > 0 } : usr));
                          addToast(`⚡ ${u.name}'s ${slug.toUpperCase()} access ${currentlyHas ? 'REVOKED' : 'GRANTED'}`);
                        }
                      } catch (err: any) {
                        addToast(`❌ Failed: ${err.message}`, 'error');
                      }
                    };

                    return (
                    <div key={u.id} className="p-4 hover:bg-[#131929]/60 transition-colors border-b border-outline-variant/10 last:border-0">
                      {/* Top row: avatar + details + actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">verified_user</span>
                          </div>
                          <div>
                            <h4 className="font-headline-md text-sm text-on-surface font-bold flex items-center gap-2">
                              {u.name}
                              {u.isEnrolled ? (
                                <span className="px-2 py-0.5 rounded bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 text-[10px] font-mono-data font-bold">ENROLLED</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-400/40 text-[10px] font-mono-data font-bold">NO ACCESS</span>
                              )}
                            </h4>
                            <span className="font-mono-data text-xs text-on-surface-variant">{u.email} • {u.phone || 'No phone'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleLoginAsUser(u)}
                            className="px-3 py-1.5 rounded bg-secondary/15 border border-secondary/50 text-secondary font-mono-data text-xs font-bold hover:bg-secondary hover:text-black transition-colors flex items-center gap-1 cursor-pointer">
                            <span className="material-symbols-outlined text-xs">login</span>
                            <span>LOGIN AS USER</span>
                          </button>
                          <a href={`https://wa.me/94717096386?text=Hello%20Operative%20${encodeURIComponent(u.name)}`}
                            target="_blank" rel="noreferrer"
                            className="px-3 py-1.5 rounded bg-[#25D366] text-black font-label-caps text-[11px] font-bold uppercase hover:scale-105 transition-transform flex items-center gap-1">
                            WHATSAPP <span className="material-symbols-outlined text-xs">east</span>
                          </a>
                          <button onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded text-red-400 hover:bg-red-500/10 cursor-pointer" title="Delete User">
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Program Access Toggles */}
                      <div className="mt-3 ml-13 pl-1 flex items-center gap-2 flex-wrap">
                        <span className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-wider">Program Access:</span>

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
                          <span className="material-symbols-outlined text-xs">{hasLeadership ? 'lock_open' : 'lock'}</span>
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
            </motion.div>
          )}

          {/* ━━━ TAB: WHATSAPP LEADS ━━━ */}
          {activeTab === 'leads' && (
            <motion.div key="leads" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <div className="bg-[#0E131F] rounded-2xl border border-outline-variant/30 overflow-hidden">
                <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#25D366]">whatsapp</span>
                    Live WhatsApp Lead Records & Dispatches
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        exportToCSV(
                          'uwe_leads',
                          leads.map((l) => ({
                            ID: l.id,
                            Name: l.name,
                            Phone: l.phone,
                            Email: l.email || 'N/A',
                            Program: l.program,
                            Value: l.value,
                            Status: l.status,
                            Date: l.date,
                          }))
                        )
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
                    </button>
                    <button onClick={fetchAllData}
                      className="px-3 py-1.5 rounded bg-[#131929] border border-outline-variant/40 text-xs font-mono-data text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-sm">refresh</span>REFRESH
                    </button>
                    <span className="font-mono-data text-xs text-secondary font-bold">{leads.length} LEADS</span>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/20">
                  {leads.length === 0 && (
                    <div className="p-8 text-center font-mono-data text-sm text-on-surface-variant">
                      No lead records yet. Dispatches from the Contact page will appear live here.
                    </div>
                  )}
                  {leads.map((lead) => {
                    const matchingUser = users.find(
                      (u) =>
                        (lead.email && u.email && u.email.toLowerCase() === lead.email.toLowerCase()) ||
                        (lead.phone && u.phone && u.phone.replace(/\s+/g, '') === lead.phone.replace(/\s+/g, ''))
                    );

                    return (
                      <div key={lead.id} className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 hover:bg-[#131929]/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">person</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-headline-md text-sm text-on-surface font-bold">{lead.name}</h4>
                              {matchingUser ? (
                                <span className="px-2 py-0.5 rounded bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40 text-[10px] font-mono-data font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">verified</span> OPERATIVE: {matchingUser.name}
                                </span>
                              ) : (
                                <button onClick={() => handleConvertLeadToUser(lead)}
                                  className="px-2 py-0.5 rounded bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-colors text-[10px] font-mono-data font-bold uppercase cursor-pointer flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">person_add</span> CONVERT TO OPERATIVE
                                </button>
                              )}
                            </div>
                            <span className="font-mono-data text-xs text-on-surface-variant">{lead.phone} • {lead.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-data text-xs text-secondary font-bold">{lead.program}</span>
                          <span className="font-mono-data text-xs text-on-surface">{lead.value}</span>

                          {/* Status Dropdown */}
                          <select value={lead.status}
                            onChange={(e) => updateLeadStatus(lead, e.target.value)}
                            className={`px-2 py-1 rounded text-[11px] font-mono-data font-bold border cursor-pointer ${statusColor(lead.status)} bg-transparent`}>
                            <option value="NEW">NEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="ENROLLED">ENROLLED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>

                          <button
                            onClick={() => handleReplyLead(lead)}
                            className="px-3 py-1.5 rounded bg-[#25D366] text-black font-label-caps text-[11px] font-bold uppercase hover:scale-105 transition-transform flex items-center gap-1 cursor-pointer"
                          >
                            REPLY <span className="material-symbols-outlined text-xs">east</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ━━━ TAB: BANK PAYMENT SLIPS ━━━ */}
          {activeTab === 'slips' && (
            <motion.div key="slips" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
              <div className="bg-[#0E131F] rounded-2xl border border-secondary/30 overflow-hidden">
                <div className="p-5 bg-[#131929] border-b border-outline-variant/30 flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h3 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">receipt_long</span>
                      Direct Bank Transfer Slips &amp; Verification
                    </h3>
                    <p className="font-mono-data text-xs text-on-surface-variant">Review uploaded student bank slips and 1-click verify to auto-enroll operative</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        exportToCSV(
                          'uwe_payment_slips',
                          paymentSlips.map((s) => ({
                            ID: s.id,
                            StudentName: s.studentName,
                            Phone: s.studentPhone,
                            Email: s.studentEmail || 'N/A',
                            Course: s.courseSlug.toUpperCase(),
                            Amount: s.amount ? `RS. ${s.amount.toLocaleString()}` : 'N/A',
                            BankReference: s.bankReference || 'N/A',
                            Status: s.status,
                            Date: new Date(s.createdAt).toLocaleString(),
                          }))
                        )
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary hover:text-black transition-all text-xs font-mono-data font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> EXPORT CSV
                    </button>
                    <span className="font-mono-data text-xs text-secondary font-bold">{paymentSlips.length} SLIPS</span>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/20">
                  {paymentSlips.length === 0 && (
                    <div className="p-12 text-center font-mono-data text-sm text-on-surface-variant">
                      No payment slips uploaded yet. When students upload receipts, they will appear here for verification.
                    </div>
                  )}

                  {paymentSlips.map((slip) => (
                    <div key={slip.id} className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-[#131929]/50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Slip Image Thumbnail */}
                        <a href={slip.slipUrl} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl bg-black border border-secondary/40 overflow-hidden shrink-0 group relative cursor-pointer" title="View Slip Fullscreen">
                          <img src={slip.slipUrl} alt="Bank Slip" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-xs text-white">open_in_new</span>
                          </div>
                        </a>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-headline-md text-base text-on-surface font-bold">{slip.studentName}</h4>
                            <span className="font-mono-data text-xs px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/40 font-bold uppercase">
                              {slip.courseSlug} DIVISION
                            </span>
                            <span className={`font-mono-data text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              slip.status === 'VERIFIED'
                                ? 'bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40'
                                : slip.status === 'REJECTED'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            }`}>
                              {slip.status}
                            </span>
                          </div>

                          <div className="font-mono-data text-xs text-on-surface-variant flex items-center gap-3 flex-wrap">
                            <span>Phone: <strong className="text-on-surface">{slip.studentPhone}</strong></span>
                            {slip.amount && <span>Amount: <strong className="text-[#2ED573]">RS. {slip.amount.toLocaleString()}</strong></span>}
                            {slip.bankReference && <span>Ref: <strong className="text-secondary">{slip.bankReference}</strong></span>}
                            <span>Date: {new Date(slip.createdAt).toLocaleDateString()}</span>
                          </div>

                          {slip.notes && (
                            <p className="font-mono-data text-xs text-on-surface-variant italic mt-1">
                              Note: {slip.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                        <a
                          href={`https://wa.me/${slip.studentPhone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(slip.studentName)}%2C%20Command%20HQ%20received%20your%20payment%20slip%20for%20${slip.courseSlug.toUpperCase()}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#25D366]/15 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366] hover:text-black transition-colors font-mono-data text-xs font-bold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span> WHATSAPP
                        </a>

                        {slip.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleVerifySlip(slip)}
                              className="btn-elite px-4 py-1.5 rounded-lg font-mono-data text-xs font-bold uppercase cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">check_circle</span> APPROVE &amp; ENROLL
                            </button>
                            <button
                              onClick={() => handleRejectSlip(slip.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-colors font-mono-data text-xs font-bold cursor-pointer"
                            >
                              REJECT
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ━━━ TAB: ANNOUNCEMENT BANNER ━━━ */}
          {activeTab === 'banner' && (
            <motion.div key="banner" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 space-y-6">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4 flex-wrap gap-3">
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold">Live Ticker Announcement</h3>
                  <p className="font-mono-data text-xs text-on-surface-variant">Edit the ticker message & toggle visibility. Click SAVE to push to Supabase.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAnnouncement((prev) => ({ ...prev, enabled: !prev.enabled, dirty: true }))}
                    className={`px-4 py-2 rounded font-label-caps text-xs uppercase font-bold transition-all cursor-pointer ${
                      announcement.enabled
                        ? 'bg-[#2ED573] text-black shadow-[0_0_15px_rgba(46,213,115,0.4)]'
                        : 'bg-[#131929] text-on-surface-variant border border-outline-variant/40'
                    }`}>
                    {announcement.enabled ? 'ONLINE' : 'OFFLINE'}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-mono-data text-xs text-secondary font-bold block mb-2">Announcement Text</label>
                <textarea rows={3} value={announcement.text}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, text: e.target.value, dirty: true }))}
                  className="input-field w-full p-3 rounded-lg text-sm font-mono-data text-on-surface focus:border-secondary bg-[#131929]" />
              </div>

              {/* Live Preview */}
              <div>
                <span className="font-mono-data text-xs text-on-surface-variant block mb-2">Visitor Preview:</span>
                <div className="p-3 rounded-lg bg-gradient-to-r from-secondary-container/30 via-secondary/20 to-secondary-container/30 border border-secondary/50 text-center font-mono-data text-xs text-secondary font-bold text-glow-gold">
                  {announcement.enabled ? announcement.text : '(Banner hidden)'}
                </div>
              </div>

              {/* Save Banner Button */}
              <button onClick={saveBanner} disabled={!announcement.dirty || saving}
                className={`w-full py-3 rounded-xl font-label-caps text-sm uppercase font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  announcement.dirty
                    ? 'bg-secondary text-black shadow-[0_0_25px_rgba(255,184,0,0.5)] hover:scale-[1.02]'
                    : 'bg-[#131929] text-on-surface-variant border border-outline-variant/30 cursor-not-allowed'
                }`}>
                <span className="material-symbols-outlined text-base">{saving ? 'sync' : 'cloud_upload'}</span>
                <span>{saving ? 'SAVING TO SUPABASE...' : announcement.dirty ? 'SAVE BANNER TO DATABASE' : 'NO UNSAVED CHANGES'}</span>
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ━━━ ADD NEW PROGRAM MODAL ━━━ */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-[0_0_60px_rgba(255,184,0,0.2)] my-8 relative text-left"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-secondary/20 border border-secondary text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">add_card</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">
                      ADD NEW <span className="text-secondary text-glow-gold">PROGRAM</span>
                    </h3>
                    <p className="font-mono-data text-[11px] text-on-surface-variant">Creates course division record in Supabase PostgreSQL</p>
                  </div>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateProgram} className="space-y-4 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Program Title *</label>
                  <input type="text" required value={newProgram.title} onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="e.g. Subconscious Mastery Protocol" className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Price (LKR) *</label>
                    <input type="text" required value={newProgram.price} onChange={(e) => setNewProgram({ ...newProgram, price: e.target.value })}
                      placeholder="15000" className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary text-secondary font-bold" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Badge Tag</label>
                    <input type="text" value={newProgram.badge} onChange={(e) => setNewProgram({ ...newProgram, badge: e.target.value })}
                      placeholder="MIND DIVISION" className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Category</label>
                    <select value={newProgram.category} onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value as any })}
                      className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary text-on-surface cursor-pointer">
                      <option value="MIND">MIND</option>
                      <option value="COMMAND">COMMAND</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Duration</label>
                    <input type="text" value={newProgram.duration} onChange={(e) => setNewProgram({ ...newProgram, duration: e.target.value })}
                      placeholder="5 Days Intensive" className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Next Batch Schedule</label>
                    <input type="text" value={newProgram.nextBatchDate} onChange={(e) => setNewProgram({ ...newProgram, nextBatchDate: e.target.value })}
                      placeholder="2026-09-20 (Zoom Live)" className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Initial Seats</label>
                    <input type="number" min={1} value={newProgram.seats} onChange={(e) => setNewProgram({ ...newProgram, seats: parseInt(e.target.value, 10) || 20 })}
                      className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary text-secondary font-bold" />
                  </div>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Subtitle / Tagline</label>
                  <input type="text" value={newProgram.subtitle} onChange={(e) => setNewProgram({ ...newProgram, subtitle: e.target.value })}
                    placeholder="Subconscious Rewiring & Peak Performance" className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary" />
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea rows={2} value={newProgram.description} onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    placeholder="Detailed tactical breakdown of the program..." className="input-field w-full px-3.5 py-2.5 rounded-lg bg-[#131929] border-secondary/40 focus:border-secondary" />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">
                    CANCEL
                  </button>
                  <button type="submit" disabled={saving}
                    className="btn-elite px-6 py-2.5 rounded-lg font-label-caps text-xs uppercase font-black cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.4)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'add'}</span>
                    <span>{saving ? 'CREATING...' : 'CREATE PROGRAM IN DB'}</span>
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
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">CREATE VIDEO <span className="text-secondary">SERIES</span></h3>
                <button onClick={() => setAddSeriesModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateSeries} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Target Course *</label>
                  <select value={newSeries.courseSlug} onChange={(e) => setNewSeries({ ...newSeries, courseSlug: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface">
                    <option value="bmb">Blind Mind Breaker (BMB)</option>
                    <option value="leadership">Leadership Academy</option>
                    <option value="ignit">IGNIT Accelerator</option>
                  </select>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Series Title *</label>
                  <input type="text" required value={newSeries.seriesTitle} onChange={(e) => setNewSeries({ ...newSeries, seriesTitle: e.target.value })}
                    placeholder="e.g. BMB 5-Day Subconscious Neural Rewiring" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Category</label>
                  <input type="text" value={newSeries.category} onChange={(e) => setNewSeries({ ...newSeries, category: e.target.value })}
                    placeholder="Subconscious Mind Optimization" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea rows={2} value={newSeries.description} onChange={(e) => setNewSeries({ ...newSeries, description: e.target.value })}
                    placeholder="Brief breakdown of series content..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddSeriesModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'CREATE SERIES'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ ADD NEW MODULE EPISODE MODAL ━━━ */}
      <AnimatePresence>
        {addModuleModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">ADD EPISODE <span className="text-secondary">MODULE</span></h3>
                <button onClick={() => setAddModuleModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateModule} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Target Series *</label>
                  <select value={targetSeriesId} onChange={(e) => setTargetSeriesId(e.target.value)}
                    className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface">
                    {videoSeriesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.seriesTitle} ({s.courseSlug.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Episode Number</label>
                    <input type="number" min={1} value={newModule.episodeNumber} onChange={(e) => setNewModule({ ...newModule, episodeNumber: parseInt(e.target.value, 10) || 1 })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                  <div>
                    <label className="text-secondary font-bold block mb-1">Duration</label>
                    <input type="text" value={newModule.duration} onChange={(e) => setNewModule({ ...newModule, duration: e.target.value })}
                      placeholder="03:45" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Module Title *</label>
                  <input type="text" required value={newModule.title} onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                    placeholder="Day 1: Subconscious Deconstruction" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Video Stream URL (YouTube or MP4) *</label>
                  <input type="text" required value={newModule.videoUrl} onChange={(e) => setNewModule({ ...newModule, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=JQypYNVzS3Q" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="freePrev" checked={newModule.isFreePreview} onChange={(e) => setNewModule({ ...newModule, isFreePreview: e.target.checked })}
                    className="w-4 h-4 accent-secondary cursor-pointer" />
                  <label htmlFor="freePrev" className="text-on-surface font-bold cursor-pointer">Allow Free Public Preview (No Login Needed)</label>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea rows={2} value={newModule.description} onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                    placeholder="Lesson breakdown..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddModuleModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'ADD EPISODE'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ PUBLISH JOB VACANCY MODAL ━━━ */}
      <AnimatePresence>
        {addJobModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">PUBLISH JOB <span className="text-secondary">VACANCY</span></h3>
                <button onClick={() => setAddJobModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Position Title *</label>
                  <input type="text" required value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Sales & Growth Officer" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Department</label>
                    <input type="text" value={newJob.department} onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                      placeholder="Sales & Growth" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Employment Type</label>
                    <select value={newJob.employmentType} onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface">
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
                    <input type="text" required value={newJob.incomeText} onChange={(e) => setNewJob({ ...newJob, incomeText: e.target.value })}
                      placeholder="RS. 45,000 - RS. 120,000" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold" />
                  </div>
                  <div>
                    <label className="text-secondary font-bold block mb-1">Total Open Slots *</label>
                    <input type="number" min={1} required value={newJob.openPositions} onChange={(e) => setNewJob({ ...newJob, openPositions: parseInt(e.target.value) || 1 })}
                      placeholder="5" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Requirements & Qualifications</label>
                  <textarea rows={2} value={newJob.requirements} onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                    placeholder="Key skills required..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddJobModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'PUBLISH VACANCY'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ REGISTER NEW STAFF MEMBER MODAL ━━━ */}
      <AnimatePresence>
        {addStaffModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">badge</span>
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">REGISTER <span className="text-secondary">STAFF MEMBER</span></h3>
                </div>
                <button onClick={() => setAddStaffModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Full Name / Staff Name *</label>
                  <input type="text" required value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="e.g. Ruwan Weerasinghe" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Role / Designation *</label>
                    <input type="text" required value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      placeholder="e.g. Mind Division Lead Coach" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Department</label>
                    <select value={newStaff.department} onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface">
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
                    <input type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="ruwan@uwe.lk" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Phone / WhatsApp</label>
                    <input type="text" value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="077 123 4567" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Photo URL (Optional)</label>
                  <input type="text" value={newStaff.photoUrl} onChange={(e) => setNewStaff({ ...newStaff, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Short Bio / Credentials</label>
                  <textarea rows={2} value={newStaff.bio} onChange={(e) => setNewStaff({ ...newStaff, bio: e.target.value })}
                    placeholder="Specialist in subconscious neural reprogramming with 8+ years coaching experience..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddStaffModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'REGISTER TO ROSTER'}</button>
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
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">EDIT <span className="text-secondary">STAFF MEMBER</span></h3>
                </div>
                <button onClick={() => setEditStaffModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleSaveEditStaff} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Full Name / Staff Name *</label>
                  <input type="text" required value={editingStaff.name} onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    placeholder="e.g. Ruwan Weerasinghe" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Role / Designation *</label>
                    <input type="text" required value={editingStaff.role} onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                      placeholder="e.g. Mind Division Lead Coach" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Department</label>
                    <select value={editingStaff.department} onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface">
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
                    <input type="email" value={editingStaff.email || ''} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                      placeholder="ruwan@uwe.lk" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Phone / WhatsApp</label>
                    <input type="text" value={editingStaff.phone || ''} onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                      placeholder="077 123 4567" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Photo URL</label>
                  <input type="text" value={editingStaff.photoUrl || ''} onChange={(e) => setEditingStaff({ ...editingStaff, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Short Bio / Credentials</label>
                  <textarea rows={2} value={editingStaff.bio || ''} onChange={(e) => setEditingStaff({ ...editingStaff, bio: e.target.value })}
                    placeholder="Coaching credentials and tactical profile..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
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
                  <button type="button" onClick={() => setEditStaffModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'UPDATE STAFF MEMBER'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ REGISTER NEW OPERATIVE USER MODAL ━━━ */}
      <AnimatePresence>
        {addUserModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">REGISTER STUDENT <span className="text-secondary">OPERATIVE</span></h3>
                <button onClick={() => setAddUserModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Full Name / Operative Name *</label>
                  <input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Kasun Fernando" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-secondary font-bold block mb-1">Email Address *</label>
                    <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="kasun@gmail.com" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Phone Number</label>
                    <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="077 123 4567" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Password</label>
                  <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="password123" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Enrolled Program Slugs (comma separated)</label>
                  <input type="text" value={newUser.enrolledCourseSlugs} onChange={(e) => setNewUser({ ...newUser, enrolledCourseSlugs: e.target.value })}
                    placeholder="bmb,leadership,ignit" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary" />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddUserModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'REGISTER OPERATIVE'}</button>
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
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0D111A] border border-secondary/40 rounded-2xl p-6 max-w-lg w-full space-y-4 text-left shadow-2xl">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="font-headline-md text-lg text-on-surface font-black uppercase">PUBLISH DEMO <span className="text-secondary">VIDEO REEL</span></h3>
                <button onClick={() => setAddDemoModalOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateDemo} className="space-y-3.5 text-xs font-mono-data">
                <div>
                  <label className="text-secondary font-bold block mb-1">Demo Title *</label>
                  <input type="text" required value={newDemo.title} onChange={(e) => setNewDemo({ ...newDemo, title: e.target.value })}
                    placeholder="e.g. BMB Subconscious Paradigm Shift" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-on-surface-variant block mb-1">Subtitle</label>
                    <input type="text" value={newDemo.subtitle} onChange={(e) => setNewDemo({ ...newDemo, subtitle: e.target.value })}
                      placeholder="Mind Optimization Protocol" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                  <div>
                    <label className="text-secondary font-bold block mb-1">Category *</label>
                    <select value={newDemo.category} onChange={(e) => setNewDemo({ ...newDemo, category: e.target.value as any })}
                      className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-on-surface">
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
                    <input type="text" value={newDemo.badge} onChange={(e) => setNewDemo({ ...newDemo, badge: e.target.value })}
                      placeholder="BMB MIND DIVISION" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant block mb-1">Duration (MM:SS)</label>
                    <input type="text" value={newDemo.duration} onChange={(e) => setNewDemo({ ...newDemo, duration: e.target.value })}
                      placeholder="01:45" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-secondary font-bold block mb-1">Video Stream URL (YouTube or MP4) *</label>
                  <input type="text" required value={newDemo.videoUrl} onChange={(e) => setNewDemo({ ...newDemo, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=JQypYNVzS3Q" className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40 text-secondary" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Poster Image URL</label>
                  <input type="text" value={newDemo.posterUrl} onChange={(e) => setNewDemo({ ...newDemo, posterUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1">Description</label>
                  <textarea rows={2} value={newDemo.description} onChange={(e) => setNewDemo({ ...newDemo, description: e.target.value })}
                    placeholder="Short description of what the video demonstrates..." className="input-field w-full p-2.5 rounded-lg bg-[#131929] border-secondary/40" />
                </div>
                <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/30">
                  <button type="button" onClick={() => setAddDemoModalOpen(false)} className="px-4 py-2 rounded bg-[#131929] text-on-surface-variant">CANCEL</button>
                  <button type="submit" disabled={saving} className="btn-elite px-5 py-2 rounded font-bold uppercase">{saving ? 'SAVING...' : 'PUBLISH DEMO REEL'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
