// frontend/src/app/core/api-models/artist.model.ts
/** Public, localised artist record — GET /api/artists. */
export interface ArtistListItem {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  portraitPath: string | null;
  birthYear: number | null;
  deathYear: number | null;
}
