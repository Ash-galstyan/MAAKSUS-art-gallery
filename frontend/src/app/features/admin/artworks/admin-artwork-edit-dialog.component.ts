// frontend/src/app/features/admin/artworks/admin-artwork-edit-dialog.component.ts
/**
 * Artwork create/edit dialog.
 *
 * Reused for both flows:
 *   - dialog.open(..., { data: null })       → CREATE
 *   - dialog.open(..., { data: artwork })    → EDIT
 *
 * Form structure:
 *   - Top section: slug, artist, category, year, basePrice, dimensions
 *   - TranslationTabs: title (required), description, history, medium per locale
 *   - Image manager (edit-only): existing images list + dropzone for new uploads
 *
 * Why image upload is edit-only:
 *   The backend's POST /artworks/:id/images endpoint needs an artwork ID,
 *   which we don't have until create returns. So on CREATE we save the
 *   artwork first, then transition to edit-mode in the SAME dialog so the
 *   user can drop images without losing context. The "Save & add images"
 *   button is the create flow's natural exit.
 *
 * Image semantics:
 *   - First uploaded image is automatically primary (backend logic).
 *   - "Set primary" reuploads with ?primary=true and the backend demotes
 *     others — but the simpler UX: just re-upload one with the toggle on.
 *     The list shows a "primary" star indicator on the current primary.
 *   - Removing the primary auto-promotes the next image (backend logic).
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadUrlPipe } from '../../../shared/pipes/upload-url.pipe';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import {
  ImageDropzoneComponent,
} from '../shared/image-dropzone.component';
import {
  TranslationTabsComponent,
  type TranslationField,
} from '../shared/translation-tabs.component';
import {
  AdminArtworksService,
  type AdminArtwork,
  type AdminArtworkImage,
  type AdminArtworkInput,
} from './admin-artworks.service';
import { AdminCategoriesService, type AdminCategory } from '../categories/admin-categories.service';
import { AdminArtistsService, type AdminArtist } from '../artists/admin-artists.service';

const LOCALES = ['EN', 'HY', 'RU'] as const;

@Component({
  selector: 'app-admin-artwork-edit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    TranslatePipe,
    UploadUrlPipe,
    ImageDropzoneComponent,
    TranslationTabsComponent,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEdit() ? ('admin.artworks.editTitle' | translate) : ('admin.artworks.createTitle' | translate) }}
    </h2>

    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <div class="row two-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.slug' | translate }}</mat-label>
          <input matInput formControlName="slug" required />
          <mat-hint>{{ 'admin.fields.slugHint' | translate }}</mat-hint>
          @if (form.get('slug')?.invalid && form.get('slug')?.touched) {
            <mat-error>{{ 'admin.errors.slugFormat' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.basePrice' | translate }}</mat-label>
          <input matInput type="number" formControlName="basePrice" min="0" required />
          <span matSuffix class="suffix">AMD</span>
        </mat-form-field>
      </div>

      <div class="row two-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.artist' | translate }}</mat-label>
          <mat-select formControlName="artistId" required>
            @for (a of artists(); track a.id) {
              <mat-option [value]="a.id">{{ artistName(a) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.category' | translate }}</mat-label>
          <mat-select formControlName="categoryId" required>
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ categoryName(c) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="row three-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.year' | translate }}</mat-label>
          <input matInput type="number" formControlName="year" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.widthCm' | translate }}</mat-label>
          <input matInput type="number" formControlName="widthCm" min="0" step="0.1" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.heightCm' | translate }}</mat-label>
          <input matInput type="number" formControlName="heightCm" min="0" step="0.1" />
        </mat-form-field>
      </div>

      <mat-checkbox formControlName="isAvailable" class="row-checkbox">
        {{ 'admin.fields.isAvailable' | translate }}
      </mat-checkbox>

      <h3 class="section-heading">{{ 'admin.artworks.translationsHeading' | translate }}</h3>
      <app-translation-tabs
        [translations]="translationsArray"
        [fields]="translationFields"
      ></app-translation-tabs>

      @if (isEdit() && existingImages().length > 0) {
        <h3 class="section-heading">{{ 'admin.artworks.imagesHeading' | translate }}</h3>
        <div class="image-grid">
          @for (img of existingImages(); track img.id) {
            <div class="img-cell" [class.is-primary]="img.isPrimary">
              <img [src]="img.thumbnailPath | uploadUrl" alt="" />
              @if (img.isPrimary) {
                <div class="primary-badge">
                  <mat-icon>star</mat-icon>
                  <span>{{ 'admin.images.primary' | translate }}</span>
                </div>
              }
              <button mat-icon-button class="img-delete"
                      type="button"
                      [attr.aria-label]="'admin.images.delete' | translate"
                      (click)="deleteImage(img)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }

      @if (isEdit()) {
        <h3 class="section-heading">{{ 'admin.artworks.addImagesHeading' | translate }}</h3>
        <app-image-dropzone
          #dropzone
          [multiple]="true"
          (filesSelected)="stagedFiles.set($event)"
        ></app-image-dropzone>

        @if (stagedFiles().length > 0) {
          <div class="upload-controls">
            <mat-checkbox [checked]="setNextPrimary()" (change)="setNextPrimary.set($event.checked)">
              {{ 'admin.images.setFirstAsPrimary' | translate }}
            </mat-checkbox>
            <button mat-stroked-button color="primary" type="button"
                    [disabled]="uploading()"
                    (click)="uploadStaged()">
              <mat-icon>cloud_upload</mat-icon>
              {{ 'admin.images.uploadStaged' | translate }} ({{ stagedFiles().length }})
            </button>
          </div>
        }
        @if (uploading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }
      } @else {
        <div class="hint-row">{{ 'admin.artworks.imagesAfterSave' | translate }}</div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()" [disabled]="saving() || uploading()">
        {{ 'common.cancel' | translate }}
      </button>
      @if (isEdit() && !form.dirty) {
        <button mat-raised-button color="primary" type="button" (click)="done()">
          {{ 'common.done' | translate }}
        </button>
      } @else {
        <button mat-raised-button color="primary" type="button"
                [disabled]="form.invalid || saving() || uploading()"
                (click)="save()">
          {{ saving() ? ('common.saving' | translate) : ('common.save' | translate) }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
      }
      .full-width { width: 100%; }
      .row { display: flex; gap: 12px; }
      .row.two-col > * { flex: 1 1 0; }
      .row.three-col > * { flex: 1 1 0; }
      .row-checkbox { margin: 4px 0; }
      .section-heading {
        margin: 8px 0 4px;
        font-size: 15px;
        font-weight: 500;
        color: #424242;
      }
      .suffix { color: #757575; font-size: 13px; }
      .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
      }
      .img-cell {
        position: relative;
        background: #f5f5f5;
        border-radius: 6px;
        overflow: hidden;
        aspect-ratio: 1;

        img { width: 100%; height: 100%; object-fit: cover; display: block; }
      }
      .img-cell.is-primary { box-shadow: 0 0 0 2px #673ab7; }
      .primary-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        background: #673ab7;
        color: #fff;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        mat-icon { font-size: 12px; width: 12px; height: 12px; }
      }
      .img-delete {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        width: 28px;
        height: 28px;
        line-height: 28px;
      }
      .upload-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-top: 8px;
      }
      .hint-row {
        padding: 12px;
        background: #fff8e1;
        color: #8a6d3b;
        border-radius: 4px;
        font-size: 13px;
      }
    `,
  ],
})
export class AdminArtworkEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AdminArtworkEditDialogComponent, { reload?: boolean } | undefined>);
  private readonly service = inject(AdminArtworksService);
  private readonly artistsApi = inject(AdminArtistsService);
  private readonly categoriesApi = inject(AdminCategoriesService);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);
  private readonly data = inject<AdminArtwork | null>(MAT_DIALOG_DATA);

  // The dialog flips from create → edit after the first save so image upload
  // can happen without closing. `_currentId` is null until then.
  private readonly _currentId = signal<string | null>(this.data?.id ?? null);
  readonly isEdit = computed(() => this._currentId() !== null);

  readonly artists = signal<AdminArtist[]>([]);
  readonly categories = signal<AdminCategory[]>([]);

  // Image management
  readonly existingImages = signal<AdminArtworkImage[]>(this.data?.images ?? []);
  readonly stagedFiles = signal<File[]>([]);
  readonly setNextPrimary = signal(false);
  readonly uploading = signal(false);

  readonly saving = signal(false);

  readonly dropzone = viewChild<ImageDropzoneComponent>('dropzone');

  readonly translationFields: TranslationField[] = [
    { key: 'title', labelKey: 'admin.fields.title', required: true },
    { key: 'description', labelKey: 'admin.fields.description', multiline: true },
    { key: 'history', labelKey: 'admin.fields.history', multiline: true },
    { key: 'medium', labelKey: 'admin.fields.medium' },
  ];

  // Build form
  readonly form: FormGroup = this.fb.group({
    slug: [
      this.data?.slug ?? '',
      [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)],
    ],
    artistId: [this.data?.artistId ?? '', [Validators.required]],
    categoryId: [this.data?.categoryId ?? '', [Validators.required]],
    year: [this.data?.year ?? null],
    widthCm: [this.numOrNull(this.data?.widthCm)],
    heightCm: [this.numOrNull(this.data?.heightCm)],
    basePrice: [
      this.data ? Number(this.data.basePrice) : null,
      [Validators.required, Validators.min(0)],
    ],
    isAvailable: [this.data?.isAvailable ?? true],
    translations: this.fb.array(
      LOCALES.map((locale) => {
        const existing = this.data?.translations.find((t) => t.locale === locale);
        return this.fb.group({
          locale: [locale],
          title: [existing?.title ?? '', locale === 'EN' ? [Validators.required] : []],
          description: [existing?.description ?? ''],
          history: [existing?.history ?? ''],
          medium: [existing?.medium ?? ''],
        });
      }),
    ),
  });

  get translationsArray(): FormArray {
    return this.form.get('translations') as FormArray;
  }

  constructor() {
    void this.loadPickerOptions();
  }

  private async loadPickerOptions(): Promise<void> {
    try {
      const [artists, categories] = await Promise.all([
        this.artistsApi.list(),
        this.categoriesApi.list(),
      ]);
      this.artists.set(artists);
      this.categories.set(categories);
    } catch {
      // Error toast comes from interceptor.
    }
  }

  artistName(a: AdminArtist): string {
    const locale = this.i18n.localeServer();
    return (
      a.translations.find((t) => t.locale === locale)?.name ??
      a.translations.find((t) => t.locale === 'EN')?.name ??
      a.slug
    );
  }

  categoryName(c: AdminCategory): string {
    const locale = this.i18n.localeServer();
    return (
      c.translations.find((t) => t.locale === locale)?.name ??
      c.translations.find((t) => t.locale === 'EN')?.name ??
      c.slug
    );
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const translations = raw.translations as Array<{
      locale: 'EN' | 'HY' | 'RU';
      title: string;
      description: string;
      history: string;
      medium: string;
    }>;
    const input: AdminArtworkInput = {
      slug: raw.slug,
      artistId: raw.artistId,
      categoryId: raw.categoryId,
      basePrice: Number(raw.basePrice),
      isAvailable: raw.isAvailable,
      year: raw.year ?? undefined,
      widthCm: raw.widthCm ?? undefined,
      heightCm: raw.heightCm ?? undefined,
      translations: translations
        .filter((t) => t.title.trim().length > 0)
        .map((t) => ({
          locale: t.locale,
          title: t.title,
          description: t.description || undefined,
          history: t.history || undefined,
          medium: t.medium || undefined,
        })),
    };

    try {
      const wasCreate = this._currentId() === null;
      if (wasCreate) {
        // First save of a new artwork — keep the dialog open so the user
        // can drop images straight in. We flip to edit-mode by stashing
        // the new id.
        const created = await this.service.create(input);
        this._currentId.set(created.id);
        this.snack.success(this.i18n.t('admin.artworks.createdAddImages'));
      } else {
        // Already an existing artwork: save and close.
        await this.service.update(this._currentId()!, input);
        this.snack.success(this.i18n.t('admin.artworks.saved'));
        this.dialogRef.close({ reload: true });
      }
    } catch {
      // Interceptor toast.
    } finally {
      this.saving.set(false);
    }
  }

  async uploadStaged(): Promise<void> {
    const id = this._currentId();
    if (!id || this.stagedFiles().length === 0) return;
    this.uploading.set(true);
    try {
      let promotedFirst = false;
      const uploaded: AdminArtworkImage[] = [];
      for (const file of this.stagedFiles()) {
        // Only the first uploaded file becomes primary if the toggle is on.
        const primary = this.setNextPrimary() && !promotedFirst;
        const img = await this.service.uploadImage(id, file, { primary });
        uploaded.push(img);
        if (primary) promotedFirst = true;
      }
      // If we promoted one to primary, demote the others locally; the backend
      // already moved the flag, but our local copy of existingImages doesn't
      // know yet. Refetching the artwork would be cleaner but adds a round trip;
      // do it in-memory:
      const promoted = promotedFirst;
      this.existingImages.update((curr) => {
        const merged = [...curr, ...uploaded];
        if (promoted) {
          const newPrimary = uploaded[0];
          return merged.map((img) =>
            img.id === newPrimary?.id ? { ...img, isPrimary: true } : { ...img, isPrimary: false },
          );
        }
        return merged;
      });
      this.stagedFiles.set([]);
      this.setNextPrimary.set(false);
      this.dropzone()?.reset();
      this.snack.success(this.i18n.t('admin.images.uploaded'));
    } catch {
      // Interceptor toast.
    } finally {
      this.uploading.set(false);
    }
  }

  async deleteImage(img: AdminArtworkImage): Promise<void> {
    const id = this._currentId();
    if (!id) return;
    const ok = confirm(this.i18n.t('admin.images.confirmDelete'));
    if (!ok) return;
    try {
      await this.service.removeImage(id, img.id);
      this.existingImages.update((curr) => {
        const filtered = curr.filter((i) => i.id !== img.id);
        // If we removed the primary, promote the next image (matches backend).
        if (img.isPrimary && filtered.length > 0 && !filtered.some((i) => i.isPrimary)) {
          return filtered.map((i, ix) => (ix === 0 ? { ...i, isPrimary: true } : i));
        }
        return filtered;
      });
    } catch {
      /* interceptor toast */
    }
  }

  cancel(): void {
    // Even on cancel, if anything happened (image uploaded after create),
    // signal a reload so the list refreshes.
    this.dialogRef.close({ reload: this._currentId() !== this.data?.id || this.existingImages().length !== (this.data?.images.length ?? 0) });
  }

    /**
   * Close the dialog after the user has finished uploading images in a
   * create-then-edit flow. The "Done" button replaces "Save" once the form
   * has no unsaved changes — at that point Save would be a no-op.
   */
  done(): void {
    this.dialogRef.close({ reload: true });
  }

  /** Numeric Prisma Decimals may arrive as string; normalise. */
  private numOrNull(v: number | string | null | undefined): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}