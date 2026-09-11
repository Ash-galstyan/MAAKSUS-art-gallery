// frontend/src/app/features/account/forgot-password.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not submit while the form is invalid', async () => {
    await component.onSubmit();
    expect(auth.forgotPassword).not.toHaveBeenCalled();
    expect(component.sent()).toBeFalse();
  });

  it('shows the success state after a successful request', async () => {
    component.form.setValue({ email: 'a@b.com' });
    auth.forgotPassword.and.returnValue(Promise.resolve());
    await component.onSubmit();
    expect(auth.forgotPassword).toHaveBeenCalledWith('a@b.com');
    expect(component.sent()).toBeTrue();
    expect(component.submitting()).toBeFalse();
  });

  it('still shows the success state when the request fails (anti-enumeration UX)', async () => {
    component.form.setValue({ email: 'a@b.com' });
    auth.forgotPassword.and.returnValue(Promise.reject(new Error('network blip')));
    await component.onSubmit();
    expect(component.sent()).toBeTrue();
  });

  it('ignores a second submit while one is already in flight', async () => {
    component.form.setValue({ email: 'a@b.com' });
    let resolveFn!: () => void;
    auth.forgotPassword.and.returnValue(new Promise((resolve) => (resolveFn = () => resolve())));
    const first = component.onSubmit();
    const second = component.onSubmit();
    resolveFn();
    await Promise.all([first, second]);
    expect(auth.forgotPassword).toHaveBeenCalledTimes(1);
  });

  it('renders the request form before submit and the success panel after', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('form')).toBeTruthy();

    component.sent.set(true);
    fixture.detectChanges();
    expect(el.querySelector('form')).toBeFalsy();
    expect(el.querySelector('a[routerLink="/account/login"]')).toBeTruthy();
  });
});
