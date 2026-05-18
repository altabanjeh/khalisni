import type { User } from './user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface StoredSession extends LoginResponse {}
