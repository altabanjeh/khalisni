import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig } from 'axios';

import { env } from '../config/env';
import { clearSessionStorage, readSession, saveSession } from '../auth/authStorage';
import { useAuthStore } from '../state/authStore';
import type { ApiError, PaginatedResponse } from '../types/common';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

function setAuthorizationHeader(token?: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.access;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const store = useAuthStore.getState();
      const session = await readSession();
      const refresh = store.tokens?.refresh ?? session?.refresh;
      if (!refresh) return null;

      const response = await axios.post<{ access: string }>(
        `${env.apiBaseUrl}/auth/token/refresh/`,
        { refresh },
        { timeout: 15_000 },
      );

      const access = response.data.access;
      const currentUser = store.user ?? session?.user;
      if (currentUser) {
        store.setSession({ access, refresh, user: currentUser });
      }
      if (session) {
        await saveSession({ ...session, access });
      }
      setAuthorizationHeader(access);
      return access;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = originalRequest?.url?.includes('/auth/token/refresh/');

    if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;
      try {
        const access = await refreshAccessToken();
        if (access) {
          const headers = AxiosHeaders.from(originalRequest.headers as any);
          headers.set('Authorization', `Bearer ${access}`);
          originalRequest.headers = headers;
          return apiClient(originalRequest);
        }
      } catch {
        await clearSessionStorage();
        useAuthStore.getState().clearSession();
        setAuthorizationHeader(null);
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { detail?: string; message?: string; [key: string]: unknown }
      | undefined;
    const detail = typeof responseData?.detail === 'string'
      ? responseData.detail
      : typeof responseData?.message === 'string'
        ? responseData.message
        : undefined;

    const fieldErrors = Object.entries(responseData ?? {}).reduce<Record<string, string[]>>(
      (acc, [key, value]) => {
        if (key === 'detail' || key === 'message') return acc;
        if (Array.isArray(value)) {
          acc[key] = value.map(String);
        } else if (typeof value === 'string') {
          acc[key] = [value];
        }
        return acc;
      },
      {},
    );

    return {
      message: detail ?? error.message ?? 'حدث خطأ غير متوقع.',
      status: error.response?.status,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.',
  };
}

export function getDisplayError(error: unknown) {
  return normalizeApiError(error).message;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export function unwrapListData<T>(data: T[] | PaginatedResponse<T> | null | undefined) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function applyAccessToken(token?: string | null) {
  setAuthorizationHeader(token);
}
