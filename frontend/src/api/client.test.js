import { beforeEach, describe, expect, test, vi } from 'vitest'

const axiosMockState = vi.hoisted(() => ({
  request: vi.fn(),
  post: vi.fn(),
  responseRejected: null,
}))

vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: {
        use: vi.fn(() => 0),
      },
      response: {
        use: vi.fn((_, rejected) => {
          axiosMockState.responseRejected = rejected
          return 0
        }),
      },
    },
    request: axiosMockState.request,
  }

  return {
    default: {
      create: vi.fn(() => instance),
      post: axiosMockState.post,
      isAxiosError: (error) => Boolean(error?.isAxiosError),
    },
  }
})

describe('client auth storage', () => {
  beforeEach(() => {
    vi.resetModules()
    axiosMockState.request.mockReset()
    axiosMockState.post.mockReset()
    axiosMockState.responseRejected = null
    localStorage.clear()
    sessionStorage.clear()
  })

  test('storeAuthTokens keeps session login out of localStorage', async () => {
    const client = await import('./client.js')

    client.storeAuthTokens(
      { access: 'session-access-token', refresh: 'session-refresh-token' },
      { persistent: false },
    )

    expect(client.getStoredAccessToken()).toBe('session-access-token')
    expect(client.getStoredRefreshToken()).toBe('session-refresh-token')
    expect(sessionStorage.getItem(client.ACCESS_TOKEN_KEY)).toBe('session-access-token')
    expect(sessionStorage.getItem(client.REFRESH_TOKEN_KEY)).toBe('session-refresh-token')
    expect(localStorage.getItem(client.ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(client.REFRESH_TOKEN_KEY)).toBeNull()
  })

  test('refresh keeps session access token in sessionStorage only', async () => {
    const client = await import('./client.js')

    sessionStorage.setItem(client.ACCESS_TOKEN_KEY, 'stale-session-access')
    sessionStorage.setItem(client.REFRESH_TOKEN_KEY, 'session-refresh-token')
    sessionStorage.setItem(client.AUTH_STORAGE_MODE_KEY, client.AUTH_STORAGE_MODE_SESSION)

    axiosMockState.post.mockResolvedValueOnce({
      data: { access: 'new-session-access' },
    })
    axiosMockState.request.mockResolvedValueOnce({ data: { ok: true } })

    const error = {
      isAxiosError: true,
      config: { url: '/orders/', headers: {} },
      response: {
        status: 401,
        data: {
          code: 'token_not_valid',
          detail: 'token_not_valid',
        },
      },
    }

    await axiosMockState.responseRejected(error)

    expect(axiosMockState.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/token/refresh/',
      { refresh: 'session-refresh-token' },
      expect.objectContaining({ timeout: 30000 }),
    )
    expect(sessionStorage.getItem(client.ACCESS_TOKEN_KEY)).toBe('new-session-access')
    expect(localStorage.getItem(client.ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(client.REFRESH_TOKEN_KEY)).toBeNull()
    expect(axiosMockState.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-session-access',
        }),
      }),
    )
  })

  function expiredTokenError(config = { url: '/orders/', headers: {} }) {
    return {
      isAxiosError: true,
      config,
      response: { status: 401, data: { code: 'token_not_valid', detail: 'token_not_valid' } },
    }
  }

  function storeSession(client) {
    sessionStorage.setItem(client.ACCESS_TOKEN_KEY, 'stale-access')
    sessionStorage.setItem(client.REFRESH_TOKEN_KEY, 'refresh-token')
    sessionStorage.setItem(client.AUTH_STORAGE_MODE_KEY, client.AUTH_STORAGE_MODE_SESSION)
  }

  test('a refresh that fails without an answer keeps the session and reports a network error', async () => {
    const client = await import('./client.js')
    storeSession(client)
    axiosMockState.post.mockRejectedValueOnce({ isAxiosError: true, message: 'Network Error' })

    const rejection = await axiosMockState.responseRejected(expiredTokenError()).catch((error) => error)

    expect(rejection.status).toBe(0)
    expect(rejection.displayMessage).toBe('تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.')
    expect(client.getStoredRefreshToken()).toBe('refresh-token')
    expect(client.getStoredAccessToken()).toBe('stale-access')
  })

  test('a refresh that fails with a server fault keeps the session', async () => {
    const client = await import('./client.js')
    storeSession(client)
    axiosMockState.post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: {} } })

    const rejection = await axiosMockState.responseRejected(expiredTokenError()).catch((error) => error)

    expect(rejection.status).toBe(503)
    expect(client.getStoredRefreshToken()).toBe('refresh-token')
  })

  test('a refused refresh token ends the session', async () => {
    const client = await import('./client.js')
    storeSession(client)
    axiosMockState.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { code: 'token_not_valid' } },
    })

    const rejection = await axiosMockState.responseRejected(expiredTokenError()).catch((error) => error)

    expect(rejection.status).toBe(401)
    expect(client.getStoredRefreshToken()).toBeNull()
    expect(client.getStoredAccessToken()).toBeNull()
  })

  test.each(['token_revoked', 'user_inactive', 'user_not_found'])('401 %s ends the session without a refresh', async (code) => {
    const client = await import('./client.js')
    storeSession(client)

    await axiosMockState.responseRejected({
      isAxiosError: true,
      config: { url: '/orders/', headers: {} },
      response: { status: 401, data: { code, detail: 'gone' } },
    }).catch(() => null)

    expect(axiosMockState.post).not.toHaveBeenCalled()
    expect(client.getStoredRefreshToken()).toBeNull()
  })

  test('a request already retried after a refresh is not refreshed again', async () => {
    const client = await import('./client.js')
    storeSession(client)

    const rejection = await axiosMockState
      .responseRejected(expiredTokenError({ url: '/orders/', headers: {}, _retried: true }))
      .catch((error) => error)

    expect(axiosMockState.post).not.toHaveBeenCalled()
    expect(rejection.status).toBe(401)
  })

  test('default error messages follow the stored language', async () => {
    localStorage.setItem('khalisni-language', 'en')
    const client = await import('./client.js')

    const rejection = await axiosMockState
      .responseRejected({ isAxiosError: true, config: { url: '/orders/' }, message: 'timeout of 30000ms exceeded' })
      .catch((error) => error)

    expect(rejection.displayMessage).toBe('Could not reach the server. Check your connection and try again.')
    expect(client.getDisplayError(null)).toBe('The request could not be completed.')
  })

  test('unwrapList supports paginated DRF responses', async () => {
    const client = await import('./client.js')

    expect(
      client.unwrapList({
        count: 2,
        next: null,
        previous: null,
        results: [{ id: 1 }, { id: 2 }],
      }),
    ).toEqual([{ id: 1 }, { id: 2 }])
  })
})
