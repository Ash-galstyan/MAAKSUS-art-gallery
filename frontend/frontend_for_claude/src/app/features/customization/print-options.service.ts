// frontend/src/app/features/customization/print-options.service.ts
/**
 * Fetches localised print sizes + frame options. Cached for the session per
 * locale — admin-defined data that changes rarely.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { FrameOption, PrintSize } from '../../core/api-models/print-options.model';

@Injectable({ providedIn: 'root' })
export class PrintOptionsService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  private sizesCache = new Map<string, Promise<PrintSize[]>>();
  private framesCache = new Map<string, Promise<FrameOption[]>>();

  listSizes(): Promise<PrintSize[]> {
    return this.cached(this.sizesCache, () => this.api.get<PrintSize[]>('/print-options/sizes'));
  }

  listFrames(): Promise<FrameOption[]> {
    return this.cached(this.framesCache, () =>
      this.api.get<FrameOption[]>('/print-options/frames'),
    );
  }

  private cached<T>(map: Map<string, Promise<T>>, fetcher: () => Promise<T>): Promise<T> {
    const key = this.i18n.locale();
    const hit = map.get(key);
    if (hit) return hit;
    const promise = fetcher();
    map.set(key, promise);
    promise.catch(() => map.delete(key));
    return promise;
  }
}
