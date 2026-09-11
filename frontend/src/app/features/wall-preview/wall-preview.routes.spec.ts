// frontend/src/app/features/wall-preview/wall-preview.routes.spec.ts
import { WALL_PREVIEW_ROUTES } from './wall-preview.routes';

describe('WALL_PREVIEW_ROUTES', () => {
  it('declares a single empty-path route lazy-loading WallPreviewComponent', async () => {
    expect(WALL_PREVIEW_ROUTES.length).toBe(1);
    expect(WALL_PREVIEW_ROUTES[0].path).toBe('');
    const cmp = await WALL_PREVIEW_ROUTES[0].loadComponent!();
    const { WallPreviewComponent } = await import('./wall-preview.component');
    expect(cmp).toBe(WallPreviewComponent);
  });
});
