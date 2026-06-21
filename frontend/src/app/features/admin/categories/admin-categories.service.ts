// frontend/src/app/features/admin/categories/admin-categories.service.ts
/**
 * Admin Categories HTTP service.
 *
 * Endpoints:
 *   GET    /api/categories/admin       full list with all translations
 *   POST   /api/categories             create
 *   PATCH  /api/categories/:id         update
 *   DELETE /api/categories/:id         delete (409 if still referenced)
 */
import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

export interface AdminCategoryTranslation {
  id?: string;
  locale: 'EN' | 'HY' | 'RU';
  name: string;
}

export interface AdminCategory {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  translations: AdminCategoryTranslation[];
}

export interface AdminCategoryInput {
  slug: string;
  translations: AdminCategoryTranslation[];
}

@Injectable({ providedIn: 'root' })
export class AdminCategoriesService {
  private readonly api = inject(ApiService);

  list(): Promise<AdminCategory[]> {
    return this.api.get<AdminCategory[]>('/categories/admin');
  }

  create(input: AdminCategoryInput): Promise<AdminCategory> {
    return this.api.post<AdminCategoryInput, AdminCategory>('/categories', input);
  }

  update(id: string, input: Partial<AdminCategoryInput>): Promise<AdminCategory> {
    return this.api.patch<Partial<AdminCategoryInput>, AdminCategory>(
      `/categories/${encodeURIComponent(id)}`,
      input,
    );
  }

  remove(id: string): Promise<void> {
    return this.api.del(`/categories/${encodeURIComponent(id)}`);
  }
}