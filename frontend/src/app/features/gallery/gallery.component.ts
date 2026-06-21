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
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ArtworkCardComponent,
    OnVisibleDirective,
    TranslatePipe,
  ],
  template: `
    <section class="filters">
      <div class="container">
        <mat-form-field appearance="outline" class="search">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>{{ 'gallery.searchPlaceholder' | translate }}</mat-label>
          <input
            matInput
            type="search"
            [value]="searchInput()"
            (input)="onSearchInput($any($event.target).value)"
            autocomplete="off"
          />
          @if (searchInput()) {
            <button matSuffix mat-icon-button aria-label="Clear" (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        @if (categories().length > 0) {
          <mat-chip-listbox
            class="chips"
            multiple
            [value]="selectedCategoryIdsArray()"
            (change)="onCategoryChipsChange($event.value)"
            [attr.aria-label]="'gallery.filterByCategory' | translate"
          >
            @for (cat of categories(); track cat.id) {
              <mat-chip-option [value]="cat.id">{{ cat.name }}</mat-chip-option>
            }
          </mat-chip-listbox>
        }
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
            <p>{{ 'gallery.empty' | translate }}</p>
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
      .filters {
        background: #ffffff;
        border-bottom: 1px solid #eee;
        padding: 16px 0;
        position: sticky;
        top: 64px;
        z-index: 50;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
      .search { width: 100%; max-width: 480px; }
      .chips { margin-top: 8px; display: flex; flex-wrap: wrap; }

      .grid-section { padding: 24px 0 64px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
      }

      .empty {
        text-align: center;
        padding: 80px 16px;
        color: rgba(0, 0, 0, 0.5);
      }
      .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.4; }

      .loading { display: flex; justify-content: center; padding: 32px; }
      .sentinel { height: 1px; }
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
  readonly selectedCategoryIdsArray = computed(() => [...this.selectedCategoryIds()]);

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

  // ─── Chips ───────────────────────────────────────────────────────────────

  onCategoryChipsChange(value: string[] | string): void {
    // mat-chip-listbox multiple mode emits an array; defensively handle string too.
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    this.selectedCategoryIds.set(new Set(arr));
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
