// frontend/src/app/core/api-models/artwork.model.ts
export interface ArtworkCategoryRef {
  id: string;
  name: string;
}

export interface ArtworkArtistRef {
  id: string;
  slug?: string;
  name: string;
  bio?: string | null;
  portraitPath?: string | null;
}

/** List view — what the gallery grid renders. */
export interface ArtworkListItem {
  id: string;
  slug: string;
  title: string;
  artist: ArtworkArtistRef;
  category: ArtworkCategoryRef;
  basePrice: number;
  thumbnailPath: string | null;
  mediumPath: string | null;
  width: number | null;
  height: number | null;
}

/** Image attached to an artwork. */
export interface ArtworkImage {
  id: string;
  originalPath: string;
  mediumPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

/** Detail view — what the artwork page renders. */
export interface ArtworkDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  history: string | null;
  medium: string | null;
  year: number | null;
  widthCm: number | null;
  heightCm: number | null;
  basePrice: number;
  isAvailable: boolean;
  artist: ArtworkArtistRef;
  category: ArtworkCategoryRef;
  images: ArtworkImage[];
}
