// frontend/src/app/core/auth/role.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, type RouterStateSnapshot, type ActivatedRouteSnapshot } from '@angular/router';
import { adminGuard } from './role.guard';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const urlTree = {} as ReturnType<Router['createUrlTree']>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(urlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run() {
    return TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('allows navigation for admins', () => {
    auth.isAdmin.and.returnValue(true);
    expect(run()).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects non-admins to the home page', () => {
    auth.isAdmin.and.returnValue(false);
    const result = run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toBe(urlTree);
  });
});
