// frontend/src/app/core/api-models/user.model.ts
export type UserRole = 'USER' | 'ADMIN';
export type Locale = 'EN' | 'HY' | 'RU';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  locale: Locale;
}

export interface MeResponse {
  user: AuthUser & { phone?: string | null; status?: 'ACTIVE' | 'BLOCKED' };
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
