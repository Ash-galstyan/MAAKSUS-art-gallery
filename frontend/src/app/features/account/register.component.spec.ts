// frontend/src/app/features/account/register.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires email and an 8+ char password; first/last name are optional', () => {
    expect(component.form.valid).toBeFalse();
    component.form.patchValue({ email: 'a@b.com', password: 'short' });
    expect(component.form.valid).toBeFalse();
    component.form.patchValue({ password: 'longenough' });
    expect(component.form.valid).toBeTrue();
  });

  it('does not submit while the form is invalid', async () => {
    await component.onSubmit();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('registers with trimmed-optional names converted to undefined when blank', async () => {
    component.form.setValue({ firstName: '', lastName: '', email: 'a@b.com', password: 'longenough' });
    auth.register.and.returnValue(Promise.resolve());
    await component.onSubmit();
    expect(auth.register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'longenough',
      firstName: undefined,
      lastName: undefined,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('passes through first/last name when provided', async () => {
    component.form.setValue({
      firstName: 'Ash',
      lastName: 'G',
      email: 'a@b.com',
      password: 'longenough',
    });
    auth.register.and.returnValue(Promise.resolve());
    await component.onSubmit();
    expect(auth.register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'longenough',
      firstName: 'Ash',
      lastName: 'G',
    });
  });

  it('resets submitting and does not navigate on failure', async () => {
    component.form.setValue({ firstName: '', lastName: '', email: 'a@b.com', password: 'longenough' });
    auth.register.and.returnValue(Promise.reject(new Error('taken')));
    await component.onSubmit();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.submitting()).toBeFalse();
  });

  it('ignores a second submit while one is already in flight', async () => {
    component.form.setValue({ firstName: '', lastName: '', email: 'a@b.com', password: 'longenough' });
    let resolveFn!: () => void;
    auth.register.and.returnValue(new Promise((resolve) => (resolveFn = () => resolve())));
    const first = component.onSubmit();
    const second = component.onSubmit();
    resolveFn();
    await Promise.all([first, second]);
    expect(auth.register).toHaveBeenCalledTimes(1);
  });

  it('toggles password visibility', () => {
    expect(component.hidePw()).toBeTrue();
    component.hidePw.set(!component.hidePw());
    expect(component.hidePw()).toBeFalse();
  });
});
