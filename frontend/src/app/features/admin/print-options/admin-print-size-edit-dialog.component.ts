// frontend/src/app/features/admin/print-options/admin-print-size-edit-dialog.component.ts
/**
 * Print size create/edit dialog. Single 'label' field per locale +
 * code, width, height, price multiplier, position, active toggle.
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
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  AdminPrintOptionsService,
  type AdminPrintSize,
  type AdminPrintSizeInput,
} from './admin-print-options.service';

const LOCALES = ['EN', 'HY', 'RU'] as const;

@Component({
  selector: 'app-admin-print-size-edit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
    TranslationTabsComponent,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEdit() ? ('admin.printOptions.editSizeTitle' | translate) : ('admin.printOptions.createSizeTitle' | translate) }}
    </h2>

    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'admin.fields.code' | translate }}</mat-label>
        <input matInput formControlName="code" required />
        <mat-hint>{{ 'admin.printOptions.codeHint' | translate }}</mat-hint>
      </mat-form-field>

      <div class="row two-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.widthCm' | translate }}</mat-label>
          <input matInput type="number" formControlName="widthCm" min="0" step="0.1" required />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.heightCm' | translate }}</mat-label>
          <input matInput type="number" formControlName="heightCm" min="0" step="0.1" required />
        </mat-form-field>
      </div>

      <div class="row two-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.multiplier' | translate }}</mat-label>
          <input matInput type="number" formControlName="priceMultiplier" min="0" step="0.01" required />
          <mat-hint>{{ 'admin.printOptions.multiplierHint' | translate }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.position' | translate }}</mat-label>
          <input matInput type="number" formControlName="position" />
        </mat-form-field>
      </div>

      <mat-checkbox formControlName="isActive">{{ 'admin.fields.active' | translate }}</mat-checkbox>

      <h3 class="section-heading">{{ 'admin.printOptions.labelsHeading' | translate }}</h3>
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
      .row { display: flex; gap: 12px; }
      .row.two-col > * { flex: 1 1 0; }
      .section-heading { margin: 8px 0 4px; font-size: 15px; font-weight: 500; color: #424242; }
    `,
  ],
})
export class AdminPrintSizeEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AdminPrintSizeEditDialogComponent, { reload?: boolean } | undefined>);
  private readonly service = inject(AdminPrintOptionsService);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);
  private readonly data = inject<AdminPrintSize | null>(MAT_DIALOG_DATA);

  readonly isEdit = computed(() => this.data !== null);
  readonly saving = signal(false);

  readonly translationFields: TranslationField[] = [
    { key: 'label', labelKey: 'admin.fields.label', required: true },
  ];

  readonly form: FormGroup = this.fb.group({
    code: [this.data?.code ?? '', [Validators.required]],
    widthCm: [this.data ? Number(this.data.widthCm) : null, [Validators.required, Validators.min(0)]],
    heightCm: [this.data ? Number(this.data.heightCm) : null, [Validators.required, Validators.min(0)]],
    priceMultiplier: [
      this.data ? Number(this.data.priceMultiplier) : 1,
      [Validators.required, Validators.min(0)],
    ],
    position: [this.data?.position ?? 0],
    isActive: [this.data?.isActive ?? true],
    translations: this.fb.array(
      LOCALES.map((locale) => {
        const existing = this.data?.translations.find((t) => t.locale === locale);
        return this.fb.group({
          locale: [locale],
          label: [existing?.label ?? '', locale === 'EN' ? [Validators.required] : []],
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
      label: string;
    }>;
    const input: AdminPrintSizeInput = {
      code: raw.code,
      widthCm: Number(raw.widthCm),
      heightCm: Number(raw.heightCm),
      priceMultiplier: Number(raw.priceMultiplier),
      position: raw.position ?? undefined,
      isActive: raw.isActive,
      translations: translations
        .filter((t) => t.label.trim().length > 0)
        .map((t) => ({ locale: t.locale, label: t.label })),
    };
    try {
      if (this.data) {
        await this.service.updateSize(this.data.id, input);
        this.snack.success(this.i18n.t('admin.printOptions.sizeSaved'));
      } else {
        await this.service.createSize(input);
        this.snack.success(this.i18n.t('admin.printOptions.sizeCreated'));
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