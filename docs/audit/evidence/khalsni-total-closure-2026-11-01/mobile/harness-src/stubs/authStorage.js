let s = { access: 'expired-access', refresh: 'r1', user: { id: 1, role: 'customer' } };
export async function readSession() { return s; }
export async function saveSession(x) { s = x; }
export async function clearSessionStorage() { s = null; globalThis.__cleared = (globalThis.__cleared||0)+1; }
