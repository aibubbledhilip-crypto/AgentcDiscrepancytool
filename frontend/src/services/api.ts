import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string; email?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Data Source API
export const dataSourceApi = {
  getAll: () => api.get('/datasources'),
  getById: (id: string) => api.get(`/datasources/${id}`),
  create: (data: any) => api.post('/datasources', data),
  update: (id: string, data: any) => api.put(`/datasources/${id}`, data),
  delete: (id: string) => api.delete(`/datasources/${id}`),
  testConnection: (id: string) => api.post(`/datasources/${id}/test`),
};

// Rules API
export const rulesApi = {
  getAll: () => api.get('/rules'),
  getById: (id: string) => api.get(`/rules/${id}`),
  create: (data: any) => api.post('/rules', data),
  update: (id: string, data: any) => api.put(`/rules/${id}`, data),
  delete: (id: string) => api.delete(`/rules/${id}`),
  execute: (id: string) => api.post(`/rules/${id}/execute`),
  getExecutions: (id: string, page?: number, limit?: number) =>
    api.get(`/rules/${id}/executions`, { params: { page, limit } }),
};

// Schedule API
export const scheduleApi = {
  getAll: () => api.get('/schedules'),
  getById: (id: string) => api.get(`/schedules/${id}`),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  toggle: (id: string) => api.post(`/schedules/${id}/toggle`),
  runNow: (id: string) => api.post(`/schedules/${id}/run`),
};

// Reports API
export const reportsApi = {
  getAll: (page?: number, limit?: number) =>
    api.get('/reports', { params: { page, limit } }),
  getById: (id: string) => api.get(`/reports/${id}`),
  create: (data: any) => api.post('/reports', data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  exportCsv: (id: string) =>
    api.get(`/reports/${id}/export/csv`, { responseType: 'blob' }),
  exportJson: (id: string) =>
    api.get(`/reports/${id}/export/json`, { responseType: 'blob' }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentExecutions: (limit?: number) =>
    api.get('/dashboard/recent-executions', { params: { limit } }),
  getExecutionTrends: (days?: number) =>
    api.get('/dashboard/execution-trends', { params: { days } }),
  getDiscrepancySummary: (limit?: number) =>
    api.get('/dashboard/discrepancy-summary', { params: { limit } }),
  getUpcomingSchedules: (limit?: number) =>
    api.get('/dashboard/upcoming-schedules', { params: { limit } }),
};
