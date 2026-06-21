// frontend/src/app/features/admin/print-options/admin-frame-option-edit-dialog.component.ts
/**
 * Frame option create/edit dialog. Code, frame type, swatch colour,
 * additional price, position, active, plus localised label.
 *
 * Color picker uses the browser-native <input type="color"> — keeps the
 * dialog dependency-light. Backend stores #RRGGBB and the field enforces
 * that pattern.
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
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import {
  TranslationTabsComponent,
  type TranslationField,
} from '../shared/translation-tabs.component';
import {
  AdminPrintOptionsService,
  type AdminFrameOption,
  type AdminFrameOptionInput,
  type FrameType,
} from './admin-print-options.service';

const LOCALES = ['EN', 'HY', 'RU'] as const;
const FRAME_TYPES: FrameType[] = ['NONE', 'WOOD', 'METAL', 'PLASTIC'];

@Component({
  selector: 'app-admin-frame-option-edit-dialog',
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
    MatSelectModule,
    TranslatePipe,
    TranslationTabsComponent,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEdit() ? ('admin.printOptions.editFrameTitle' | translate) : ('admin.printOptions.createFrameTitle' | translate) }}
    </h2>

    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'admin.fields.code' | translate }}</mat-label>
        <input matInput formControlName="code" required />
        <mat-hint>{{ 'admin.printOptions.codeHint' | translate }}</mat-hint>
      </mat-form-field>

      <div class="row two-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.type' | translate }}</mat-label>
          <mat-select formControlName="frameType" required>
            @for (t of frameTypes; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="color-row">
          <label class="color-label">{{ 'admin.fields.color' | translate }}</label>
          <input type="color" formControlName="colorHex" class="color-input" />
          <input
            type="text"
            [value]="form.get('colorHex')?.value"
            (input)="onHexInput($event)"
            class="hex-input"
            maxlength="7"
            pattern="^#[0-9a-fA-F]{6}$"
          />
        </div>
      </div>

      <div class="row two-col">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'admin.fields.additionalPrice' | translate }}</mat-label>
          <input matInput type="number" formControlName="additionalPrice" min="0" required />
          <span matSuffix class="suffix">AMD</span>
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
      .suffix { color: #757575; font-size: 13px; }

      .color-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1 1 0;
      }
      .color-label { font-size: 12px; color: #757575; }
      .color-input {
        width: 56px;
        height: 40px;
        border: 1px solid #c5c5c5;
        border-radius: 4px;
        cursor: pointer;
        padding: 2px;
      }
      .hex-input {
        height: 40px;
        padding: 0 12px;
        border: 1px solid #c5c5c5;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
      }
    `,
  ],
})
export class AdminFrameOptionEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AdminFrameOptionEditDialogComponent, { reload?: boolean } | undefined>);
  private readonly service = inject(AdminPrintOptionsService);
  private readonly snack = inject(AdminSnackbarService);
  private readonly i18n = inject(I18nService);
  private readonly data = inject<AdminFrameOption | null>(MAT_DIALOG_DATA);

  readonly isEdit = computed(() => this.data !== null);
  readonly saving = signal(false);

  readonly frameTypes = FRAME_TYPES;

  readonly translationFields: TranslationField[] = [
    { key: 'label', labelKey: 'admin.fields.label', required: true },
  ];

  readonly form: FormGroup = this.fb.group({
    code: [this.data?.code ?? '', [Validators.required]],
    frameType: [this.data?.frameType ?? 'WOOD', [Validators.required]],
    colorHex: [
      this.data?.colorHex ?? '#6b4423',
      [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    ],
    additionalPrice: [
      this.data ? Number(this.data.additionalPrice) : 0,
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

  /**
   * Allow typing a hex by hand alongside the color picker — keeps them in
   * sync. We don't validate per-keystroke (the field validator handles it
   * on submit), just push the raw value into the control.
   */
  onHexInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.get('colorHex')?.setValue(value);
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
    const input: AdminFrameOptionInput = {
      code: raw.code,
      frameType: raw.frameType,
      colorHex: raw.colorHex,
      additionalPrice: Number(raw.additionalPrice),
      position: raw.position ?? undefined,
      isActive: raw.isActive,
      translations: translations
        .filter((t) => t.label.trim().length > 0)
        .map((t) => ({ locale: t.locale, label: t.label })),
    };
    try {
      if (this.data) {
        await this.service.updateFrame(this.data.id, input);
        this.snack.success(this.i18n.t('admin.printOptions.frameSaved'));
      } else {
        await this.service.createFrame(input);
        this.snack.success(this.i18n.t('admin.printOptions.frameCreated'));
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