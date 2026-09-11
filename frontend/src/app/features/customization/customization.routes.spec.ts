// frontend/src/app/features/customization/customization.routes.spec.ts
import { CUSTOMIZATION_ROUTES } from './customization.routes';

describe('CUSTOMIZATION_ROUTES', () => {
  it('declares a single empty-path route lazy-loading CustomizationComponent', async () => {
    expect(CUSTOMIZATION_ROUTES.length).toBe(1);
    expect(CUSTOMIZATION_ROUTES[0].path).toBe('');
    const cmp = await CUSTOMIZATION_ROUTES[0].loadComponent!();
    const { CustomizationComponent } = await import('./customization.component');
    expect(cmp).toBe(CustomizationComponent);
  });
});
