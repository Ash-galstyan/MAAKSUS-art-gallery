// frontend/src/app/features/artwork-detail/artwork-detail.service.ts
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import type { ArtworkDetail } from '../../core/api-models/artwork.model';

@Injectable({ providedIn: 'root' })
export class ArtworkDetailService {
  private readonly api = inject(ApiService);

  getById(id: string): Promise<ArtworkDetail> {
    return this.api.get<ArtworkDetail>(`/artworks/${encodeURIComponent(id)}`);
  }
}
