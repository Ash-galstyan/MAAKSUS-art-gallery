// frontend/src/app/features/admin/admin-layout.component.ts
/**
 * Admin shell — sidebar nav + <router-outlet>.
 *
 * Routes inside /admin/*:
 *   /admin           → /admin/artworks (redirect)
 *   /admin/artworks  → list + actions
 *   /admin/categories
 *   /admin/artists
 *   /admin/print-options
 *   /admin/orders
 *   /admin/users
 *
 * The role guard on /admin in app.routes.ts handles auth — if the user isn't
 * ADMIN they're bounced to /. This layout just lays out the panel.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    TranslatePipe,
  ],
  template: `
    <mat-sidenav-container class="admin-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <h2 class="sidenav-title">{{ 'admin.title' | translate }}</h2>
        <mat-nav-list>
          <a mat-list-item routerLink="artworks" routerLinkActive="active">
            <mat-icon matListItemIcon>image</mat-icon>
            <span matListItemTitle>{{ 'admin.nav.artworks' | translate }}</span>
          </a>
          <a mat-list-item routerLink="categories" routerLinkActive="active">
            <mat-icon matListItemIcon>category</mat-icon>
            <span matListItemTitle>{{ 'admin.nav.categories' | translate }}</span>
          </a>
          <a mat-list-item routerLink="artists" routerLinkActive="active">
            <mat-icon matListItemIcon>palette</mat-icon>
            <span matListItemTitle>{{ 'admin.nav.artists' | translate }}</span>
          </a>
          <a mat-list-item routerLink="print-options" routerLinkActive="active">
            <mat-icon matListItemIcon>tune</mat-icon>
            <span matListItemTitle>{{ 'admin.nav.printOptions' | translate }}</span>
          </a>
          <a mat-list-item routerLink="orders" routerLinkActive="active">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span matListItemTitle>{{ 'admin.nav.orders' | translate }}</span>
          </a>
          <a mat-list-item routerLink="users" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>{{ 'admin.nav.users' | translate }}</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .admin-container { height: calc(100vh - 64px); }
      .sidenav { width: 240px; background: #fafafa; border-right: 1px solid #eee; }
      .sidenav-title { padding: 16px; margin: 0; font-size: 18px; font-weight: 600; }
      .active { background: rgba(103, 58, 183, 0.08); }
      .content { padding: 24px; }
    `,
  ],
})
export class AdminLayoutComponent {}
