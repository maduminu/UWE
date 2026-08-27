import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for Command HQ admin routes.
 * Requires a valid admin JWT session — if missing or expired,
 * redirects to /admin (which renders the AdminPage login screen).
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAdminAuthenticated();

  if (!isAuthenticated) {
    // Redirect to admin login, preserving the attempted path in state
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
