import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useRealtimeEvent } from '../../services/realtime';
import { AuthModal } from '../ui/AuthModal';

interface SessionExpiredEventDetail {
  type?: 'admin' | 'student';
  reason?: string;
}

export const SessionExpiredModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionType, setSessionType] = useState<'admin' | 'student'>('student');
  const [reason, setReason] = useState<string>('Your session has expired. Please sign in again to continue.');
  const [showStudentAuthModal, setShowStudentAuthModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenModal = (type: 'admin' | 'student', customReason?: string) => {
    setSessionType(type);
    if (customReason) {
      setReason(customReason);
    } else {
      setReason(
        type === 'admin'
          ? 'Your Command HQ administrative session has expired or was revoked. Please authenticate again to access privileged tools.'
          : 'Your operative session has expired. Please log in again to access your enrolled programs and video vault.'
      );
    }
    setIsOpen(true);
  };

  useEffect(() => {
    const handleExpiredEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SessionExpiredEventDetail>;
      const type = customEvent.detail?.type || (location.pathname.startsWith('/admin') ? 'admin' : 'student');
      const customReason = customEvent.detail?.reason;
      handleOpenModal(type, customReason);
    };

    window.addEventListener('auth:session_expired', handleExpiredEvent);

    // Periodic heartbeat check: detects expiration if tab is idle
    const interval = setInterval(() => {
      if (location.pathname.startsWith('/admin')) {
        const adminSession = authService.getAdminSession();
        // getAdminSession() automatically triggers auth:session_expired if past expiresAt
        if (!adminSession && authService.getAdminRefreshToken()) {
          handleOpenModal('admin');
        }
      } else {
        const studentSession = authService.getStudentSession();
        if (!studentSession && authService.getStudentRefreshToken()) {
          handleOpenModal('student');
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('auth:session_expired', handleExpiredEvent);
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Listen to realtime SSE revocation broadcasts
  useRealtimeEvent('session:revoked', (payload) => {
    const currentAdmin = authService.getAdminUser();
    const currentStudent = authService.getStudentUser();

    if (payload?.userId) {
      if (currentAdmin?.id === payload.userId) {
        authService.clearAdminSession();
        handleOpenModal('admin', 'Your admin session was revoked from the security console. Please log in again.');
      } else if (currentStudent?.id === payload.userId) {
        authService.clearStudentSession();
        handleOpenModal('student', 'Your session was updated or revoked. Please log in again.');
      }
    }
  });

  const handleAction = () => {
    setIsOpen(false);
    if (sessionType === 'admin') {
      navigate('/admin', { state: { from: location }, replace: true });
    } else {
      setShowStudentAuthModal(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-2xl bg-[#0E131F] border border-amber-500/50 p-6 text-center space-y-5 shadow-[0_0_50px_rgba(255,184,0,0.25)] relative overflow-hidden"
            >
              {/* Tactical Top Glowing Border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

              {/* Icon Emblem */}
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(255,184,0,0.3)]">
                <span className="material-symbols-outlined text-3xl">timer_off</span>
              </div>

              {/* Header Title */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono-data text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  REAL-TIME SESSION EXPIRY
                </div>
                <h3 className="font-headline-md text-xl font-black text-on-surface uppercase tracking-wide">
                  {sessionType === 'admin' ? 'Command HQ Session Expired' : 'Operative Session Expired'}
                </h3>
              </div>

              {/* Description */}
              <p className="font-mono-data text-xs text-on-surface-variant leading-relaxed px-2">
                {reason}
              </p>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#131929] border border-outline-variant/30 text-on-surface-variant hover:text-on-surface font-mono-data text-xs font-bold transition-colors cursor-pointer"
                >
                  DISMISS
                </button>
                <button
                  onClick={handleAction}
                  className="btn-elite px-6 py-2.5 rounded-xl font-label-caps text-xs uppercase font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,184,0,0.4)]"
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  <span>SIGN IN AGAIN</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fallback Student Auth Modal if needed */}
      <AuthModal
        isOpen={showStudentAuthModal}
        onClose={() => setShowStudentAuthModal(false)}
        onLoginSuccess={(user) => {
          authService.persistStudentLogin(user as any);
          setShowStudentAuthModal(false);
        }}
      />
    </>
  );
};
