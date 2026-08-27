import { authService } from './auth';

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:5005/api');

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(type: 'admin' | 'student'): Promise<string | null> {
  const refreshToken = type === 'admin'
    ? authService.getAdminRefreshToken()
    : authService.getStudentRefreshToken();

  if (!refreshToken) return null;

  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        const newAccess = data.data.accessToken;
        const newRefresh = data.data.refreshToken || refreshToken;
        if (type === 'admin') {
          authService.updateAdminToken(newAccess, newRefresh);
        } else {
          authService.updateStudentToken(newAccess, newRefresh);
        }
        return newAccess;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Universal safe fetch wrapper with auth header injection, silent refresh retry, and 401 handling.
 */
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  authType: 'admin' | 'student' | 'any' = 'any'
): Promise<Response> {
  const headers = {
    ...authService.getAuthHeaders(authType),
    ...(options.headers || {}),
  };

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 with Silent Re-Authentication
  if (response.status === 401) {
    const targetType: 'admin' | 'student' =
      authType === 'admin' || (authType === 'any' && authService.isAdminAuthenticated())
        ? 'admin'
        : 'student';

    const newToken = await attemptTokenRefresh(targetType);

    if (newToken) {
      // Retry original request with newly refreshed token
      const retryHeaders = {
        ...(options.headers || {}),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newToken}`,
      };
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      });
    } else {
      // Failed to refresh — clear session
      if (targetType === 'admin') {
        authService.clearAdminSession();
      } else {
        authService.clearStudentSession();
      }
    }
  }

  return response;
}

export const api = {
  // ── Courses ──
  getCourses: async () => {
    const res = await fetch(`${API_BASE}/courses`);
    if (!res.ok) throw new Error('Failed to fetch courses');
    return res.json();
  },

  createCourse: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to create program');
    return res.json();
  },

  updateCourse: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update course');
    return res.json();
  },

  updateBatchSeats: async (batchId: string, seats: number) => {
    const res = await fetchWithAuth(`/courses/batches/${batchId}/seats`, {
      method: 'PUT',
      body: JSON.stringify({ availableSeats: seats }),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update seats');
    return res.json();
  },

  updateBatch: async (batchId: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/courses/batches/${batchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update batch details');
    return res.json();
  },

  // ── Leads ──
  getLeads: async () => {
    const res = await fetchWithAuth('/leads', {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  createLead: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create lead');
    return res.json();
  },

  updateLeadStatus: async (id: string, status: string) => {
    const res = await fetchWithAuth(`/leads/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update lead status');
    return res.json();
  },

  deleteLead: async (id: string) => {
    const res = await fetchWithAuth(`/leads/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete lead');
    return res.json();
  },

  // ── Banners ──
  getActiveBanner: async () => {
    const res = await fetch(`${API_BASE}/banners/active`);
    if (!res.ok) throw new Error('Failed to fetch banner');
    return res.json();
  },

  updateBanner: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update banner');
    return res.json();
  },

  createBanner: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/banners', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to create banner');
    return res.json();
  },

  // ── Auth ──
  adminLogin: async (username: string, password: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Invalid Credentials');
      }
      const data = await res.json();
      if (data.success && (data.data?.token || data.data?.accessToken)) {
        const token = data.data.accessToken || data.data.token;
        const refreshToken = data.data.refreshToken;
        authService.setAdminSession(token, {
          id: data.data.id,
          name: data.data.name,
          email: data.data.email,
          role: data.data.role,
        }, refreshToken);
      }
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  studentLogin: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.success && (data.data?.token || data.data?.accessToken)) {
      const token = data.data.accessToken || data.data.token;
      const refreshToken = data.data.refreshToken;
      authService.setStudentSession(token, {
        id: data.data.id,
        name: data.data.name,
        email: data.data.email,
        enrolledCourseSlugs: data.data.enrolledCourseSlugs || [],
      }, refreshToken);
    }
    return data;
  },

  studentRegister: async (registerData: { name: string; email: string; password: string; phone?: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });
    return res.json();
  },

  refreshToken: async (refreshToken: string) => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return res.json();
  },

  // ── Program Videos & Series ──
  getProgramVideos: async (courseSlug?: string) => {
    const url = courseSlug ? `${API_BASE}/program-videos?courseSlug=${courseSlug}` : `${API_BASE}/program-videos`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch program videos');
    return res.json();
  },

  createVideoSeries: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/program-videos/series', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to create video series');
    return res.json();
  },

  updateVideoSeries: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/program-videos/series/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update video series');
    return res.json();
  },

  deleteVideoSeries: async (id: string) => {
    const res = await fetchWithAuth(`/program-videos/series/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete video series');
    return res.json();
  },

  createVideoModule: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/program-videos/modules', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to add video episode module');
    return res.json();
  },

  deleteVideoModule: async (id: string) => {
    const res = await fetchWithAuth(`/program-videos/modules/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete video module');
    return res.json();
  },

  // ── Job Vacancies & Applications ──
  getJobVacancies: async () => {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error('Failed to fetch job vacancies');
    return res.json();
  },

  createJobVacancy: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to create job vacancy');
    return res.json();
  },

  updateJobVacancy: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update job vacancy');
    return res.json();
  },

  applyForJob: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/jobs/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit application');
    return res.json();
  },

  getJobApplications: async () => {
    const res = await fetchWithAuth('/jobs/applications', {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch job applications');
    return res.json();
  },

  updateJobApplicationStatus: async (id: string, status: string) => {
    const res = await fetchWithAuth(`/jobs/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update application status');
    return res.json();
  },

  // ── Registered Users & Operatives ──
  getUsers: async () => {
    const res = await fetchWithAuth('/users', {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch user accounts');
    return res.json();
  },

  createUser: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create user account');
    }
    return res.json();
  },

  updateUser: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update user account');
    return res.json();
  },

  deleteUser: async (id: string) => {
    const res = await fetchWithAuth(`/users/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete user account');
    return res.json();
  },

  // ── Demo Videos ──
  getDemos: async (category?: string) => {
    const url = category ? `${API_BASE}/demos?category=${category}` : `${API_BASE}/demos`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch demo videos');
    return res.json();
  },

  createDemo: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/demos', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to create demo video');
    return res.json();
  },

  updateDemo: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/demos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update demo video');
    return res.json();
  },

  deleteDemo: async (id: string) => {
    const res = await fetchWithAuth(`/demos/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete demo video');
    return res.json();
  },

  // ── Video Watch Progress (LMS) ──
  getProgress: async (userId: string) => {
    const res = await fetchWithAuth(`/progress/${userId}`, {}, 'student');
    if (!res.ok) throw new Error('Failed to fetch video progress');
    return res.json();
  },

  saveProgress: async (data: { userId: string; moduleId: string; seriesId?: string; isCompleted?: boolean; progressPercent?: number }) => {
    const res = await fetchWithAuth('/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'student');
    if (!res.ok) throw new Error('Failed to save watch progress');
    return res.json();
  },

  // ── Bank Payment Slips ──
  getPaymentSlips: async (status?: string) => {
    const url = status ? `/slips?status=${status}` : `/slips`;
    const res = await fetchWithAuth(url, {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch payment slips');
    return res.json();
  },

  createPaymentSlip: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/slips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit payment slip');
    }
    return res.json();
  },

  updateSlipStatus: async (id: string, status: string, notes?: string) => {
    const res = await fetchWithAuth(`/slips/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update slip status');
    return res.json();
  },

  // ── Staff Members ──
  getStaff: async () => {
    const res = await fetch(`${API_BASE}/staff`);
    if (!res.ok) throw new Error('Failed to fetch staff members');
    return res.json();
  },

  createStaff: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create staff member');
    }
    return res.json();
  },

  updateStaff: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update staff member');
    return res.json();
  },

  deleteStaff: async (id: string) => {
    const res = await fetchWithAuth(`/staff/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete staff member');
    return res.json();
  },

  // ── Update Job Vacancy ──
  updateJob: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update job vacancy');
    return res.json();
  },

  // ── Coupons & Promo Codes ──
  validateCoupon: async (code: string, courseSlug?: string, originalPrice?: number) => {
    const res = await fetch(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, courseSlug, originalPrice }),
    });
    return res.json();
  },

  getCoupons: async () => {
    const res = await fetchWithAuth('/coupons', {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch coupons');
    return res.json();
  },

  createCoupon: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    return res.json();
  },

  updateCoupon: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    return res.json();
  },

  deleteCoupon: async (id: string) => {
    const res = await fetchWithAuth(`/coupons/${id}`, { method: 'DELETE' }, 'admin');
    return res.json();
  },

  // ── Course Reviews ──
  getCourseReviews: async (courseSlug: string) => {
    const res = await fetch(`${API_BASE}/reviews/${courseSlug}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  submitReview: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'any');
    return res.json();
  },

  getAllReviews: async () => {
    const res = await fetchWithAuth('/reviews', {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  toggleReviewApproval: async (id: string, isApproved: boolean) => {
    const res = await fetchWithAuth(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved }),
    }, 'admin');
    return res.json();
  },

  deleteReview: async (id: string) => {
    const res = await fetchWithAuth(`/reviews/${id}`, { method: 'DELETE' }, 'admin');
    return res.json();
  },

  // ── Instructors ──
  getInstructors: async () => {
    const res = await fetch(`${API_BASE}/instructors`);
    if (!res.ok) throw new Error('Failed to fetch instructors');
    return res.json();
  },

  createInstructor: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/instructors', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    return res.json();
  },

  updateInstructor: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/instructors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    return res.json();
  },

  deleteInstructor: async (id: string) => {
    const res = await fetchWithAuth(`/instructors/${id}`, { method: 'DELETE' }, 'admin');
    return res.json();
  },

  // ── Certificates ──
  claimCertificate: async (data: { userId: string; studentName: string; courseSlug: string; courseTitle?: string }) => {
    const res = await fetchWithAuth('/certificates/claim', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'any');
    return res.json();
  },

  verifyCertificate: async (certQuery: string) => {
    const res = await fetch(`${API_BASE}/certificates/verify/${encodeURIComponent(certQuery)}`);
    return res.json();
  },

  getUserCertificates: async (userId: string) => {
    const res = await fetchWithAuth(`/certificates/user/${userId}`, {}, 'student');
    if (!res.ok) throw new Error('Failed to fetch certificates');
    return res.json();
  },

  getCertificateDownloadUrl: (certId: string) => {
    return `${API_BASE}/certificates/download/${encodeURIComponent(certId)}`;
  },

  downloadCertificatePDF: async (certId: string, certNo?: string) => {
    const downloadUrl = `${API_BASE}/certificates/download/${encodeURIComponent(certId)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `UWE-Certificate-${certNo || certId}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ── Mastermind Live Q&A & Discussion ──
  getMastermindQuestions: async (courseSlug = 'bmb', since?: string) => {
    let url = `${API_BASE}/mastermind/questions?courseSlug=${encodeURIComponent(courseSlug)}`;
    if (since) {
      url += `&since=${encodeURIComponent(since)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch mastermind questions');
    return res.json();
  },

  postMastermindQuestion: async (data: {
    courseSlug: string;
    userId?: string;
    authorName: string;
    authorBadge?: string;
    question: string;
    drillTopic?: string;
  }) => {
    const res = await fetch(`${API_BASE}/mastermind/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to post question');
    return res.json();
  },

  upvoteMastermindQuestion: async (id: string, userId?: string) => {
    const res = await fetch(`${API_BASE}/mastermind/questions/${id}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to upvote question');
    return res.json();
  },

  answerMastermindQuestion: async (id: string, data: { answer: string; answeredBy?: string; isPinned?: boolean }) => {
    const res = await fetchWithAuth(`/mastermind/questions/${id}/answer`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to answer question');
    return res.json();
  },

  deleteMastermindQuestion: async (id: string) => {
    const res = await fetchWithAuth(`/mastermind/questions/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete question');
    return res.json();
  },

  // ── Gamification & Student XP ──
  getLeaderboard: async () => {
    const res = await fetch(`${API_BASE}/gamification/leaderboard`);
    if (!res.ok) throw new Error('Failed to load leaderboard');
    return res.json();
  },

  getGamificationProfile: async (userId: string) => {
    const res = await fetch(`${API_BASE}/gamification/profile/${userId}`);
    if (!res.ok) throw new Error('Failed to load operative profile');
    return res.json();
  },

  awardXp: async (data: { userId: string; actionType?: string; xpAmount?: number; badgeId?: string }) => {
    const res = await fetchWithAuth('/gamification/award-xp', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'any');
    if (!res.ok) throw new Error('Failed to award XP');
    return res.json();
  },

  // ── Abandoned Slip Reminder ──
  recordAbandonedReminder: async (leadId: string) => {
    const res = await fetchWithAuth(`/leads/${leadId}/abandoned-reminder`, {
      method: 'POST',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to record abandoned reminder');
    return res.json();
  },

  // ── Multi-Coach Assignment ──
  getAvailableCoaches: async () => {
    const res = await fetchWithAuth('/users/coaches', { method: 'GET' }, 'admin');
    if (!res.ok) throw new Error('Failed to fetch available coaches');
    return res.json();
  },

  assignCoachToUser: async (userId: string, data: { assignedCoachId?: string | null; assignedCoachName?: string | null; cohortTag?: string | null }) => {
    const res = await fetchWithAuth(`/users/${userId}/assign-coach`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to assign coach');
    return res.json();
  },

  // ── Health ──
  health: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API offline');
    return res.json();
  },
};

