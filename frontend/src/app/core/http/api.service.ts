// frontend/src/app/core/http/api.service.ts
/**
 * Tiny typed wrapper over HttpClient.
 *
 * The backend uses two response shapes:
 *   - { data: T }                         for single records / simple lists
 *   - { data: T[]; nextCursor: string | null }   for paginated lists
 *
 * This service unwraps the envelope so feature services work with raw T.
 * Errors propagate as HttpErrorResponse so the error interceptor still sees
 * them.
 *
 * Method coverage:
 *   get          GET with query params → unwrapped data
 *   getPaginated GET with cursor pagination → { data, nextCursor }
 *   post         POST JSON body → unwrapped data
 *   patch        PATCH JSON body → unwrapped data
 *   del          DELETE → void (backend returns 204)
 *   postForm     POST multipart/form-data → unwrapped data (for image uploads)
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, type HttpParams } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Envelope<T> {
  data: T;
}
interface PaginatedEnvelope<T> {
  data: T[];
  nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return firstValueFrom(
      this.http
        .get<Envelope<T>>(`${this.base}${path}`, { params: this.cleanParams(params) })
        .pipe(map((r) => r.data)),
    );
  }

  getPaginated<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<{ data: T[]; nextCursor: string | null }> {
    return firstValueFrom(
      this.http.get<PaginatedEnvelope<T>>(`${this.base}${path}`, {
        params: this.cleanParams(params),
      }),
    );
  }

  post<TBody, TResp>(path: string, body: TBody): Promise<TResp> {
    return firstValueFrom(
      this.http.post<Envelope<TResp>>(`${this.base}${path}`, body).pipe(map((r) => r.data)),
    );
  }

  patch<TBody, TResp>(path: string, body: TBody): Promise<TResp> {
    return firstValueFrom(
      this.http.patch<Envelope<TResp>>(`${this.base}${path}`, body).pipe(map((r) => r.data)),
    );
  }

  del(path: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}${path}`).pipe(map(() => undefined)),
    );
  }

  /**
   * POST multipart/form-data. Used for image uploads.
   *
   * IMPORTANT: do NOT set Content-Type yourself — the browser must set it
   * along with the multipart boundary. HttpClient knows to leave it alone
   * when the body is a FormData instance.
   *
   * `params` here go into the query string (e.g. ?primary=true), not the form body.
   */
  postForm<TResp>(
    path: string,
    formData: FormData,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<TResp> {
    return firstValueFrom(
      this.http
        .post<Envelope<TResp>>(`${this.base}${path}`, formData, {
          params: this.cleanParams(params),
        })
        .pipe(map((r) => r.data)),
    );
  }

  private cleanParams(
    p?: Record<string, string | number | boolean | undefined>,
  ): HttpParams | undefined {
    if (!p) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined && v !== null && v !== '') out[k] = String(v);
    }
    return out as unknown as HttpParams;
  }
}