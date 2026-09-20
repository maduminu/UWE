import React from 'react';
import type { PageId } from './Navbar';

interface FooterProps {
  setActivePage: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActivePage }) => {
  const handlePageChange = (page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full pt-12 pb-8 bg-[#0a0d13] border-t border-outline-variant/20 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-4 sm:px-lg max-w-container-max mx-auto">
        <div className="flex flex-col gap-sm">
          <div className="flex items-center gap-sm">
            <div className="logo-circle">
              <img 
                alt="UWE Metallic Logo" 
                className="h-full w-full object-cover rounded-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkZaDW45iBJgfYuDEfFG0b1KUoy-_-xz2d2iJl_qDJ5NyI-Qr0Z4lLoxfj9JsGMBLSXSIRDHKsxW0BZVN6LTFinbhu9ZmlUaJxxH66dsaBi36CMXg9EfKmMlrW3HLdPoLGB3We0qTs0K3s60bubCQanXAsFwx1IFi2ukjaxUZkZlzotw4YXRr8Q9XlRnv8RCW6k8UIIvLl-7wr4mgGn4eFGbkmNJdqNt1rGvSoIpntjLyTarpO59Sl" 
              />
            </div>
            <span className="font-headline-md text-base sm:text-headline-md font-black text-on-surface uppercase">
              Unity Warriors Empire
            </span>
          </div>
          <p className="font-body-md text-on-surface-variant text-xs sm:text-sm">
            Pvt Ltd. Reg No: PV 123456
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-xs text-on-surface uppercase font-bold tracking-wider mb-xs">Protocol</span>
          <button 
            onClick={() => handlePageChange('about')}
            className="text-left min-h-[36px] bg-transparent border-none p-0 font-body-md text-sm text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active-press"
          >
            About Us
          </button>
          <button 
            onClick={() => handlePageChange('vision')}
            className="text-left min-h-[36px] bg-transparent border-none p-0 font-body-md text-sm text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active-press"
          >
            Vision &amp; Mission
          </button>
          <button 
            onClick={() => handlePageChange('product')}
            className="text-left min-h-[36px] bg-transparent border-none p-0 font-body-md text-sm text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active-press"
          >
            Elite Programs
          </button>
          <button 
            onClick={() => handlePageChange('partners')}
            className="text-left min-h-[36px] bg-transparent border-none p-0 font-body-md text-sm text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active-press"
          >
            Business Partners
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-xs text-on-surface uppercase font-bold tracking-wider mb-xs">Command</span>
          <button 
            onClick={() => handlePageChange('contact')}
            className="text-left min-h-[36px] bg-transparent border-none p-0 font-body-md text-sm text-secondary hover:text-secondary-container transition-colors cursor-pointer active-press"
          >
            Command Center
          </button>
          <button 
            onClick={() => handlePageChange('contact')}
            className="text-left min-h-[36px] bg-transparent border-none p-0 font-body-md text-sm text-on-surface-variant hover:text-secondary transition-colors cursor-pointer active-press"
          >
            Support &amp; Inquiries
          </button>
        </div>

        <div className="flex flex-col gap-xs">
          <span className="font-label-caps text-xs text-on-surface uppercase font-bold tracking-wider mb-xs">Location</span>
          <p className="font-body-md text-on-surface-variant text-xs sm:text-sm">Colombo, Sri Lanka</p>
          <div className="h-20 w-full bg-surface-variant/40 rounded mt-2 border border-outline-variant/30 flex items-center justify-center relative overflow-hidden">
            <span className="material-symbols-outlined text-outline">map</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center border-t border-outline-variant/20 pt-6 max-w-container-max mx-auto px-4">
        <p className="font-body-md text-on-surface-variant text-xs">
          © 2026 UNITY WARRIORS EMPIRE. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
};
