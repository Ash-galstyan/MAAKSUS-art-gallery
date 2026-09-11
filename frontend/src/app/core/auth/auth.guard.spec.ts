// frontend/src/app/core/auth/auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, type RouterStateSnapshot, type ActivatedRouteSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const urlTree = {} as ReturnType<Router['createUrlTree']>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(urlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('allows navigation when authenticated', () => {
    auth.isAuthenticated.and.returnValue(true);
    expect(run('/cart')).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to login with the intended URL when not authenticated', () => {
    auth.isAuthenticated.and.returnValue(false);
    const result = run('/account/profile');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/account/login'], {
      queryParams: { redirect: '/account/profile' },
    });
    expect(result).toBe(urlTree);
  });
});
