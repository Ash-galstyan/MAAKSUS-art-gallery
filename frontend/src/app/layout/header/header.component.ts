// frontend/src/app/layout/header/header.component.ts
/**
 * Site header — three bands (see WIKI.md §7 "Navigation" and the reference
 * mockup):
 *
 *   1. Utility bar   — trust signals (left) + Trade & Designers, Sign in,
 *                      language, search, cart (right).
 *   2. Masthead      — MAAKSUS wordmark (left), primary nav (centre),
 *                      Collector's Circle button (right).
 *   3. Search drawer — slides open from the utility-bar search toggle;
 *                      submitting routes to /gallery?q=…
 *
 * On narrow viewports the primary nav collapses into a full-height drawer
 * opened by the hamburger; the utility bar's trust signals are hidden.
 *
 * Self-contained against core services — no inputs/outputs.
 *   auth.isAuthenticated() / isAdmin() / logout()
 *   cart.itemCount()
 *
 * NOTE: Photography / Artists / Collections / New arrivals / Inspiration do
 * not have dedicated routes yet — they point at /gallery. Give them real
 * targets when those pages exist.
 */
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { type IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';
import { CartStorageService } from '../../core/cart/cart-storage.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

interface NavLink {
  readonly key: string;
  readonly link: string;
  /** Query params applied on navigation — e.g. `{ category: 'photography' }`
   *  so the gallery loads pre-filtered. */
  readonly params?: Record<string, string>;
  /** Scroll target on the destination page (homepage sections). */
  readonly fragment?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  template: `
    <header class="site-header" [class.is-open]="menuOpen()">
      <!-- 1 ─ Utility bar ─────────────────────────────────────────────── -->
      <div class="utility">
        <div class="wrap utility__inner">
          <ul class="trust" aria-hidden="true">
            <li>{{ 'announce.prints' | translate }}</li>
            <li>{{ 'announce.framing' | translate }}</li>
            <li>{{ 'announce.trade' | translate }}</li>
            <li>{{ 'announce.delivery' | translate }}</li>
          </ul>

          <div class="utility__meta">
            <a class="meta-link" routerLink="/" fragment="trade">{{ 'nav.trade' | translate }}</a>
            @if (auth.isAuthenticated()) {
              <button
                type="button"
                class="meta-link"
                [matMenuTriggerFor]="userMenu"
                [attr.aria-label]="'nav.account' | translate"
              >
                {{ 'nav.account' | translate }}
              </button>
              <mat-menu #userMenu="matMenu">
                <a mat-menu-item routerLink="/account/profile">{{ 'nav.profile' | translate }}</a>
                @if (auth.isAdmin()) {
                  <a mat-menu-item routerLink="/admin">{{ 'nav.admin' | translate }}</a>
                }
                <button mat-menu-item (click)="logout()">{{ 'nav.logout' | translate }}</button>
              </mat-menu>
            } @else {
              <a class="meta-link" routerLink="/account/login">{{ 'nav.signIn' | translate }}</a>
            }

            <app-language-switcher class="meta-lang"></app-language-switcher>

            <button
              type="button"
              class="icon-btn"
              (click)="toggleSearch()"
              [attr.aria-label]="'nav.search' | translate"
              [attr.aria-expanded]="searchOpen()"
            >
              <mat-icon>{{ searchOpen() ? 'close' : 'search' }}</mat-icon>
            </button>

            <a
              class="icon-btn cart-btn"
              routerLink="/cart"
              [attr.aria-label]="'nav.cart' | translate"
            >
              <mat-icon>shopping_bag</mat-icon>
              @if (cart.itemCount() > 0) {
                <span class="cart-count">{{ cart.itemCount() }}</span>
              }
            </a>
          </div>
        </div>
      </div>

      <!-- 2 ─ Masthead ───────────────────────────────────────────────── -->
      <div class="masthead">
        <div class="wrap masthead__inner">
          <button
            type="button"
            class="icon-btn hamburger"
            (click)="toggleMenu()"
            [attr.aria-label]="(menuOpen() ? 'nav.closeMenu' : 'nav.menu') | translate"
            [attr.aria-expanded]="menuOpen()"
          >
            <mat-icon>{{ menuOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>

          <a routerLink="/" class="brand" (click)="closeMenu()">
            <span class="brand__mark">{{ 'common.appName' | translate }}</span>
          </a>

          <nav class="primary-nav" [attr.aria-label]="'nav.menu' | translate">
            @for (item of navLinks; track item.key) {
              <a
                [routerLink]="item.link"
                [queryParams]="item.params ?? null"
                [fragment]="item.fragment"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="navActiveMatch"
                (click)="closeMenu()"
              >{{ item.key | translate }}</a>
            }
          </nav>

          <a class="btn btn--solid btn--sm masthead__cta" routerLink="/" fragment="collector-circle">
            {{ 'nav.collectorsCircle' | translate }}
          </a>
        </div>
      </div>

      <!-- 3 ─ Search drawer ──────────────────────────────────────────── -->
      @if (searchOpen()) {
        <div class="search-drawer">
          <form class="wrap search-drawer__form" (submit)="submitSearch($event)">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input
              #searchInput
              type="search"
              name="q"
              autocomplete="off"
              [attr.placeholder]="'nav.searchPlaceholder' | translate"
              [attr.aria-label]="'nav.search' | translate"
            />
            <button type="submit" class="link-underline">{{ 'nav.search' | translate }}</button>
          </form>
        </div>
      }

      <!-- Mobile drawer backdrop -->
      @if (menuOpen()) {
        <button type="button" class="scrim" (click)="closeMenu()" tabindex="-1" aria-hidden="true"></button>
      }
    </header>
  `,
  styles: [
    `
      :host {
        position: sticky;
        top: 0;
        z-index: 100;
        display: block;
      }

      .site-header {
        background: var(--c-paper);
        border-bottom: 1px solid var(--c-line);
      }

      .wrap {
        width: 100%;
        max-width: var(--wrap);
        margin-inline: auto;
        padding-inline: var(--gutter);
      }

      /* ── Utility bar ──────────────────────────────────────────────── */
      .utility {
        background: var(--c-paper-alt);
        border-bottom: 1px solid var(--c-line);
        font-size: 11px;
      }
      .utility__inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 40px;
      }
      .trust {
        display: flex;
        gap: 30px;
        margin: 0;
        padding: 0;
        list-style: none;
        color: var(--c-muted);
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        font-weight: 600;
      }
      .utility__meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }
      .meta-link {
        appearance: none;
        background: none;
        border: 0;
        font: inherit;
        cursor: pointer;
        padding: 8px 10px;
        color: var(--c-ink);
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        font-weight: 600;
        white-space: nowrap;
      }
      .meta-link:hover { color: var(--c-muted); }
      .meta-lang { display: inline-flex; }

      .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 0;
        background: none;
        cursor: pointer;
        color: var(--c-ink);
        position: relative;
      }
      .icon-btn:hover { color: var(--c-muted); }
      .icon-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
      .cart-count {
        position: absolute;
        top: 3px;
        right: 1px;
        min-width: 15px;
        height: 15px;
        padding: 0 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--c-ink);
        color: var(--c-paper);
        font-size: 9px;
        font-weight: 700;
        border-radius: 999px;
        letter-spacing: 0;
      }

      /* ── Masthead ─────────────────────────────────────────────────── */
      .masthead__inner {
        display: flex;
        align-items: center;
        gap: 24px;
        min-height: var(--header-h);
      }
      .hamburger { display: none; margin-left: -8px; }
      .brand { flex: none; }
      .brand__mark {
        font-family: var(--font-display);
        font-size: 30px;
        font-weight: 600;
        letter-spacing: 0.14em;
        line-height: 1;
        color: var(--c-ink);
        text-transform: uppercase;
      }
      .primary-nav {
        flex: 1;
        display: flex;
        justify-content: center;
        gap: clamp(18px, 2.6vw, 40px);
      }
      .primary-nav a {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-ink);
        padding: 6px 0;
        border-bottom: 1px solid transparent;
        transition: border-color 160ms ease, color 160ms ease;
        white-space: nowrap;
      }
      .primary-nav a:hover { color: var(--c-muted); }
      .primary-nav a.is-active { border-color: var(--c-ink); }
      .masthead__cta { flex: none; }

      /* ── Search drawer ────────────────────────────────────────────── */
      .search-drawer {
        border-bottom: 1px solid var(--c-line);
        background: var(--c-paper);
      }
      .search-drawer__form {
        display: flex;
        align-items: center;
        gap: 14px;
        padding-block: 20px;
      }
      .search-drawer__form mat-icon { color: var(--c-muted); }
      .search-drawer__form input {
        flex: 1;
        border: 0;
        outline: 0;
        background: none;
        font-family: var(--font-display);
        font-size: clamp(1.1rem, 2.4vw, 1.6rem);
        color: var(--c-ink);
        padding: 4px 0;
      }
      .search-drawer__form input::placeholder { color: var(--c-line-strong); }
      .search-drawer__form input::-webkit-search-cancel-button { display: none; }

      .scrim {
        display: none;
        position: fixed;
        inset: 0;
        border: 0;
        background: rgba(20, 18, 15, 0.32);
        z-index: 90;
      }

      /* ── Responsive ───────────────────────────────────────────────── */
      @media (max-width: 1180px) {
        .trust li:nth-child(n + 3) { display: none; }
      }
      @media (max-width: 1024px) {
        .hamburger { display: inline-flex; }
        .masthead__inner { min-height: 84px; justify-content: space-between; gap: 12px; }
        .brand { order: -1; }
        .primary-nav {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(84vw, 360px);
          background: var(--c-paper);
          border-right: 1px solid var(--c-line);
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
          gap: 4px;
          padding: 96px 32px 32px;
          transform: translateX(-100%);
          transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 95;
        }
        .site-header.is-open .primary-nav { transform: translateX(0); }
        .primary-nav a { font-size: 13px; padding: 14px 0; width: 100%; }
        .masthead__cta { display: none; }
        .scrim { display: block; }
      }
      @media (max-width: 720px) {
        .trust { display: none; }
        .utility__inner { min-height: 44px; }
        .brand__mark { font-size: 24px; }
      }
      @media (max-width: 520px) {
        .utility__meta .meta-link { display: none; }
        .utility__meta { gap: 0; }
      }
    `,
  ],
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStorageService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);

  /** Only mark a nav item active when path AND query match exactly, so
   *  "Art prints" (/gallery) and "Photography" (/gallery?category=photography)
   *  don't both light up on a filtered view. */
  readonly navActiveMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'exact',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /**
   * Primary nav.
   *   Art prints  → the full catalogue.
   *   Photography → gallery filtered to the `photography` category.
   *   Artists     → the artists index.
   *   New arrivals → gallery, recency-filtered (`?new=1`).
   *   Collections → the full catalogue for now — TODO: needs a Collection
   *     entity + curation UI before it can be its own view.
   *   Inspiration → the homepage "Behind the art" section — TODO: needs an
   *     editorial / journal feature for a real destination.
   */
  readonly navLinks: readonly NavLink[] = [
    { key: 'nav.artPrints', link: '/gallery' },
    { key: 'nav.photography', link: '/gallery', params: { category: 'photography' } },
    { key: 'nav.artists', link: '/artists' },
    { key: 'nav.collections', link: '/gallery' },
    { key: 'nav.newArrivals', link: '/gallery', params: { new: '1' } },
    { key: 'nav.inspiration', link: '/', fragment: 'artists' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    if (this.menuOpen()) this.searchOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
    if (this.searchOpen()) this.menuOpen.set(false);
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const value = (form.elements.namedItem('q') as HTMLInputElement | null)?.value.trim() ?? '';
    this.searchOpen.set(false);
    this.router.navigate(['/gallery'], { queryParams: value ? { q: value } : {} });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
    this.searchOpen.set(false);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
