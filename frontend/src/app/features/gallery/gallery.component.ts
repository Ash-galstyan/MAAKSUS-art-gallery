// frontend/src/app/features/gallery/gallery.component.ts
/**
 * Gallery page — landing route.
 *
 * State (all signals):
 *   selectedCategoryIds : Set<string>     — chip-filter selection (multi)
 *   searchQuery         : string          — debounced text input
 *   items               : ArtworkListItem[]  — accumulated across pages
 *   nextCursor          : string | null   — null means no more pages
 *   loading             : boolean         — request in flight
 *   initialLoaded       : boolean         — first fetch done (controls empty state)
 *
 * Behaviour:
 *   - Whenever categories OR search change, we RESET the list and fetch page 1.
 *     A `currentRequestId` token prevents stale responses from a prior request
 *     overwriting fresh state if they finish out-of-order.
 *   - Infinite scroll: an OnVisible sentinel at the bottom of the grid emits
 *     a "load more" trigger; we ignore it while loading or when nextCursor
 *     is null.
 *   - Search is debounced 300ms via a setTimeout — RxJS would be heavier than
 *     warranted for one input.
 *   - URL query params (`q`, `categories`) are kept in sync via the router so
 *     filtered states are shareable and survive back/forward.
 */
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GalleryService } from './gallery.service';
import { CategoriesService } from './categories.service';
import { ArtworkCardComponent } from './artwork-card.component';
import { OnVisibleDirective } from '../../shared/directives/intersection.directive';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';
import type { Category } from '../../core/api-models/category.model';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 24;

@Component({
  selector: 'app-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    ArtworkCardComponent,
    OnVisibleDirective,
    TranslatePipe,
  ],
  template: `
    <section class="filters">
      <div class="container filters-row">
        @if (categories().length > 0) {
          <button
            type="button"
            class="cat-trigger"
            [matMenuTriggerFor]="catMenu"
            [attr.aria-label]="'gallery.filterByCategory' | translate"
          >
            <span class="cat-label">{{ 'gallery.categories' | translate }}</span>
            @if (selectedCategoryIds().size > 0) {
              <span class="cat-count">{{ selectedCategoryIds().size }}</span>
            }
            <mat-icon class="cat-caret">expand_more</mat-icon>
          </button>

          <mat-menu #catMenu="matMenu" class="cat-menu" xPosition="after">
            <button
              type="button"
              mat-menu-item
              class="cat-item"
              [class.selected]="selectedCategoryIds().size === 0"
              (click)="clearCategories(); $event.stopPropagation()"
            >
              <mat-icon class="cat-check">{{ selectedCategoryIds().size === 0 ? 'check' : '' }}</mat-icon>
              <span>{{ 'gallery.allCategories' | translate }}</span>
            </button>
            @for (cat of categories(); track cat.id) {
              <button
                type="button"
                mat-menu-item
                class="cat-item"
                [class.selected]="selectedCategoryIds().has(cat.id)"
                (click)="toggleCategory(cat.id); $event.stopPropagation()"
              >
                <mat-icon class="cat-check">{{ selectedCategoryIds().has(cat.id) ? 'check' : '' }}</mat-icon>
                <span>{{ cat.name }}</span>
              </button>
            }
          </mat-menu>
        } @else {
          <span></span>
        }

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
            <mat-icon class="empty-icon">image_not_supported</mat-icon>
            <p>{{ 'gallery.noResults' | translate }}</p>
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
      /* Short, classical sub-header: a single slim row. */
      .filters {
        background: var(--gallery-bg);
        border-bottom: 1px solid var(--gallery-line);
        position: sticky;
        top: 64px;
        z-index: 50;
        box-shadow: none;
      }
      .container {
        max-width: 1440px;
        margin: 0 auto;
        padding: 0 clamp(20px, 5vw, 56px);
      }
      .filters-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 44px;
      }

      /* ── Categories dropdown trigger ──────────────────────────────────── */
      .cat-trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: none;
        border: 0;
        padding: 6px 0;
        cursor: pointer;
        color: var(--gallery-ink);
        font: inherit;
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 500;
      }
      .cat-trigger:hover .cat-label { text-decoration: underline; text-underline-offset: 5px; }
      .cat-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: var(--gallery-ink);
        color: #fff;
        font-size: 11px;
        letter-spacing: 0;
      }
      .cat-caret { font-size: 18px; width: 18px; height: 18px; }

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
        /* The resting + "coming to life" bottom border. */
        border-bottom: 1px solid var(--gallery-line);
        transition: border-bottom-color 320ms ease;
      }
      .search-field:focus-within { border-bottom-color: var(--gallery-ink); }

      /* Segment 1 (::after): anchored bottom-right, owns the RIGHT + TOP sides.
         Drawing in (focus): right side up, then top leftward.
         Drawing out (blur): top retracts first, then the right side —
         so it unwinds in the exact reverse order, back to the start corner.
         CSS uses the *destination* state's transition, so the appear timing
         lives on :focus-within and the retract timing lives on the base. */
      .search-field::after {
        content: '';
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 0;
        height: 0;
        border-top: 1px solid var(--gallery-ink);
        border-right: 1px solid var(--gallery-ink);
        /* out: width (top) first, then height (right) */
        transition: width 320ms ease, height 320ms ease 320ms;
        pointer-events: none;
      }
      /* Segment 2 (::before): anchored bottom-right, owns the BOTTOM + LEFT.
         In: bottom leftward, then left side up. Out: left first, then bottom. */
      .search-field::before {
        content: '';
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 0;
        height: 0;
        border-bottom: 1px solid var(--gallery-ink);
        border-left: 1px solid var(--gallery-ink);
        /* out: height (left) first, then width (bottom) */
        transition: height 320ms ease, width 320ms ease 320ms;
        pointer-events: none;
      }
      .search-field:focus-within::after {
        width: calc(100% + 2px);
        height: calc(100% + 2px);
        /* in: height (right) first, then width (top) */
        transition: height 320ms ease, width 320ms ease 320ms;
      }
      .search-field:focus-within::before {
        width: calc(100% + 2px);
        height: calc(100% + 2px);
        /* in: width (bottom) first, then height (left) */
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
      /* Hide the native search "clear" so only our own button shows. */
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
      }
      .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.35; }

      .loading { display: flex; justify-content: center; padding: 40px; }
      .sentinel { height: 1px; }

      /* ── Category menu items ─────────────────────────────────────────────── */
      ::ng-deep .cat-menu .mat-mdc-menu-item {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        min-height: 40px;
      }
      ::ng-deep .cat-menu .cat-item.selected { font-weight: 600; }
      ::ng-deep .cat-menu .cat-check {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
        color: var(--gallery-ink);
      }
    `,
  ],
})
export class GalleryComponent {
  private readonly galleryService = inject(GalleryService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ─── Filter state ────────────────────────────────────────────────────────

  /** Current text in the search box (uncommitted). */
  readonly searchInput = signal('');
  /** Debounced/committed search value used by the fetch effect. */
  private readonly searchCommitted = signal('');

  readonly selectedCategoryIds = signal<Set<string>>(new Set());

  readonly categories = signal<Category[]>([]);

  // ─── List state ──────────────────────────────────────────────────────────

  readonly items = signal<ArtworkListItem[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly initialLoaded = signal(false);

  // ─── Plumbing ────────────────────────────────────────────────────────────

  /**
   * Identifies the most recent reset-and-fetch. A response is only applied
   * if its request token still matches the current one — guards against
   * out-of-order responses when filters change quickly.
   */
  private currentRequestId = 0;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Mirror of the route's query params, so we can hydrate state on entry. */
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  constructor() {
    // Load categories once per locale.
    effect(() => {
      // re-fetch when language changes; categories.list() is locale-aware
      const _ = this.i18n.locale();
      this.categoriesService
        .list()
        .then((cats) => this.categories.set(cats))
        .catch(() => this.categories.set([]));
    }, { allowSignalWrites: true });

    // Hydrate from URL on first run (and respond to back/forward navigation).
    effect(() => {
      const qp = this.queryParams();
      const q = qp.get('q') ?? '';
      const cats = qp.get('categories');
      const set = new Set(cats ? cats.split(',').filter(Boolean) : []);

      if (q !== this.searchCommitted()) {
        this.searchInput.set(q);
        this.searchCommitted.set(q);
      }
      const current = this.selectedCategoryIds();
      const same = current.size === set.size && [...current].every((id) => set.has(id));
      if (!same) this.selectedCategoryIds.set(set);
    }, { allowSignalWrites: true });

    // Re-fetch from scratch whenever committed filters or language change.
    effect(() => {
        // Touch everything that should trigger a refetch.
        this.searchCommitted();
        this.selectedCategoryIds();
        this.i18n.locale();
        this.resetAndFetch();
      },
      { allowSignalWrites: true }
    );
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

  // ─── Categories dropdown ───────────────────────────────────────────────────

  /** Toggle a single category in/out of the (multi-select) filter. */
  toggleCategory(id: string): void {
    const next = new Set(this.selectedCategoryIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedCategoryIds.set(next);
    this.syncUrl();
  }

  /** "All categories" — clear the filter. */
  clearCategories(): void {
    if (this.selectedCategoryIds().size === 0) return;
    this.selectedCategoryIds.set(new Set());
    this.syncUrl();
  }

  // ─── Fetching ────────────────────────────────────────────────────────────

  private async resetAndFetch(): Promise<void> {
    const reqId = ++this.currentRequestId;
    this.items.set([]);
    this.nextCursor.set(null);
    this.initialLoaded.set(false);
    this.loading.set(true);

    try {
      const result = await this.galleryService.listArtworks({
        categoryIds: [...this.selectedCategoryIds()],
        search: this.searchCommitted(),
        limit: PAGE_SIZE,
      });
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
    const reqId = this.currentRequestId; // capture; don't bump — load-more isn't a reset
    this.loading.set(true);
    try {
      const result = await this.galleryService.listArtworks({
        categoryIds: [...this.selectedCategoryIds()],
        search: this.searchCommitted(),
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

  // ─── URL sync ────────────────────────────────────────────────────────────

  private syncUrl(): void {
    const cats = [...this.selectedCategoryIds()];
    this.router.navigate([], {
      queryParams: {
        q: this.searchCommitted() || null,
        categories: cats.length ? cats.join(',') : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true, // don't pollute history with every keystroke pause
    });
  }
}
