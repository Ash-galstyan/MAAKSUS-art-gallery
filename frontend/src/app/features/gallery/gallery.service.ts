// frontend/src/app/features/gallery/gallery.service.ts
/**
 * Reads:
 *   - listArtworks({ categoryIds[], search, cursor, limit })
 *     → { items, nextCursor }
 *
 * Maps frontend cursor pagination to backend query shape: categoryIds are
 * joined with commas, undefined params are dropped by ApiService.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';

export type ArtworkSort = 'newest' | 'price-asc' | 'price-desc';

export interface ListArtworksArgs {
  categoryIds?: string[];
  artistIds?: string[];
  newOnly?: boolean;
  priceMin?: number | null;
  priceMax?: number | null;
  orientation?: string[];
  sort?: ArtworkSort;
  search?: string;
  cursor?: string | null;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly api = inject(ApiService);

  async listArtworks(args: ListArtworksArgs): Promise<{
    items: ArtworkListItem[];
    nextCursor: string | null;
  }> {
    const resp = await this.api.getPaginated<ArtworkListItem>('/artworks', {
      categoryIds: args.categoryIds?.length ? args.categoryIds.join(',') : undefined,
      artistIds: args.artistIds?.length ? args.artistIds.join(',') : undefined,
      new: args.newOnly ? '1' : undefined,
      priceMin: args.priceMin ?? undefined,
      priceMax: args.priceMax ?? undefined,
      orientation: args.orientation?.length ? args.orientation.join(',') : undefined,
      sort: args.sort && args.sort !== 'newest' ? args.sort : undefined,
      search: args.search?.trim() || undefined,
      cursor: args.cursor ?? undefined,
      limit: args.limit ?? 24,
    });
    return { items: resp.data, nextCursor: resp.nextCursor };
  }
}
