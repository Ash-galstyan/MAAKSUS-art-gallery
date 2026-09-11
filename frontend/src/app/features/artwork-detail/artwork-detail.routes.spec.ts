// frontend/src/app/features/artwork-detail/artwork-detail.routes.spec.ts
import { ARTWORK_DETAIL_ROUTES } from './artwork-detail.routes';

describe('ARTWORK_DETAIL_ROUTES', () => {
  it('declares a single empty-path route lazy-loading ArtworkDetailComponent', async () => {
    expect(ARTWORK_DETAIL_ROUTES.length).toBe(1);
    expect(ARTWORK_DETAIL_ROUTES[0].path).toBe('');
    const cmp = await ARTWORK_DETAIL_ROUTES[0].loadComponent!();
    const { ArtworkDetailComponent } = await import('./artwork-detail.component');
    expect(cmp).toBe(ArtworkDetailComponent);
  });
});
