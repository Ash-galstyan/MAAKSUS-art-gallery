// frontend/src/app/features/account/reset-password.component.ts
/**
 * Reset-password screen.
 *
 * Reads ?token=… from the query (set by the email link). If absent or invalid,
 * shows the "missing token" message. On success, redirects user to /account/login
 * after a moment.
 *
 * Includes a cross-field validator that ensures the confirm field matches.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const cf = group.get('confirm')?.value;
  return pw && cf && pw !== cf ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
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
        @if (!token()) {
          <mat-card-content>
            <p class="error">{{ 'auth.reset.missingToken' | translate }}</p>
            <a mat-button routerLink="/account/forgot-password">
              {{ 'auth.forgot.title' | translate }}
            </a>
          </mat-card-content>
        } @else if (success()) {
          <mat-card-header>
            <mat-card-title>{{ 'auth.reset.successTitle' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ 'auth.reset.successBody' | translate }}</p>
            <a mat-flat-button color="primary" routerLink="/account/login">
              {{ 'auth.reset.goToLogin' | translate }}
            </a>
          </mat-card-content>
        } @else {
          <mat-card-header>
            <mat-card-title>{{ 'auth.reset.title' | translate }}</mat-card-title>
            <mat-card-subtitle>{{ 'auth.reset.subtitle' | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.reset.newPasswordLabel' | translate }}</mat-label>
                <input matInput [type]="hidePw() ? 'password' : 'text'"
                       formControlName="newPassword" autocomplete="new-password" required />
                <button mat-icon-button matSuffix type="button" (click)="hidePw.set(!hidePw())">
                  <mat-icon>{{ hidePw() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.reset.confirmLabel' | translate }}</mat-label>
                <input matInput [type]="hidePw() ? 'password' : 'text'"
                       formControlName="confirm" autocomplete="new-password" required />
                @if (form.errors?.['mismatch'] && form.get('confirm')?.touched) {
                  <mat-error>{{ 'auth.reset.mismatch' | translate }}</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit"
                      [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
                } @else {
                  {{ 'auth.reset.submit' | translate }}
                }
              </button>
            </form>
          </mat-card-content>
        }
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page { display: flex; justify-content: center; padding: 48px 16px; }
      .auth-card { width: 100%; max-width: 420px; }
      .form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
      .error { color: #c00; }
    `,
  ],
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = signal(this.route.snapshot.queryParamMap.get('token'));
  readonly hidePw = signal(true);
  readonly submitting = signal(false);
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: matchPasswords },
  );

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting() || !this.token()) return;
    this.submitting.set(true);
    try {
      await this.auth.resetPassword(this.token()!, this.form.getRawValue().newPassword);
      this.success.set(true);
    } catch {
      /* errorInterceptor surfaces RESET_INVALID etc. */
    } finally {
      this.submitting.set(false);
    }
  }
}
