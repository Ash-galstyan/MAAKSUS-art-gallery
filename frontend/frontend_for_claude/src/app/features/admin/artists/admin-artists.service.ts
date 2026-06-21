// frontend/src/app/features/admin/artists/admin-artists.service.ts
/**
 * Admin Artists HTTP service.
 *
 * Endpoints:
 *   GET    /api/artists/admin         full list with all translations + artwork counts
 *   POST   /api/artists               create
 *   PATCH  /api/artists/:id           update
 *   DELETE /api/artists/:id           delete (409 if has artworks)
 *
 * Note: portrait upload uses the artworks image-upload mechanism in spirit
 * but the artist portrait endpoint isn't exposed in v1 — out of scope here.
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

export interface AdminArtistTranslation {
  id?: string;
  locale: 'EN' | 'HY' | 'RU';
  name: string;
  bio?: string | null;
}

export interface AdminArtist {
  id: string;
  slug: string;
  birthYear: number | null;
  deathYear: number | null;
  portraitPath: string | null;
  createdAt: string;
  updatedAt: string;
  translations: AdminArtistTranslation[];
  _count?: { artworks: number };
}

export interface AdminArtistInput {
  slug: string;
  birthYear?: number;
  deathYear?: number;
  translations: AdminArtistTranslation[];
}

@Injectable({ providedIn: 'root' })
export class AdminArtistsService {
  private readonly api = inject(ApiService);

  list(): Promise<AdminArtist[]> {
    return this.api.get<AdminArtist[]>('/artists/admin');
  }

  create(input: AdminArtistInput): Promise<AdminArtist> {
    return this.api.post<AdminArtistInput, AdminArtist>('/artists', input);
  }

  update(id: string, input: Partial<AdminArtistInput>): Promise<AdminArtist> {
    return this.api.patch<Partial<AdminArtistInput>, AdminArtist>(
      `/artists/${encodeURIComponent(id)}`,
      input,
    );
  }

  remove(id: string): Promise<void> {
    return this.api.del(`/artists/${encodeURIComponent(id)}`);
  }
}