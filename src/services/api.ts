const API_BASE = 'http://localhost:5005/api';

export const api = {
  // ── Courses ──
  getCourses: async () => {
    const res = await fetch(`${API_BASE}/courses`);
    if (!res.ok) throw new Error('Failed to fetch courses');
    return res.json();
  },

  createCourse: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create program');
    return res.json();
  },

  updateCourse: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update course');
    return res.json();
  },

  updateBatchSeats: async (batchId: string, seats: number) => {
    const res = await fetch(`${API_BASE}/courses/batches/${batchId}/seats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableSeats: seats }),
    });
    if (!res.ok) throw new Error('Failed to update seats');
    return res.json();
  },

  // ── Leads ──
  getLeads: async () => {
    const res = await fetch(`${API_BASE}/leads`);
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
    const res = await fetch(`${API_BASE}/leads/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update lead status');
    return res.json();
  },

  // ── Banners ──
  getActiveBanner: async () => {
    const res = await fetch(`${API_BASE}/banners/active`);
    if (!res.ok) throw new Error('Failed to fetch banner');
    return res.json();
  },

  updateBanner: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update banner');
    return res.json();
  },

  createBanner: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create banner');
    return res.json();
  },

  // ── Auth ──
  adminLogin: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Invalid Credentials');
    }
    return res.json();
  },

  // ── Program Videos & Series ──
  getProgramVideos: async () => {
    const res = await fetch(`${API_BASE}/program-videos`);
    if (!res.ok) throw new Error('Failed to fetch program videos');
    return res.json();
  },

  createVideoSeries: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/program-videos/series`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create video series');
    return res.json();
  },

  createVideoModule: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/program-videos/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add video episode module');
    return res.json();
  },

  deleteVideoModule: async (id: string) => {
    const res = await fetch(`${API_BASE}/program-videos/modules/${id}`, {
      method: 'DELETE',
    });
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
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create job vacancy');
    return res.json();
  },

  updateJobVacancy: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
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
    const res = await fetch(`${API_BASE}/jobs/applications`);
    if (!res.ok) throw new Error('Failed to fetch job applications');
    return res.json();
  },

  updateJobApplicationStatus: async (id: string, status: string) => {
    const res = await fetch(`${API_BASE}/jobs/applications/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update application status');
    return res.json();
  },

  // ── Registered Users & Operatives ──
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch user accounts');
    return res.json();
  },

  createUser: async (data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create user account');
    }
    return res.json();
  },

  updateUser: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user account');
    return res.json();
  },

  deleteUser: async (id: string) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
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
    const res = await fetch(`${API_BASE}/demos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create demo video');
    return res.json();
  },

  updateDemo: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/demos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update demo video');
    return res.json();
  },

  deleteDemo: async (id: string) => {
    const res = await fetch(`${API_BASE}/demos/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete demo video');
    return res.json();
  },

  // ── Video Watch Progress (LMS) ──
  getProgress: async (userId: string) => {
    const res = await fetch(`${API_BASE}/progress/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch video progress');
    return res.json();
  },

  saveProgress: async (data: { userId: string; moduleId: string; seriesId?: string; isCompleted?: boolean; progressPercent?: number }) => {
    const res = await fetch(`${API_BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save watch progress');
    return res.json();
  },

  // ── Bank Payment Slips ──
  getPaymentSlips: async (status?: string) => {
    const url = status ? `${API_BASE}/slips?status=${status}` : `${API_BASE}/slips`;
    const res = await fetch(url);
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
      const err = await res.json();
      throw new Error(err.message || 'Failed to submit payment slip');
    }
    return res.json();
  },

  updateSlipStatus: async (id: string, status: string, notes?: string) => {
    const res = await fetch(`${API_BASE}/slips/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
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
    const res = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create staff member');
    }
    return res.json();
  },

  updateStaff: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update staff member');
    return res.json();
  },

  deleteStaff: async (id: string) => {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete staff member');
    return res.json();
  },

  // ── Update Job Vacancy (incl. hiringStatus + openPositions) ──
  updateJob: async (id: string, data: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update job vacancy');
    return res.json();
  },

  // ── Health ──
  health: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API offline');
    return res.json();
  },
};

