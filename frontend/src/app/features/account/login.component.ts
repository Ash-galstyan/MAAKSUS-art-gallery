// frontend/src/app/features/account/login.component.ts
/**
 * Login screen.
 *
 * - ReactiveForms with email + password.
 * - On submit, calls AuthService.login. On success redirects to ?redirect=
 *   if present, otherwise /.
 * - The error interceptor handles the snackbar for known codes (BAD_CREDENTIALS,
 *   ACCOUNT_BLOCKED, RATE_LIMITED).
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  template: `
    <div class="page">
      <div class="auth-card">
        <header class="auth-head">
          <span class="eyebrow">{{ 'auth.login.subtitle' | translate }}</span>
          <h1 class="display-3">{{ 'auth.login.title' | translate }}</h1>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.login.emailLabel' | translate }}</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" required />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.login.passwordLabel' | translate }}</mat-label>
            <input matInput [type]="hidePw() ? 'password' : 'text'" formControlName="password"
                   autocomplete="current-password" required />
            <button mat-icon-button matSuffix type="button" (click)="hidePw.set(!hidePw())"
                    [attr.aria-label]="hidePw() ? 'Show password' : 'Hide password'">
              <mat-icon>{{ hidePw() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <a routerLink="/account/forgot-password" class="muted-link">
            {{ 'auth.login.forgot' | translate }}
          </a>

          <button type="submit" class="btn btn--solid btn--block"
                  [disabled]="form.invalid || submitting()">
            {{ (submitting() ? 'common.loading' : 'auth.login.submit') | translate }}
          </button>
        </form>

        <p class="footer-line">
          {{ 'auth.login.noAccount' | translate }}
          <a routerLink="/account/register">{{ 'auth.login.createOne' | translate }}</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .page { display: flex; justify-content: center; padding: clamp(48px, 9vw, 112px) var(--gutter); }
      .auth-card {
        width: 100%; max-width: 420px;
        border: 1px solid var(--c-line); background: var(--c-paper);
        padding: clamp(28px, 5vw, 44px);
      }
      .auth-head { margin-bottom: 28px; }
      .auth-head h1 { margin-top: 10px; }
      .form { display: flex; flex-direction: column; gap: 14px; }
      .form mat-form-field { width: 100%; }
      .muted-link {
        font-size: 12px; color: var(--c-muted); align-self: flex-end;
        text-decoration: underline; text-underline-offset: 3px;
      }
      .muted-link:hover { color: var(--c-ink); }
      .footer-line { text-align: center; margin-top: 24px; font-size: 13px; color: var(--c-muted); }
      .footer-line a { text-decoration: underline; text-underline-offset: 3px; color: var(--c-ink); }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly hidePw = signal(true);
  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
      this.router.navigateByUrl(redirect);
    } catch {
      /* Error snackbar shown by errorInterceptor */
    } finally {
      this.submitting.set(false);
    }
  }
}
