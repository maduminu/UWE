import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfileModal } from '../ui/UserProfileModal';
import { AuthModal } from '../ui/AuthModal';
import uweLogoAsset from '../../assets/images/uwe_shield_isolated.png';

export type PageId = 'home' | 'about' | 'vision' | 'product' | 'demos' | 'careers' | 'program-videos' | 'posters' | 'admin' | 'contact';

interface NavbarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, setActivePage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });

  // ── Auth User Session State ──
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('uwe_user_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('uwe_user_account');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('uwe_user_account');
    setCurrentUser(null);
    setProfileModalOpen(false);
  };

  // Position the popover directly beneath the trigger button using getBoundingClientRect
  const updatePopoverPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  // Update position on open and on window resize
  useEffect(() => {
    if (toolsDropdownOpen) {
      updatePopoverPosition();
      window.addEventListener('resize', updatePopoverPosition);
      return () => window.removeEventListener('resize', updatePopoverPosition);
    }
  }, [toolsDropdownOpen, updatePopoverPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavItems: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'vision', label: 'Vision' },
    { id: 'product', label: 'Programs' },
    { id: 'demos', label: 'Demos' },
    { id: 'careers', label: 'Careers' },
  ];

  const toolNavItems: { id: PageId; label: string; icon: string }[] = [
    { id: 'program-videos', label: 'Series & Vault', icon: 'video_library' },
    { id: 'posters', label: 'Command Flyers', icon: 'photo_library' },
    { id: 'admin', label: 'Admin HQ', icon: 'admin_panel_settings' },
  ];

  const handleNavClick = (id: PageId) => {
    setActivePage(id);
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  };

  const isToolActive = toolNavItems.some((t) => t.id === activePage);

  // Portal JSX for Tools & HQ dropdown popover
  const dropdownPopover = toolsDropdownOpen
    ? createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            right: `${popoverPos.right}px`,
          }}
          className="z-[9999] min-w-[200px] py-1.5 rounded-xl bg-[#0d121c]/95 backdrop-blur-2xl border border-secondary/40 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(255,184,0,0.15)] animate-in fade-in zoom-in-95 duration-150"
        >
          {toolNavItems.map((tool) => {
            const isSelected = activePage === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleNavClick(tool.id)}
                className={`w-full px-4 py-2.5 text-xs font-mono-data uppercase flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-secondary/20 text-secondary font-bold border-l-2 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#06080D]/85 backdrop-blur-xl border-b border-outline-variant/30 h-[64px] flex items-center">
        <div className="max-w-container-max w-full mx-auto px-4 md:px-lg flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer group active-press shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary via-[#FFD700] to-secondary-container p-[2.5px] shadow-[0_0_15px_rgba(255,184,0,0.5)] flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-full bg-[#0a0e18] flex items-center justify-center overflow-hidden">
                <img 
                  src={uweLogoAsset} 
                  alt="UWE Shield" 
                  className="w-[85%] h-[85%] object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="font-display-md text-base tracking-wider text-on-surface font-black group-hover:text-secondary transition-colors duration-300 leading-none">
                UWE
              </span>
              <span className="font-mono-data text-[10px] tracking-widest text-secondary font-bold leading-none mt-0.5">
                EMPIRE
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative px-3 py-1.5 font-body-md text-sm bg-transparent border-none cursor-pointer transition-colors duration-300 active-press whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-secondary font-bold text-glow-gold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary rounded-full shadow-[0_0_12px_#ffba20]" />
                  )}
                </button>
              );
            })}

            {/* Tools & HQ Trigger Button */}
            <button
              ref={triggerRef}
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className={`relative ml-1 px-3.5 py-2 rounded-lg text-xs font-mono-data uppercase flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isToolActive
                  ? 'bg-secondary/15 text-secondary border-secondary/60 font-bold shadow-[0_0_12px_rgba(255,184,0,0.3)]'
                  : 'glass-panel text-on-surface-variant border-outline-variant/30 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm shrink-0">settings_suggest</span>
              <span className="font-bold">Tools &amp; HQ</span>
              <span className={`material-symbols-outlined text-xs shrink-0 transition-transform duration-300 ${toolsDropdownOpen ? 'rotate-180' : ''}`}>
                arrow_drop_down
              </span>

              {isToolActive && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary rounded-full shadow-[0_0_12px_#ffba20]" />
              )}
            </button>
          </nav>

          {/* Action CTA Button / User Profile & Mobile Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setProfileModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-secondary/15 border border-secondary/60 text-secondary font-mono-data text-xs font-bold hover:bg-secondary hover:text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.25)]"
                >
                  <span className="material-symbols-outlined text-sm">account_circle</span>
                  <span>⚡ OPERATIVE {currentUser.name ? currentUser.name.split(' ')[0].toUpperCase() : 'ALEX'}</span>
                </motion.button>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer flex items-center justify-center"
                  title="Logout Session"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAuthModalOpen(true)}
                className="btn-elite px-4 py-2 rounded font-label-caps text-xs uppercase tracking-widest cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>OPERATIVE LOGIN</span>
              </motion.button>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center text-on-surface p-2 focus:outline-none active-press"
              aria-label="Toggle Navigation Menu"
            >
              <span className="material-symbols-outlined text-2xl text-secondary">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Animated Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden overflow-hidden bg-[#0e121a]/95 backdrop-blur-2xl border-b border-outline-variant/40 px-6 py-4 flex flex-col gap-2 shadow-2xl absolute top-[100%] left-0 w-full"
            >
              {[...mainNavItems, ...toolNavItems, { id: 'contact' as PageId, label: 'Contact HQ' }].map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`text-left min-h-[44px] w-full px-4 py-2.5 rounded-lg font-body-md transition-all cursor-pointer flex items-center justify-between active-press ${
                      isActive 
                        ? 'bg-secondary/15 text-secondary font-bold border-l-4 border-secondary shadow-[0_0_15px_rgba(255,186,32,0.2)]' 
                        : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="material-symbols-outlined text-secondary text-sm">chevron_right</span>}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Portal-rendered dropdown popover */}
      {dropdownPopover}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        user={currentUser}
        onClose={() => setProfileModalOpen(false)}
        onLogout={handleLogout}
        onNavigateToVideos={() => setActivePage('program-videos')}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          localStorage.setItem('uwe_user_account', JSON.stringify(user));
          setCurrentUser(user);
        }}
      />
    </>
  );
};
