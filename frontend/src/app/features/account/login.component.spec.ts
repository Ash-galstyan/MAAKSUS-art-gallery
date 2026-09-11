// frontend/src/app/features/account/login.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  let queryParamMap: ReturnType<typeof convertToParamMap>;

  function setup(queryParams: Record<string, string> = {}) {
    TestBed.resetTestingModule();
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    queryParamMap = convertToParamMap(queryParams);
    const i18nStub = {
      locale: signal('en'),
      t: (key: string) => key,
    } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: i18nStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (k: string) => queryParamMap.get(k) } } },
        },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(setup);

  it('creates with an invalid, empty form', () => {
    expect(component.form.valid).toBeFalse();
  });

  it('does not submit while the form is invalid', async () => {
    await component.onSubmit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in and navigates to "/" when there is no redirect param', async () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret' });
    auth.login.and.returnValue(Promise.resolve());
    await component.onSubmit();
    expect(auth.login).toHaveBeenCalledWith('a@b.com', 'secret');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(component.submitting()).toBeFalse();
  });

  it('navigates to the redirect query param when present', async () => {
    setup({ redirect: '/cart' });
    component.form.setValue({ email: 'a@b.com', password: 'secret' });
    auth.login.and.returnValue(Promise.resolve());
    await component.onSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  });

  it('resets submitting and does not navigate when login rejects', async () => {
    component.form.setValue({ email: 'a@b.com', password: 'wrong' });
    auth.login.and.returnValue(Promise.reject(new Error('bad creds')));
    await component.onSubmit();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.submitting()).toBeFalse();
  });

  it('ignores a second submit while one is already in flight', async () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret' });
    let resolveLogin!: () => void;
    auth.login.and.returnValue(new Promise((resolve) => (resolveLogin = () => resolve())));
    const first = component.onSubmit();
    const second = component.onSubmit();
    resolveLogin();
    await Promise.all([first, second]);
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('toggles password visibility', () => {
    expect(component.hidePw()).toBeTrue();
    component.hidePw.set(!component.hidePw());
    expect(component.hidePw()).toBeFalse();
  });
});
