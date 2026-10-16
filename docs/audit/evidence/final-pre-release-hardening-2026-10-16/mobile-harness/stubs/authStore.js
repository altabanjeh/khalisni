let state = { tokens: { access: 'expired-access', refresh: 'refresh-token' }, user: { id: 1 } }
export const useAuthStore = { getState: () => ({ ...state, setSession(next) { state = { ...state, tokens: { access: next.access, refresh: next.refresh }, user: next.user } }, clearSession() { state = { ...state, tokens: null } } }) }
