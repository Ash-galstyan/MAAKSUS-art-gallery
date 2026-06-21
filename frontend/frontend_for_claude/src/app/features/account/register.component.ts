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
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
          <mat-card-title>{{ 'auth.register.title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'auth.register.subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
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

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="form.invalid || submitting()">
              @if (submitting()) {
                <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
              } @else {
                {{ 'auth.register.submit' | translate }}
              }
            </button>
          </form>

          <p class="footer-line">
            {{ 'auth.register.haveAccount' | translate }}
            <a routerLink="/account/login">{{ 'auth.register.logIn' | translate }}</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page { display: flex; justify-content: center; padding: 48px 16px; }
      .auth-card { width: 100%; max-width: 480px; }
      .form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .footer-line { text-align: center; margin-top: 16px; }
      @media (max-width: 480px) {
        .row { grid-template-columns: 1fr; }
      }
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
