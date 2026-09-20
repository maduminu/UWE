import React from 'react';
import type { AdminTab } from '../types/admin.types';
import { authService } from '../../../services/auth';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export const TAB_CONFIG = [
  { id: 'analytics', label: 'Analytics', icon: 'analytics', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER'] },
  { id: 'batches', label: 'Batches, Fees & Zoom Links', icon: 'edit_calendar', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'mastermind', label: 'Mastermind Q&A', icon: 'question_answer', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'coupons', label: 'Coupons & Promos', icon: 'local_offer', roles: ['SUPER_ADMIN', 'COMMANDER', 'RECRUITER'] },
  { id: 'reviews', label: 'Course Reviews', icon: 'rate_review', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER'] },
  { id: 'instructors', label: 'Faculty Directory', icon: 'person_celebrate', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'partners', label: 'Business Partners', icon: 'handshake', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'demos', label: 'Demo Videos', icon: 'play_circle', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'series', label: 'Video Series & Modules', icon: 'video_library', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'jobs', label: 'Jobs & Applications', icon: 'work', roles: ['SUPER_ADMIN', 'COMMANDER', 'RECRUITER'] },
  { id: 'staff', label: 'Staff Roster', icon: 'badge', roles: ['SUPER_ADMIN', 'COMMANDER'] },
  { id: 'calls', label: 'Call Tracker', icon: 'call', roles: ['SUPER_ADMIN', 'COMMANDER', 'RECRUITER'] },
  { id: 'leads', label: 'WhatsApp Leads', icon: 'forum', roles: ['SUPER_ADMIN', 'COMMANDER', 'RECRUITER'] },
  { id: 'users', label: 'User Accounts', icon: 'manage_accounts', roles: ['SUPER_ADMIN', 'COMMANDER', 'COACH'] },
  { id: 'slips', label: 'Bank Slips', icon: 'receipt_long', roles: ['SUPER_ADMIN', 'COMMANDER', 'RECRUITER'] },
  { id: 'banner', label: 'Ticker Banner', icon: 'campaign', roles: ['SUPER_ADMIN', 'COMMANDER'] },
] as const;

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab }) => {
  const currentAdmin = authService.getAdminUser();
  const currentRole = currentAdmin?.role || 'COMMANDER';

  // Filter tabs according to RBAC clearances
  const visibleTabs = TAB_CONFIG.filter(
    (tab) => currentRole === 'SUPER_ADMIN' || (tab.roles as readonly string[]).includes(currentRole)
  );

  return (
    <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-5 pb-3">
      <div className="flex gap-2 sm:gap-3 border-b border-outline-variant/30 pb-3 flex-wrap items-center">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-label-caps text-xs uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-secondary text-black font-black shadow-[0_0_20px_rgba(255,184,0,0.5)]'
                : 'bg-[#0E131F] text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
