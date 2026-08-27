import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { AuthModal } from '../ui/AuthModal';
import { PageSEO } from '../ui/PageSEO';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated =
    authService.isStudentAuthenticated() ||
    authService.isAdminAuthenticated();

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <PageSEO
          title="Operative Clearance Required"
          description="Authentication required to access student directives, tactical video vault, and certificates."
          canonical="/dashboard"
        />
        <div className="w-20 h-20 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-secondary mb-6 shadow-[0_0_30px_rgba(255,184,0,0.3)]">
          <span className="material-symbols-outlined text-4xl">lock_person</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-black text-on-surface uppercase tracking-wider mb-3">
          Clearance Level Required
        </h1>
        <p className="font-mono-data text-sm text-on-surface-variant max-w-md mb-8 leading-relaxed">
          This division is reserved strictly for active registered operatives. Please authenticate your student credentials to access this feature.
        </p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="btn-elite px-8 py-3.5 rounded-xl font-label-caps text-sm uppercase tracking-widest cursor-pointer flex items-center gap-2 shadow-[0_0_25px_rgba(255,184,0,0.4)]"
        >
          <span className="material-symbols-outlined text-base">login</span>
          <span>ENTER OPERATIVE LOGIN</span>
        </button>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(user) => {
            const account = user as typeof user & {
              token?: string;
              refreshToken?: string;
              phone?: string;
            };

            authService.persistStudentLogin(account);
            setAuthModalOpen(false);
            navigate('/dashboard', { replace: true });
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
};
