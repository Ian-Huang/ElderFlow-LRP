import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse, ApiError } from '@lrp/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
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
    // Request interceptor - add auth token from auth store (IndexedDB-backed)
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = this.getAccessToken();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
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

        return Promise.reject(this.normalizeError(error));
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

  private normalizeError(error: AxiosError<ApiResponse<unknown>>): ApiError {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: '請求逾時，請檢查網路連線' };
    }

    if (!error.response) {
      return { code: 'NETWORK_ERROR', message: '網路錯誤，請檢查連線' };
    }

    return {
      code: error.response.data?.error?.code || 'UNKNOWN_ERROR',
      message: error.response.data?.error?.message || '發生未知錯誤',
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

  async delete<T>(url: string) {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;