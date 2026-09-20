import { authService } from './auth';

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:5005/api');

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(type: 'admin' | 'student'): Promise<string | null> {
  const localRefreshToken = type === 'admin'
    ? authService.getAdminRefreshToken()
    : authService.getStudentRefreshToken();

  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Transports HttpOnly cookie automatically
        body: JSON.stringify(localRefreshToken ? { refreshToken: localRefreshToken } : {}),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      if (data.success && (data.data?.accessToken || data.data?.token)) {
        const newAccess = data.data.accessToken || data.data.token;
        const newRefresh = data.data.refreshToken;
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
    credentials: 'include',
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
        credentials: 'include',
        headers: retryHeaders,
      });
    } else {
      // Failed to refresh — clear session & trigger real-time expiration alert
      if (targetType === 'admin') {
        authService.clearAdminSession();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('auth:session_expired', {
              detail: {
                type: 'admin',
                reason: 'Command HQ session expired. Please sign in again.',
              },
            })
          );
        }
      } else {
        authService.clearStudentSession();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('auth:session_expired', {
              detail: {
                type: 'student',
                reason: 'Operative session expired. Please sign in again.',
              },
            })
          );
        }
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

  getCourseBySlug: async (slug: string) => {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Failed to fetch course details');
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

  createBatch: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/courses/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to create course batch');
    return res.json();
  },

  deleteBatch: async (batchId: string) => {
    const res = await fetchWithAuth(`/courses/batches/${batchId}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete course batch');
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

  getAdminBanner: async () => {
    const res = await fetchWithAuth('/banners', {}, 'admin');
    if (!res.ok) throw new Error('Failed to fetch admin banner');
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
        credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
      body: JSON.stringify(registerData),
    });
    return res.json();
  },

  refreshToken: async (refreshToken?: string) => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
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

  updateVideoModule: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/program-videos/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to update video module');
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

  deleteJobVacancy: async (id: string) => {
    const res = await fetchWithAuth(`/jobs/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete job vacancy');
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

  deleteJobApplication: async (id: string) => {
    const res = await fetchWithAuth(`/jobs/applications/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete application');
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
    }, 'any');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update user account');
    }
    return res.json();
  },

  deleteUser: async (id: string) => {
    const res = await fetchWithAuth(`/users/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete user account');
    return res.json();
  },

  getUserById: async (id: string) => {
    const res = await fetchWithAuth(`/users/${id}`, {}, 'any');
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  getUserDashboard: async (userId: string) => {
    const res = await fetchWithAuth(`/users/${userId}/dashboard`, {}, 'student');
    if (!res.ok) throw new Error('Failed to fetch student dashboard data');
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

  deleteSlip: async (id: string) => {
    const res = await fetchWithAuth(`/slips/${id}`, {
      method: 'DELETE',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to delete slip');
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
  getCourseReviews: async (courseSlug: string, params?: { rating?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.rating) query.set('rating', String(params.rating));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = `${API_BASE}/reviews/${courseSlug}${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
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

  getTopTestimonials: async () => {
    const res = await fetch(`${API_BASE}/reviews/testimonials/top`);
    if (!res.ok) throw new Error('Failed to fetch testimonials');
    return res.json();
  },

  // ── Business Partners ──
  getPartners: async (params?: { courseSlug?: string; isFeatured?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.courseSlug) query.set('courseSlug', params.courseSlug);
    if (params?.isFeatured !== undefined) query.set('isFeatured', String(params.isFeatured));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    const url = `${API_BASE}/partners${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch business partners');
    return res.json();
  },

  getPartnerById: async (id: string) => {
    const res = await fetch(`${API_BASE}/partners/${id}`);
    if (!res.ok) throw new Error('Failed to fetch partner details');
    return res.json();
  },

  createPartner: async (data: Record<string, any>) => {
    const res = await fetchWithAuth('/partners', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    return res.json();
  },

  updatePartner: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithAuth(`/partners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin');
    return res.json();
  },

  deletePartner: async (id: string) => {
    const res = await fetchWithAuth(`/partners/${id}`, { method: 'DELETE' }, 'admin');
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
  getMastermindQuestions: async (
    courseSlug = 'all',
    params?: string | { since?: string; topic?: string; page?: number; limit?: number }
  ) => {
    let url = `${API_BASE}/mastermind/questions?courseSlug=${encodeURIComponent(courseSlug)}`;
    if (typeof params === 'string') {
      url += `&since=${encodeURIComponent(params)}`;
    } else if (params) {
      if (params.since) url += `&since=${encodeURIComponent(params.since)}`;
      if (params.topic && params.topic !== 'ALL') url += `&topic=${encodeURIComponent(params.topic)}`;
      if (params.page) url += `&page=${params.page}`;
      if (params.limit) url += `&limit=${params.limit}`;
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
    const res = await fetchWithAuth('/mastermind/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'student');
    if (!res.ok) throw new Error('Failed to post question');
    return res.json();
  },

  upvoteMastermindQuestion: async (id: string, userId?: string) => {
    const res = await fetchWithAuth(`/mastermind/questions/${id}/upvote`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, 'student');
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

  postMastermindReply: async (
    questionId: string,
    body: string,
    options?: { asCoach?: boolean; authorName?: string; authorBadge?: string }
  ) => {
    const authType = options?.asCoach ? 'admin' : (authService.isStudentAuthenticated() ? 'student' : 'any');
    const res = await fetchWithAuth(`/mastermind/questions/${questionId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body,
        asCoach: Boolean(options?.asCoach),
        authorName: options?.authorName,
        authorBadge: options?.authorBadge,
      }),
    }, authType);
    if (!res.ok) throw new Error('Failed to post reply');
    return res.json();
  },

  markReplyAsSolution: async (questionId: string, replyId: string) => {
    const res = await fetchWithAuth(`/mastermind/questions/${questionId}/replies/${replyId}/solution`, {
      method: 'PUT',
    }, 'any');
    if (!res.ok) throw new Error('Failed to mark reply as solution');
    return res.json();
  },

  // ── Gamification & Student XP ──
  getLeaderboard: async () => {
    const res = await fetch(`${API_BASE}/gamification/leaderboard`);
    if (!res.ok) throw new Error('Failed to load leaderboard');
    return res.json();
  },

  getGamificationProfile: async (userId: string) => {
    const res = await fetchWithAuth(`/gamification/profile/${userId}`, {}, 'any');
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

  // ── Realtime In-App Notifications ──
  getNotifications: async (userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetchWithAuth(`/notifications${qs}`, { method: 'GET' }, 'any');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  markNotificationRead: async (id: string) => {
    const res = await fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' }, 'any');
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  markAllNotificationsRead: async (userId?: string) => {
    const res = await fetchWithAuth('/notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify(userId ? { userId } : {}),
    }, 'any');
    if (!res.ok) throw new Error('Failed to mark all notifications as read');
    return res.json();
  },

  // ── Call Tracking System (CRM) ──
  checkCallNumber: async (phone: string) => {
    const res = await fetchWithAuth('/calls/check-number', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to check number');
    return res.json();
  },
  lockCallNumber: async (leadId: string) => {
    const res = await fetchWithAuth(`/calls/lock/${leadId}`, {
      method: 'POST',
    }, 'admin');
    if (!res.ok) throw new Error('Failed to lock number');
    return res.json();
  },
  logCall: async (data: any) => {
    const res = await fetchWithAuth('/calls/log', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin');
    if (!res.ok) throw new Error('Failed to log call');
    return res.json();
  },
  getCallHistory: async (leadId: string) => {
    const res = await fetchWithAuth(`/calls/lead/${leadId}`, { method: 'GET' }, 'admin');
    if (!res.ok) throw new Error('Failed to fetch call history');
    return res.json();
  },
  getCallStats: async () => {
    const res = await fetchWithAuth('/calls/stats', { method: 'GET' }, 'admin');
    if (!res.ok) throw new Error('Failed to fetch call stats');
    return res.json();
  },
  getDailySheet: async (date?: string, adminId?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (adminId) params.append('adminId', adminId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithAuth(`/calls/daily-sheet${qs}`, { method: 'GET' }, 'admin');
    if (!res.ok) throw new Error('Failed to fetch daily sheet');
    return res.json();
  },
  getAllCallLogs: async (limit: number = 50, page: number = 1) => {
    const res = await fetchWithAuth(`/calls?limit=${limit}&page=${page}`, { method: 'GET' }, 'admin');
    if (!res.ok) throw new Error('Failed to fetch global call logs');
    return res.json();
  },
  deleteCallLog: async (id: string) => {
    const res = await fetchWithAuth(`/calls/${id}`, { method: 'DELETE' }, 'admin');
    if (!res.ok) throw new Error('Failed to delete call log');
    return res.json();
  },

  // ── Health ──
  health: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API offline');
    return res.json();
  },
};

