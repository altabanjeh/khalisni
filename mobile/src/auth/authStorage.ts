import * as SecureStore from 'expo-secure-store';

import type { StoredSession } from '../types/auth';

const SESSION_KEY = 'khalsni.mobile.session';

export async function saveSession(session: StoredSession) {
  const { user, ...tokens } = session;
  const { permissions: _permissions, ...userWithoutPermissions } = user ?? ({} as any);
  const slim = { ...tokens, user: userWithoutPermissions };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(slim));
}

export async function readSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function clearSessionStorage() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
