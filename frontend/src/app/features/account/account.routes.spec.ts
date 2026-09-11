// frontend/src/app/features/account/account.routes.spec.ts
import { ACCOUNT_ROUTES } from './account.routes';
import { authGuard } from '../../core/auth/auth.guard';

describe('ACCOUNT_ROUTES', () => {
  function byPath(path: string) {
    return ACCOUNT_ROUTES.find((r) => r.path === path);
  }

  it('declares the expected paths', () => {
    expect(ACCOUNT_ROUTES.map((r) => r.path)).toEqual([
      'login',
      'register',
      'forgot-password',
      'reset-password',
      'profile',
    ]);
  });

  it('login lazy-loads LoginComponent', async () => {
    const cmp = await byPath('login')!.loadComponent!();
    const { LoginComponent } = await import('./login.component');
    expect(cmp).toBe(LoginComponent);
  });

  it('register lazy-loads RegisterComponent', async () => {
    const cmp = await byPath('register')!.loadComponent!();
    const { RegisterComponent } = await import('./register.component');
    expect(cmp).toBe(RegisterComponent);
  });

  it('forgot-password lazy-loads ForgotPasswordComponent', async () => {
    const cmp = await byPath('forgot-password')!.loadComponent!();
    const { ForgotPasswordComponent } = await import('./forgot-password.component');
    expect(cmp).toBe(ForgotPasswordComponent);
  });

  it('reset-password lazy-loads ResetPasswordComponent', async () => {
    const cmp = await byPath('reset-password')!.loadComponent!();
    const { ResetPasswordComponent } = await import('./reset-password.component');
    expect(cmp).toBe(ResetPasswordComponent);
  });

  it('profile is guarded by authGuard and lazy-loads ProfileComponent', async () => {
    const route = byPath('profile');
    expect(route?.canActivate).toEqual([authGuard]);
    const cmp = await route!.loadComponent!();
    const { ProfileComponent } = await import('./profile.component');
    expect(cmp).toBe(ProfileComponent);
  });
});
