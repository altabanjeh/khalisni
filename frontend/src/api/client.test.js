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
