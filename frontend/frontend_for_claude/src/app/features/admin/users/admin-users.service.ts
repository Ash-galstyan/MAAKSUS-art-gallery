// frontend/src/app/features/admin/users/admin-users.service.ts
/**
 * Admin Users HTTP service.
 *
 * Endpoints:
 *   GET   /api/users/admin
 *   GET   /api/users/admin/:id
 *   PATCH /api/users/admin/:id/status    body: { status: 'ACTIVE' | 'BLOCKED' }
 *
 * There is intentionally NO admin create/delete here. Self-registration is
 * the only path in; deleting users would break foreign keys to orders. Use
 * block (status=BLOCKED) instead — it revokes refresh tokens server-side
 * so the user is logged out everywhere immediately.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  locale: 'EN' | 'HY' | 'RU';
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number };
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly api = inject(ApiService);

  list(): Promise<AdminUser[]> {
    return this.api.get<AdminUser[]>('/users/admin');
  }

  detail(id: string): Promise<AdminUser> {
    return this.api.get<AdminUser>(`/users/admin/${encodeURIComponent(id)}`);
  }

  setStatus(id: string, status: UserStatus): Promise<AdminUser> {
    return this.api.patch<{ status: UserStatus }, AdminUser>(
      `/users/admin/${encodeURIComponent(id)}/status`,
      { status },
    );
  }
}