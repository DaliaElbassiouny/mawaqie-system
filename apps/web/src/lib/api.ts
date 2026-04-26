import axios, { AxiosError } from 'axios';

const DEFAULT_API_URL = 'http://localhost:3001/api/v1';
const API_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach JWT from localStorage on each request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Single in-flight refresh promise — all concurrent 401s wait on the same call.
// Without this, N parallel requests expiring at the same time each trigger their own
// refresh, exhausting the token and causing a silent logout.
let refreshingPromise: Promise<void> | null = null;

async function executeRefresh(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('no_refresh_token');

  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
  const tokens = data.data as { accessToken: string; refreshToken: string };
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Also clear the Zustand auth store so the UI reflects the logged-out state.
  // Without this, the store rehydrates from its own persisted key and the user
  // still appears authenticated even though all tokens are gone.
  localStorage.removeItem('cdc-auth');
}

function getLoginPath(): string {
  if (typeof window === 'undefined') return '/ar/login';
  const segments = window.location.pathname.split('/').filter(Boolean);
  const locale = ['ar', 'en'].includes(segments[0]) ? segments[0] : 'ar';
  return `/${locale}/login`;
}

// Handle 401 responses: attempt one shared token refresh then replay the request.
// On refresh failure, clear auth state and redirect cleanly — no silent loops.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    const isAuthRequest =
      original?.url?.includes('auth/login') || original?.url?.includes('auth/refresh');

    if (error.response?.status === 401 && !original?._retry && !isAuthRequest) {
      original._retry = true;

      try {
        if (!refreshingPromise) {
          refreshingPromise = executeRefresh().finally(() => {
            refreshingPromise = null;
          });
        }
        await refreshingPromise;

        const newToken = localStorage.getItem('accessToken');
        if (original?.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(original!);
      } catch {
        clearAuth();
        window.location.href = getLoginPath();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ data: { user: unknown; accessToken: string; refreshToken: string } }>(
      'auth/login',
      { email, password },
    ),
  logout: () => api.post('auth/logout'),
  me: () => api.get('auth/me'),
};

export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

export const rbacApi = {
  listRoles: () => api.get('/rbac/roles'),
  listPermissions: () => api.get('/rbac/permissions'),
  createRole: (data: unknown) => api.post('/rbac/roles', data),
  updateRole: (id: string, data: unknown) => api.patch(`/rbac/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/rbac/roles/${id}`),
  assignRole: (data: unknown) => api.post('/rbac/assign', data),
};

export const tendersApi = {
  list: (params?: Record<string, unknown>) => api.get('/tenders', { params }),
  stats: () => api.get('/tenders/stats'),
  getById: (id: string) => api.get(`/tenders/${id}`),
  create: (data: unknown) => api.post('/tenders', data),
  update: (id: string, data: unknown) => api.patch(`/tenders/${id}`, data),
  remove: (id: string) => api.delete(`/tenders/${id}`),
};

export const projectsApi = {
  list: (params?: Record<string, unknown>) => api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: unknown) => api.post('/projects', data),
  update: (id: string, data: unknown) => api.patch(`/projects/${id}`, data),
  assignTeam: (id: string, data: unknown) => api.patch(`/projects/${id}/team`, data),
  remove: (id: string) => api.delete(`/projects/${id}`),
};

export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post('/clients', data),
  update: (id: string, data: unknown) => api.patch(`/clients/${id}`, data),
  remove: (id: string) => api.delete(`/clients/${id}`),
};

export const operationsApi = {
  // Stats
  getStats: (projectId: string) =>
    api.get(`/projects/${projectId}/operations/stats`),

  // Weekly lookahead
  getLookahead: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/operations/lookahead`, { params }),

  // Cost summary
  getCostSummary: (projectId: string) =>
    api.get(`/projects/${projectId}/operations/cost-summary`),

  // Activities (flat, project-level)
  listActivities: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/operations/activities`, { params }),
  createActivity: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/operations/activities`, data),
  updateActivity: (projectId: string, activityId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/operations/activities/${activityId}`, data),
  deleteActivity: (projectId: string, activityId: string) =>
    api.delete(`/projects/${projectId}/operations/activities/${activityId}`),
  submitForApproval: (projectId: string, activityId: string) =>
    api.post(`/projects/${projectId}/operations/activities/${activityId}/submit`),
  approveActivity: (projectId: string, activityId: string, data: unknown) =>
    api.post(`/projects/${projectId}/operations/activities/${activityId}/approve`, data),

  // Schedules
  listSchedules: (projectId: string) =>
    api.get(`/projects/${projectId}/operations/schedules`),
  createSchedule: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/operations/schedules`, data),
  updateSchedule: (projectId: string, scheduleId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/operations/schedules/${scheduleId}`, data),
  deleteSchedule: (projectId: string, scheduleId: string) =>
    api.delete(`/projects/${projectId}/operations/schedules/${scheduleId}`),

  // Daily Logs
  listDailyLogs: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/operations/daily-logs`, { params }),
  upsertDailyLog: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/operations/daily-logs`, data),
  updateDailyLog: (projectId: string, logId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/operations/daily-logs/${logId}`, data),

  // Procurement linkage
  listProcurementReadiness: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/procurement/readiness`, { params }),
  updateProcurementRequirement: (
    projectId: string,
    activityId: string,
    requirementType: string,
    data: unknown,
  ) =>
    api.patch(
      `/projects/${projectId}/procurement/readiness/${activityId}/${requirementType}`,
      data,
    ),
};

export const settingsApi = {
  getPublic: () => api.get('/settings/public'),
  list: () => api.get('/settings'),
  update: (key: string, value: string) => api.patch(`/settings/${key}`, { value }),
  bulkUpdate: (settings: Record<string, string>) => api.patch('/settings', { settings }),
};

export const costApi = {
  getOverview: (projectId: string) =>
    api.get(`/projects/${projectId}/cost/overview`),

  // Cost Items
  listItems: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/cost/items`, { params }),
  createItem: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/cost/items`, data),
  updateItem: (projectId: string, itemId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/cost/items/${itemId}`, data),
  deleteItem: (projectId: string, itemId: string) =>
    api.delete(`/projects/${projectId}/cost/items/${itemId}`),

  // Invoices
  listInvoices: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/cost/invoices`, { params }),
  createInvoice: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/cost/invoices`, data),
  updateInvoice: (projectId: string, invoiceId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/cost/invoices/${invoiceId}`, data),
  deleteInvoice: (projectId: string, invoiceId: string) =>
    api.delete(`/projects/${projectId}/cost/invoices/${invoiceId}`),

  // Extracts
  listExtracts: (projectId: string, params?: Record<string, unknown>) =>
    api.get(`/projects/${projectId}/cost/extracts`, { params }),
  createExtract: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/cost/extracts`, data),
  updateExtract: (projectId: string, extractId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/cost/extracts/${extractId}`, data),
  deleteExtract: (projectId: string, extractId: string) =>
    api.delete(`/projects/${projectId}/cost/extracts/${extractId}`),
};

export const procurementApi = {
  getDashboard: () => api.get('/procurement/dashboard'),
  listRequests: (params?: Record<string, unknown>) => api.get('/procurement/requests', { params }),
  getById: (id: string) => api.get(`/procurement/requests/${id}`),
  create: (data: unknown) => api.post('/procurement/requests', data),
  update: (id: string, data: unknown) => api.patch(`/procurement/requests/${id}`, data),
  delete: (id: string) => api.delete(`/procurement/requests/${id}`),
};

export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/documents', { params }),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDownloadUrl: (id: string) => `${api.defaults.baseURL}/documents/${id}/download`,
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch('/notifications/read-all', {}),
};

export const reportsApi = {
  getExecutiveSummary: (params?: Record<string, unknown>) =>
    api.get('/reports/executive-summary', { params }),
  getProjectStatus: (params?: Record<string, unknown>) =>
    api.get('/reports/project-status', { params }),
  getOperations: (params?: Record<string, unknown>) =>
    api.get('/reports/operations', { params }),
  getProcurementReadiness: (params?: Record<string, unknown>) =>
    api.get('/reports/procurement-readiness', { params }),
  getDailyHistory: (params?: Record<string, unknown>) =>
    api.get('/reports/daily-history', { params }),
  getCostSummary: (params?: Record<string, unknown>) =>
    api.get('/reports/cost-summary', { params }),
  getInvoices: (params?: Record<string, unknown>) =>
    api.get('/reports/invoices', { params }),
  getExtracts: (params?: Record<string, unknown>) =>
    api.get('/reports/extracts', { params }),
};
