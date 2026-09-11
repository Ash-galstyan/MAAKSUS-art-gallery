// frontend/src/app/features/account/forgot-password.component.ts
/**
 * Request-reset screen.
 *
 * Always shows the success state after submit, even on error — backend always
 * returns 204 to prevent account enumeration, so we honour the same UX.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
  ],
  template: `
    <div class="page">
      <div class="auth-card">
        @if (!sent()) {
          <header class="auth-head">
            <span class="eyebrow">{{ 'auth.forgot.subtitle' | translate }}</span>
            <h1 class="display-3">{{ 'auth.forgot.title' | translate }}</h1>
          </header>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.forgot.emailLabel' | translate }}</mat-label>
              <input matInput type="email" formControlName="email" required />
            </mat-form-field>

            <button type="submit" class="btn btn--solid btn--block"
                    [disabled]="form.invalid || submitting()">
              {{ (submitting() ? 'common.loading' : 'auth.forgot.submit') | translate }}
            </button>
          </form>
        } @else {
          <header class="auth-head">
            <h1 class="display-3">{{ 'auth.forgot.successTitle' | translate }}</h1>
          </header>
          <p class="body">{{ 'auth.forgot.successBody' | translate }}</p>
          <a routerLink="/account/login" class="btn btn--sm btn--block">
            {{ 'auth.forgot.backToLogin' | translate }}
          </a>
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
    `,
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    try {
      await this.auth.forgotPassword(this.form.getRawValue().email);
    } catch {
      /* Backend always returns 204; if we got here it's a network blip —
         still show success to honour anti-enumeration UX. */
    } finally {
      this.submitting.set(false);
      this.sent.set(true);
    }
  }
}
