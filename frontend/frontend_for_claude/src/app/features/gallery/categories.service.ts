// frontend/src/app/features/gallery/categories.service.ts
/**
 * Lists categories for the chip filter. Cached for the session — categories
 * change rarely and the gallery hits this on every revisit.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { Category } from '../../core/api-models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  /** Cache keyed by locale — switching languages re-fetches localised names. */
  private cache = new Map<string, Promise<Category[]>>();

  list(): Promise<Category[]> {
    const key = this.i18n.locale();
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = this.api.get<Category[]>('/categories');
    this.cache.set(key, promise);
    // Drop cache on rejection so a transient failure doesn't poison the session.
    promise.catch(() => this.cache.delete(key));
    return promise;
  }
}
