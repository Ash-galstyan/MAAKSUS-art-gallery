// frontend/src/app/features/admin/artworks/admin-artworks.service.ts
/**
 * Admin Artworks HTTP service.
 *
 * Endpoints used:
 *   GET    /api/artworks/admin                     full list with all translations
 *   POST   /api/artworks                           create
 *   PATCH  /api/artworks/:id                       update (partial)
 *   DELETE /api/artworks/:id                       soft delete
 *   PATCH  /api/artworks/:id/availability          toggle isAvailable
 *   POST   /api/artworks/:id/images?primary=...    upload image (multipart)
 *   DELETE /api/artworks/:id/images/:imageId       remove image
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

export interface AdminArtworkTranslation {
  id?: string;
  locale: 'EN' | 'HY' | 'RU';
  title: string;
  description?: string | null;
  history?: string | null;
  medium?: string | null;
}

export interface AdminArtworkImage {
  id: string;
  thumbnailPath: string;
  mediumPath: string;
  originalPath: string;
  width: number;
  height: number;
  isPrimary: boolean;
  position: number;
}

export interface AdminArtwork {
  id: string;
  slug: string;
  artistId: string;
  categoryId: string;
  year: number | null;
  medium: string | null;
  widthCm: number | string | null;
  heightCm: number | string | null;
  basePrice: number | string;
  isAvailable: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  translations: AdminArtworkTranslation[];
  images: AdminArtworkImage[];
  artist: {
    id: string;
    slug: string;
    translations: { locale: 'EN' | 'HY' | 'RU'; name: string }[];
  };
  category: {
    id: string;
    slug: string;
    translations: { locale: 'EN' | 'HY' | 'RU'; name: string }[];
  };
}

export interface AdminArtworkInput {
  slug: string;
  artistId: string;
  categoryId: string;
  year?: number;
  medium?: string;
  widthCm?: number;
  heightCm?: number;
  basePrice: number;
  isAvailable?: boolean;
  translations: AdminArtworkTranslation[];
}

@Injectable({ providedIn: 'root' })
export class AdminArtworksService {
  private readonly api = inject(ApiService);

  list(): Promise<AdminArtwork[]> {
    return this.api.get<AdminArtwork[]>('/artworks/admin');
  }

  create(input: AdminArtworkInput): Promise<AdminArtwork> {
    return this.api.post<AdminArtworkInput, AdminArtwork>('/artworks', input);
  }

  update(id: string, input: Partial<AdminArtworkInput>): Promise<AdminArtwork> {
    return this.api.patch<Partial<AdminArtworkInput>, AdminArtwork>(
      `/artworks/${encodeURIComponent(id)}`,
      input,
    );
  }

  remove(id: string): Promise<void> {
    return this.api.del(`/artworks/${encodeURIComponent(id)}`);
  }

  setAvailability(id: string, isAvailable: boolean): Promise<void> {
    return this.api.patch<{ isAvailable: boolean }, void>(
      `/artworks/${encodeURIComponent(id)}/availability`,
      { isAvailable },
    );
  }

  uploadImage(
    artworkId: string,
    file: File,
    options?: { primary?: boolean },
  ): Promise<AdminArtworkImage> {
    const form = new FormData();
    form.append('image', file, file.name);
    return this.api.postForm<AdminArtworkImage>(
      `/artworks/${encodeURIComponent(artworkId)}/images`,
      form,
      { primary: options?.primary ? 'true' : undefined },
    );
  }

  removeImage(artworkId: string, imageId: string): Promise<void> {
    return this.api.del(
      `/artworks/${encodeURIComponent(artworkId)}/images/${encodeURIComponent(imageId)}`,
    );
  }
}