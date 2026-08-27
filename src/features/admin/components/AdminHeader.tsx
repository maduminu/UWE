import React from 'react';
import type { PageId } from '../../../components/layout/Navbar';
import { authService } from '../../../services/auth';

interface AdminHeaderProps {
  dbStatus: 'connecting' | 'online' | 'offline';
  fetchAllData: () => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  handleAdminLogout: () => void;
  setActivePage?: (page: PageId) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  dbStatus,
  fetchAllData,
  addToast,
  handleAdminLogout,
  setActivePage,
}) => {
  const adminUser = authService.getAdminUser();
  const role = adminUser?.role || 'COMMANDER';

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-500/20 border-purple-500 text-purple-300',
    COMMANDER: 'bg-secondary/20 border-secondary text-secondary',
    COACH: 'bg-blue-500/20 border-blue-500 text-blue-300',
    RECRUITER: 'bg-emerald-500/20 border-emerald-500 text-emerald-300',
  };

  return (
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
            <span
              className={`px-2 py-0.5 rounded border font-mono-data text-[10px] font-bold ${
                roleColors[role] || 'bg-secondary/20 border-secondary text-secondary'
              }`}
            >
              {role}
            </span>
            <span
              className={`px-2 py-0.5 rounded border font-mono-data text-[10px] font-bold ${
                dbStatus === 'online'
                  ? 'bg-[#2ED573]/20 border-[#2ED573] text-[#2ED573]'
                  : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
              }`}
            >
              DB: {dbStatus.toUpperCase()}
            </span>
          </div>
          <p className="font-mono-data text-[11px] text-on-surface-variant hidden sm:block">
            {adminUser?.email || 'admin@uwe.lk'} • Supabase Live CMS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => {
            fetchAllData();
            addToast('Syncing data with Supabase...', 'info');
          }}
          className="px-3 py-1.5 rounded bg-secondary/15 border border-secondary/40 text-xs font-mono-data text-secondary hover:bg-secondary hover:text-black font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(255,184,0,0.2)]"
          title="Fetch latest data from Supabase"
        >
          <span className={`material-symbols-outlined text-sm ${dbStatus === 'connecting' ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span>SYNC DATA</span>
        </button>
        {setActivePage && (
          <button
            onClick={() => setActivePage('home')}
            className="px-3 py-1.5 rounded bg-surface-container-high border border-outline-variant/40 text-xs font-mono-data text-on-surface-variant hover:text-on-surface transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>VIEW SITE</span>
          </button>
        )}
        <button
          onClick={handleAdminLogout}
          className="px-3 sm:px-4 py-1.5 rounded bg-red-500/20 border border-red-500/50 text-red-400 font-mono-data text-xs font-bold hover:bg-red-500/30 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          <span className="hidden sm:inline">LOGOUT</span>
        </button>
      </div>
    </header>
  );
};
