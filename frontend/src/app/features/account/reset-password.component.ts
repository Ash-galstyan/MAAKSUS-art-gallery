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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  template: `
    <div class="page">
      <div class="auth-card">
        @if (!token()) {
          <p class="error">{{ 'auth.reset.missingToken' | translate }}</p>
          <a routerLink="/account/forgot-password" class="btn btn--sm btn--block">
            {{ 'auth.forgot.title' | translate }}
          </a>
        } @else if (success()) {
          <header class="auth-head">
            <h1 class="display-3">{{ 'auth.reset.successTitle' | translate }}</h1>
          </header>
          <p class="body">{{ 'auth.reset.successBody' | translate }}</p>
          <a routerLink="/account/login" class="btn btn--solid btn--block">
            {{ 'auth.reset.goToLogin' | translate }}
          </a>
        } @else {
          <header class="auth-head">
            <span class="eyebrow">{{ 'auth.reset.subtitle' | translate }}</span>
            <h1 class="display-3">{{ 'auth.reset.title' | translate }}</h1>
          </header>
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

            <button type="submit" class="btn btn--solid btn--block"
                    [disabled]="form.invalid || submitting()">
              {{ (submitting() ? 'common.loading' : 'auth.reset.submit') | translate }}
            </button>
          </form>
        }
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
      .auth-head { margin-bottom: 24px; }
      .auth-head h1 { margin-top: 10px; }
      .form { display: flex; flex-direction: column; gap: 14px; }
      .form mat-form-field { width: 100%; }
      .body { color: var(--c-muted); font-size: 14px; line-height: 1.7; margin: 0 0 22px; }
      .error { color: var(--mat-sys-error); margin: 0 0 20px; font-size: 14px; }
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
