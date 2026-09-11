// frontend/src/app/features/gallery/gallery.routes.spec.ts
import { GALLERY_ROUTES } from './gallery.routes';

describe('GALLERY_ROUTES', () => {
  it('declares a single empty-path route lazy-loading GalleryComponent', async () => {
    expect(GALLERY_ROUTES.length).toBe(1);
    expect(GALLERY_ROUTES[0].path).toBe('');
    const cmp = await GALLERY_ROUTES[0].loadComponent!();
    const { GalleryComponent } = await import('./gallery.component');
    expect(cmp).toBe(GalleryComponent);
  });
});
