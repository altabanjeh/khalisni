import { create } from 'zustand';

import { normalizeRole, type AppRole } from '../constants/roles';
import type { AuthTokens, LoginResponse } from '../types/auth';
import type { User } from '../types/user';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  tokens: AuthTokens | null;
  user: User | null;
  role: AppRole | null;
  setSession: (session: LoginResponse) => void;
  updateUser: (user: User) => void;
  setBootstrapped: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  tokens: null,
  user: null,
  role: null,
  setSession: (session) =>
    set({
      status: 'authenticated',
      tokens: { access: session.access, refresh: session.refresh },
      user: session.user,
      role: normalizeRole(session.user.role),
    }),
  updateUser: (user) =>
    set((state) => ({
      user,
      role: normalizeRole(user.role),
      status: state.tokens ? 'authenticated' : state.status,
    })),
  setBootstrapped: () =>
    set((state) => ({
      status: state.tokens && state.user ? 'authenticated' : 'unauthenticated',
    })),
  clearSession: () =>
    set({
      status: 'unauthenticated',
      tokens: null,
      user: null,
      role: null,
    }),
}));
