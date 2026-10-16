import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig } from 'axios';

import { env } from '../config/env';
import { clearSessionStorage, readSession, saveSession } from '../auth/authStorage';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../state/authStore';
import type { ApiError, PaginatedResponse } from '../types/common';

// The app's screens are Arabic only (there is no language setting), so every
// request names Arabic. Without it the API falls back to its own defaults
// (password-reset email in English) and iOS adds the device locale instead.
export const APP_LANGUAGE = 'ar';
const languageHeaders = { 'Accept-Language': APP_LANGUAGE };

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: languageHeaders,
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

      const response = await axios.post<{ access: string; refresh?: string }>(
        `${env.apiBaseUrl}/auth/token/refresh/`,
        { refresh },
        { timeout: 15_000, headers: languageHeaders },
      );

      const access = response.data.access;
      // The backend rotates refresh tokens and blacklists the old one.
      const nextRefresh = response.data.refresh || refresh;
      const currentUser = store.user ?? session?.user;
      if (currentUser) {
        store.setSession({ access, refresh: nextRefresh, user: currentUser });
        await saveSession({ access, refresh: nextRefresh, user: currentUser });
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
      } catch (refreshError) {
        const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        if (refreshStatus === 400 || refreshStatus === 401) {
          // The server rejected the refresh token: the session is really over.
          await clearSessionStorage();
          useAuthStore.getState().clearSession();
          setAuthorizationHeader(null);
          queryClient.clear();
        } else {
          // Timeout, offline or 5xx: keep the session so the request can be retried later.
          return Promise.reject(normalizeApiError(refreshError));
        }
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

function firstErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstErrorMessage(item);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'code') continue;
      const found = firstErrorMessage(item);
      if (found) return found;
    }
  }
  return undefined;
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const rawData: unknown = error.response?.data;
    const responseData = (rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : undefined) as
      | { detail?: string; message?: string; code?: unknown; [key: string]: unknown }
      | undefined;
    const detail = typeof responseData?.detail === 'string'
      ? responseData.detail
      : typeof responseData?.message === 'string'
        ? responseData.message
        : undefined;

    const fieldErrors = Object.entries(responseData ?? {}).reduce<Record<string, string[]>>(
      (acc, [key, value]) => {
        if (key === 'detail' || key === 'message' || key === 'code') return acc;
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
      message:
        detail
        ?? firstErrorMessage(responseData ?? (Array.isArray(rawData) ? rawData : undefined))
        ?? error.message
        ?? 'حدث خطأ غير متوقع.',
      status: error.response?.status,
      code: typeof responseData?.code === 'string' ? responseData.code : undefined,
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

export function secureAdminDelete<T = unknown>(
  url: string,
  deletePassword: string,
  config: AxiosRequestConfig = {},
) {
  const normalizedPassword = String(deletePassword || '').trim();
  if (!normalizedPassword) {
    throw new Error('Current admin password is required.');
  }

  return apiClient.delete<T>(url, {
    ...config,
    data: {
      ...(config.data as Record<string, unknown> | undefined),
      delete_password: normalizedPassword,
    },
  }).then((res) => res.data);
}
