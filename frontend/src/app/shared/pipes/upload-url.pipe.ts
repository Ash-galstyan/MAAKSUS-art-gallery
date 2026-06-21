// frontend/src/app/shared/pipes/upload-url.pipe.ts
/**
 * Turns a relative upload path like "artworks/abc/medium.jpg" into the full
 * URL the browser should fetch. In dev that's "/uploads/artworks/abc/medium.jpg"
 * (proxied to Node); in prod it's the same path, served by Nginx directly.
 *
 * Accepts null/undefined safely and emits a transparent placeholder so the
 * gallery never breaks if a thumbnail is missing.
 */
import { Pipe, type PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23eee"/></svg>';

@Pipe({ name: 'uploadUrl', standalone: true })
export class UploadUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    if (!path) return PLACEHOLDER;
    // strip leading slash if present so we don't double up
    const clean = path.startsWith('/') ? path.slice(1) : path;
    return `${environment.uploadsBaseUrl}/${clean}`;
  }
}
