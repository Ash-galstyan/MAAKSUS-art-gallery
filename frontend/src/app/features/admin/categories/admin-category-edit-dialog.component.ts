// frontend/src/app/features/admin/categories/admin-category-edit-dialog.component.ts
/**
 * Category create/edit dialog.
 *
 * Single text field per locale (name), plus slug at the top.
 * Used in both flows: null data = create, populated = edit.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import {
  TranslationTabsComponent,
  type TranslationField,
} from '../shared/translation-tabs.component';
import {
  AdminCategoriesService,
  type AdminCategory,
  type AdminCategoryInput,
} from './admin-categories.service';

const LOCALES = ['EN', 'HY', 'RU'] as const;

@Component({
  selector: 'app-admin-category-edit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
    TranslationTabsComponent,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEdit() ? ('admin.categories.editTitle' | translate) : ('admin.categories.createTitle' | translate) }}
    </h2>

    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'admin.fields.slug' | translate }}</mat-label>
        <input matInput formControlName="slug" required />
        <mat-hint>{{ 'admin.fields.slugHint' | translate }}</mat-hint>
        @if (form.get('slug')?.invalid && form.get('slug')?.touched) {
          <mat-error>{{ 'admin.errors.slugFormat' | translate }}</mat-error>
        }
      </mat-form-field>

      <h3 class="section-heading">{{ 'admin.categories.translationsHeading' | translate }}</h3>
      <app-translation-tabs
        [translations]="translationsArray"
        [fields]="translationFields"
      ></app-translation-tabs>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()" [disabled]="saving()">
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-raised-button color="primary" type="button"
              [disabled]="form.invalid || saving()" (click)="save()">
        {{ saving() ? ('common.saving' | translate) : ('common.save' | translate) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-body { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
      .full-width { width: 100%; }
      .section-heading { margin: 8px 0 4px; font-size: 15px; font-weight: 500; color: #424242; }
    `,
  ],
})
export class AdminCategoryEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AdminCategoryEditDialogComponent, { reload?: boolean } | undefined>);
  private readonly service = inject(AdminCategoriesService);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);
  private readonly data = inject<AdminCategory | null>(MAT_DIALOG_DATA);

  readonly isEdit = computed(() => this.data !== null);
  readonly saving = signal(false);

  readonly translationFields: TranslationField[] = [
    { key: 'name', labelKey: 'admin.fields.name', required: true },
  ];

  readonly form: FormGroup = this.fb.group({
    slug: [
      this.data?.slug ?? '',
      [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)],
    ],
    translations: this.fb.array(
      LOCALES.map((locale) => {
        const existing = this.data?.translations.find((t) => t.locale === locale);
        return this.fb.group({
          locale: [locale],
          name: [existing?.name ?? '', locale === 'EN' ? [Validators.required] : []],
        });
      }),
    ),
  });

  get translationsArray(): FormArray {
    return this.form.get('translations') as FormArray;
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
      name: string;
    }>;
    const input: AdminCategoryInput = {
      slug: raw.slug,
      translations: translations
        .filter((t) => t.name.trim().length > 0)
        .map((t) => ({ locale: t.locale, name: t.name })),
    };
    try {
      if (this.data) {
        await this.service.update(this.data.id, input);
        this.snack.success(this.i18n.t('admin.categories.saved'));
      } else {
        await this.service.create(input);
        this.snack.success(this.i18n.t('admin.categories.created'));
      }
      this.dialogRef.close({ reload: true });
    } catch {
      /* interceptor toast */
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}