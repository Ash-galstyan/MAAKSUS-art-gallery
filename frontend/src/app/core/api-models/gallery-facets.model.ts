// frontend/src/app/core/api-models/gallery-facets.model.ts
/**
 * Options for the gallery filter panel — served by GET /api/artworks/facets,
 * scoped to the public catalogue (live + available), locale-aware for names.
 */
export interface FacetArtist {
  id: string;
  slug: string;
  name: string;
  count: number;
}

export interface FacetOrientation {
  /** 'portrait' | 'landscape' | 'square' */
  key: string;
  count: number;
}

export interface GalleryFacets {
  artists: FacetArtist[];
  priceRange: { min: number; max: number };
  orientations: FacetOrientation[];
}
