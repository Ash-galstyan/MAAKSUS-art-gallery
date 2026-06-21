// frontend/src/app/features/admin/artists/admin-artists.component.ts
/**
 * Admin → Artists list page.
 *
 * Standard list pattern. The dialog handles create/edit with EN/HY/RU
 * tabs for name + bio.
 *
 * Note: artist portrait upload isn't exposed in v1. The schema has a
 * portraitPath column but no endpoint accepts uploads for it. Add later
 * if needed; not blocking.
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
import { AdminArtistsService, type AdminArtist } from './admin-artists.service';
import { AdminArtistEditDialogComponent } from './admin-artist-edit-dialog.component';

@Component({
  selector: 'app-admin-artists',
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
      <h2>{{ 'admin.nav.artists' | translate }}</h2>
      <button mat-raised-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        {{ 'admin.artists.new' | translate }}
      </button>
    </div>

    @if (error(); as msg) {
      <div class="error-banner">{{ msg }}</div>
    }

    @if (loading()) {
      <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (artists().length === 0) {
      <div class="empty-state">{{ 'admin.artists.empty' | translate }}</div>
    } @else {
      <div class="table-card mat-elevation-z1">
        <table mat-table [dataSource]="artists()">
          <ng-container matColumnDef="slug">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.slug' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.slug }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.name' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ nameFor(row) }}</td>
          </ng-container>

          <ng-container matColumnDef="years">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.years' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.birthYear || row.deathYear) {
                {{ row.birthYear ?? '?' }}–{{ row.deathYear ?? '' }}
              } @else {
                <span class="muted">—</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="artworkCount">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.artists.artworkCount' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row._count?.artworks ?? 0 }}</td>
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
                        [matTooltip]="'common.delete' | translate"
                        [disabled]="(row._count?.artworks ?? 0) > 0">
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
export class AdminArtistsComponent {
  private readonly service = inject(AdminArtistsService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);

  readonly artists = signal<AdminArtist[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly columns = ['slug', 'name', 'years', 'artworkCount', 'actions'];

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.artists.set(await this.service.list());
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to load artists');
    } finally {
      this.loading.set(false);
    }
  }

  nameFor(row: AdminArtist): string {
    const locale = this.i18n.localeServer();
    return (
      row.translations.find((t) => t.locale === locale)?.name ??
      row.translations.find((t) => t.locale === 'EN')?.name ??
      row.slug
    );
  }

  openCreate(): void {
    const ref = this.dialog.open<
      AdminArtistEditDialogComponent,
      AdminArtist | null,
      { reload?: boolean } | undefined
    >(AdminArtistEditDialogComponent, {
      data: null,
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.reload) void this.reload();
    });
  }

  openEdit(row: AdminArtist): void {
    const ref = this.dialog.open<
      AdminArtistEditDialogComponent,
      AdminArtist,
      { reload?: boolean } | undefined
    >(AdminArtistEditDialogComponent, {
      data: row,
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.reload) void this.reload();
    });
  }

  async remove(row: AdminArtist): Promise<void> {
    if (!confirm(this.i18n.t('admin.artists.confirmDelete'))) return;
    try {
      await this.service.remove(row.id);
      this.snack.success(this.i18n.t('admin.artists.deleted'));
      await this.reload();
    } catch {
      /* interceptor toast (409 ARTIST_IN_USE if has artworks) */
    }
  }
}