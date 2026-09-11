// frontend/src/app/core/http/error.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest, type HttpEvent, type HttpHandlerFn } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, firstValueFrom } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { I18nService } from '../i18n/i18n.service';

describe('errorInterceptor', () => {
  let snack: jasmine.SpyObj<MatSnackBar>;
  let i18n: jasmine.SpyObj<I18nService>;

  beforeEach(() => {
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    i18n = jasmine.createSpyObj<I18nService>('I18nService', ['t']);
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snack },
        { provide: I18nService, useValue: i18n },
      ],
    });
  });

  function run(req: HttpRequest<unknown>, next: HttpHandlerFn) {
    return TestBed.runInInjectionContext(() => errorInterceptor(req, next));
  }

  it('passes through successful responses without touching the snackbar', async () => {
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(of({} as HttpEvent<unknown>));
    const req = new HttpRequest('GET', '/api/artworks');
    await firstValueFrom(run(req, next));
    expect(snack.open).not.toHaveBeenCalled();
  });

  it('ignores 401s so the auth interceptor can handle them', async () => {
    const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('GET', '/api/cart');
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(snack.open).not.toHaveBeenCalled();
  });

  it('shows the localised message when a translation exists for the error code', async () => {
    i18n.t.and.callFake((key: string) =>
      key === 'errors.VALIDATION_ERROR' ? 'Please check your input' : key === 'common.dismiss' ? 'Dismiss' : key,
    );
    const err = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { error: { code: 'VALIDATION_ERROR', message: 'raw server message' } },
    });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('POST', '/api/orders', {});
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(snack.open).toHaveBeenCalledWith('Please check your input', 'Dismiss', { duration: 4000 });
  });

  it('falls back to the server message when no translation exists for the code', async () => {
    i18n.t.and.callFake((key: string) => (key === 'common.dismiss' ? 'Dismiss' : key));
    const err = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { error: { code: 'WEIRD_CODE', message: 'raw server message' } },
    });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('POST', '/api/orders', {});
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(snack.open).toHaveBeenCalledWith('raw server message', 'Dismiss', { duration: 4000 });
  });

  it('falls back to the generic message when there is no code and no server message', async () => {
    i18n.t.and.callFake((key: string) => (key === 'errors.GENERIC' ? 'Something went wrong' : key === 'common.dismiss' ? 'Dismiss' : key));
    const err = new HttpErrorResponse({ status: 500, statusText: 'Server Error', error: {} });
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('GET', '/api/orders');
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(snack.open).toHaveBeenCalledWith('Something went wrong', 'Dismiss', { duration: 4000 });
  });

  it('rethrows non-HttpErrorResponse errors without touching the snackbar', async () => {
    const err = new Error('boom');
    const next = jasmine.createSpy<HttpHandlerFn>().and.returnValue(throwError(() => err));
    const req = new HttpRequest('GET', '/api/orders');
    await expectAsync(firstValueFrom(run(req, next))).toBeRejectedWith(err);
    expect(snack.open).not.toHaveBeenCalled();
  });
});
