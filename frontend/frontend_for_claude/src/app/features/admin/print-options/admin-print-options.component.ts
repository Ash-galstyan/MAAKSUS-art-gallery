// frontend/src/app/features/admin/print-options/admin-print-options.component.ts
/**
 * Admin → Print Options page.
 *
 * Two related entities live here: print sizes and frame options. They're
 * paired in the catalog (every cart line picks one of each) so it makes
 * sense to surface them together under a tabbed page rather than two
 * sidebar entries.
 *
 * Each tab has its own list + dialog. Active toggle is in-line; everything
 * else opens the appropriate edit dialog.
 *
 * Note about deletion:
 *   The backend will 409 with PRINT_SIZE_IN_USE / FRAME_OPTION_IN_USE if
 *   the row is referenced by any cart item or order item. Use isActive=false
 *   instead to retire an option without breaking history.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import {
  AdminPrintOptionsService,
  type AdminPrintSize,
  type AdminFrameOption,
} from './admin-print-options.service';
import { AdminPrintSizeEditDialogComponent } from './admin-print-size-edit-dialog.component';
import { AdminFrameOptionEditDialogComponent } from './admin-frame-option-edit-dialog.component';

@Component({
  selector: 'app-admin-print-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    TranslatePipe,
    PricePipe,
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'admin.nav.printOptions' | translate }}</h2>
    </div>

    <mat-tab-group [animationDuration]="'150ms'">
      <!-- ─── Sizes ────────────────────────────────────────────────────── -->
      <mat-tab [label]="'admin.printOptions.sizesTab' | translate">
        <div class="tab-content">
          <div class="toolbar">
            <span class="spacer"></span>
            <button mat-raised-button color="primary" (click)="openSizeCreate()">
              <mat-icon>add</mat-icon>
              {{ 'admin.printOptions.newSize' | translate }}
            </button>
          </div>

          @if (loadingSizes()) {
            <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
          } @else if (sizes().length === 0) {
            <div class="empty-state">{{ 'admin.printOptions.sizesEmpty' | translate }}</div>
          } @else {
            <div class="table-card mat-elevation-z1">
              <table mat-table [dataSource]="sizes()">
                <ng-container matColumnDef="code">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.code' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.code }}</td>
                </ng-container>
                <ng-container matColumnDef="label">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.label' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ sizeLabel(row) }}</td>
                </ng-container>
                <ng-container matColumnDef="dimensions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.dimensions' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ +row.widthCm }} × {{ +row.heightCm }} cm</td>
                </ng-container>
                <ng-container matColumnDef="multiplier">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.multiplier' | translate }}</th>
                  <td mat-cell *matCellDef="let row" class="price">×{{ +row.priceMultiplier }}</td>
                </ng-container>
                <ng-container matColumnDef="position">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.position' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.position }}</td>
                </ng-container>
                <ng-container matColumnDef="active">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.active' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <mat-slide-toggle
                      [checked]="row.isActive"
                      (change)="toggleSizeActive(row, $event.checked)"
                    ></mat-slide-toggle>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <div class="row-actions">
                      <button mat-icon-button (click)="openSizeEdit(row)" type="button"
                              [matTooltip]="'common.edit' | translate">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button (click)="removeSize(row)" type="button"
                              [matTooltip]="'common.delete' | translate">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="sizeColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: sizeColumns;"></tr>
              </table>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ─── Frames ───────────────────────────────────────────────────── -->
      <mat-tab [label]="'admin.printOptions.framesTab' | translate">
        <div class="tab-content">
          <div class="toolbar">
            <span class="spacer"></span>
            <button mat-raised-button color="primary" (click)="openFrameCreate()">
              <mat-icon>add</mat-icon>
              {{ 'admin.printOptions.newFrame' | translate }}
            </button>
          </div>

          @if (loadingFrames()) {
            <div class="loading-overlay"><mat-spinner diameter="40"></mat-spinner></div>
          } @else if (frames().length === 0) {
            <div class="empty-state">{{ 'admin.printOptions.framesEmpty' | translate }}</div>
          } @else {
            <div class="table-card mat-elevation-z1">
              <table mat-table [dataSource]="frames()">
                <ng-container matColumnDef="code">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.code' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.code }}</td>
                </ng-container>
                <ng-container matColumnDef="label">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.label' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ frameLabel(row) }}</td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.type' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.frameType }}</td>
                </ng-container>
                <ng-container matColumnDef="color">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.color' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="swatch-row">
                      <span class="swatch" [style.background]="row.colorHex"></span>
                      <code>{{ row.colorHex }}</code>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="price">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.additionalPrice' | translate }}</th>
                  <td mat-cell *matCellDef="let row" class="price">{{ +row.additionalPrice | price }}</td>
                </ng-container>
                <ng-container matColumnDef="position">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.position' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.position }}</td>
                </ng-container>
                <ng-container matColumnDef="active">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.fields.active' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <mat-slide-toggle
                      [checked]="row.isActive"
                      (change)="toggleFrameActive(row, $event.checked)"
                    ></mat-slide-toggle>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <div class="row-actions">
                      <button mat-icon-button (click)="openFrameEdit(row)" type="button"
                              [matTooltip]="'common.edit' | translate">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button (click)="removeFrame(row)" type="button"
                              [matTooltip]="'common.delete' | translate">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="frameColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: frameColumns;"></tr>
              </table>
            </div>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styleUrls: ['../shared/admin-page.scss'],
  styles: [
    `
      .tab-content { padding: 16px 0; }
      .swatch-row { display: inline-flex; align-items: center; gap: 8px; }
      .swatch {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 1px solid rgba(0,0,0,0.2);
      }
      code { font-size: 12px; }
    `,
  ],
})
export class AdminPrintOptionsComponent {
  private readonly service = inject(AdminPrintOptionsService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);

  readonly sizes = signal<AdminPrintSize[]>([]);
  readonly frames = signal<AdminFrameOption[]>([]);
  readonly loadingSizes = signal(true);
  readonly loadingFrames = signal(true);

  readonly sizeColumns = ['code', 'label', 'dimensions', 'multiplier', 'position', 'active', 'actions'];
  readonly frameColumns = ['code', 'label', 'type', 'color', 'price', 'position', 'active', 'actions'];

  constructor() {
    void this.reloadSizes();
    void this.reloadFrames();
  }

  async reloadSizes(): Promise<void> {
    this.loadingSizes.set(true);
    try {
      this.sizes.set(await this.service.listSizes());
    } finally {
      this.loadingSizes.set(false);
    }
  }

  async reloadFrames(): Promise<void> {
    this.loadingFrames.set(true);
    try {
      this.frames.set(await this.service.listFrames());
    } finally {
      this.loadingFrames.set(false);
    }
  }

  sizeLabel(row: AdminPrintSize): string {
    const locale = this.i18n.localeServer();
    return (
      row.translations.find((t) => t.locale === locale)?.label ??
      row.translations.find((t) => t.locale === 'EN')?.label ??
      row.code
    );
  }

  frameLabel(row: AdminFrameOption): string {
    const locale = this.i18n.localeServer();
    return (
      row.translations.find((t) => t.locale === locale)?.label ??
      row.translations.find((t) => t.locale === 'EN')?.label ??
      row.code
    );
  }

  // ─── Sizes operations ────────────────────────────────────────────────
  async toggleSizeActive(row: AdminPrintSize, isActive: boolean): Promise<void> {
    const prev = row.isActive;
    this.sizes.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, isActive } : r)));
    try {
      await this.service.updateSize(row.id, { isActive });
    } catch {
      this.sizes.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, isActive: prev } : r)));
    }
  }

  openSizeCreate(): void {
    const ref = this.dialog.open<
      AdminPrintSizeEditDialogComponent,
      AdminPrintSize | null,
      { reload?: boolean } | undefined
    >(AdminPrintSizeEditDialogComponent, {
      data: null, width: '640px', maxWidth: '95vw', autoFocus: false,
    });
    ref.afterClosed().subscribe((r) => { if (r?.reload) void this.reloadSizes(); });
  }

  openSizeEdit(row: AdminPrintSize): void {
    const ref = this.dialog.open<
      AdminPrintSizeEditDialogComponent,
      AdminPrintSize,
      { reload?: boolean } | undefined
    >(AdminPrintSizeEditDialogComponent, {
      data: row, width: '640px', maxWidth: '95vw', autoFocus: false,
    });
    ref.afterClosed().subscribe((r) => { if (r?.reload) void this.reloadSizes(); });
  }

  async removeSize(row: AdminPrintSize): Promise<void> {
    if (!confirm(this.i18n.t('admin.printOptions.confirmDeleteSize'))) return;
    try {
      await this.service.removeSize(row.id);
      this.snack.success(this.i18n.t('admin.printOptions.sizeDeleted'));
      await this.reloadSizes();
    } catch { /* interceptor toast (409 PRINT_SIZE_IN_USE) */ }
  }

  // ─── Frame operations ───────────────────────────────────────────────
  async toggleFrameActive(row: AdminFrameOption, isActive: boolean): Promise<void> {
    const prev = row.isActive;
    this.frames.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, isActive } : r)));
    try {
      await this.service.updateFrame(row.id, { isActive });
    } catch {
      this.frames.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, isActive: prev } : r)));
    }
  }

  openFrameCreate(): void {
    const ref = this.dialog.open<
      AdminFrameOptionEditDialogComponent,
      AdminFrameOption | null,
      { reload?: boolean } | undefined
    >(AdminFrameOptionEditDialogComponent, {
      data: null, width: '640px', maxWidth: '95vw', autoFocus: false,
    });
    ref.afterClosed().subscribe((r) => { if (r?.reload) void this.reloadFrames(); });
  }

  openFrameEdit(row: AdminFrameOption): void {
    const ref = this.dialog.open<
      AdminFrameOptionEditDialogComponent,
      AdminFrameOption,
      { reload?: boolean } | undefined
    >(AdminFrameOptionEditDialogComponent, {
      data: row, width: '640px', maxWidth: '95vw', autoFocus: false,
    });
    ref.afterClosed().subscribe((r) => { if (r?.reload) void this.reloadFrames(); });
  }

  async removeFrame(row: AdminFrameOption): Promise<void> {
    if (!confirm(this.i18n.t('admin.printOptions.confirmDeleteFrame'))) return;
    try {
      await this.service.removeFrame(row.id);
      this.snack.success(this.i18n.t('admin.printOptions.frameDeleted'));
      await this.reloadFrames();
    } catch { /* interceptor toast (409 FRAME_OPTION_IN_USE) */ }
  }
}