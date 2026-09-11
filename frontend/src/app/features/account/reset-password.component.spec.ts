// frontend/src/app/features/account/reset-password.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let auth: jasmine.SpyObj<AuthService>;

  function setup(token: string | null) {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;
    const paramMap = convertToParamMap(token ? { token } : {});

    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: i18nStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows the missing-token message when there is no token in the URL', () => {
    setup(null);
    expect(component.token()).toBeNull();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.error')).toBeTruthy();
    expect(el.querySelector('form')).toBeFalsy();
  });

  it('does not submit when there is no token, even with a "valid" form', async () => {
    setup(null);
    component.form.setValue({ newPassword: 'longenough', confirm: 'longenough' });
    await component.onSubmit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('flags a mismatch between newPassword and confirm', () => {
    setup('tok-1');
    component.form.setValue({ newPassword: 'longenough', confirm: 'different' });
    expect(component.form.errors?.['mismatch']).toBeTrue();
    expect(component.form.invalid).toBeTrue();
  });

  it('is valid once both fields match and meet length requirements', () => {
    setup('tok-1');
    component.form.setValue({ newPassword: 'longenough', confirm: 'longenough' });
    expect(component.form.valid).toBeTrue();
  });

  it('submits the token and new password, then shows success', async () => {
    setup('tok-1');
    component.form.setValue({ newPassword: 'longenough', confirm: 'longenough' });
    auth.resetPassword.and.returnValue(Promise.resolve());
    await component.onSubmit();
    expect(auth.resetPassword).toHaveBeenCalledWith('tok-1', 'longenough');
    expect(component.success()).toBeTrue();
    expect(component.submitting()).toBeFalse();
  });

  it('does not flip to success when the request fails', async () => {
    setup('tok-1');
    component.form.setValue({ newPassword: 'longenough', confirm: 'longenough' });
    auth.resetPassword.and.returnValue(Promise.reject(new Error('invalid token')));
    await component.onSubmit();
    expect(component.success()).toBeFalse();
    expect(component.submitting()).toBeFalse();
  });

  it('ignores a second submit while one is already in flight', async () => {
    setup('tok-1');
    component.form.setValue({ newPassword: 'longenough', confirm: 'longenough' });
    let resolveFn!: () => void;
    auth.resetPassword.and.returnValue(new Promise((resolve) => (resolveFn = () => resolve())));
    const first = component.onSubmit();
    const second = component.onSubmit();
    resolveFn();
    await Promise.all([first, second]);
    expect(auth.resetPassword).toHaveBeenCalledTimes(1);
  });

  it('toggles password visibility', () => {
    setup('tok-1');
    expect(component.hidePw()).toBeTrue();
    component.hidePw.set(!component.hidePw());
    expect(component.hidePw()).toBeFalse();
  });
});
