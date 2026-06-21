// frontend/src/app/layout/header/header.component.ts
/**
 * App header.
 *
 * Left:   logo + brand → /
 * Middle: nav link "Gallery"
 * Right:  language switcher, cart badge (links to /cart), user menu
 *
 * Reads:
 *   - auth.currentUser()  — show "Log in" or user menu
 *   - auth.isAdmin()      — show "Admin" link
 *   - cart.itemCount()    — show badge if > 0
 *
 * No inputs/outputs — self-contained against core services.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/auth/auth.service';
import { CartStorageService } from '../../core/cart/cart-storage.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  template: `
    <mat-toolbar color="primary" class="header">
      <a routerLink="/" class="brand">
        <mat-icon>palette</mat-icon>
        <span>{{ 'common.appName' | translate }}</span>
      </a>

      <nav class="nav">
        <a mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          {{ 'nav.gallery' | translate }}
        </a>
      </nav>

      <span class="spacer"></span>

      <app-language-switcher></app-language-switcher>

      <a mat-icon-button routerLink="/cart" [matBadge]="cart.itemCount()" [matBadgeHidden]="cart.itemCount() === 0"
         matBadgeColor="accent" matBadgeSize="small" aria-label="Cart">
        <mat-icon>shopping_cart</mat-icon>
      </a>

      @if (auth.isAuthenticated()) {
        <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="Account">
          <mat-icon>person</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <a mat-menu-item routerLink="/account/profile">
            <mat-icon>account_circle</mat-icon>
            <span>{{ 'nav.profile' | translate }}</span>
          </a>
          @if (auth.isAdmin()) {
            <a mat-menu-item routerLink="/admin">
              <mat-icon>admin_panel_settings</mat-icon>
              <span>{{ 'nav.admin' | translate }}</span>
            </a>
          }
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>{{ 'nav.logout' | translate }}</span>
          </button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/account/login">{{ 'nav.login' | translate }}</a>
      }
    </mat-toolbar>
  `,
  styles: [
    `
      :host {
        position: sticky;
        top: 0;
        z-index: 100;
        display: block;
      }
      .header { gap: 8px; }
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        color: inherit;
        font-weight: 600;
      }
      .nav { margin-left: 24px; display: flex; gap: 8px; }
      .spacer { flex: 1; }
      .active { font-weight: 600; text-decoration: underline; }
    `,
  ],
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStorageService);

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
