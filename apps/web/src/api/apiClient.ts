import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse, ApiError } from '@lrp/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let sessionCsrfToken: string | null = null;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match && match[3] !== undefined ? decodeURIComponent(match[3]) : null;
}

export function getCsrfToken(): string {
  const cookieToken = getCookie('csrf_token') || getCookie('XSRF-TOKEN');
  if (cookieToken) {
    sessionCsrfToken = cookieToken;
    return cookieToken;
  }
  if (!sessionCsrfToken) {
    try {
      sessionCsrfToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('csrf_token') : null;
    } catch {
      // ignore
    }
  }
  if (!sessionCsrfToken) {
    sessionCsrfToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'csrf-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('csrf_token', sessionCsrfToken);
      }
    } catch {
      // ignore
    }
  }
  return sessionCsrfToken;
}

export function setCsrfToken(token: string): void {
  sessionCsrfToken = token;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('csrf_token', token);
    }
  } catch {
    // ignore
  }
}

export function clearCsrfToken(): void {
  sessionCsrfToken = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('csrf_token');
    }
  } catch {
    // ignore
  }
}

export function setSimulateCsrfError(simulate: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (simulate) {
        localStorage.setItem('SIMULATE_CSRF_ERROR', 'true');
      } else {
        localStorage.removeItem('SIMULATE_CSRF_ERROR');
      }
    }
  } catch {
    // ignore
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // For HttpOnly cookies
    });

    this.setupInterceptors();
  }

  private getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  private setAccessToken(token: string): void {
    useAuthStore.getState().setAccessToken(token);
  }

  private setupInterceptors() {
    // Request interceptor - add auth token and CSRF token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = this.getAccessToken();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Attach CSRF Token to requests
        const csrfToken = getCsrfToken();
        if (csrfToken && config.headers) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        // Check development error simulation
        let simulateCsrfError = false;
        try {
          simulateCsrfError = typeof localStorage !== 'undefined' && localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true';
        } catch {
          // ignore
        }

        if (simulateCsrfError && config.headers) {
          config.headers['X-Simulate-CSRF-Error'] = 'true';
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh and CSRF errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown> | { code?: string; message?: string }>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.client(originalRequest);
          } catch {
            // Refresh failed, redirect to login
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }

        // Handle CSRF verification failure (HTTP 403 CSRF_INVALID)
        if (error.response?.status === 403) {
          const resData = error.response.data as (ApiResponse<unknown> & { code?: string; message?: string }) | undefined;
          const errorCode = resData?.error?.code || resData?.code;
          if (errorCode === 'CSRF_INVALID') {
            clearCsrfToken();
            return Promise.reject(this.normalizeError(error as AxiosError<ApiResponse<unknown>>));
          }
        }

        return Promise.reject(this.normalizeError(error as AxiosError<ApiResponse<unknown>>));
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      const response = await axios.post<ApiResponse<{ accessToken: string }>>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newAccessToken = response.data.data?.accessToken;
      if (!newAccessToken) {
        throw new Error('Failed to refresh token');
      }

      this.setAccessToken(newAccessToken);
      return newAccessToken;
    })();

    try {
      return await this.refreshTokenPromise;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private normalizeError(
    error: AxiosError<{ error?: ApiError; code?: string; message?: string; details?: Record<string, unknown> }>
  ): ApiError {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (error.response?.data?.code && error.response?.data?.message) {
      return {
        code: error.response.data.code,
        message: error.response.data.message,
        details: error.response.data.details,
      };
    }

    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: '請求逾時，請檢查網路連線' };
    }

    if (!error.response) {
      return { code: 'NETWORK_ERROR', message: '網路錯誤，請檢查連線' };
    }

    return {
      code: error.response.data?.error?.code || error.response.data?.code || 'UNKNOWN_ERROR',
      message: error.response.data?.error?.message || error.response.data?.message || '發生未知錯誤',
    };
  }

  // HTTP methods
  async get<T>(url: string, params?: Record<string, unknown>) {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown) {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown) {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown) {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string, data?: unknown) {
    const response = await this.client.delete<ApiResponse<T>>(url, { data });
    return response.data;
  }

  async postBlob(url: string, data?: unknown): Promise<Blob> {
    const response = await this.client.post(url, data, {
      responseType: 'blob',
    });
    return response.data as Blob;
  }
}

export const apiClient = new ApiClient();
export default apiClient;