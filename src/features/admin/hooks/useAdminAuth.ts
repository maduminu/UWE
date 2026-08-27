import { useState } from 'react';
import { authService } from '../../../services/auth';
import { api } from '../../../services/api';

export const useAdminAuth = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return authService.isAdminAuthenticated();
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const data = await api.adminLogin(usernameInput, passwordInput);
      if (data.success && data.data?.token) {
        setIsAdminAuthenticated(true);
        if (onSuccess) onSuccess();
      } else {
        setAuthError(data.message || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid credentials. Check your username and security key.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    authService.clearAdminSession();
    setIsAdminAuthenticated(false);
  };

  const handleAutofill = () => {
    setUsernameInput('admin@uwe.lk');
    setPasswordInput('admin1234');
  };

  return {
    isAdminAuthenticated,
    setIsAdminAuthenticated,
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
  };
};
