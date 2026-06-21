// frontend/src/app/core/i18n/translate.pipe.ts
/**
 * Pipe for templates: {{ 'gallery.title' | translate }}
 * With params:        {{ 'cart.itemsCount' | translate: { count: total() } }}
 *
 * Impure on purpose — re-evaluates when the language signal changes.
 * The signal-based design keeps this cheap; Angular's change detector
 * runs it only when something in the component is dirty.
 */
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  transform(key: string, params?: Record<string, string | number>): string {
    // Read the locale signal so Angular treats this pipe as dependent on it.
    this.i18n.locale();
    return this.i18n.t(key, params);
  }
}
