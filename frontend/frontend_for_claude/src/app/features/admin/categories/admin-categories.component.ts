// frontend/src/app/features/admin/categories/admin-categories.component.ts
/**
 * Admin → Categories list page.
 *
 * Flat table — categories are leaf entities with one name per locale. The
 * dialog handles both create and edit by accepting null or an existing row.
 *
 * Delete is hard delete; the backend returns 409 if the category is still
 * referenced by any artwork, which the interceptor surfaces as a toast.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import {
  AdminCategoriesService,
  type AdminCategory,
} from './admin-categories.service';
import { AdminCategoryEditDialogComponent } from './admin-category-edit-dialog.component';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'admin.nav.categories' | translate }}</h2>
      <button mat-raised-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        {{ 'admin.categories.new' | translate }}
      </button>
    </div>

    @if (error(); as msg) {
      <div class="error-banner">{{ msg }}</div>
    }

    @if (loading()) {
      <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (categories().length === 0) {
      <div class="empty-state">{{ 'admin.categories.empty' | translate }}</div>
    } @else {
      <div class="table-card mat-elevation-z1">
        <table mat-table [dataSource]="categories()">
          <ng-container matColumnDef="slug">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.slug' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.slug }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.name' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ nameFor(row) }}</td>
          </ng-container>

          <ng-container matColumnDef="translations">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.translations' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="muted">{{ localeSummary(row) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <div class="row-actions">
                <button mat-icon-button (click)="openEdit(row)" type="button"
                        [matTooltip]="'common.edit' | translate">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="remove(row)" type="button"
                        [matTooltip]="'common.delete' | translate">
                  <mat-icon>delete</mat-icon>
                </button>
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
})
export class AdminCategoriesComponent {
  private readonly service = inject(AdminCategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);

  readonly categories = signal<AdminCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly columns = ['slug', 'name', 'translations', 'actions'];

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.categories.set(await this.service.list());
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to load categories');
    } finally {
      this.loading.set(false);
    }
  }

  nameFor(row: AdminCategory): string {
    const locale = this.i18n.localeServer();
    return (
      row.translations.find((t) => t.locale === locale)?.name ??
      row.translations.find((t) => t.locale === 'EN')?.name ??
      row.slug
    );
  }

  localeSummary(row: AdminCategory): string {
    return row.translations
      .map((t) => t.locale)
      .sort()
      .join(' · ');
  }

  openCreate(): void {
    const ref = this.dialog.open<
      AdminCategoryEditDialogComponent,
      AdminCategory | null,
      { reload?: boolean } | undefined
    >(AdminCategoryEditDialogComponent, {
      data: null,
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.reload) void this.reload();
    });
  }

  openEdit(row: AdminCategory): void {
    const ref = this.dialog.open<
      AdminCategoryEditDialogComponent,
      AdminCategory,
      { reload?: boolean } | undefined
    >(AdminCategoryEditDialogComponent, {
      data: row,
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.reload) void this.reload();
    });
  }

  async remove(row: AdminCategory): Promise<void> {
    if (!confirm(this.i18n.t('admin.categories.confirmDelete'))) return;
    try {
      await this.service.remove(row.id);
      this.snack.success(this.i18n.t('admin.categories.deleted'));
      await this.reload();
    } catch {
      /* interceptor toast (likely 409 CATEGORY_IN_USE) */
    }
  }
}