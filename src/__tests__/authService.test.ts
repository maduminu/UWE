import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/auth';

// In-memory localStorage mock for Node environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => { storage[k] = String(v); },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  key: (i: number) => Object.keys(storage)[i] || null,
  length: 0,
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Auth Service Session & Token Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('manages admin session lifecycle accurately', () => {
    expect(authService.isAdminAuthenticated()).toBe(false);

    authService.setAdminSession('test-admin-jwt-token-xyz', {
      id: 'adm-001',
      name: 'Chief Admin',
      email: 'admin@uwe.lk',
      role: 'SUPER_ADMIN',
    });

    expect(authService.isAdminAuthenticated()).toBe(true);
    expect(authService.getAdminToken()).toBe('test-admin-jwt-token-xyz');
    expect(authService.getAdminSession()?.user.name).toBe('Chief Admin');

    authService.clearAdminSession();
    expect(authService.isAdminAuthenticated()).toBe(false);
    expect(authService.getAdminToken()).toBeNull();
  });

  it('manages student session lifecycle accurately', () => {
    expect(authService.isStudentAuthenticated()).toBe(false);

    authService.setStudentSession('test-student-jwt-token-abc', {
      id: 'stu-001',
      name: 'Operative Alex',
      email: 'alex@uwe.lk',
      phone: '071 709 6386',
      isEnrolled: true,
      enrolledCourseSlugs: 'bmb,leadership',
    });

    expect(authService.isStudentAuthenticated()).toBe(true);
    expect(authService.getStudentToken()).toBe('test-student-jwt-token-abc');
    expect(authService.getStudentSession()?.user.email).toBe('alex@uwe.lk');

    authService.clearStudentSession();
    expect(authService.isStudentAuthenticated()).toBe(false);
    expect(authService.getStudentToken()).toBeNull();
  });

  it('generates proper Authorization header depending on authType', () => {
    authService.setAdminSession('admin-secret-token', {
      id: 'adm-1',
      name: 'Admin',
      email: 'admin@uwe.lk',
      role: 'SUPER_ADMIN',
    });

    const adminHeaders = authService.getAuthHeaders('admin');
    expect(adminHeaders.Authorization).toBe('Bearer admin-secret-token');
    expect(adminHeaders['Content-Type']).toBe('application/json');

    const unauthStudentHeaders = authService.getAuthHeaders('student');
    expect(unauthStudentHeaders.Authorization).toBeUndefined();
  });

  it('handles expired sessions automatically', () => {
    const expiredSession = {
      token: 'expired-token',
      user: { id: 'adm-1', name: 'Admin', email: 'admin@uwe.lk', role: 'SUPER_ADMIN' },
      expiresAt: Date.now() - 10000, // Expired 10 seconds ago
    };
    localStorage.setItem('uwe_admin_session', JSON.stringify(expiredSession));

    expect(authService.isAdminAuthenticated()).toBe(false);
    expect(authService.getAdminToken()).toBeNull();
  });
});
