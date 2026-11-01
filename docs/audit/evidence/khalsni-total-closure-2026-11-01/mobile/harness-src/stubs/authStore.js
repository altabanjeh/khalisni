let state = { tokens: { access: 'expired-access', refresh: 'r1' }, user: { id: 1, role: 'customer' } };
state.setSession = (x) => { state.tokens = { access: x.access, refresh: x.refresh }; state.user = x.user; };
state.clearSession = () => { state.tokens = null; state.user = null; };
export const useAuthStore = { getState: () => state };
