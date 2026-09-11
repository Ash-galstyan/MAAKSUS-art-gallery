// frontend/src/app/features/admin/admin.routes.spec.ts
import { ADMIN_ROUTES } from './admin.routes';

describe('ADMIN_ROUTES', () => {
  it('has a single root route lazy-loading AdminLayoutComponent with children', async () => {
    expect(ADMIN_ROUTES.length).toBe(1);
    const root = ADMIN_ROUTES[0];
    expect(root.path).toBe('');
    const cmp = await root.loadComponent!();
    const { AdminLayoutComponent } = await import('./admin-layout.component');
    expect(cmp).toBe(AdminLayoutComponent);
    expect(root.children?.length).toBe(7);
  });

  function child(path: string) {
    return ADMIN_ROUTES[0].children!.find((r) => r.path === path);
  }

  it('redirects the empty child path to artworks', () => {
    const empty = child('');
    expect(empty?.pathMatch).toBe('full');
    expect(empty?.redirectTo).toBe('artworks');
  });

  it('artworks lazy-loads AdminArtworksComponent', async () => {
    const cmp = await child('artworks')!.loadComponent!();
    const { AdminArtworksComponent } = await import('./artworks/admin-artworks.component');
    expect(cmp).toBe(AdminArtworksComponent);
  });

  it('categories lazy-loads AdminCategoriesComponent', async () => {
    const cmp = await child('categories')!.loadComponent!();
    const { AdminCategoriesComponent } = await import('./categories/admin-categories.component');
    expect(cmp).toBe(AdminCategoriesComponent);
  });

  it('artists lazy-loads AdminArtistsComponent', async () => {
    const cmp = await child('artists')!.loadComponent!();
    const { AdminArtistsComponent } = await import('./artists/admin-artists.component');
    expect(cmp).toBe(AdminArtistsComponent);
  });

  it('print-options lazy-loads AdminPrintOptionsComponent', async () => {
    const cmp = await child('print-options')!.loadComponent!();
    const { AdminPrintOptionsComponent } = await import('./print-options/admin-print-options.component');
    expect(cmp).toBe(AdminPrintOptionsComponent);
  });

  it('orders lazy-loads AdminOrdersComponent', async () => {
    const cmp = await child('orders')!.loadComponent!();
    const { AdminOrdersComponent } = await import('./orders/admin-orders.component');
    expect(cmp).toBe(AdminOrdersComponent);
  });

  it('users lazy-loads AdminUsersComponent', async () => {
    const cmp = await child('users')!.loadComponent!();
    const { AdminUsersComponent } = await import('./users/admin-users.component');
    expect(cmp).toBe(AdminUsersComponent);
  });
});
