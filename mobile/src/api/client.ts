import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig } from 'axios';

import { env } from '../config/env';
import { clearSessionStorage, readSession, saveSession } from '../auth/authStorage';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../state/authStore';
import type { ApiError, ApiListParams, PaginatedResponse } from '../types/common';

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

// Arabic text for failures that carry no usable server message. Axios's own
// English text ("Network Error", "timeout of 20000ms exceeded", "Request failed
// with status code 500") is never shown to the user.
export const NETWORK_ERROR_MESSAGE = 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.';
export const TIMEOUT_ERROR_MESSAGE = 'انتهت مهلة الاتصال بالخادم. تحقق من اتصالك ثم حاول مرة أخرى.';
export const SERVER_ERROR_MESSAGE = 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى بعد قليل.';
export const UNEXPECTED_ERROR_MESSAGE = 'حدث خطأ غير متوقع.';

function fallbackMessageForStatus(status: number) {
  if (status === 401) return 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.';
  if (status === 403) return 'لا تملك صلاحية تنفيذ هذا الإجراء.';
  if (status === 404) return 'العنصر المطلوب غير موجود.';
  if (status === 413) return 'حجم الملف أكبر من المسموح.';
  if (status === 429) return 'تم تجاوز عدد المحاولات المسموح. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
  return `تعذر إكمال الطلب (رمز الخطأ ${status}).`;
}

// `{ key: "message" }` objects nested under one error key, such as
// `document_errors` and `service_answers`.
function toMessageMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const message = firstErrorMessage(item);
    if (message) result[key] = message;
  }
  return Object.keys(result).length ? result : undefined;
}

function isNormalizedApiError(error: unknown): error is ApiError {
  return Boolean(
    error
    && typeof error === 'object'
    && !(error instanceof Error)
    && typeof (error as ApiError).message === 'string',
  );
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || /timeout/i.test(error.message || '');
      return {
        message: isTimeout ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE,
        code: isTimeout ? 'timeout' : 'network_error',
      };
    }

    const rawData: unknown = error.response.data;
    const responseData = (rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : undefined) as
      | { detail?: string; message?: string; code?: unknown; [key: string]: unknown }
      | undefined;

    // A 5xx body is an internal error page or a generic English sentence; it
    // never means anything to the customer.
    if (status && status >= 500) {
      return {
        message: SERVER_ERROR_MESSAGE,
        status,
        code: typeof responseData?.code === 'string' ? responseData.code : undefined,
      };
    }

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
        ?? (status ? fallbackMessageForStatus(status) : UNEXPECTED_ERROR_MESSAGE),
      status,
      code: typeof responseData?.code === 'string' ? responseData.code : undefined,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      documentErrors: toMessageMap(responseData?.document_errors),
      serviceAnswerErrors: toMessageMap(responseData?.service_answers),
    };
  }

  // Errors rejected by the response interceptor are already normalized.
  if (isNormalizedApiError(error)) {
    return error;
  }

  return {
    message: error instanceof Error && error.message ? error.message : UNEXPECTED_ERROR_MESSAGE,
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

export interface PageResult<T> {
  results: T[];
  next: string | null;
  count: number;
}

export function toPageResult<T>(data: T[] | PaginatedResponse<T> | null | undefined): PageResult<T> {
  if (Array.isArray(data)) return { results: data, next: null, count: data.length };
  const results = Array.isArray(data?.results) ? data.results : [];
  return {
    results,
    next: typeof data?.next === 'string' && data.next ? data.next : null,
    count: typeof data?.count === 'number' ? data.count : results.length,
  };
}

// The page number named by a DRF `next` link. Re-requesting the relative path
// with that page keeps the configured base URL even when the server builds
// `next` with an internal host name or plain http behind a proxy.
export function pageFromNextLink(next: string | null | undefined) {
  if (!next) return null;
  const match = /[?&]page=(\d+)/.exec(next);
  return match ? Number(match[1]) : null;
}

const MAX_PAGES = 200;

/**
 * Reads every page of a DRF PageNumberPagination list ({count, next, previous,
 * results}) by following `next`. A plain array response is returned as is.
 */
export async function fetchAllPages<T>(url: string, params: ApiListParams = {}) {
  const firstResponse = await apiClient.get<T[] | PaginatedResponse<T>>(url, { params: buildQuery(params) });
  const first = toPageResult(firstResponse.data);
  const items = [...first.results];
  let next = first.next;
  let pages = 1;
  while (next && pages < MAX_PAGES) {
    const page = pageFromNextLink(next);
    const response = page
      ? await apiClient.get<T[] | PaginatedResponse<T>>(url, { params: buildQuery({ ...params, page }) })
      : await apiClient.get<T[] | PaginatedResponse<T>>(next);
    const current = toPageResult(response.data);
    items.push(...current.results);
    next = current.next;
    pages += 1;
  }
  return items;
}

// One page of a paginated list, for screens that load more on demand.
export async function fetchPage<T>(url: string, params: ApiListParams = {}) {
  const response = await apiClient.get<T[] | PaginatedResponse<T>>(url, { params: buildQuery(params) });
  return toPageResult(response.data);
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
    throw new Error('كلمة مرور المشرف الحالية مطلوبة.');
  }

  return apiClient.delete<T>(url, {
    ...config,
    data: {
      ...(config.data as Record<string, unknown> | undefined),
      delete_password: normalizedPassword,
    },
  }).then((res) => res.data);
}
