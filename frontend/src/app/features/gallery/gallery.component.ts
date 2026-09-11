// frontend/src/app/features/gallery/gallery.component.ts
/**
 * Gallery page — the catalogue browse route (`/gallery`).
 *
 * Axis split (see docs/gallery-filters.md):
 *   - CATEGORY is the nav axis. It arrives as `?category=<slug>` from the
 *     header nav / breadcrumb, drives the H1 + breadcrumb, and is shown as a
 *     removable chip. There is deliberately no category picker in the toolbar.
 *   - The toolbar owns the refinement FACETS: artist, price range, shape
 *     (orientation), plus sort. Each is a `?param` so filtered views are
 *     shareable and survive back/forward.
 *
 * State (signals):
 *   searchInput / searchCommitted       — text search (committed is debounced)
 *   selectedCategoryIds : Set<string>   — 0 or 1 (single-category browse)
 *   selectedArtistIds   : Set<string>
 *   priceMin / priceMax  : number | null
 *   selectedOrientations: Set<string>   — 'portrait' | 'landscape' | 'square'
 *   sort                 : ArtworkSort
 *   items / nextCursor / loading / initialLoaded — list + infinite scroll
 *
 * Data flow is one-directional: URL → state (the hydrate effect, reads guarded
 * by `untracked()` so a filter change can't be clobbered by a stale URL read);
 * state → URL (`writeUrl`, debounced). The list is fetched from the signals,
 * never the URL, so URL lag is cosmetic.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GalleryService, type ArtworkSort } from './gallery.service';
import { CategoriesService } from './categories.service';
import { FacetsService } from './facets.service';
import { ArtworkCardComponent } from './artwork-card.component';
import { OnVisibleDirective } from '../../shared/directives/intersection.directive';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';
import type { Category } from '../../core/api-models/category.model';
import type { GalleryFacets } from '../../core/api-models/gallery-facets.model';

const SEARCH_DEBOUNCE_MS = 300;
const URL_SYNC_DEBOUNCE_MS = 250;
const PAGE_SIZE = 24;

const SORTS: readonly ArtworkSort[] = ['newest', 'price-asc', 'price-desc'];
const SORT_KEY: Record<ArtworkSort, string> = {
  newest: 'gallery.sortNewest',
  'price-asc': 'gallery.sortPriceAsc',
  'price-desc': 'gallery.sortPriceDesc',
};
const ORIENTATIONS: readonly string[] = ['portrait', 'landscape', 'square'];

@Component({
  selector: 'app-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    ArtworkCardComponent,
    OnVisibleDirective,
    TranslatePipe,
    PricePipe,
  ],
  template: `
    <header class="page-head">
      <div class="container">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/gallery">{{ 'gallery.pageTitle' | translate }}</a>
          @if (pageHeading()) {
            <span aria-hidden="true">/</span>
            <span class="crumbs__current">{{ pageHeading() }}</span>
          }
        </nav>
        <span class="eyebrow">{{ 'gallery.pageEyebrow' | translate }}</span>
        <h1 class="display-2">{{ pageHeading() || ('gallery.pageTitle' | translate) }}</h1>
        <p class="lead">{{ 'gallery.pageLead' | translate }}</p>
      </div>
    </header>

    <section class="filters">
      <div class="container filters-row">
        <div class="facets">
          <!-- Artist -->
          @if (facets()?.artists?.length) {
            <button type="button" class="facet-trigger" [matMenuTriggerFor]="artistMenu">
              <span>{{ 'gallery.filterArtist' | translate }}</span>
              @if (selectedArtistIds().size > 0) {
                <span class="facet-count">{{ selectedArtistIds().size }}</span>
              }
              <mat-icon class="facet-caret">expand_more</mat-icon>
            </button>
            <mat-menu #artistMenu="matMenu" class="facet-menu" xPosition="after">
              @for (a of facets()!.artists; track a.id) {
                <button
                  type="button"
                  mat-menu-item
                  class="facet-item"
                  [class.selected]="selectedArtistIds().has(a.id)"
                  (click)="toggleArtist(a.id); $event.stopPropagation()"
                >
                  <mat-icon class="facet-check">{{ selectedArtistIds().has(a.id) ? 'check' : '' }}</mat-icon>
                  <span>{{ a.name }} <em class="facet-n">{{ a.count }}</em></span>
                </button>
              }
            </mat-menu>
          }

          <!-- Price -->
          <button type="button" class="facet-trigger" [matMenuTriggerFor]="priceMenu">
            <span>{{ 'gallery.filterPrice' | translate }}</span>
            @if (priceMin() !== null || priceMax() !== null) {
              <span class="facet-count">1</span>
            }
            <mat-icon class="facet-caret">expand_more</mat-icon>
          </button>
          <mat-menu #priceMenu="matMenu" class="facet-menu facet-menu--price" xPosition="after">
            <div class="price-fields" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
              <label>
                <span>{{ 'gallery.priceFrom' | translate }}</span>
                <input type="number" inputmode="numeric" min="0"
                       [value]="priceMin() ?? ''"
                       [attr.placeholder]="facets()?.priceRange?.min ?? 0"
                       (change)="setPriceMin($any($event.target).value)" />
              </label>
              <label>
                <span>{{ 'gallery.priceTo' | translate }}</span>
                <input type="number" inputmode="numeric" min="0"
                       [value]="priceMax() ?? ''"
                       [attr.placeholder]="facets()?.priceRange?.max ?? 0"
                       (change)="setPriceMax($any($event.target).value)" />
              </label>
              @if (priceMin() !== null || priceMax() !== null) {
                <button type="button" class="price-reset" (click)="clearPrice()">
                  {{ 'gallery.priceAny' | translate }}
                </button>
              }
            </div>
          </mat-menu>

          <!-- Shape / orientation -->
          @if (facets()?.orientations?.length) {
            <button type="button" class="facet-trigger" [matMenuTriggerFor]="shapeMenu">
              <span>{{ 'gallery.filterShape' | translate }}</span>
              @if (selectedOrientations().size > 0) {
                <span class="facet-count">{{ selectedOrientations().size }}</span>
              }
              <mat-icon class="facet-caret">expand_more</mat-icon>
            </button>
            <mat-menu #shapeMenu="matMenu" class="facet-menu" xPosition="after">
              @for (o of orientationOptions(); track o.key) {
                <button
                  type="button"
                  mat-menu-item
                  class="facet-item"
                  [class.selected]="selectedOrientations().has(o.key)"
                  (click)="toggleOrientation(o.key); $event.stopPropagation()"
                >
                  <mat-icon class="facet-check">{{ selectedOrientations().has(o.key) ? 'check' : '' }}</mat-icon>
                  <span>{{ o.labelKey | translate }} <em class="facet-n">{{ o.count }}</em></span>
                </button>
              }
            </mat-menu>
          }

          <!-- Sort -->
          <button type="button" class="facet-trigger facet-trigger--sort" [matMenuTriggerFor]="sortMenu">
            <span class="facet-sort-label">{{ 'gallery.sortLabel' | translate }}:</span>
            <span>{{ SORT_KEY[sort()] | translate }}</span>
            <mat-icon class="facet-caret">expand_more</mat-icon>
          </button>
          <mat-menu #sortMenu="matMenu" class="facet-menu" xPosition="after">
            @for (s of sorts; track s) {
              <button
                type="button"
                mat-menu-item
                class="facet-item"
                [class.selected]="sort() === s"
                (click)="setSort(s)"
              >
                <mat-icon class="facet-check">{{ sort() === s ? 'check' : '' }}</mat-icon>
                <span>{{ SORT_KEY[s] | translate }}</span>
              </button>
            }
          </mat-menu>
        </div>

        <div class="search-field" [class.has-value]="searchInput()">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            class="search-input"
            type="search"
            [value]="searchInput()"
            (input)="onSearchInput($any($event.target).value)"
            [attr.placeholder]="'gallery.searchPlaceholder' | translate"
            [attr.aria-label]="'gallery.searchPlaceholder' | translate"
            autocomplete="off"
          />
          @if (searchInput()) {
            <button
              type="button"
              class="search-clear"
              (click)="clearSearch()"
              [attr.aria-label]="'common.close' | translate"
            >
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
      </div>

      @if (hasActiveFilters()) {
        <div class="container active-filters">
          @for (cat of selectedCategories(); track cat.id) {
            <button type="button" class="chip" (click)="toggleCategory(cat.id)"
                    [attr.aria-label]="'gallery.removeFilter' | translate: { name: cat.name }">
              {{ cat.name }}<span class="chip__x" aria-hidden="true">&times;</span>
            </button>
          }
          @if (isNew()) {
            <button type="button" class="chip" (click)="clearNew()"
                    [attr.aria-label]="'gallery.removeFilter' | translate: { name: ('gallery.newArrivalsHeading' | translate) }">
              {{ 'gallery.newArrivalsHeading' | translate }}<span class="chip__x" aria-hidden="true">&times;</span>
            </button>
          }
          @for (a of selectedArtists(); track a.id) {
            <button type="button" class="chip" (click)="toggleArtist(a.id)"
                    [attr.aria-label]="'gallery.removeFilter' | translate: { name: a.name }">
              {{ a.name }}<span class="chip__x" aria-hidden="true">&times;</span>
            </button>
          }
          @for (key of selectedOrientationList(); track key) {
            <button type="button" class="chip" (click)="toggleOrientation(key)"
                    [attr.aria-label]="'gallery.removeFilter' | translate: { name: orientationLabel(key) }">
              {{ orientationLabel(key) }}<span class="chip__x" aria-hidden="true">&times;</span>
            </button>
          }
          @if (priceMin() !== null || priceMax() !== null) {
            <button type="button" class="chip" (click)="clearPrice()"
                    [attr.aria-label]="'gallery.removeFilter' | translate: { name: ('gallery.filterPrice' | translate) }">
              @if (priceMin() !== null && priceMax() !== null) {
                {{ priceMin() | price }} – {{ priceMax() | price }}
              } @else if (priceMin() !== null) {
                {{ 'gallery.priceFrom' | translate }} {{ priceMin() | price }}
              } @else {
                {{ 'gallery.priceTo' | translate }} {{ priceMax() | price }}
              }
              <span class="chip__x" aria-hidden="true">&times;</span>
            </button>
          }
          @if (searchCommitted()) {
            <button type="button" class="chip" (click)="clearSearch()"
                    [attr.aria-label]="'gallery.removeFilter' | translate: { name: searchCommitted() }">
              &ldquo;{{ searchCommitted() }}&rdquo;<span class="chip__x" aria-hidden="true">&times;</span>
            </button>
          }
          @if (activeFilterCount() > 1) {
            <button type="button" class="chip chip--clear" (click)="clearAllFilters()">
              {{ 'gallery.clearAll' | translate }}
            </button>
          }
        </div>
      }
    </section>

    <section class="grid-section">
      <div class="container">
        @if (items().length > 0) {
          <div class="grid">
            @for (artwork of items(); track artwork.id) {
              <app-artwork-card [artwork]="artwork"></app-artwork-card>
            }
          </div>
        } @else if (initialLoaded() && !loading()) {
          <div class="empty">
            <p>{{ 'gallery.noResults' | translate }}</p>
            @if (hasActiveFilters()) {
              <button type="button" class="chip chip--clear" (click)="clearAllFilters()">
                {{ 'gallery.clearAll' | translate }}
              </button>
            }
          </div>
        }

        @if (loading()) {
          <div class="loading">
            <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
          </div>
        }

        <!-- Sentinel: emits when scrolled into view; ignored if no next page or already loading -->
        @if (nextCursor() !== null && initialLoaded()) {
          <div appOnVisible (visible)="loadMore()" class="sentinel" aria-hidden="true"></div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .container {
        max-width: var(--wrap);
        margin: 0 auto;
        padding: 0 var(--gutter);
      }

      /* Page header — breadcrumb + eyebrow + title + lead. */
      .page-head {
        padding: clamp(40px, 6vw, 80px) 0 clamp(24px, 3vw, 36px);
      }
      .page-head .lead { margin-top: 14px; }

      .crumbs {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 18px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-muted);
      }
      .crumbs a:hover { color: var(--c-ink); }
      .crumbs__current { color: var(--c-ink); }

      /* Toolbar: facet triggers on the left, search on the right, an optional
         chip row below. */
      .filters {
        background: var(--gallery-bg);
        border-block: 1px solid var(--gallery-line);
        box-shadow: none;
      }
      .filters-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px 24px;
        min-height: 48px;
        flex-wrap: wrap;
      }
      .facets { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }

      .facet-trigger {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: none;
        border: 0;
        padding: 6px 0;
        cursor: pointer;
        color: var(--gallery-ink);
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
      }
      .facet-trigger:hover { color: var(--c-muted); }
      .facet-trigger--sort .facet-sort-label { color: var(--c-muted); }
      .facet-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: var(--gallery-ink);
        color: var(--c-paper);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0;
      }
      .facet-caret { font-size: 18px; width: 18px; height: 18px; }

      /* Price menu fields */
      .price-fields {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px 16px;
        min-width: 200px;
      }
      .price-fields label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-muted);
      }
      .price-fields input {
        width: 110px;
        border: 1px solid var(--c-line-strong);
        background: var(--c-paper);
        padding: 8px 10px;
        font: inherit;
        font-size: 13px;
        color: var(--c-ink);
      }
      .price-fields input:focus { outline: 0; border-color: var(--c-ink); }
      .price-reset {
        margin-top: 2px;
        align-self: flex-start;
        border: 0;
        background: none;
        padding: 4px 0;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-muted);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .price-reset:hover { color: var(--c-ink); }

      /* Active-filter chips — the removable summary of what's applied. */
      .active-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding-top: 14px;
        padding-bottom: 16px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--c-line-strong);
        background: var(--c-paper);
        padding: 7px 12px;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-ink);
        cursor: pointer;
        transition: border-color 140ms ease, color 140ms ease;
      }
      .chip:hover { border-color: var(--c-ink); }
      .chip__x { font-size: 14px; line-height: 1; }
      .chip--clear { border-style: dashed; color: var(--c-muted); }
      .chip--clear:hover { color: var(--c-ink); }

      /* ── Animated search field ────────────────────────────────────────────
         Resting: just a bottom rule. On focus the bottom rule "comes to life"
         and two segments draw the remaining sides outward from the
         bottom-right corner — right→top and bottom→left — meeting at the
         top-left to complete a full box. */
      .search-field {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: 200px;
        padding: 6px 8px;
        transition: border-bottom-color 320ms ease;
      }
      .search-field:focus-within { border-bottom-color: var(--gallery-ink); }
      .search-field::after {
        content: '';
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 0;
        height: 0;
        border-top: 1px solid var(--gallery-ink);
        border-right: 1px solid var(--gallery-ink);
        transition: width 320ms ease, height 320ms ease 320ms;
        pointer-events: none;
      }
      .search-field::before {
        content: '';
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 0;
        height: 0;
        border-bottom: 1px solid var(--gallery-ink);
        border-left: 1px solid var(--gallery-ink);
        transition: height 320ms ease, width 320ms ease 320ms;
        pointer-events: none;
      }
      .search-field:focus-within::after {
        width: calc(100% + 2px);
        height: calc(100% + 2px);
        transition: height 320ms ease, width 320ms ease 320ms;
      }
      .search-field:focus-within::before {
        width: calc(100% + 2px);
        height: calc(100% + 2px);
        transition: width 320ms ease, height 320ms ease 320ms;
      }

      .search-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--gallery-muted);
        flex: none;
      }
      .search-input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: none;
        font: inherit;
        font-size: 13px;
        color: var(--gallery-ink);
        padding: 2px 0;
      }
      .search-input::placeholder { color: var(--gallery-muted); }
      .search-input::-webkit-search-cancel-button { display: none; }
      .search-clear {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: none;
        padding: 0;
        cursor: pointer;
        color: var(--gallery-muted);
        flex: none;
      }
      .search-clear:hover { color: var(--gallery-ink); }
      .search-clear mat-icon { font-size: 16px; width: 16px; height: 16px; }

      /* Generous breathing room — wide row gaps let each piece stand alone. */
      .grid-section { padding: 56px 0 112px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        column-gap: 36px;
        row-gap: 56px;
      }

      .empty {
        text-align: center;
        padding: 96px 16px;
        color: var(--gallery-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }

      .loading { display: flex; justify-content: center; padding: 40px; }
      .sentinel { height: 1px; }

      /* ── Facet menu items ────────────────────────────────────────────────── */
      ::ng-deep .facet-menu.mat-mdc-menu-panel { min-width: 220px; }
      ::ng-deep .facet-menu--price.mat-mdc-menu-panel { min-width: 0; }
      ::ng-deep .facet-menu .mat-mdc-menu-item {
        font-size: 12px;
        letter-spacing: 0.06em;
        min-height: 40px;
      }
      ::ng-deep .facet-menu .facet-item.selected { font-weight: 600; }
      ::ng-deep .facet-menu .facet-check {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
        color: var(--gallery-ink);
      }
      ::ng-deep .facet-menu .facet-n {
        font-style: normal;
        color: var(--c-muted);
        font-size: 11px;
        margin-left: 4px;
      }
    `,
  ],
})
export class GalleryComponent {
  private readonly galleryService = inject(GalleryService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly facetsService = inject(FacetsService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Exposed to the template.
  readonly sorts = SORTS;
  readonly SORT_KEY = SORT_KEY;

  // ─── Filter state ────────────────────────────────────────────────────────

  readonly searchInput = signal('');
  /** Debounced/committed search value — feeds the fetch + the chip. */
  readonly searchCommitted = signal('');

  /** 0 or 1 — single-category browse (the nav axis). */
  readonly selectedCategoryIds = signal<Set<string>>(new Set());
  readonly selectedArtistIds = signal<Set<string>>(new Set());
  /** `?new=1` — the "New arrivals" nav view (recency filter). */
  readonly isNew = signal(false);
  readonly priceMin = signal<number | null>(null);
  readonly priceMax = signal<number | null>(null);
  readonly selectedOrientations = signal<Set<string>>(new Set());
  readonly sort = signal<ArtworkSort>('newest');

  readonly categories = signal<Category[]>([]);
  readonly facets = signal<GalleryFacets | null>(null);

  /** When exactly one category is active, its localised name — drives the H1
   *  and breadcrumb so a filtered nav landing reads as that section. */
  readonly activeCategoryName = computed(() => {
    const ids = this.selectedCategoryIds();
    if (ids.size !== 1) return null;
    const [id] = [...ids];
    return this.categories().find((c) => c.id === id)?.name ?? null;
  });

  /** The heading + breadcrumb leaf — a category name, or the "New arrivals"
   *  view, else null (plain "Art prints"). */
  readonly pageHeading = computed(
    () =>
      this.activeCategoryName() ??
      (this.isNew() ? this.i18n.t('gallery.newArrivalsHeading') : null),
  );

  readonly selectedCategories = computed(() => {
    const ids = this.selectedCategoryIds();
    return this.categories().filter((c) => ids.has(c.id));
  });

  readonly selectedArtists = computed(() => {
    const ids = this.selectedArtistIds();
    return (this.facets()?.artists ?? []).filter((a) => ids.has(a.id));
  });

  /** Orientation options in a stable order, with counts, only those present. */
  readonly orientationOptions = computed(() => {
    const byKey = new Map((this.facets()?.orientations ?? []).map((o) => [o.key, o.count]));
    return ORIENTATIONS.filter((k) => byKey.has(k)).map((k) => ({
      key: k,
      count: byKey.get(k)!,
      labelKey: 'gallery.shape' + k[0].toUpperCase() + k.slice(1),
    }));
  });

  readonly selectedOrientationList = computed(() => [...this.selectedOrientations()]);

  readonly activeFilterCount = computed(
    () =>
      this.selectedCategoryIds().size +
      this.selectedArtistIds().size +
      this.selectedOrientations().size +
      (this.isNew() ? 1 : 0) +
      (this.priceMin() !== null || this.priceMax() !== null ? 1 : 0) +
      (this.searchCommitted() ? 1 : 0),
  );
  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  // ─── List state ──────────────────────────────────────────────────────────

  readonly items = signal<ArtworkListItem[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly initialLoaded = signal(false);

  // ─── Plumbing ────────────────────────────────────────────────────────────

  private currentRequestId = 0;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private urlSyncTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      if (this.urlSyncTimer) clearTimeout(this.urlSyncTimer);
    });

    // Categories + facets — reloaded per locale (both are locale-aware).
    effect(() => {
      const _ = this.i18n.locale();
      this.categoriesService.list().then((c) => this.categories.set(c)).catch(() => this.categories.set([]));
      this.facetsService.getFacets().then((f) => this.facets.set(f)).catch(() => this.facets.set(null));
    }, { allowSignalWrites: true });

    // Hydrate state FROM the URL — first run, back/forward, and once
    // categories()/facets() load (needed to resolve slugs → ids).
    //
    // Tracked deps: queryParams(), categories(), facets() only. Reads of the
    // filter signals happen inside untracked() — comparisons, not deps — so a
    // filter change can't re-trigger this effect and get clobbered by a URL
    // that hasn't been written yet.
    effect(() => {
      const qp = this.queryParams();
      const cats = this.categories();
      const fac = this.facets();
      untracked(() => this.hydrateFromUrl(qp, cats, fac));
    }, { allowSignalWrites: true });

    // Re-fetch page 1 whenever any committed filter, sort, or the locale changes.
    effect(() => {
      this.searchCommitted();
      this.selectedCategoryIds();
      this.selectedArtistIds();
      this.isNew();
      this.priceMin();
      this.priceMax();
      this.selectedOrientations();
      this.sort();
      this.i18n.locale();
      this.resetAndFetch();
    }, { allowSignalWrites: true });
  }

  // ─── URL → state ─────────────────────────────────────────────────────────

  private hydrateFromUrl(
    qp: ReturnType<typeof this.queryParams>,
    cats: Category[],
    fac: GalleryFacets | null,
  ): void {
    const csv = (v: string | null) =>
      (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

    // search
    const q = qp.get('q') ?? '';
    if (q !== this.searchCommitted()) {
      this.searchInput.set(q);
      this.searchCommitted.set(q);
    }

    // sort
    const sort = qp.get('sort');
    const wantSort: ArtworkSort = (SORTS as readonly string[]).includes(sort ?? '')
      ? (sort as ArtworkSort)
      : 'newest';
    if (wantSort !== this.sort()) this.sort.set(wantSort);

    // new arrivals
    const wantNew = qp.get('new') === '1';
    if (wantNew !== this.isNew()) this.isNew.set(wantNew);

    // price
    const priceRaw = qp.get('price');
    if (priceRaw) {
      const [lo, hi] = priceRaw.split('-');
      const nLo = lo?.trim() ? Math.max(0, Math.floor(Number(lo))) : null;
      const nHi = hi?.trim() ? Math.max(0, Math.floor(Number(hi))) : null;
      if ((nLo ?? null) !== this.priceMin()) this.priceMin.set(Number.isNaN(nLo as number) ? null : nLo);
      if ((nHi ?? null) !== this.priceMax()) this.priceMax.set(Number.isNaN(nHi as number) ? null : nHi);
    } else {
      if (this.priceMin() !== null) this.priceMin.set(null);
      if (this.priceMax() !== null) this.priceMax.set(null);
    }

    // orientation (values are self-describing — no lookup table needed)
    const wantOri = new Set(csv(qp.get('orientation')).filter((k) => ORIENTATIONS.includes(k)));
    if (!sameSet(wantOri, this.selectedOrientations())) this.selectedOrientations.set(wantOri);

    // category — slugs; needs categories() loaded to resolve
    const catSlugs = csv(qp.get('category'));
    if (!(catSlugs.length > 0 && cats.length === 0)) {
      const bySlug = new Map(cats.map((c) => [c.slug, c.id]));
      const wantCats = new Set(
        catSlugs.map((s) => bySlug.get(s)).filter((id): id is string => !!id).slice(0, 1),
      );
      if (!sameSet(wantCats, this.selectedCategoryIds())) this.selectedCategoryIds.set(wantCats);
    }

    // artist — slugs; needs facets() loaded to resolve
    const artistSlugs = csv(qp.get('artist'));
    if (!(artistSlugs.length > 0 && !fac)) {
      const bySlug = new Map((fac?.artists ?? []).map((a) => [a.slug, a.id]));
      const wantArtists = new Set(
        artistSlugs.map((s) => bySlug.get(s)).filter((id): id is string => !!id),
      );
      if (!sameSet(wantArtists, this.selectedArtistIds())) this.selectedArtistIds.set(wantArtists);
    }
  }

  // ─── Search box ──────────────────────────────────────────────────────────

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.searchCommitted.set(value.trim());
      this.syncUrl();
    }, SEARCH_DEBOUNCE_MS);
  }

  clearSearch(): void {
    this.searchInput.set('');
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchCommitted.set('');
    this.syncUrl();
  }

  // ─── Facet controls ──────────────────────────────────────────────────────

  /** Category is single-select: clicking the active one (its chip) clears it. */
  toggleCategory(id: string): void {
    const next = this.selectedCategoryIds().has(id) ? new Set<string>() : new Set([id]);
    this.selectedCategoryIds.set(next);
    this.syncUrl();
  }

  toggleArtist(id: string): void {
    this.selectedArtistIds.set(toggleInSet(this.selectedArtistIds(), id));
    this.syncUrl();
  }

  toggleOrientation(key: string): void {
    this.selectedOrientations.set(toggleInSet(this.selectedOrientations(), key));
    this.syncUrl();
  }

  setPriceMin(raw: string): void {
    this.priceMin.set(parsePrice(raw));
    this.syncUrl();
  }
  setPriceMax(raw: string): void {
    this.priceMax.set(parsePrice(raw));
    this.syncUrl();
  }
  clearPrice(): void {
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.syncUrl();
  }

  clearNew(): void {
    this.isNew.set(false);
    this.syncUrl();
  }

  setSort(s: ArtworkSort): void {
    if (this.sort() === s) return;
    this.sort.set(s);
    this.syncUrl();
  }

  orientationLabel(key: string): string {
    return this.i18n.t('gallery.shape' + key[0].toUpperCase() + key.slice(1));
  }

  clearAllFilters(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchInput.set('');
    this.searchCommitted.set('');
    this.selectedCategoryIds.set(new Set());
    this.selectedArtistIds.set(new Set());
    this.selectedOrientations.set(new Set());
    this.isNew.set(false);
    this.priceMin.set(null);
    this.priceMax.set(null);
    // Sort is not a filter — leave it.
    this.syncUrl();
  }

  // ─── Fetching ────────────────────────────────────────────────────────────

  private currentArgs() {
    return {
      categoryIds: [...this.selectedCategoryIds()],
      artistIds: [...this.selectedArtistIds()],
      newOnly: this.isNew(),
      priceMin: this.priceMin(),
      priceMax: this.priceMax(),
      orientation: [...this.selectedOrientations()],
      sort: this.sort(),
      search: this.searchCommitted(),
    };
  }

  private async resetAndFetch(): Promise<void> {
    const reqId = ++this.currentRequestId;
    this.items.set([]);
    this.nextCursor.set(null);
    this.initialLoaded.set(false);
    this.loading.set(true);

    try {
      const result = await this.galleryService.listArtworks({ ...this.currentArgs(), limit: PAGE_SIZE });
      if (reqId !== this.currentRequestId) return; // stale — ignore
      this.items.set(result.items);
      this.nextCursor.set(result.nextCursor);
    } catch {
      if (reqId !== this.currentRequestId) return;
      this.items.set([]);
      this.nextCursor.set(null);
    } finally {
      if (reqId === this.currentRequestId) {
        this.loading.set(false);
        this.initialLoaded.set(true);
      }
    }
  }

  async loadMore(): Promise<void> {
    if (this.loading() || this.nextCursor() === null) return;
    const reqId = this.currentRequestId; // capture; load-more isn't a reset
    this.loading.set(true);
    try {
      const result = await this.galleryService.listArtworks({
        ...this.currentArgs(),
        cursor: this.nextCursor(),
        limit: PAGE_SIZE,
      });
      if (reqId !== this.currentRequestId) return; // filters changed mid-flight
      this.items.update((prev) => [...prev, ...result.items]);
      this.nextCursor.set(result.nextCursor);
    } finally {
      if (reqId === this.currentRequestId) this.loading.set(false);
    }
  }

  // ─── state → URL ─────────────────────────────────────────────────────────

  /**
   * Reflect filter state in the query string. Debounced so a flurry of toggles
   * coalesces into one `router.navigate` (fewer soft navigations; also spares
   * injected perf collectors from racing). The list is fetched from signals,
   * not the URL, so the delay is cosmetic.
   */
  private syncUrl(): void {
    if (this.urlSyncTimer) clearTimeout(this.urlSyncTimer);
    this.urlSyncTimer = setTimeout(() => this.writeUrl(), URL_SYNC_DEBOUNCE_MS);
  }

  private writeUrl(): void {
    this.urlSyncTimer = null;
    const catSlug = new Map(this.categories().map((c) => [c.id, c.slug]));
    const artistSlug = new Map((this.facets()?.artists ?? []).map((a) => [a.id, a.slug]));

    const cats = [...this.selectedCategoryIds()].map((id) => catSlug.get(id)).filter(Boolean);
    const artists = [...this.selectedArtistIds()].map((id) => artistSlug.get(id)).filter(Boolean);
    const lo = this.priceMin();
    const hi = this.priceMax();

    this.router.navigate([], {
      queryParams: {
        q: this.searchCommitted() || null,
        category: cats.length ? cats.join(',') : null,
        artist: artists.length ? artists.join(',') : null,
        new: this.isNew() ? '1' : null,
        price: lo !== null || hi !== null ? `${lo ?? ''}-${hi ?? ''}` : null,
        orientation: this.selectedOrientations().size
          ? [...this.selectedOrientations()].join(',')
          : null,
        sort: this.sort() !== 'newest' ? this.sort() : null,
        categories: null, // clear the legacy id-based param
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

// ─── module helpers ──────────────────────────────────────────────────────────

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && [...a].every((v) => b.has(v));
}

function parsePrice(raw: string): number | null {
  const s = raw.trim();
  if (s === '') return null;
  const n = Math.floor(Number(s));
  return Number.isNaN(n) || n < 0 ? null : n;
}
