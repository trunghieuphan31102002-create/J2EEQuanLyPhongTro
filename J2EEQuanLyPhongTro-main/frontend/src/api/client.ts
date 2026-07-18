import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

// In dev, VITE_API_URL is undefined → falls back to '/api' (Vite proxy forwards to backend).
// In production, set VITE_API_URL to the deployed backend, e.g. https://rentalms-api.up.railway.app/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Avoid redirect loop if already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a user-friendly error message from an axios error. */
export function getErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined;
    if (data?.message) return data.message;
    if (err.message) return err.message;
  }
  return fallback;
}
