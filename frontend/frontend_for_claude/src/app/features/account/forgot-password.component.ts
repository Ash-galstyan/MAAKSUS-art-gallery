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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="page">
      <mat-card class="auth-card">
        @if (!sent()) {
          <mat-card-header>
            <mat-card-title>{{ 'auth.forgot.title' | translate }}</mat-card-title>
            <mat-card-subtitle>{{ 'auth.forgot.subtitle' | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.forgot.emailLabel' | translate }}</mat-label>
                <input matInput type="email" formControlName="email" required />
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit"
                      [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
                } @else {
                  {{ 'auth.forgot.submit' | translate }}
                }
              </button>
            </form>
          </mat-card-content>
        } @else {
          <mat-card-header>
            <mat-card-title>{{ 'auth.forgot.successTitle' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ 'auth.forgot.successBody' | translate }}</p>
            <a mat-button routerLink="/account/login">
              {{ 'auth.forgot.backToLogin' | translate }}
            </a>
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
