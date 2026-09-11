// frontend/src/app/features/cart/cart.routes.spec.ts
import { CART_ROUTES } from './cart.routes';

describe('CART_ROUTES', () => {
  it('declares a single empty-path route lazy-loading CartComponent', async () => {
    expect(CART_ROUTES.length).toBe(1);
    expect(CART_ROUTES[0].path).toBe('');
    const cmp = await CART_ROUTES[0].loadComponent!();
    const { CartComponent } = await import('./cart.component');
    expect(cmp).toBe(CartComponent);
  });
});
