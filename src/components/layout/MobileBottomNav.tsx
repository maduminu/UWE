import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from './Navbar';

interface MobileBottomNavProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activePage, setActivePage }) => {
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  // Primary bottom tabs
  const primaryTabs: { id: PageId; label: string; icon: string; highlight?: boolean }[] = [
    { id: 'home', label: 'HOME', icon: 'home' },
    { id: 'product', label: 'COURSES', icon: 'school' },
    { id: 'program-videos', label: 'VAULT', icon: 'play_circle' },
    { id: 'careers', label: 'CAREERS', icon: 'work' },
    { id: 'admin', label: 'HQ ADMIN', icon: 'shield', highlight: true },
  ];

  // Secondary items in the "More Menu" drawer
  const moreItems: { id: PageId; label: string; icon: string; desc: string }[] = [
    { id: 'dashboard', label: 'My Student Portal', icon: 'school', desc: 'Enrolled courses, certificates & progress' },
    { id: 'contact', label: 'Contact HQ & WhatsApp', icon: 'chat', desc: 'Direct transmission & inquiries' },
    { id: 'demos', label: 'Demo Media Vault', icon: 'movie', desc: 'Watch program preview trailers' },
    { id: 'posters', label: 'Flyers & Posters', icon: 'photo_library', desc: 'Social recruitment assets' },
    { id: 'about', label: 'About UWE Empire', icon: 'info', desc: 'Operative ethos and origins' },
    { id: 'vision', label: 'Sovereign Vision', icon: 'visibility', desc: 'Sri Lankan economic architecture' },
  ];

  const handleTabClick = (id: PageId) => {
    setActivePage(id);
    setMoreDrawerOpen(false);
  };

  return (
    <>
      {/* ── Slide-up "More HQ Systems" Drawer ── */}
      <AnimatePresence>
        {moreDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md lg:hidden"
            />

            {/* Sheet Modal */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-[88px] left-3 right-3 max-w-[440px] mx-auto z-50 rounded-2xl bg-[#0C101A]/95 border border-secondary/40 p-4 shadow-[0_0_50px_rgba(255,184,0,0.25)] backdrop-blur-2xl lg:hidden space-y-2"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30 px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-base">apps</span>
                  <span className="font-mono-data text-xs text-secondary font-bold uppercase tracking-wider">
                    UWE COMMAND DIRECTORY
                  </span>
                </div>
                <button
                  onClick={() => setMoreDrawerOpen(false)}
                  className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {moreItems.map((item) => {
                  const isCurrent = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full p-2.5 rounded-xl font-mono-data text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-secondary/20 border border-secondary/50 text-secondary font-bold'
                          : 'bg-[#111624] border border-outline-variant/20 text-on-surface hover:bg-[#161d30]'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent ? 'bg-secondary text-black' : 'bg-secondary/15 text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.label}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{item.desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant shrink-0">
                        chevron_right
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Floating Mobile Bottom Dock Bar ── */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-3 left-3 right-3 max-w-[440px] mx-auto z-40 lg:hidden pointer-events-auto"
      >
        <div className="relative rounded-2xl bg-[#090D16]/95 border border-secondary/35 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(255,184,0,0.18)] backdrop-blur-2xl flex items-center justify-around gap-1">
          {primaryTabs.map((tab) => {
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none ${
                  isActive
                    ? 'text-[#00D2FF] font-black'
                    : tab.highlight
                    ? 'text-secondary/90 hover:text-secondary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {/* Active Indicator Glow Background */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-dock"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-t from-[#00D2FF]/15 to-transparent border border-[#00D2FF]/30"
                  />
                )}

                {/* Tab Icon */}
                <span
                  className={`material-symbols-outlined text-xl transition-transform ${
                    isActive ? 'scale-110 text-glow-cyan' : ''
                  }`}
                >
                  {tab.icon}
                </span>

                {/* Tab Label */}
                <span className="font-mono-data text-[9px] uppercase tracking-wider leading-none">
                  {tab.label}
                </span>

                {/* Active Indicator Glowing Cyan Dot (Matching Native App Reference) */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-dot"
                    className="w-1 h-1 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF] mt-0.5"
                  />
                )}
              </button>
            );
          })}

          {/* MORE / EXPAND MENU BUTTON */}
          <button
            onClick={() => setMoreDrawerOpen(!moreDrawerOpen)}
            className={`relative flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none ${
              moreDrawerOpen || moreItems.some((i) => i.id === activePage)
                ? 'text-secondary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="More Pages & Directory"
          >
            <span
              className={`material-symbols-outlined text-xl transition-transform ${
                moreDrawerOpen ? 'rotate-90 text-secondary' : ''
              }`}
            >
              {moreDrawerOpen ? 'cancel' : 'menu_open'}
            </span>
            <span className="font-mono-data text-[9px] uppercase tracking-wider leading-none">
              MORE
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
