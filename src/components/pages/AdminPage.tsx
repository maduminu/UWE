import React from 'react';
import { PageSEO } from '../ui/PageSEO';
import type { PageId } from '../layout/Navbar';
import { AdminLogin, AdminLayout, useAdminAuth } from '../../features/admin';

interface AdminPageProps {
  setActivePage?: (page: PageId) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ setActivePage }) => {
  const {
    isAdminAuthenticated,
    usernameInput,
    setUsernameInput,
    passwordInput,
    setPasswordInput,
    authError,
    setAuthError,
    authLoading,
    handleAdminLogin,
    handleAdminLogout,
    handleAutofill,
  } = useAdminAuth();

  return (
    <>
      <PageSEO
        title="Command Operations HQ (Admin Console)"
        description="Encrypted administrative portal for UWE Empire command operations, student admissions, batch logistics, and faculty management."
      />

      {!isAdminAuthenticated ? (
        <AdminLogin
          usernameInput={usernameInput}
          setUsernameInput={setUsernameInput}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          authError={authError}
          setAuthError={setAuthError}
          authLoading={authLoading}
          handleAdminLogin={handleAdminLogin}
          handleAutofill={handleAutofill}
          setActivePage={setActivePage}
        />
      ) : (
        <AdminLayout onLogout={handleAdminLogout} setActivePage={setActivePage} />
      )}
    </>
  );
};
