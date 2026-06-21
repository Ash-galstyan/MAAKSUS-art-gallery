// frontend/src/app/features/admin/artworks/admin-artworks.component.ts
/**
 * Admin → Artworks list page.
 *
 * Renders a table of every artwork in the system (including soft-deleted ones
 * unless the "Hide deleted" toggle is on). Each row exposes:
 *   - Thumbnail (primary image, or placeholder)
 *   - Title (in current UI locale, with fallback)
 *   - Artist + category names (locale-resolved)
 *   - Base price
 *   - Availability toggle (immediate PATCH)
 *   - Edit button → opens AdminArtworkEditDialogComponent
 *   - Delete button → confirmation, then soft delete
 *
 * The dialog handles BOTH create and edit by accepting an optional artwork.
 * On close, it returns either:
 *   - undefined → user cancelled, nothing to do
 *   - { reload: true } → list must be refetched (image upload happened, etc)
 *
 * Why refetch instead of patching the row in place: image uploads happen
 * AFTER artwork create/update, and the dialog already mutates server state
 * along several paths. A single refetch keeps the table genuinely fresh
 * with negligible UX cost.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { UploadUrlPipe } from '../../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { AdminArtworksService, type AdminArtwork } from './admin-artworks.service';
import { AdminArtworkEditDialogComponent } from './admin-artwork-edit-dialog.component';

@Component({
  selector: 'app-admin-artworks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'admin.nav.artworks' | translate }}</h2>
      <button mat-raised-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        {{ 'admin.artworks.new' | translate }}
      </button>
    </div>

    <div class="toolbar">
      <mat-slide-toggle [checked]="hideDeleted()" (change)="hideDeleted.set($event.checked)">
        {{ 'admin.artworks.hideDeleted' | translate }}
      </mat-slide-toggle>
      <span class="spacer"></span>
      <span class="muted">{{ visible().length }} / {{ artworks().length }}</span>
    </div>

    @if (error(); as msg) {
      <div class="error-banner">{{ msg }}</div>
    }

    @if (loading()) {
      <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (visible().length === 0) {
      <div class="empty-state">{{ 'admin.artworks.empty' | translate }}</div>
    } @else {
      <div class="table-card mat-elevation-z1">
        <table mat-table [dataSource]="visible()">
          <ng-container matColumnDef="thumbnail">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              @if (primaryThumb(row); as thumb) {
                <img class="thumb" [src]="thumb | uploadUrl" alt="" />
              } @else {
                <div class="thumb-placeholder">{{ 'admin.noImage' | translate }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.title' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <div class="cell-title">{{ titleFor(row) }}</div>
              <div class="muted">{{ row.slug }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="artist">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.artist' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ artistName(row) }}</td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.category' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ categoryName(row) }}</td>
          </ng-container>

          <ng-container matColumnDef="basePrice">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.basePrice' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="price">{{ +row.basePrice | price }}</td>
          </ng-container>

          <ng-container matColumnDef="available">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.available' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <mat-slide-toggle
                [checked]="row.isAvailable"
                [disabled]="!!row.deletedAt"
                (change)="toggleAvailability(row, $event.checked)"
              ></mat-slide-toggle>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <div class="row-actions">
                <button mat-icon-button (click)="openEdit(row)"
                        [matTooltip]="'common.edit' | translate" type="button">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="remove(row)"
                        [matTooltip]="'common.delete' | translate" type="button"
                        [disabled]="!!row.deletedAt">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"
              [class.row-deleted]="row.deletedAt"></tr>
        </table>
      </div>
    }
  `,
  styleUrls: ['../shared/admin-page.scss'],
  styles: [
    `
      .cell-title { font-weight: 500; }
      .row-deleted { opacity: 0.5; }
    `,
  ],
})
export class AdminArtworksComponent {
  private readonly service = inject(AdminArtworksService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);

  readonly artworks = signal<AdminArtwork[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hideDeleted = signal(true);

  readonly visible = computed(() =>
    this.hideDeleted()
      ? this.artworks().filter((a) => !a.deletedAt)
      : this.artworks(),
  );

  readonly columns = ['thumbnail', 'title', 'artist', 'category', 'basePrice', 'available', 'actions'];

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.artworks.set(await this.service.list());
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to load artworks');
    } finally {
      this.loading.set(false);
    }
  }

  primaryThumb(row: AdminArtwork): string | null {
    const primary = row.images.find((i) => i.isPrimary) ?? row.images[0];
    return primary?.thumbnailPath ?? null;
  }

  titleFor(row: AdminArtwork): string {
    const locale = this.i18n.localeServer();
    return (
      row.translations.find((t) => t.locale === locale)?.title ??
      row.translations.find((t) => t.locale === 'EN')?.title ??
      row.slug
    );
  }

  artistName(row: AdminArtwork): string {
    const locale = this.i18n.localeServer();
    return (
      row.artist.translations.find((t) => t.locale === locale)?.name ??
      row.artist.translations.find((t) => t.locale === 'EN')?.name ??
      row.artist.slug
    );
  }

  categoryName(row: AdminArtwork): string {
    const locale = this.i18n.localeServer();
    return (
      row.category.translations.find((t) => t.locale === locale)?.name ??
      row.category.translations.find((t) => t.locale === 'EN')?.name ??
      row.category.slug
    );
  }

  async toggleAvailability(row: AdminArtwork, isAvailable: boolean): Promise<void> {
    // Optimistic update; on error, refetch to reset.
    const prev = row.isAvailable;
    this.artworks.update((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, isAvailable } : r)),
    );
    try {
      await this.service.setAvailability(row.id, isAvailable);
      this.snack.success(
        isAvailable
          ? this.i18n.t('admin.artworks.madeAvailable')
          : this.i18n.t('admin.artworks.madeUnavailable'),
      );
    } catch {
      // Roll back UI; error toast comes from the interceptor.
      this.artworks.update((rows) =>
        rows.map((r) => (r.id === row.id ? { ...r, isAvailable: prev } : r)),
      );
    }
  }

  openCreate(): void {
    const ref = this.dialog.open<AdminArtworkEditDialogComponent, AdminArtwork | null, { reload?: boolean } | undefined>(
      AdminArtworkEditDialogComponent,
      { data: null, width: '800px', maxWidth: '95vw', autoFocus: false, disableClose: true },
    );
    ref.afterClosed().subscribe((result) => {
      if (result?.reload) void this.reload();
    });
  }

  openEdit(row: AdminArtwork): void {
    const ref = this.dialog.open<AdminArtworkEditDialogComponent, AdminArtwork, { reload?: boolean } | undefined>(
      AdminArtworkEditDialogComponent,
      { data: row, width: '800px', maxWidth: '95vw', autoFocus: false, disableClose: true },
    );
    ref.afterClosed().subscribe((result) => {
      if (result?.reload) void this.reload();
    });
  }

  async remove(row: AdminArtwork): Promise<void> {
    const ok = confirm(this.i18n.t('admin.artworks.confirmDelete'));
    if (!ok) return;
    try {
      await this.service.remove(row.id);
      this.snack.success(this.i18n.t('admin.artworks.deleted'));
      await this.reload();
    } catch {
      /* error toast from interceptor */
    }
  }
}