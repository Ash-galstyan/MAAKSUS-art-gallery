// frontend/src/app/shared/pipes/price.pipe.ts
/**
 * AMD price formatter. Whole numbers only (Armenia has no sub-unit currency).
 * Uses Intl.NumberFormat keyed off the active locale for thousands separators
 * appropriate to the language.
 */
import { Pipe, type PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Pipe({ name: 'price', standalone: true, pure: false })
export class PricePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(amount: number | null | undefined): string {
    // Touch the locale signal so the pipe re-runs on language change.
    const lang = this.i18n.locale();
    if (amount === null || amount === undefined) return '';
    const fmt = new Intl.NumberFormat(this.intlLocale(lang), {
      style: 'currency',
      currency: 'AMD',
      maximumFractionDigits: 0,
    });
    return fmt.format(amount);
  }

  private intlLocale(lang: 'en' | 'hy' | 'ru'): string {
    return lang === 'hy' ? 'hy-AM' : lang === 'ru' ? 'ru-RU' : 'en-US';
  }
}
