// frontend/src/app/features/admin/shared/translation-tabs.component.ts
/**
 * Reusable tabbed translation editor for trilingual EN/HY/RU content.
 *
 * Used by artwork, category, artist, print-size, and frame-option dialogs
 * — every entity that has a translations[] array of { locale, ...fields }.
 *
 * Contract:
 *   - Takes a FormGroup containing a FormArray named 'translations'.
 *   - Each item in the array is itself a FormGroup with at least a 'locale'
 *     control (string: 'EN' | 'HY' | 'RU') plus any text fields the parent
 *     wants editable.
 *   - The parent supplies which field names to render and which are required.
 *
 * The component does NOT create or destroy translation rows — the parent
 * is responsible for initialising one FormGroup per locale before mounting.
 * This keeps form lifecycle obvious in the parent and avoids hidden state.
 *
 * Why tabs and not "all three side-by-side"? With long-form fields like
 * description + history, side-by-side becomes a wall of text that's hard
 * to scan. Tabs keep the active language focused and reduce cognitive load.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export interface TranslationField {
  /** The control name inside each translation FormGroup (e.g. 'title'). */
  key: string;
  /** i18n key to translate the label (e.g. 'admin.fields.title'). */
  labelKey: string;
  /** Render as multi-line textarea instead of single-line input. */
  multiline?: boolean;
  /** Show a required-asterisk and the parent validators should enforce it. */
  required?: boolean;
}

const LOCALE_LABELS: Record<string, string> = {
  EN: 'English',
  HY: 'Հայերեն',
  RU: 'Русский',
};

@Component({
  selector: 'app-translation-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    TranslatePipe,
  ],
  template: `
    <mat-tab-group [animationDuration]="'150ms'">
      @for (group of translationGroups(); track group.value.locale; let i = $index) {
        <mat-tab>
          <ng-template mat-tab-label>
            {{ localeLabel(group.value.locale) }}
            @if (groupHasError(group)) {
              <mat-icon class="tab-error-indicator" aria-label="Has errors">error_outline</mat-icon>
            }
          </ng-template>

          <div class="tab-content" [formGroup]="group">
            @for (field of fields(); track field.key) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>
                  {{ field.labelKey | translate }}
                  @if (field.required) { <span class="req">*</span> }
                </mat-label>

                @if (field.multiline) {
                  <textarea matInput [formControlName]="field.key" rows="4"></textarea>
                } @else {
                  <input matInput [formControlName]="field.key" />
                }

                @if (
                  group.get(field.key)?.invalid &&
                  group.get(field.key)?.touched
                ) {
                  <mat-error>{{ 'admin.errors.fieldRequired' | translate }}</mat-error>
                }
              </mat-form-field>
            }
          </div>
        </mat-tab>
      }
    </mat-tab-group>
  `,
  styles: [
    `
      :host { display: block; }
      .tab-content { padding: 16px 4px 0; display: flex; flex-direction: column; gap: 12px; }
      .full-width { width: 100%; }
      .req { color: #d32f2f; margin-left: 4px; }
      .tab-error-indicator {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-left: 6px;
        color: #d32f2f;
        vertical-align: middle;
      }
    `,
  ],
})
export class TranslationTabsComponent {
  readonly translations = input.required<FormArray>();
  readonly fields = input.required<TranslationField[]>();

  readonly translationGroups = computed(() =>
    this.translations().controls.map((c) => c as FormGroup),
  );

  localeLabel(locale: string): string {
    return LOCALE_LABELS[locale] ?? locale;
  }

  groupHasError(group: FormGroup): boolean {
    // Only show the error indicator after the user has interacted with the
    // group — otherwise every freshly-opened dialog flashes red.
    return group.invalid && group.touched;
  }
}