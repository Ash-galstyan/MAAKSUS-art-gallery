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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
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
      <header class="page-header">
        <h1>{{ 'profile.title' | translate }}</h1>
        <button mat-stroked-button (click)="logout()">
          <mat-icon>logout</mat-icon>
          {{ 'nav.logout' | translate }}
        </button>
      </header>

      <div class="grid">
        <!-- ─── Profile info ──────────────────────────────────────────── -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ 'profile.info.title' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="todo-block">
              {{ 'profile.info.todo' | translate }}
            </div>
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
              <button mat-flat-button color="primary" (click)="saveProfile()" [disabled]="true">
                {{ 'common.save' | translate }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- ─── Change password ───────────────────────────────────────── -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ 'profile.password.title' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="todo-block">
              {{ 'profile.password.todo' | translate }}
            </div>
            <form [formGroup]="passwordForm" class="form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'profile.password.current' | translate }}</mat-label>
                <input matInput type="password" formControlName="currentPassword" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'profile.password.new' | translate }}</mat-label>
                <input matInput type="password" formControlName="newPassword" />
              </mat-form-field>
              <button mat-flat-button color="primary" (click)="changePassword()" [disabled]="true">
                {{ 'profile.password.submit' | translate }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- ─── Order history ─────────────────────────────────────────── -->
        <mat-card class="orders-card">
          <mat-card-header>
            <mat-card-title>{{ 'profile.orders.title' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="todo-block">
              {{ 'profile.orders.todo' | translate }}
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .page { max-width: 1100px; margin: 0 auto; padding: 24px; }
      .page-header {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 24px;
      }
      .page-header h1 { margin: 0; font-size: 28px; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .orders-card { grid-column: 1 / -1; }
      @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
      .form { display: flex; flex-direction: column; gap: 4px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .todo-block {
        padding: 12px; background: #fff8e1; border-radius: 4px;
        font-size: 13px; color: #8a6d3b; margin-bottom: 16px;
      }
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
