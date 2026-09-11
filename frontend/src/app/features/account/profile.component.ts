// frontend/src/app/features/account/profile.component.ts
/**
 * Profile page (/account/profile) — STUB.
 *
 * What's implemented:
 *   ✅ Auth guard (in account.routes.ts).
 *   ✅ Page scaffold with three sections: profile info, change password,
 *      order history.
 *   ✅ Layout + i18n + types.
 *
 * TODO Phase 9 completion:
 *   - Profile info section:
 *       GET  /api/auth/me           → fill firstName/lastName/phone/email/locale
 *       PATCH /api/users/me         → save changes (form below)
 *     Validate phone format minimally; backend caps lengths.
 *
 *   - Change password section:
 *       POST /api/users/me/change-password
 *         body: { currentPassword, newPassword }
 *       Show snackbar on success; backend revokes all refresh tokens so the
 *       NEXT request will trigger a refresh-and-fail loop — best UX is to
 *       call authService.logout() immediately after and route to /account/login
 *       with a "password updated, please log in" message.
 *
 *   - Order history section:
 *       GET /api/orders             → list user's own orders
 *       Render a table with: orderNumber, createdAt, status chip, total, link
 *       to /order/:id/confirmation (works for any status — that page handles
 *       the non-PAID case gracefully).
 *
 *   - Logout button: call authService.logout(); router handles redirect.
 *
 * The handlers below are placeholder stubs to keep the page rendering.
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
  ],
  template: `
    <div class="page wrap">
      <header class="page-header">
        <div>
          <span class="eyebrow">{{ 'nav.account' | translate }}</span>
          <h1 class="display-2">{{ 'profile.title' | translate }}</h1>
        </div>
        <button type="button" class="btn btn--sm" (click)="logout()">
          {{ 'nav.logout' | translate }}
        </button>
      </header>

      <div class="grid">
        <!-- ─── Profile info ──────────────────────────────────────────── -->
        <section class="panel">
          <h2 class="block__title">{{ 'profile.info.title' | translate }}</h2>
          <p class="note">{{ 'profile.info.todo' | translate }}</p>
          <form [formGroup]="profileForm" class="form">
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.register.firstNameLabel' | translate }}</mat-label>
                <input matInput formControlName="firstName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'auth.register.lastNameLabel' | translate }}</mat-label>
                <input matInput formControlName="lastName" />
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'checkout.shipping.phone' | translate }}</mat-label>
              <input matInput formControlName="phone" />
            </mat-form-field>
            <button type="button" class="btn btn--sm" (click)="saveProfile()" [disabled]="true">
              {{ 'common.save' | translate }}
            </button>
          </form>
        </section>

        <!-- ─── Change password ───────────────────────────────────────── -->
        <section class="panel">
          <h2 class="block__title">{{ 'profile.password.title' | translate }}</h2>
          <p class="note">{{ 'profile.password.todo' | translate }}</p>
          <form [formGroup]="passwordForm" class="form">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'profile.password.current' | translate }}</mat-label>
              <input matInput type="password" formControlName="currentPassword" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'profile.password.new' | translate }}</mat-label>
              <input matInput type="password" formControlName="newPassword" />
            </mat-form-field>
            <button type="button" class="btn btn--sm" (click)="changePassword()" [disabled]="true">
              {{ 'profile.password.submit' | translate }}
            </button>
          </form>
        </section>

        <!-- ─── Order history ─────────────────────────────────────────── -->
        <section class="panel orders-card">
          <h2 class="block__title">{{ 'profile.orders.title' | translate }}</h2>
          <p class="note">{{ 'profile.orders.empty' | translate }}</p>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .page { padding-block: clamp(32px, 5vw, 56px) clamp(56px, 9vw, 112px); }
      .page-header {
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 16px; margin-bottom: clamp(28px, 4vw, 48px);
      }
      .page-header h1 { margin-top: 10px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background: var(--c-line); border: 1px solid var(--c-line); }
      .orders-card { grid-column: 1 / -1; }
      @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
      .panel { background: var(--c-paper); padding: 28px; }
      .block__title {
        font-family: var(--font-sans); font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
        color: var(--c-muted); margin: 0 0 12px;
      }
      .note { font-size: 13px; color: var(--c-muted); line-height: 1.6; margin: 0 0 20px; }
      .form { display: flex; flex-direction: column; gap: 10px; }
      .form mat-form-field { width: 100%; }
      .form .btn { align-self: flex-start; margin-top: 6px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly saving = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    phone: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  // TODO: PATCH /api/users/me
  saveProfile(): void { /* TODO */ }

  // TODO: POST /api/users/me/change-password, then auth.logout() + route to login
  changePassword(): void { /* TODO */ }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
