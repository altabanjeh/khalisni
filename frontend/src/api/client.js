import axios from 'axios'
import { LANGUAGE_STORAGE_KEY, normalizeLanguage } from '../utils/i18n'

export const ACCESS_TOKEN_KEY = 'khalisni_access'
export const REFRESH_TOKEN_KEY = 'khalisni_refresh'
export const AUTH_STORAGE_MODE_KEY = 'khalisni_auth_storage'
export const AUTH_STORAGE_MODE_LOCAL = 'local'
export const AUTH_STORAGE_MODE_SESSION = 'session'

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api'
export const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL,
).replace(/\/+$/, '')

const USE_CREDENTIALS = String(import.meta.env.VITE_API_WITH_CREDENTIALS || '').toLowerCase() === 'true'

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

function getStorageModeValue(storage) {
  const value = storage.getItem(AUTH_STORAGE_MODE_KEY)
  return value === AUTH_STORAGE_MODE_LOCAL || value === AUTH_STORAGE_MODE_SESSION ? value : null
}

function hasStoredAuth(storage) {
  return Boolean(storage.getItem(REFRESH_TOKEN_KEY) || storage.getItem(ACCESS_TOKEN_KEY))
}

function getStorageForMode(mode) {
  return mode === AUTH_STORAGE_MODE_LOCAL ? localStorage : sessionStorage
}

function removeStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_STORAGE_MODE_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_MODE_KEY)
}

export function clearStoredAuth({ notify = true } = {}) {
  removeStoredAuth()
  if (typeof window !== 'undefined') {
    if (!notify) return
    window.dispatchEvent(new Event('khalisni:auth-expired'))
  }
}

export function getStoredAuthMode() {
  if (hasStoredAuth(localStorage) || getStorageModeValue(localStorage) === AUTH_STORAGE_MODE_LOCAL) {
    return AUTH_STORAGE_MODE_LOCAL
  }

  if (hasStoredAuth(sessionStorage) || getStorageModeValue(sessionStorage) === AUTH_STORAGE_MODE_SESSION) {
    return AUTH_STORAGE_MODE_SESSION
  }

  return AUTH_STORAGE_MODE_SESSION
}

function getActiveAuthStorage() {
  return getStorageForMode(getStoredAuthMode())
}

export function storeAuthTokens(tokens, { persistent = false } = {}) {
  removeStoredAuth()

  const mode = persistent ? AUTH_STORAGE_MODE_LOCAL : AUTH_STORAGE_MODE_SESSION
  const storage = getStorageForMode(mode)
  storage.setItem(AUTH_STORAGE_MODE_KEY, mode)

  if (tokens?.access) {
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  }

  if (tokens?.refresh) {
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
  }
}

export function updateStoredAccessToken(access) {
  const mode = getStoredAuthMode()
  const storage = getStorageForMode(mode)
  const inactiveStorage = getStorageForMode(
    mode === AUTH_STORAGE_MODE_LOCAL ? AUTH_STORAGE_MODE_SESSION : AUTH_STORAGE_MODE_LOCAL,
  )

  inactiveStorage.removeItem(ACCESS_TOKEN_KEY)
  storage.setItem(AUTH_STORAGE_MODE_KEY, mode)

  if (access) {
    storage.setItem(ACCESS_TOKEN_KEY, access)
    return
  }

  storage.removeItem(ACCESS_TOKEN_KEY)
}

export function getStoredAccessToken() {
  return getActiveAuthStorage().getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken() {
  return getActiveAuthStorage().getItem(REFRESH_TOKEN_KEY)
}

function getStoredLanguage() {
  if (typeof window === 'undefined') return 'ar'
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
}

function flattenErrorMessages(value) {
  if (Array.isArray(value)) {
    return value.flatMap(flattenErrorMessages).filter(Boolean)
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      flattenErrorMessages(nestedValue).map((message) => `${key}: ${message}`),
    )
  }

  if (value == null || value === '') return []
  return [String(value)]
}

function normalizeErrorPayload(data, status) {
  const fieldErrors = {}
  const nonFieldErrors = []

  if (typeof data === 'string') {
    if (/<\/?(html|body|title|h1)\b/i.test(data)) {
      return {
        code: '',
        detail: '',
        fieldErrors,
        nonFieldErrors,
        displayMessage: getDefaultErrorMessage(status),
      }
    }

    return {
      code: '',
      detail: data,
      fieldErrors,
      nonFieldErrors,
      displayMessage: data,
    }
  }

  if (Array.isArray(data)) {
    const messages = flattenErrorMessages(data)
    return {
      code: '',
      detail: messages[0] || '',
      fieldErrors,
      nonFieldErrors: messages,
      displayMessage: messages[0] || getDefaultErrorMessage(status),
    }
  }

  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'detail' || key === 'code') continue
      const messages = flattenErrorMessages(value)
      if (!messages.length) continue
      fieldErrors[key] = messages
    }

    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : flattenErrorMessages(data.detail)[0] || flattenErrorMessages(data.message)[0] || ''

    const firstFieldMessage = Object.values(fieldErrors)[0]?.[0] || ''
    const firstNonFieldMessage = flattenErrorMessages(data.non_field_errors)[0] || ''
    const displayMessage = detail || firstFieldMessage || firstNonFieldMessage || getDefaultErrorMessage(status)

    return {
      code: typeof data.code === 'string' ? data.code : '',
      detail,
      fieldErrors,
      nonFieldErrors: firstNonFieldMessage ? [firstNonFieldMessage] : [],
      displayMessage,
    }
  }

  return {
    code: '',
    detail: '',
    fieldErrors,
    nonFieldErrors,
    displayMessage: getDefaultErrorMessage(status),
  }
}

function getDefaultErrorMessage(status) {
  if (status === 400) return 'تعذر تنفيذ الطلب بسبب بيانات غير صالحة.'
  if (status === 401) return 'انتهت الجلسة أو بيانات الدخول غير صالحة.'
  if (status === 403) return 'لا تملك الصلاحية لتنفيذ هذا الإجراء.'
  if (status === 404) return 'العنصر المطلوب غير موجود.'
  if (status >= 500) return 'حدث خطأ داخلي في الخادم. حاول مرة أخرى لاحقاً.'
  return 'تعذر إتمام الطلب.'
}

function createApiError(error) {
  if (!axios.isAxiosError(error)) {
    return error
  }

  const status = error.response?.status ?? 0
  const payload = normalizeErrorPayload(error.response?.data, status)
  const apiError = error

  apiError.name = 'ApiError'
  apiError.status = status
  apiError.code = payload.code
  apiError.detail = payload.detail
  apiError.fieldErrors = payload.fieldErrors
  apiError.nonFieldErrors = payload.nonFieldErrors
  apiError.displayMessage = payload.displayMessage
  apiError.isValidationError = status === 400
  apiError.isAuthError = status === 401
  apiError.isForbidden = status === 403
  apiError.isNotFound = status === 404
  apiError.isServerError = status >= 500
  apiError.message = payload.displayMessage
  apiError.apiError = {
    status,
    code: payload.code,
    detail: payload.detail,
    fieldErrors: payload.fieldErrors,
    nonFieldErrors: payload.nonFieldErrors,
    displayMessage: payload.displayMessage,
    rawData: error.response?.data,
  }

  return apiError
}

export function getDisplayError(error) {
  if (!error) return 'تعذر إتمام الطلب.'
  if (typeof error === 'string') return error
  if (error.displayMessage) return error.displayMessage
  if (error.apiError?.displayMessage) return error.apiError.displayMessage
  if (error.response?.data?.detail && typeof error.response.data.detail === 'string') {
    return error.response.data.detail
  }
  return error.message || 'تعذر إتمام الطلب.'
}

function createClientActionError(message) {
  const error = new Error(message)
  error.displayMessage = message
  return error
}

function promptDeletePassword() {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
    throw createClientActionError('Current admin password prompt is unavailable in this environment.')
  }

  const password = window.prompt('Enter your current admin password / أدخل كلمة مرور حسابك الإدارية الحالية')
  if (password == null) {
    throw createClientActionError('Delete action was cancelled.')
  }

  const normalized = String(password).trim()
  if (!normalized) {
    throw createClientActionError('Current admin password is required.')
  }

  return normalized
}

export function unwrapList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export function withId(record, ...keys) {
  if (!record) return record
  if (record.id != null) return record

  for (const key of keys) {
    if (record[key] != null) {
      return { ...record, id: record[key] }
    }
  }

  return record
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: USE_CREDENTIALS,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const nextConfig = { ...config }
  const headers = { ...(nextConfig.headers || {}) }
  const access = getStoredAccessToken()

  if (access && !headers.Authorization) {
    headers.Authorization = `Bearer ${access}`
  }

  if (!headers['Accept-Language']) {
    headers['Accept-Language'] = getStoredLanguage()
  }

  if (isFormData(nextConfig.data)) {
    delete headers['Content-Type']
  } else if (nextConfig.data !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  nextConfig.headers = headers
  return nextConfig
})

let _isRefreshing = false
let _refreshQueue = []

function _processRefreshQueue(error, token = null) {
  _refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  _refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const detail = error?.response?.data?.detail
    const code = error?.response?.data?.code
    const message = typeof detail === 'string' ? detail : ''

    const isInvalidToken =
      status === 401 &&
      (code === 'token_not_valid' ||
        message.includes('Given token not valid') ||
        message.includes('Token is invalid') ||
        message.includes('token_not_valid'))

    if (!isInvalidToken) {
      return Promise.reject(createApiError(error))
    }

    const refresh = getStoredRefreshToken()
    const isRefreshCall = error?.config?.url?.includes('/auth/token/refresh/')

    if (!refresh || isRefreshCall) {
      clearStoredAuth()
      return Promise.reject(createApiError(error))
    }

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject })
      }).then((newAccess) => {
        const retryConfig = { ...error.config }
        retryConfig.headers = { ...retryConfig.headers, Authorization: `Bearer ${newAccess}` }
        return apiClient.request(retryConfig)
      })
    }

    _isRefreshing = true
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
      const newAccess = response.data.access
      updateStoredAccessToken(newAccess)
      _processRefreshQueue(null, newAccess)
      const retryConfig = { ...error.config }
      retryConfig.headers = { ...retryConfig.headers, Authorization: `Bearer ${newAccess}` }
      return apiClient.request(retryConfig)
    } catch (refreshError) {
      _processRefreshQueue(refreshError)
      clearStoredAuth()
      return Promise.reject(createApiError(error))
    } finally {
      _isRefreshing = false
    }
  },
)

async function request(config) {
  const response = await apiClient.request(config)
  return response.data
}

export const http = {
  get(url, config = {}) {
    return request({ ...config, method: 'get', url })
  },
  post(url, data, config = {}) {
    return request({ ...config, method: 'post', url, data })
  },
  put(url, data, config = {}) {
    return request({ ...config, method: 'put', url, data })
  },
  patch(url, data, config = {}) {
    return request({ ...config, method: 'patch', url, data })
  },
  delete(url, config = {}) {
    return request({ ...config, method: 'delete', url })
  },
}

export function secureAdminDelete(url, config = {}) {
  const deletePassword = config.deletePassword || config.data?.delete_password || promptDeletePassword()
  const data = {
    ...(config.data || {}),
    delete_password: deletePassword,
  }
  const { deletePassword: _deletePassword, ...rest } = config
  return request({ ...rest, method: 'delete', url, data })
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null && item !== '') {
          query.append(key, String(item))
        }
      })
      return
    }

    query.append(key, String(value))
  })

  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export default apiClient
