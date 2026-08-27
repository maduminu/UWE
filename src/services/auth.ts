// Type-Safe Authentication & Session Storage Service

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'COMMANDER' | 'COACH' | 'RECRUITER' | string;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  enrolledCourseSlugs: string[];
}

export interface AdminSession {
  token: string;
  refreshToken?: string;
  user: AdminUser;
  expiresAt: number; // Unix timestamp in ms
}

export interface StudentSession {
  token: string;
  refreshToken?: string;
  user: StudentUser;
  expiresAt: number; // Unix timestamp in ms
}

const ADMIN_SESSION_KEY = 'uwe_admin_session';
const STUDENT_SESSION_KEY = 'uwe_student_session';
const DEFAULT_ACCESS_DURATION = 15 * 60 * 1000; // 15 minutes (short-lived access token)

// Helper to safely parse JSON from localStorage
const safeGetItem = <T>(key: string): T | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const authService = {
  persistStudentLogin: (
    user: Partial<StudentUser> & {
      token?: string;
      accessToken?: string;
      refreshToken?: string;
      phone?: string;
    },
    durationMs = DEFAULT_ACCESS_DURATION
  ): void => {
    if (typeof localStorage === 'undefined') return;

    const normalizedUser: StudentUser = {
      id: user.id || '',
      name: user.name || 'Operative',
      email: user.email || '',
      phone: user.phone,
      enrolledCourseSlugs: user.enrolledCourseSlugs || [],
    };

    localStorage.setItem('uwe_user_account', JSON.stringify(normalizedUser));

    authService.setStudentSession(
      user.token || user.accessToken || 'demo-student-session',
      normalizedUser,
      user.refreshToken,
      durationMs
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ── Admin Session ──
  setAdminSession: (
    token: string,
    user: AdminUser,
    refreshToken?: string,
    durationMs = DEFAULT_ACCESS_DURATION
  ): void => {
    if (typeof localStorage === 'undefined') return;
    const session: AdminSession = {
      token,
      refreshToken: refreshToken || authService.getAdminRefreshToken() || undefined,
      user,
      expiresAt: Date.now() + durationMs,
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem('uwe_admin_auth');
  },

  updateAdminToken: (token: string, refreshToken?: string, durationMs = DEFAULT_ACCESS_DURATION): void => {
    const current = authService.getAdminSession();
    if (!current) return;
    authService.setAdminSession(token, current.user, refreshToken || current.refreshToken, durationMs);
  },

  getAdminSession: (): AdminSession | null => {
    const session = safeGetItem<AdminSession>(ADMIN_SESSION_KEY);
    if (!session) return null;

    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      authService.clearAdminSession();
      return null;
    }
    return session;
  },

  getAdminToken: (): string | null => {
    return authService.getAdminSession()?.token || null;
  },

  getAdminRefreshToken: (): string | null => {
    const raw = safeGetItem<AdminSession>(ADMIN_SESSION_KEY);
    return raw?.refreshToken || null;
  },

  getAdminUser: (): AdminUser | null => {
    return authService.getAdminSession()?.user || null;
  },

  isAdminAuthenticated: (): boolean => {
    const session = authService.getAdminSession();
    return session !== null && Boolean(session.token);
  },

  clearAdminSession: (): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem('uwe_admin_auth');
  },

  // ── Student Session ──
  setStudentSession: (
    token: string,
    user: StudentUser,
    refreshToken?: string,
    durationMs = DEFAULT_ACCESS_DURATION
  ): void => {
    if (typeof localStorage === 'undefined') return;
    const session: StudentSession = {
      token,
      refreshToken: refreshToken || authService.getStudentRefreshToken() || undefined,
      user,
      expiresAt: Date.now() + durationMs,
    };
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('uwe_user', JSON.stringify(user));
  },

  updateStudentToken: (token: string, refreshToken?: string, durationMs = DEFAULT_ACCESS_DURATION): void => {
    const current = authService.getStudentSession();
    if (!current) return;
    authService.setStudentSession(token, current.user, refreshToken || current.refreshToken, durationMs);
  },

  getStudentSession: (): StudentSession | null => {
    const session = safeGetItem<StudentSession>(STUDENT_SESSION_KEY);
    if (!session) return null;

    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      authService.clearStudentSession();
      return null;
    }
    return session;
  },

  getStudentToken: (): string | null => {
    return authService.getStudentSession()?.token || null;
  },

  getStudentRefreshToken: (): string | null => {
    const raw = safeGetItem<StudentSession>(STUDENT_SESSION_KEY);
    return raw?.refreshToken || null;
  },

  getStudentUser: (): StudentUser | null => {
    return authService.getStudentSession()?.user || null;
  },

  isStudentAuthenticated: (): boolean => {
    const session = authService.getStudentSession();
    return session !== null && Boolean(session.token);
  },

  clearStudentSession: (): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STUDENT_SESSION_KEY);
    localStorage.removeItem('uwe_user');
    localStorage.removeItem('uwe_user_account');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  },

  // ── Universal Auth Helper ──
  getAuthHeaders: (type: 'admin' | 'student' | 'any' = 'any'): Record<string, string> => {
    let token: string | null = null;

    if (type === 'admin') {
      token = authService.getAdminToken();
    } else if (type === 'student') {
      token = authService.getStudentToken();
    } else {
      token = authService.getAdminToken() || authService.getStudentToken();
    }

    if (token) {
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
    }
    return { 'Content-Type': 'application/json' };
  },
};
