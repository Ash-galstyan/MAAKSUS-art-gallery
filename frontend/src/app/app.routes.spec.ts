import { APP_ROUTES } from './app.routes';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/role.guard';

describe('APP_ROUTES', () => {
  function byPath(path: string) {
    return APP_ROUTES.find((r) => r.path === path);
  }

  it('declares the expected top-level paths', () => {
    const paths = APP_ROUTES.map((r) => r.path);
    expect(paths).toEqual([
      '',
      'gallery',
      'artists',
      'artwork/:id',
      'wall-preview/:artworkId',
      'customize/:artworkId',
      'cart',
      'checkout',
      'order/:id',
      'account',
      'admin',
      '**',
    ]);
  });

  it('the root route matches full and lazy-loads HomeComponent', async () => {
    const root = byPath('');
    expect(root?.pathMatch).toBe('full');
    const cmp = await root!.loadComponent!();
    const { HomeComponent } = await import('./features/home/home.component');
    expect(cmp).toBe(HomeComponent);
  });

  it('gallery lazy-loads the gallery routes', async () => {
    const routes = await byPath('gallery')!.loadChildren!();
    const { GALLERY_ROUTES } = await import('./features/gallery/gallery.routes');
    expect(routes).toBe(GALLERY_ROUTES);
  });

  it('artists lazy-loads the artists routes', async () => {
    const routes = await byPath('artists')!.loadChildren!();
    const { ARTISTS_ROUTES } = await import('./features/artists/artists.routes');
    expect(routes).toBe(ARTISTS_ROUTES);
  });

  it('artwork/:id lazy-loads the artwork-detail routes', async () => {
    const routes = await byPath('artwork/:id')!.loadChildren!();
    const { ARTWORK_DETAIL_ROUTES } = await import('./features/artwork-detail/artwork-detail.routes');
    expect(routes).toBe(ARTWORK_DETAIL_ROUTES);
  });

  it('wall-preview/:artworkId lazy-loads the wall-preview routes', async () => {
    const routes = await byPath('wall-preview/:artworkId')!.loadChildren!();
    const { WALL_PREVIEW_ROUTES } = await import('./features/wall-preview/wall-preview.routes');
    expect(routes).toBe(WALL_PREVIEW_ROUTES);
  });

  it('customize/:artworkId lazy-loads the customization routes', async () => {
    const routes = await byPath('customize/:artworkId')!.loadChildren!();
    const { CUSTOMIZATION_ROUTES } = await import('./features/customization/customization.routes');
    expect(routes).toBe(CUSTOMIZATION_ROUTES);
  });

  it('cart lazy-loads the cart routes', async () => {
    const routes = await byPath('cart')!.loadChildren!();
    const { CART_ROUTES } = await import('./features/cart/cart.routes');
    expect(routes).toBe(CART_ROUTES);
  });

  it('checkout is guarded by authGuard and lazy-loads CHECKOUT_ROUTES', async () => {
    const route = byPath('checkout');
    expect(route?.canActivate).toEqual([authGuard]);
    const routes = await route!.loadChildren!();
    const { CHECKOUT_ROUTES } = await import('./features/checkout/checkout.routes');
    expect(routes).toBe(CHECKOUT_ROUTES);
  });

  it('order/:id is guarded by authGuard and lazy-loads ORDER_ROUTES', async () => {
    const route = byPath('order/:id');
    expect(route?.canActivate).toEqual([authGuard]);
    const routes = await route!.loadChildren!();
    const { ORDER_ROUTES } = await import('./features/checkout/checkout.routes');
    expect(routes).toBe(ORDER_ROUTES);
  });

  it('account lazy-loads the account routes', async () => {
    const routes = await byPath('account')!.loadChildren!();
    const { ACCOUNT_ROUTES } = await import('./features/account/account.routes');
    expect(routes).toBe(ACCOUNT_ROUTES);
  });

  it('admin is guarded by adminGuard and lazy-loads ADMIN_ROUTES', async () => {
    const route = byPath('admin');
    expect(route?.canActivate).toEqual([adminGuard]);
    const routes = await route!.loadChildren!();
    const { ADMIN_ROUTES } = await import('./features/admin/admin.routes');
    expect(routes).toBe(ADMIN_ROUTES);
  });

  it('unmatched paths redirect to root', () => {
    const wildcard = byPath('**');
    expect(wildcard?.redirectTo).toBe('');
  });
});
