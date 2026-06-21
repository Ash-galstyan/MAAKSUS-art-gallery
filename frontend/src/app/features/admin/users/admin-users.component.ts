// frontend/src/app/features/admin/users/admin-users.component.ts
/**
 * Admin → Users list page.
 *
 * Read-only list with a single action per row: block / unblock. There is
 * intentionally no create/delete here — self-registration is the only path
 * in, and deleting would break foreign keys to orders. Blocking sets
 * status=BLOCKED which:
 *   - Prevents login (auth.service rejects BLOCKED users)
 *   - Force-revokes refresh tokens server-side (logged out everywhere)
 *
 * Admin can't block themselves — guarded client-side and the backend will
 * also reject it (current user's id == target id) to be safe.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { AdminUsersService, type AdminUser } from './admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'admin.nav.users' | translate }}</h2>
    </div>

    @if (error(); as msg) {
      <div class="error-banner">{{ msg }}</div>
    }

    @if (loading()) {
      <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (users().length === 0) {
      <div class="empty-state">{{ 'admin.users.empty' | translate }}</div>
    } @else {
      <div class="table-card mat-elevation-z1">
        <table mat-table [dataSource]="users()">
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.email' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <div>{{ row.email }}</div>
              @if (row.id === currentUserId()) {
                <div class="muted">({{ 'admin.users.you' | translate }})</div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.name' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.firstName || row.lastName) {
                {{ row.firstName ?? '' }} {{ row.lastName ?? '' }}
              } @else {
                <span class="muted">—</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.role' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="role-chip" [class.role-admin]="row.role === 'ADMIN'">{{ row.role }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.status' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class]="'status-' + row.status.toLowerCase()">
                {{ row.status }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="locale">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.locale' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.locale }}</td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.created' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <div class="row-actions">
                @if (row.status === 'ACTIVE') {
                  <button mat-icon-button color="warn"
                          [disabled]="row.id === currentUserId()"
                          (click)="setStatus(row, 'BLOCKED')"
                          [matTooltip]="'admin.users.block' | translate" type="button">
                    <mat-icon>block</mat-icon>
                  </button>
                } @else {
                  <button mat-icon-button color="primary"
                          (click)="setStatus(row, 'ACTIVE')"
                          [matTooltip]="'admin.users.unblock' | translate" type="button">
                    <mat-icon>check_circle</mat-icon>
                  </button>
                }
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </div>
    }
  `,
  styleUrls: ['../shared/admin-page.scss'],
  styles: [
    `
      .role-chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        background: #f5f5f5;
        color: #616161;
      }
      .role-chip.role-admin {
        background: #ede7f6;
        color: #4527a0;
      }
    `,
  ],
})
export class AdminUsersComponent {
  private readonly service = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly columns = ['email', 'name', 'role', 'status', 'locale', 'created', 'actions'];

  constructor() {
    void this.reload();
  }

  currentUserId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.users.set(await this.service.list());
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }

  async setStatus(row: AdminUser, status: 'ACTIVE' | 'BLOCKED'): Promise<void> {
    if (row.id === this.currentUserId()) {
      this.snack.error(this.i18n.t('admin.users.cannotBlockSelf'));
      return;
    }
    const message =
      status === 'BLOCKED'
        ? this.i18n.t('admin.users.confirmBlock')
        : this.i18n.t('admin.users.confirmUnblock');
    if (!confirm(message)) return;

    try {
      const updated = await this.service.setStatus(row.id, status);
      this.users.update((rows) => rows.map((u) => (u.id === row.id ? updated : u)));
      this.snack.success(
        status === 'BLOCKED'
          ? this.i18n.t('admin.users.blocked')
          : this.i18n.t('admin.users.unblocked'),
      );
    } catch {
      /* interceptor toast */
    }
  }
}