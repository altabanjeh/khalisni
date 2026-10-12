import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACCESS_TOKEN_KEY,
  AUTH_STORAGE_MODE_LOCAL,
  AUTH_STORAGE_MODE_SESSION,
  REFRESH_TOKEN_KEY,
  getStoredAccessToken,
  getStoredAuthMode,
  isStaleActionError,
  storeAuthTokens,
} from './client'

describe('auth storage isolation between tabs', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('keeps this tab on its own session when another tab stores a remembered login', () => {
    storeAuthTokens({ access: 'tab-a-access', refresh: 'tab-a-refresh' }, { persistent: false })
    // Another tab signs in as a different account with "remember me".
    localStorage.setItem(ACCESS_TOKEN_KEY, 'tab-b-access')
    localStorage.setItem(REFRESH_TOKEN_KEY, 'tab-b-refresh')

    expect(getStoredAuthMode()).toBe(AUTH_STORAGE_MODE_SESSION)
    expect(getStoredAccessToken()).toBe('tab-a-access')
  })

  it('uses the remembered login when the tab has no session of its own', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'remembered-access')
    localStorage.setItem(REFRESH_TOKEN_KEY, 'remembered-refresh')

    expect(getStoredAuthMode()).toBe(AUTH_STORAGE_MODE_LOCAL)
    expect(getStoredAccessToken()).toBe('remembered-access')
  })
})

describe('isStaleActionError', () => {
  const error = (status, data) => ({ response: { status, data } })

  it('treats state conflicts and vanished records as stale', () => {
    expect(isStaleActionError(error(409, {}))).toBe(true)
    expect(isStaleActionError(error(404, {}))).toBe(true)
    expect(isStaleActionError(error(403, {}))).toBe(true)
    expect(isStaleActionError(error(400, { detail: "Role 'employee' cannot move order from REJECTED to ASSIGNED." }))).toBe(true)
  })

  it('does not refetch for field validation or network errors', () => {
    expect(isStaleActionError(error(400, { note: ['This field is required.'] }))).toBe(false)
    expect(isStaleActionError(error(500, {}))).toBe(false)
    expect(isStaleActionError(new Error('Network Error'))).toBe(false)
  })
})
