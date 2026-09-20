import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import type { PageId } from '../../components/layout/Navbar';
import { AdminHeader } from './components/AdminHeader';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminToastContainer } from './components/AdminToastContainer';
import { useAdminToast } from './hooks/useAdminToast';
import { parsePrice } from '../../utils/priceFormatter';
import type { AdminTab, LeadRecord } from './types/admin.types';

// Tab components
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { BatchesTab } from './tabs/BatchesTab';
import { DemosTab } from './tabs/DemosTab';
import { SeriesTab } from './tabs/SeriesTab';
import { JobsTab } from './tabs/JobsTab';
import { StaffTab } from './tabs/StaffTab';
import { UsersTab } from './tabs/UsersTab';
import { LeadsTab } from './tabs/LeadsTab';
import { SlipsTab } from './tabs/SlipsTab';
import { BannerTab } from './tabs/BannerTab';
import { CouponsTab } from './tabs/CouponsTab';
import { ReviewsTab } from './tabs/ReviewsTab';
import { InstructorsTab } from './tabs/InstructorsTab';
import { MastermindTab } from './tabs/MastermindTab';
import { PartnersTab } from './tabs/PartnersTab';
import { CallTrackerTab } from './tabs/CallTrackerTab';

interface AdminLayoutProps {
  onLogout: () => void;
  setActivePage?: (page: PageId) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout, setActivePage }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [saving, setSaving] = useState(false);
  const { toasts, addToast } = useAdminToast();

  // State arrays for all domains
  const [courses, setCourses] = useState<any[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [demos, setDemos] = useState<any[]>([]);
  const [videoSeriesList, setVideoSeriesList] = useState<any[]>([]);
  const [jobVacancies, setJobVacancies] = useState<any[]>([]);
  const [jobApplications, setJobApplications] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [paymentSlips, setPaymentSlips] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [adminInstructors, setAdminInstructors] = useState<any[]>([]);
  const [unansweredQACount, setUnansweredQACount] = useState(0);
  const [announcement, setAnnouncement] = useState({
    id: '',
    enabled: true,
    text: '⚡ FINAL CALL FOR BMB BATCH 2026: 4 SEATS REMAINING BEFORE REGISTRATION LOCKS',
    type: 'URGENT',
    dirty: false,
  });

  const fetchAllData = useCallback(async () => {
    try {
      const [
        coursesRes,
        leadsRes,
        bannerRes,
        demosRes,
        seriesRes,
        jobsRes,
        jobAppsRes,
        staffRes,
        usersRes,
        slipsRes,
        couponsRes,
        reviewsRes,
        instructorsRes,
      ] = await Promise.allSettled([
        api.getCourses(),
        api.getLeads(),
        api.getAdminBanner().catch(() => api.getActiveBanner()),
        api.getDemos(),
        api.getProgramVideos(),
        api.getJobVacancies(),
        api.getJobApplications(),
        api.getStaff(),
        api.getUsers(),
        api.getPaymentSlips(),
        api.getCoupons(),
        api.getAllReviews(),
        api.getInstructors(),
      ]);

      if (coursesRes.status === 'fulfilled' && coursesRes.value.data) {
        const colorMap: Record<string, string> = {
          bmb: '#00D2FF',
          leadership: '#FFB800',
          ignit: '#FF4757',
        };
        const mappedCourses = coursesRes.value.data.map((c: any) => {
          const upcomingBatch =
            c.batches?.find((b: any) => b.status === 'UPCOMING') || c.batches?.[0];
          const rawPrice = typeof c.price === 'number' ? c.price : parsePrice(c.price);
          const priceNum = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 0;
          const totalSeats = typeof upcomingBatch?.totalSeats === 'number' ? upcomingBatch.totalSeats : 0;
          const seats =
            typeof upcomingBatch?.availableSeats === 'number'
              ? upcomingBatch.availableSeats
              : typeof c.seatsLeft === 'number'
              ? c.seatsLeft
              : 0;

          return {
            id: c.id,
            slug: c.slug || '',
            name: c.title || c.name || 'Unknown Program',
            badge: c.badge || '',
            price: priceNum,
            priceDisplay: `${c.currency || 'RS.'} ${priceNum.toLocaleString('en-US')}`,
            currency: c.currency || 'RS.',
            nextBatchDate:
              upcomingBatch?.scheduleText || c.nextBatchDate || 'TBA',
            seatsLeft: seats,
            totalSeats: totalSeats,
            zoomLink: upcomingBatch?.zoomLink || '',
            batchId: upcomingBatch?.id || c.batchId,
            batches: c.batches || [],
            color: colorMap[c.slug?.toLowerCase()] || '#FFB800',
            dirty: false,
          };
        });
        setCourses(mappedCourses);
      }
      if (leadsRes.status === 'fulfilled' && leadsRes.value.data) {
        setLeads(
          leadsRes.value.data.map((l: any) => ({
            id: `#LD-${l.id.substring(0, 4).toUpperCase()}`,
            fullId: l.id,
            name: l.name,
            phone: l.phone,
            email: l.email,
            program: (l.courseSlug || l.inquiryType || '').toUpperCase(),
            date: new Date(l.createdAt).toLocaleString(),
            status: l.status,
            value: l.course?.price ? `RS. ${l.course.price.toLocaleString('en-US')}` : 'N/A',
            isAbandoned: l.isAbandoned || false,
            hoursPending: l.hoursPending || 0,
          }))
        );
      }
      if (bannerRes.status === 'fulfilled' && bannerRes.value?.data) {
        const b = Array.isArray(bannerRes.value.data) ? bannerRes.value.data[0] : bannerRes.value.data;
        if (b && b.id) {
          setAnnouncement({
            id: b.id,
            enabled: Boolean(b.isActive),
            text: b.message || '',
            type: b.bannerType || 'URGENT',
            dirty: false,
          });
        }
      }
      if (demosRes.status === 'fulfilled' && demosRes.value.data) {
        setDemos(demosRes.value.data);
      }
      if (seriesRes.status === 'fulfilled' && seriesRes.value.data) {
        setVideoSeriesList(seriesRes.value.data);
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setJobVacancies(jobsRes.value.data);
      }
      if (jobAppsRes.status === 'fulfilled' && jobAppsRes.value.data) {
        setJobApplications(jobAppsRes.value.data);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.data) {
        setStaffMembers(staffRes.value.data);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data) {
        setUsers(usersRes.value.data);
      }
      if (slipsRes.status === 'fulfilled' && slipsRes.value.data) {
        setPaymentSlips(slipsRes.value.data);
      }
      if (couponsRes.status === 'fulfilled' && couponsRes.value.data) {
        setCoupons(couponsRes.value.data);
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.data) {
        setAdminReviews(reviewsRes.value.data);
      }
      if (instructorsRes.status === 'fulfilled' && instructorsRes.value.data) {
        setAdminInstructors(instructorsRes.value.data);
      }

      // Fetch unanswered Mastermind Q&A count — uses IDENTICAL logic to MastermindTab line 174:
      // (!q.isAnswered && !q.answer) || hasStudentFollowUp(q)
      // where hasStudentFollowUp = last reply exists and is NOT from a coach.
      try {
        const qaRes = await api.getMastermindQuestions('all', { limit: 50 }).catch(() => ({ data: [], totalCount: 0 }));
        const allQs: any[] = qaRes?.data && Array.isArray(qaRes.data) ? qaRes.data : [];
        const totalCount: number = qaRes?.totalCount ?? qaRes?.count ?? allQs.length;

        const hasStudentFollowUp = (q: any): boolean => {
          const replies: any[] = q.replies || [];
          if (replies.length === 0) return false;
          return !replies[replies.length - 1].isCoach;
        };

        const unanswered = allQs.filter((q: any) =>
          (!q.isAnswered && !q.answer) || hasStudentFollowUp(q)
        );

        // If backend has more than 50 total questions, fall back to totalCount
        // (we can only inspect isAnswered/replies for the 50 we received)
        setUnansweredQACount(totalCount > allQs.length ? totalCount : unanswered.length);
      } catch {
        /* non-critical */
      }

      setDbStatus('online');
    } catch (err) {
      console.error('Failed to load some admin data:', err);
      setDbStatus('offline');
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <div className="min-h-screen bg-[#070A11] text-on-surface flex flex-col font-body-md pt-20 pb-32 lg:pb-8">
      {/* Toast Notification HUD */}
      <AdminToastContainer toasts={toasts} />

      {/* Top Header Command Bar */}
      <AdminHeader
        dbStatus={dbStatus}
        fetchAllData={fetchAllData}
        addToast={addToast}
        handleAdminLogout={onLogout}
        setActivePage={setActivePage}
      />

      {/* Navigation Bar / Tabs */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Layout */}
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <AnalyticsTab
              key="analytics"
              courses={courses}
              leads={leads}
              paymentSlips={paymentSlips}
              staffMembers={staffMembers}
              jobVacancies={jobVacancies}
              jobApplications={jobApplications}
              users={users}
              unansweredQACount={unansweredQACount}
              setActiveTab={setActiveTab}
              addToast={addToast}
            />
          )}

          {activeTab === 'batches' && (
            <BatchesTab
              key="batches"
              courses={courses}
              setCourses={setCourses}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'demos' && (
            <DemosTab
              key="demos"
              demos={demos}
              setDemos={setDemos}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'series' && (
            <SeriesTab
              key="series"
              videoSeriesList={videoSeriesList}
              setVideoSeriesList={setVideoSeriesList}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsTab
              key="jobs"
              jobVacancies={jobVacancies}
              setJobVacancies={setJobVacancies}
              jobApplications={jobApplications}
              setJobApplications={setJobApplications}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'staff' && (
            <StaffTab
              key="staff"
              staffMembers={staffMembers}
              setStaffMembers={setStaffMembers}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              key="users"
              users={users}
              setUsers={setUsers}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
              setActivePage={setActivePage}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsTab
              key="leads"
              leads={leads}
              setLeads={setLeads}
              users={users}
              setUsers={setUsers}
              fetchAllData={fetchAllData}
              addToast={addToast}
            />
          )}

          {activeTab === 'calls' && (
            <CallTrackerTab key="calls" />
          )}

          {activeTab === 'slips' && (
            <SlipsTab
              key="slips"
              paymentSlips={paymentSlips}
              setPaymentSlips={setPaymentSlips}
              setUsers={setUsers}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'banner' && (
            <BannerTab
              key="banner"
              announcement={announcement}
              setAnnouncement={setAnnouncement}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'coupons' && (
            <CouponsTab
              key="coupons"
              coupons={coupons}
              setCoupons={setCoupons}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewsTab
              key="reviews"
              adminReviews={adminReviews}
              setAdminReviews={setAdminReviews}
              addToast={addToast}
            />
          )}

          {activeTab === 'instructors' && (
            <InstructorsTab
              key="instructors"
              adminInstructors={adminInstructors}
              setAdminInstructors={setAdminInstructors}
              saving={saving}
              setSaving={setSaving}
              addToast={addToast}
            />
          )}

          {activeTab === 'mastermind' && (
            <MastermindTab
              key="mastermind"
              addToast={addToast}
            />
          )}

          {activeTab === 'partners' && (
            <PartnersTab
              key="partners"
              addToast={addToast}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
