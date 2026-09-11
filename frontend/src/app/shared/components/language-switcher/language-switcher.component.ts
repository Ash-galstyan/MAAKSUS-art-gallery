// frontend/src/app/shared/components/language-switcher/language-switcher.component.ts
/**
 * Language picker — a slim text trigger ("EN") that opens a small dropdown
 * listing en / hy / ru by their native names. Selecting one calls
 * i18n.setLocale().
 *
 * Plain markup (no Angular Material) so it sits cleanly in the header's
 * utility bar. Self-contained against I18nService — no inputs/outputs.
 */
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';

type Lang = 'en' | 'hy' | 'ru';

const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  hy: 'Հայերեն',
  ru: 'Русский',
};

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang">
      <button
        type="button"
        class="lang__trigger"
        (click)="open.set(!open())"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="i18n.t('common.language')"
      >
        {{ i18n.locale().toUpperCase() }}
        <span class="lang__caret" aria-hidden="true"></span>
      </button>
      @if (open()) {
        <ul class="lang__menu" role="listbox">
          @for (lang of langs; track lang) {
            <li>
              <button
                type="button"
                role="option"
                [attr.aria-selected]="i18n.locale() === lang"
                [class.is-active]="i18n.locale() === lang"
                (click)="select(lang)"
              >
                {{ names[lang] }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .lang { position: relative; }
      .lang__trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        appearance: none;
        background: none;
        border: 0;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-ink);
        padding: 8px 10px;
      }
      .lang__trigger:hover { color: var(--c-muted); }
      .lang__caret {
        width: 0;
        height: 0;
        border-left: 3.5px solid transparent;
        border-right: 3.5px solid transparent;
        border-top: 4px solid currentColor;
      }
      .lang__menu {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        margin: 0;
        padding: 6px;
        list-style: none;
        min-width: 150px;
        background: var(--c-paper);
        border: 1px solid var(--c-line);
        box-shadow: 0 12px 40px -12px rgba(20, 18, 15, 0.25);
        z-index: 120;
      }
      .lang__menu button {
        display: block;
        width: 100%;
        text-align: left;
        appearance: none;
        background: none;
        border: 0;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        color: var(--c-ink);
        padding: 9px 12px;
      }
      .lang__menu button:hover { background: var(--c-paper-alt); }
      .lang__menu button.is-active { font-weight: 600; }
    `,
  ],
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly langs: readonly Lang[] = ['en', 'hy', 'ru'];
  readonly names = LANG_NAMES;
  readonly open = signal(false);

  async select(lang: Lang): Promise<void> {
    this.open.set(false);
    await this.i18n.setLocale(lang);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
