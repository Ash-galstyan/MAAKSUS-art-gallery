// frontend/src/app/features/account/register.component.ts
/**
 * Registration screen.
 *
 * Calls AuthService.register; on success the user is already authenticated
 * (backend returns access token + sets refresh cookie). Redirects to /.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-register',
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
          <span class="eyebrow">{{ 'auth.register.subtitle' | translate }}</span>
          <h1 class="display-3">{{ 'auth.register.title' | translate }}</h1>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.register.firstNameLabel' | translate }}</mat-label>
              <input matInput formControlName="firstName" autocomplete="given-name" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'auth.register.lastNameLabel' | translate }}</mat-label>
              <input matInput formControlName="lastName" autocomplete="family-name" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.register.emailLabel' | translate }}</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" required />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.register.passwordLabel' | translate }}</mat-label>
            <input matInput [type]="hidePw() ? 'password' : 'text'" formControlName="password"
                   autocomplete="new-password" required />
            <button mat-icon-button matSuffix type="button" (click)="hidePw.set(!hidePw())">
              <mat-icon>{{ hidePw() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>{{ 'auth.register.passwordHint' | translate }}</mat-hint>
          </mat-form-field>

          <button type="submit" class="btn btn--solid btn--block"
                  [disabled]="form.invalid || submitting()">
            {{ (submitting() ? 'common.loading' : 'auth.register.submit') | translate }}
          </button>
        </form>

        <p class="footer-line">
          {{ 'auth.register.haveAccount' | translate }}
          <a routerLink="/account/login">{{ 'auth.register.logIn' | translate }}</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .page { display: flex; justify-content: center; padding: clamp(48px, 9vw, 112px) var(--gutter); }
      .auth-card {
        width: 100%; max-width: 460px;
        border: 1px solid var(--c-line); background: var(--c-paper);
        padding: clamp(28px, 5vw, 44px);
      }
      .auth-head { margin-bottom: 28px; }
      .auth-head h1 { margin-top: 10px; }
      .form { display: flex; flex-direction: column; gap: 14px; }
      .form mat-form-field { width: 100%; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .footer-line { text-align: center; margin-top: 24px; font-size: 13px; color: var(--c-muted); }
      .footer-line a { text-decoration: underline; text-underline-offset: 3px; color: var(--c-ink); }
      @media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
    `,
  ],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly hidePw = signal(true);
  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    try {
      const raw = this.form.getRawValue();
      await this.auth.register({
        email: raw.email,
        password: raw.password,
        firstName: raw.firstName || undefined,
        lastName: raw.lastName || undefined,
      });
      this.router.navigateByUrl('/');
    } catch {
      /* errorInterceptor handles user-facing message */
    } finally {
      this.submitting.set(false);
    }
  }
}
