// frontend/src/app/shared/pipes/upload-url.pipe.spec.ts
import { UploadUrlPipe } from './upload-url.pipe';
import { environment } from '../../../environments/environment';

describe('UploadUrlPipe', () => {
  let pipe: UploadUrlPipe;

  beforeEach(() => {
    pipe = new UploadUrlPipe();
  });

  it('builds a full URL for a relative path', () => {
    expect(pipe.transform('artworks/abc/medium.jpg')).toBe(
      `${environment.uploadsBaseUrl}/artworks/abc/medium.jpg`,
    );
  });

  it('strips a single leading slash to avoid double-slashing', () => {
    expect(pipe.transform('/artworks/abc/medium.jpg')).toBe(
      `${environment.uploadsBaseUrl}/artworks/abc/medium.jpg`,
    );
  });

  it('returns the SVG placeholder for null', () => {
    expect(pipe.transform(null)).toContain('data:image/svg+xml');
  });

  it('returns the SVG placeholder for undefined', () => {
    expect(pipe.transform(undefined)).toContain('data:image/svg+xml');
  });

  it('returns the SVG placeholder for an empty string', () => {
    expect(pipe.transform('')).toContain('data:image/svg+xml');
  });
});
