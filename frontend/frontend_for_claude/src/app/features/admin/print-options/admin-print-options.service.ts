// frontend/src/app/features/admin/print-options/admin-print-options.service.ts
/**
 * Admin Print Options HTTP service.
 *
 * Endpoints:
 *   GET    /api/print-options/sizes/admin
 *   POST   /api/print-options/sizes
 *   PATCH  /api/print-options/sizes/:id
 *   DELETE /api/print-options/sizes/:id
 *   GET    /api/print-options/frames/admin
 *   POST   /api/print-options/frames
 *   PATCH  /api/print-options/frames/:id
 *   DELETE /api/print-options/frames/:id
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

export interface AdminPrintSizeTranslation {
  id?: string;
  locale: 'EN' | 'HY' | 'RU';
  label: string;
}

export interface AdminPrintSize {
  id: string;
  code: string;
  widthCm: number | string;
  heightCm: number | string;
  priceMultiplier: number | string;
  isActive: boolean;
  position: number;
  translations: AdminPrintSizeTranslation[];
}

export interface AdminPrintSizeInput {
  code: string;
  widthCm: number;
  heightCm: number;
  priceMultiplier: number;
  isActive?: boolean;
  position?: number;
  translations: AdminPrintSizeTranslation[];
}

export type FrameType = 'NONE' | 'WOOD' | 'METAL' | 'PLASTIC';

export interface AdminFrameOptionTranslation {
  id?: string;
  locale: 'EN' | 'HY' | 'RU';
  label: string;
}

export interface AdminFrameOption {
  id: string;
  code: string;
  frameType: FrameType;
  colorHex: string;
  additionalPrice: number | string;
  isActive: boolean;
  position: number;
  translations: AdminFrameOptionTranslation[];
}

export interface AdminFrameOptionInput {
  code: string;
  frameType: FrameType;
  colorHex: string;
  additionalPrice: number;
  isActive?: boolean;
  position?: number;
  translations: AdminFrameOptionTranslation[];
}

@Injectable({ providedIn: 'root' })
export class AdminPrintOptionsService {
  private readonly api = inject(ApiService);

  // ─── Sizes ────────────────────────────────────────────────────────────
  listSizes(): Promise<AdminPrintSize[]> {
    return this.api.get<AdminPrintSize[]>('/print-options/sizes/admin');
  }
  createSize(input: AdminPrintSizeInput): Promise<AdminPrintSize> {
    return this.api.post<AdminPrintSizeInput, AdminPrintSize>('/print-options/sizes', input);
  }
  updateSize(id: string, input: Partial<AdminPrintSizeInput>): Promise<AdminPrintSize> {
    return this.api.patch<Partial<AdminPrintSizeInput>, AdminPrintSize>(
      `/print-options/sizes/${encodeURIComponent(id)}`,
      input,
    );
  }
  removeSize(id: string): Promise<void> {
    return this.api.del(`/print-options/sizes/${encodeURIComponent(id)}`);
  }

  // ─── Frames ───────────────────────────────────────────────────────────
  listFrames(): Promise<AdminFrameOption[]> {
    return this.api.get<AdminFrameOption[]>('/print-options/frames/admin');
  }
  createFrame(input: AdminFrameOptionInput): Promise<AdminFrameOption> {
    return this.api.post<AdminFrameOptionInput, AdminFrameOption>('/print-options/frames', input);
  }
  updateFrame(id: string, input: Partial<AdminFrameOptionInput>): Promise<AdminFrameOption> {
    return this.api.patch<Partial<AdminFrameOptionInput>, AdminFrameOption>(
      `/print-options/frames/${encodeURIComponent(id)}`,
      input,
    );
  }
  removeFrame(id: string): Promise<void> {
    return this.api.del(`/print-options/frames/${encodeURIComponent(id)}`);
  }
}