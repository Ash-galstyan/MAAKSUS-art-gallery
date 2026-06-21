// frontend/src/app/shared/components/language-switcher/language-switcher.component.ts
/**
 * Language picker — a Material menu button.
 *
 * Renders the active language code in the trigger, opens a menu listing
 * en / hy / ru with their native names. Selecting one calls i18n.setLocale().
 *
 * No inputs/outputs — fully self-contained against I18nService.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { I18nService } from '../../../core/i18n/i18n.service';

const LANG_NAMES: Record<'en' | 'hy' | 'ru', string> = {
  en: 'English',
  hy: 'Հայերեն',
  ru: 'Русский',
};

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button mat-button [matMenuTriggerFor]="menu" aria-label="Change language">
      <mat-icon>language</mat-icon>
      <span class="lang-code">{{ i18n.locale().toUpperCase() }}</span>
    </button>
    <mat-menu #menu="matMenu">
      @for (lang of langs; track lang) {
        <button mat-menu-item (click)="select(lang)" [class.active]="i18n.locale() === lang">
          {{ names[lang] }}
        </button>
      }
    </mat-menu>
  `,
  styles: [
    `
      .lang-code {
        margin-left: 4px;
        font-weight: 500;
      }
      .active {
        font-weight: 600;
      }
    `,
  ],
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly langs: Array<'en' | 'hy' | 'ru'> = ['en', 'hy', 'ru'];
  readonly names = LANG_NAMES;

  async select(lang: 'en' | 'hy' | 'ru'): Promise<void> {
    await this.i18n.setLocale(lang);
  }
}
