// frontend/src/app/core/auth/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import type { AuthResponse, AuthUser, MeResponse } from '../api-models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const user: AuthUser = {
    id: 'u1',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    role: 'USER',
    locale: 'EN',
  };
  const authResp: AuthResponse = { accessToken: 'tok-1', user };

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts unauthenticated with no user and no admin', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.isAdmin()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
  });

  describe('register', () => {
    it('sets auth state from the response', async () => {
      const promise = service.register({ email: 'a@b.com', password: 'pw' });
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush(authResp);
      await promise;
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.getAccessToken()).toBe('tok-1');
      expect(service.currentUser()).toEqual(user);
    });
  });

  describe('login', () => {
    it('posts credentials and sets auth state', async () => {
      const promise = service.login('a@b.com', 'pw');
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'a@b.com', password: 'pw' });
      req.flush(authResp);
      await promise;
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('propagates errors and leaves state unauthenticated', async () => {
      const promise = service.login('a@b.com', 'wrong');
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
      req.flush({ error: { code: 'BAD_CREDENTIALS', message: 'no' } }, { status: 401, statusText: 'Unauthorized' });
      await expectAsync(promise).toBeRejected();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('isAdmin', () => {
    it('is true only when the current user has role ADMIN', async () => {
      const admin: AuthUser = { ...user, role: 'ADMIN' };
      const promise = service.login('a@b.com', 'pw');
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({ accessToken: 't', user: admin });
      await promise;
      expect(service.isAdmin()).toBeTrue();
    });
  });

  describe('logout', () => {
    it('clears auth and navigates home even when the request succeeds', async () => {
      const loginPromise = service.login('a@b.com', 'pw');
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(authResp);
      await loginPromise;

      const logoutPromise = service.logout();
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
      req.flush(null);
      await logoutPromise;

      expect(service.isAuthenticated()).toBeFalse();
      expect(service.getAccessToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('clears auth and navigates home even when the request fails', async () => {
      const loginPromise = service.login('a@b.com', 'pw');
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(authResp);
      await loginPromise;

      const logoutPromise = service.logout();
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
      req.flush({ error: { code: 'SERVER', message: 'boom' } }, { status: 500, statusText: 'Error' });
      // logout() has no catch — the finally block still runs, but the
      // rejection propagates once it does.
      await expectAsync(logoutPromise).toBeRejected();

      expect(service.isAuthenticated()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('forgotPassword posts the email without credentials flag', async () => {
      const promise = service.forgotPassword('a@b.com');
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password`);
      expect(req.request.body).toEqual({ email: 'a@b.com' });
      req.flush(null);
      await promise;
    });

    it('resetPassword posts the token and new password', async () => {
      const promise = service.resetPassword('tok', 'newpw');
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/reset-password`);
      expect(req.request.body).toEqual({ token: 'tok', newPassword: 'newpw' });
      req.flush(null);
      await promise;
    });
  });

  describe('refresh', () => {
    it('sets auth state and returns the new token on success', async () => {
      const promise = service.refresh();
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
      expect(req.request.withCredentials).toBeTrue();
      req.flush(authResp);
      const token = await promise;
      expect(token).toBe('tok-1');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('clears auth and returns null on failure', async () => {
      const promise = service.refresh();
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
      req.flush({ error: { code: 'NO_SESSION', message: 'no' } }, { status: 401, statusText: 'Unauthorized' });
      const token = await promise;
      expect(token).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('shares one in-flight request across concurrent callers', async () => {
      const p1 = service.refresh();
      const p2 = service.refresh();
      expect(p1).toBe(p2);
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
      req.flush(authResp);
      await Promise.all([p1, p2]);
    });

    it('allows a fresh refresh after the previous one settles', async () => {
      const p1 = service.refresh();
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`).flush(authResp);
      await p1;

      const p2 = service.refresh();
      expect(p2).not.toBe(p1);
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`).flush(authResp);
      await p2;
    });
  });

  describe('hydrate', () => {
    it('does nothing further when refresh fails', async () => {
      const promise = service.hydrate();
      httpMock
        .expectOne(`${environment.apiBaseUrl}/auth/refresh`)
        .flush({ error: { code: 'NO_SESSION', message: 'no' } }, { status: 401, statusText: 'Unauthorized' });
      await promise;
      httpMock.verify();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('fetches /auth/me and sets the user on refresh success', async () => {
      const promise = service.hydrate();
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`).flush(authResp);
      // Let the refresh()/hydrate() await chain unwind before the /auth/me
      // request is actually issued.
      await new Promise((resolve) => setTimeout(resolve));
      const meResp: MeResponse = { user: { ...user, phone: null, status: 'ACTIVE' } };
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`).flush(meResp);
      await promise;
      expect(service.currentUser()).toEqual(meResp.user as AuthUser);
    });

    it('clears auth when /auth/me fails after a successful refresh', async () => {
      const promise = service.hydrate();
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`).flush(authResp);
      await new Promise((resolve) => setTimeout(resolve));
      httpMock
        .expectOne(`${environment.apiBaseUrl}/auth/me`)
        .flush({ error: { code: 'SERVER', message: 'boom' } }, { status: 500, statusText: 'Error' });
      await promise;
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.getAccessToken()).toBeNull();
    });
  });
});
