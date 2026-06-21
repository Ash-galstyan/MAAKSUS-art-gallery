// frontend/src/app/core/auth/auth.service.ts
/**
 * Auth state + flows.
 *
 * State (signals):
 *   - currentUser()      : AuthUser | null
 *   - isAuthenticated()  : boolean
 *   - isAdmin()          : boolean
 *
 * Methods:
 *   - register / login / logout / forgotPassword / resetPassword
 *   - refresh()          : returns a promise resolving to the new access token,
 *                          or null if refresh fails. Single-flight: concurrent
 *                          callers share the same in-flight refresh.
 *   - hydrate()          : called once at bootstrap. Tries /me with whatever
 *                          access token might still be valid; on 401, tries
 *                          a refresh; on failure, leaves user unauthenticated.
 *
 * The access token lives in memory only. The refresh token is in an httpOnly
 * cookie the JS can't read, so XSS can't lift the long-lived credential.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import type { AuthResponse, AuthUser, MeResponse } from '../api-models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  /** Single-flight refresh promise — avoids stampede when many requests 401 at once. */
  private refreshInFlight: Promise<string | null> | null = null;

  getAccessToken(): string | null {
    return this._accessToken();
  }

  private setAuth(token: string, user: AuthUser): void {
    this._accessToken.set(token);
    this._user.set(user);
  }

  private clearAuth(): void {
    this._accessToken.set(null);
    this._user.set(null);
  }

  async register(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, input, {
        withCredentials: true,
      }),
    );
    this.setAuth(resp.accessToken, resp.user);
  }

  async login(email: string, password: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${environment.apiBaseUrl}/auth/login`,
        { email, password },
        { withCredentials: true },
      ),
    );
    this.setAuth(resp.accessToken, resp.user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/logout`, null, { withCredentials: true }),
      );
    } finally {
      this.clearAuth();
      this.router.navigate(['/']);
    }
  }

  forgotPassword(email: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/auth/forgot-password`, { email }),
    );
  }

  resetPassword(token: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/auth/reset-password`, { token, newPassword }),
    );
  }

  /**
   * Called by the interceptor when a request 401s. Multiple concurrent
   * 401s share the same in-flight refresh; on success they all retry with
   * the new token.
   */
  refresh(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const resp = await firstValueFrom(
          this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/refresh`, null, {
            withCredentials: true,
          }),
        );
        this.setAuth(resp.accessToken, resp.user);
        return resp.accessToken;
      } catch {
        this.clearAuth();
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  /** Bootstrap: silently try to restore session via the refresh cookie. */
  async hydrate(): Promise<void> {
    const token = await this.refresh();
    if (!token) return;
    // Fetch fresh profile data (covers locale/role changes since last login).
    try {
      const me = await firstValueFrom(
        this.http.get<MeResponse>(`${environment.apiBaseUrl}/auth/me`),
      );
      this._user.set(me.user as AuthUser);
    } catch {
      this.clearAuth();
    }
  }
}
