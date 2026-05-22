import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000);
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const api = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  config.metadata = { startedAt: Date.now() };
  const token = localStorage.getItem('neural_nexus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => {
    if (response?.config?.metadata) {
      response.durationMs = Date.now() - response.config.metadata.startedAt;
    }
    return response;
  },
  async (error) => {
    const config = error?.config || {};
    const status = error?.response?.status;
    const method = String(config.method || '').toLowerCase();
    const shouldRetry =
      !config._retry &&
      RETRYABLE_METHODS.has(method) &&
      (error.code === 'ECONNABORTED' || !status || RETRYABLE_STATUS.has(status));

    if (shouldRetry) {
      config._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return api(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('neural_nexus_token');
      localStorage.removeItem('neural_nexus_user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const payload = {
      status: error?.response?.status || 0,
      message: error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Request failed',
      url: config?.url || '',
      method,
      raw: error,
    };
    return Promise.reject(payload);
  }
);

export default api;
