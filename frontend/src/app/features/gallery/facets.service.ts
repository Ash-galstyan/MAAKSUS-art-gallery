// frontend/src/app/features/gallery/facets.service.ts
/**
 * Loads the gallery filter-panel options (artists, price range, orientations).
 * Cached per locale — same rationale as CategoriesService: it changes rarely
 * and the gallery hits it on every visit.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { GalleryFacets } from '../../core/api-models/gallery-facets.model';

@Injectable({ providedIn: 'root' })
export class FacetsService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  private cache = new Map<string, Promise<GalleryFacets>>();

  getFacets(): Promise<GalleryFacets> {
    const key = this.i18n.locale();
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = this.api.get<GalleryFacets>('/artworks/facets');
    this.cache.set(key, promise);
    promise.catch(() => this.cache.delete(key));
    return promise;
  }
}
