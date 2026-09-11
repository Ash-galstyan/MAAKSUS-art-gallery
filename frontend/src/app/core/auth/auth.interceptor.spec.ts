// frontend/src/app/core/auth/auth.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest, type HttpEvent, type HttpHandlerFn } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getAccessToken', 'refresh']);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  function run(req: HttpRequest<unknown>, next: HttpHandlerFn) {
    return TestBed.runInInjectionContext(() => authInterceptor(req, next));
  }

  it('attaches the bearer token and withCredentials when a token is present', async () => {
    auth.getAccessToken.and.returnValue('tok-1');
    const next = jasmine.createSpy<HttpHandlerFn>().and.callFake((r) => of({} as HttpEvent<unknown>));
    const req = new HttpRequest('GET', '/api/artworks');
    await firstValueFrom(run(req, next));
    const sentReq = next.calls.mostRecent().args[0];
    expect(sentReq.headers.get('Authorization')).toBe('Bearer tok-1');
    expect(sentReq.withCredentials).toBeTrue();
  });

  it('omits the Authorization header when there is no token', async () => {
    auth.getAccessToken.and.returnValue(null);
    const next = jasmine.createSpy<HttpHandlerFn>().and.callFake(() => of({} as HttpEvent<unknown>));
    const req = new HttpRequest('GET', '/api/artworks');
    await firstValueFrom(run(req, next));
    const sentReq = next.calls.mostRecent().args[0];
    expect(sentReq.headers.has('Authorization')).toBeFalse();
    expect(sentReq.withCredentials).toBeTrue();
  });

  for (const url of ['/api/auth/refresh', '/api/auth/login', '/api/auth/register']) {
    it(`skips token attachment for ${url}`, async () => {
      auth.getAccessToken.and.returnValue('tok-1');
      const next = jasmine.createSpy<HttpHandlerFn>().and.callFake(() => of({} as HttpEvent<unknown>));
      const req = new HttpRequest('POST', url, {});
      await firstValueFrom(run(req, next));
      const sentReq = next.calls.mostRecent().args[0];
      expect(sentReq.headers.has('Authorization')).toBeFalse();
      expect(sentReq.withCredentials).toBeTrue();
    });
  }

  it('retries once with a new token after a successful refresh on 401', async () => {
    auth.getAccessToken.and.returnValue('stale-tok');
    auth.refresh.and.returnValue(Promise.resolve('fresh-tok'));
    const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    let call = 0;
    const next = jasmine.createSpy<HttpHandlerFn>().and.callFake(() => {
      call++;
      return call === 1 ? throwError(() => err) : of({} as HttpEvent<unknown>);
    });
    const req = new HttpRequest('GET', '/api/cart');
    const result = await firstValueFrom(run(req, next));
    expect(result).toEqual({} as HttpEvent<unknown>);
    expect(auth.refresh).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
    const retriedReq = next.calls.mostRecent().args[0];
    expect(retriedReq.headers.get('Authorization')).toBe('Bearer fresh-tok');
  });

  it('rethrows the original 401 when refresh fails to produce a token', async () => {
    auth.getAccessToken.and.returnValue('stale-tok');
    auth.refresh.and.returnValue(Promise.resolve(null));
    const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('GET', '/api/cart');
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
  });

  it('does not attempt refresh on 401 when there was no token to begin with', async () => {
    auth.getAccessToken.and.returnValue(null);
    const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('GET', '/api/cart');
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('does not attempt refresh on 401 for skip-listed URLs', async () => {
    auth.getAccessToken.and.returnValue('tok-1');
    const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('POST', '/api/auth/login', {});
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('rethrows non-401 errors untouched', async () => {
    auth.getAccessToken.and.returnValue('tok-1');
    const err = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('GET', '/api/cart');
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(auth.refresh).not.toHaveBeenCalled();
  });
});
