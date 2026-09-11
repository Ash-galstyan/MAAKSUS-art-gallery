// frontend/src/app/features/artists/artists.routes.spec.ts
import { ARTISTS_ROUTES } from './artists.routes';

describe('ARTISTS_ROUTES', () => {
  it('declares a single empty-path route lazy-loading ArtistsIndexComponent', async () => {
    expect(ARTISTS_ROUTES.length).toBe(1);
    expect(ARTISTS_ROUTES[0].path).toBe('');
    const cmp = await ARTISTS_ROUTES[0].loadComponent!();
    const { ArtistsIndexComponent } = await import('./artists-index.component');
    expect(cmp).toBe(ArtistsIndexComponent);
  });
});
