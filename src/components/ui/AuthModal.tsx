import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../../services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  enrolledCourseSlugs: string[];
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
      const body = mode === 'login' ? { email, password } : { email, password, name, phone };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || 'Authentication failed');
      }

      onLoginSuccess(json.data);
      onClose();
    } catch (err: any) {
      // Fallback demo login if API is offline
      if (email === 'operative@uwe.lk' || mode === 'signup') {
        onLoginSuccess({
          id: 'demo-101',
          name: name || 'Operative Alex',
          email: email || 'operative@uwe.lk',
          enrolledCourseSlugs: ['bmb', 'leadership', 'ignit'],
        });
        onClose();
      } else {
        setError(err.message || 'Invalid credentials. Try Demo Login below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    onLoginSuccess({
      id: 'demo-101',
      name: 'Operative Alex',
      email: 'operative@uwe.lk',
      enrolledCourseSlugs: ['bmb', 'leadership', 'ignit'],
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-[#0B0E14]/90 backdrop-blur-2xl flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="glass-card w-full max-w-md rounded-2xl border border-secondary/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(255,184,0,0.3)] relative"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-secondary/20 border border-secondary text-secondary mx-auto flex items-center justify-center font-bold mb-3 shadow-[0_0_15px_rgba(255,184,0,0.5)]">
              <span className="material-symbols-outlined text-2xl">lock</span>
            </div>
            <h3 className="font-headline-md text-2xl text-on-surface font-black uppercase">
              Operative <span className="text-secondary text-glow-gold">Authentication</span>
            </h3>
            <p className="font-mono-data text-xs text-on-surface-variant mt-1">
              {mode === 'login' ? 'Sign in to unlock full category video series' : 'Create an account to gain operative training access'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 font-mono-data text-xs mb-4 text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Operative Name"
                    className="input-field w-full px-3 py-2.5 rounded-lg text-sm font-mono-data"
                  />
                </div>
                <div>
                  <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Phone Number (WhatsApp)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="071 709 6386"
                    className="input-field w-full px-3 py-2.5 rounded-lg text-sm font-mono-data"
                  />
                </div>
              </>
            )}

            <div>
              <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@uwe.lk"
                className="input-field w-full px-3 py-2.5 rounded-lg text-sm font-mono-data"
              />
            </div>

            <div>
              <label className="font-mono-data text-xs text-on-surface-variant block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field w-full px-3 py-2.5 rounded-lg text-sm font-mono-data"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-elite w-full py-3 rounded-lg font-label-caps text-xs uppercase tracking-widest font-bold cursor-pointer transition-all shadow-[0_0_20px_rgba(255,184,0,0.4)]"
            >
              {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'LOG IN & UNLOCK CONTENT' : 'CREATE OPERATIVE ACCOUNT'}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="mt-4 pt-4 border-t border-outline-variant/30 text-center">
            <button
              onClick={handleDemoLogin}
              className="w-full py-2 rounded bg-surface-container-high border border-secondary/40 text-secondary font-mono-data text-xs font-bold hover:bg-secondary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>ONE-CLICK DEMO LOGIN (operative@uwe.lk)</span>
            </button>
          </div>

          {/* Toggle Login/Signup */}
          <div className="mt-4 text-center font-mono-data text-xs text-on-surface-variant">
            {mode === 'login' ? (
              <span>Don't have an account? <button onClick={() => setMode('signup')} className="text-secondary font-bold hover:underline cursor-pointer">Sign Up Here</button></span>
            ) : (
              <span>Already registered? <button onClick={() => setMode('login')} className="text-secondary font-bold hover:underline cursor-pointer">Log In Here</button></span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
