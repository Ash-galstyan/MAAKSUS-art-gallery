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
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="page">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>{{ 'auth.login.title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'auth.login.subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
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

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="form.invalid || submitting()">
              @if (submitting()) {
                <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
              } @else {
                {{ 'auth.login.submit' | translate }}
              }
            </button>
          </form>

          <p class="footer-line">
            {{ 'auth.login.noAccount' | translate }}
            <a routerLink="/account/register">{{ 'auth.login.createOne' | translate }}</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page { display: flex; justify-content: center; padding: 48px 16px; }
      .auth-card { width: 100%; max-width: 420px; }
      .form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
      .muted-link { font-size: 13px; color: rgba(0, 0, 0, 0.6); align-self: flex-end; }
      .footer-line { text-align: center; margin-top: 16px; }
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
