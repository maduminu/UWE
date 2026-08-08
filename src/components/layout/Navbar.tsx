import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type PageId = 'home' | 'about' | 'vision' | 'product' | 'contact';

interface NavbarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, setActivePage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'vision', label: 'Vision' },
    { id: 'product', label: 'Programs' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (page: PageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0b0e14]/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center px-4 md:px-lg py-3 max-w-container-max mx-auto">
        
        {/* Brand Logo */}
        <button 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 sm:gap-3 bg-transparent border-none text-left cursor-pointer focus:outline-none group active-press"
        >
          <div className="logo-circle transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,184,0,0.8)]">
            <img 
              alt="UWE Metallic Logo" 
              className="h-full w-full object-cover rounded-full"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkZaDW45iBJgfYuDEfFG0b1KUoy-_-xz2d2iJl_qDJ5NyI-Qr0Z4lLoxfj9JsGMBLSXSIRDHKsxW0BZVN6LTFinbhu9ZmlUaJxxH66dsaBi36CMXg9EfKmMlrW3HLdPoLGB3We0qTs0K3s60bubCQanXAsFwx1IFi2ukjaxUZkZlzotw4YXRr8Q9XlRnv8RCW6k8UIIvLl-7wr4mgGn4eFGbkmNJdqNt1rGvSoIpntjLyTarpO59Sl" 
            />
          </div>
          <span className="font-headline-md text-base sm:text-lg md:text-headline-md font-black tracking-tighter text-on-surface uppercase group-hover:text-secondary transition-colors">
            UNITY WARRIORS
          </span>
        </button>

        {/* Desktop Navigation Links with Shared Framer Motion Layout Glow */}
        <nav className="hidden md:flex gap-md lg:gap-lg items-center">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-1.5 font-body-md text-body-md bg-transparent border-none cursor-pointer transition-colors duration-300 active-press ${
                  isActive
                    ? 'text-secondary font-bold text-glow-gold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-glow"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary rounded-full shadow-[0_0_12px_#ffba20]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-sm">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleNavClick('contact')}
            className="btn-elite min-h-[42px] px-3 sm:px-sm py-2 rounded font-label-caps text-xs sm:text-label-caps uppercase tracking-widest cursor-pointer"
          >
            JOIN EMPIRE
          </motion.button>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface p-2 focus:outline-none active-press"
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
            className="md:hidden overflow-hidden bg-[#0e121a]/95 backdrop-blur-2xl border-b border-outline-variant/40 px-6 py-4 flex flex-col gap-2 shadow-2xl"
          >
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`text-left min-h-[46px] w-full px-4 py-3 rounded-lg font-body-md transition-all cursor-pointer flex items-center justify-between active-press ${
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
  );
};
