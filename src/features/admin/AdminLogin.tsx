import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageSEO } from '../../components/ui/PageSEO';
import type { PageId } from '../../components/layout/Navbar';

interface AdminLoginProps {
  usernameInput: string;
  setUsernameInput: (val: string) => void;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  authError: string | null;
  setAuthError: (val: string | null) => void;
  authLoading: boolean;
  handleAdminLogin: (e: React.FormEvent) => void;
  handleAutofill: () => void;
  setActivePage?: (page: PageId) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  usernameInput,
  setUsernameInput,
  passwordInput,
  setPasswordInput,
  authError,
  setAuthError,
  authLoading,
  handleAdminLogin,
  handleAutofill,
  setActivePage,
}) => {
  return (
    <div className="min-h-screen bg-[#06080D] flex items-center justify-center p-4 relative overflow-hidden">
      <PageSEO
        title="Command HQ Gateway"
        description="Command HQ administrative login gateway."
        canonical="/admin"
      />
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

        <AnimatePresence>
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: [-8, 8, -6, 6, -3, 3, 0] }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/60 shadow-[0_0_20px_rgba(255,71,87,0.25)] text-red-300 font-mono-data text-xs flex items-start gap-2.5"
            >
              <span className="material-symbols-outlined text-red-400 text-lg shrink-0 mt-0.5 animate-pulse">warning</span>
              <div className="space-y-0.5">
                <p className="font-bold text-red-200">ACCESS DENIED: {authError.toUpperCase()}</p>
                <p className="text-[11px] text-red-400/90">
                  Incorrect username or security key. Please check your credentials or click <strong>AUTOFILL</strong> below.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="font-mono-data text-xs text-secondary font-bold block mb-1">Commander Username</label>
            <input
              type="text"
              required
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                if (authError) setAuthError(null);
              }}
              placeholder="admin or admin@uwe.lk"
              className="input-field w-full px-4 py-3 rounded-lg text-sm font-mono-data bg-[#111622] border-secondary/40 focus:border-secondary transition-all"
            />
          </div>
          <div>
            <label className="font-mono-data text-xs text-secondary font-bold block mb-1">Security Key</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (authError) setAuthError(null);
              }}
              placeholder="••••••••"
              className="input-field w-full px-4 py-3 rounded-lg text-sm font-mono-data bg-[#111622] border-secondary/40 focus:border-secondary transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className={`btn-elite w-full py-3.5 rounded-lg font-label-caps text-xs uppercase tracking-widest font-black cursor-pointer shadow-[0_0_25px_rgba(255,184,0,0.4)] flex items-center justify-center gap-2 transition-all ${
              authLoading ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            <span className={`material-symbols-outlined text-sm ${authLoading ? 'animate-spin' : ''}`}>
              {authLoading ? 'progress_activity' : 'key'}
            </span>
            <span>{authLoading ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE & ENTER HQ'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-outline-variant/30 text-center">
          <button
            type="button"
            onClick={handleAutofill}
            className="w-full py-2.5 rounded bg-secondary/10 border border-secondary/40 text-secondary font-mono-data text-xs font-bold hover:bg-secondary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>AUTOFILL (admin / admin1234)</span>
          </button>
        </div>

        {setActivePage && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="font-mono-data text-xs text-on-surface-variant hover:text-on-surface underline cursor-pointer"
            >
              ← Return to Visitor Website
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
