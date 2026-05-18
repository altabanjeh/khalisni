import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';

import { authApi } from '../api/auth.api';
import { applyAccessToken, getDisplayError } from '../api/client';
import { clearSessionStorage, readSession, saveSession } from './authStorage';
import { useAuthStore } from '../state/authStore';
import type { LoginPayload } from '../types/auth';

interface AuthContextValue {
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const setSession = useAuthStore((state) => state.setSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  const value = useMemo<AuthContextValue>(() => ({
    async signIn(payload) {
      const session = await authApi.login(payload);
      setSession(session);
      applyAccessToken(session.access);
      await saveSession(session);
    },
    async signOut() {
      const refresh = useAuthStore.getState().tokens?.refresh;
      try {
        if (refresh) {
          await authApi.logout(refresh);
        }
      } catch {
        // Ignore logout transport failures and clear local state anyway.
      }
      await clearSessionStorage();
      applyAccessToken(null);
      clearSession();
    },
    async restore() {
      const session = await readSession();
      if (!session) {
        applyAccessToken(null);
        clearSession();
        setBootstrapped();
        return;
      }
      setSession(session);
      applyAccessToken(session.access);
      try {
        const user = await authApi.me();
        updateUser(user);
        await saveSession({ ...session, user });
      } catch {
        await clearSessionStorage();
        applyAccessToken(null);
        clearSession();
      } finally {
        setBootstrapped();
      }
    },
    async refreshCurrentUser() {
      try {
        const user = await authApi.me();
        updateUser(user);
        const current = await readSession();
        if (current) {
          await saveSession({ ...current, user });
        }
      } catch (error) {
        throw new Error(getDisplayError(error));
      }
    },
  }), [clearSession, setBootstrapped, setSession, updateUser]);

  useEffect(() => {
    void value.restore();
  }, [value]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
