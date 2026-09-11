// frontend/src/app/features/gallery/gallery.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { GalleryComponent } from './gallery.component';
import { GalleryService, type ArtworkSort } from './gallery.service';
import { CategoriesService } from './categories.service';
import { FacetsService } from './facets.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';
import type { Category } from '../../core/api-models/category.model';
import type { GalleryFacets } from '../../core/api-models/gallery-facets.model';

function makeItem(id: string): ArtworkListItem {
  return {
    id,
    slug: id,
    title: `Artwork ${id}`,
    artist: { id: 'ar1', name: 'Ash' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    basePrice: 1000,
    thumbnailPath: null,
    mediumPath: null,
    width: null,
    height: null,
  };
}

const DEFAULT_ARGS = {
  categoryIds: [] as string[],
  artistIds: [] as string[],
  newOnly: false,
  priceMin: null as number | null,
  priceMax: null as number | null,
  orientation: [] as string[],
  sort: 'newest' as ArtworkSort,
  search: '',
};

const DEFAULT_QUERY_PARAMS = {
  q: null,
  category: null,
  artist: null,
  new: null,
  price: null,
  orientation: null,
  sort: null,
  categories: null,
};

describe('GalleryComponent', () => {
  let fixture: ComponentFixture<GalleryComponent>;
  let component: GalleryComponent;
  let gallery: jasmine.SpyObj<GalleryService>;
  let categoriesSvc: jasmine.SpyObj<CategoriesService>;
  let facetsSvc: jasmine.SpyObj<FacetsService>;
  let router: Router;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let initialParamMap: ReturnType<typeof convertToParamMap>;

  const categories: Category[] = [
    { id: 'c1', slug: 'landscape', name: 'Landscape' },
    { id: 'c2', slug: 'portrait', name: 'Portrait' },
  ];
  const facets: GalleryFacets = {
    artists: [{ id: 'ar1', slug: 'ash', name: 'Ash', count: 5 }],
    priceRange: { min: 0, max: 5000 },
    orientations: [
      { key: 'landscape', count: 3 },
      { key: 'portrait', count: 2 },
    ],
  };

  async function setup() {
    gallery = jasmine.createSpyObj<GalleryService>('GalleryService', ['listArtworks']);
    categoriesSvc = jasmine.createSpyObj<CategoriesService>('CategoriesService', ['list']);
    facetsSvc = jasmine.createSpyObj<FacetsService>('FacetsService', ['getFacets']);
    gallery.listArtworks.and.returnValue(Promise.resolve({ items: [], nextCursor: null }));
    categoriesSvc.list.and.returnValue(Promise.resolve(categories));
    facetsSvc.getFacets.and.returnValue(Promise.resolve(facets));

    queryParamMap$ = new BehaviorSubject(initialParamMap);
    const i18nStub = {
      locale: signal('en'),
      t: (key: string) => key,
    } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [GalleryComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: GalleryService, useValue: gallery },
        { provide: CategoriesService, useValue: categoriesSvc },
        { provide: FacetsService, useValue: facetsSvc },
        { provide: I18nService, useValue: i18nStub },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParamMap$, snapshot: { queryParamMap: initialParamMap } },
        },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(GalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    initialParamMap = convertToParamMap({});
  });

  describe('initial load', () => {
    beforeEach(async () => setup());

    it('loads categories and facets on init', () => {
      expect(categoriesSvc.list).toHaveBeenCalled();
      expect(facetsSvc.getFacets).toHaveBeenCalled();
      expect(component.categories()).toEqual(categories);
      expect(component.facets()).toEqual(facets);
    });

    it('clears categories on a failed fetch', async () => {
      categoriesSvc.list.and.returnValue(Promise.reject(new Error('boom')));
      const f2 = TestBed.createComponent(GalleryComponent);
      f2.detectChanges();
      await f2.whenStable();
      expect(f2.componentInstance.categories()).toEqual([]);
    });

    it('clears facets on a failed fetch', async () => {
      facetsSvc.getFacets.and.returnValue(Promise.reject(new Error('boom')));
      const f2 = TestBed.createComponent(GalleryComponent);
      f2.detectChanges();
      await f2.whenStable();
      expect(f2.componentInstance.facets()).toBeNull();
    });

    it('fetches artworks once on init with default filters', () => {
      expect(gallery.listArtworks).toHaveBeenCalledWith({ ...DEFAULT_ARGS, limit: 24 });
      expect(component.items()).toEqual([]);
      expect(component.initialLoaded()).toBeTrue();
      expect(component.loading()).toBeFalse();
    });

    it('populates items and nextCursor from a successful fetch', async () => {
      gallery.listArtworks.calls.reset();
      gallery.listArtworks.and.returnValue(
        Promise.resolve({ items: [makeItem('a1')], nextCursor: 'cur-2' }),
      );
      component.toggleCategory('c1'); // triggers resetAndFetch via effect
      await fixture.whenStable();
      expect(component.items().length).toBe(1);
      expect(component.nextCursor()).toBe('cur-2');
    });

    it('clears items and nextCursor on a failed fetch', async () => {
      gallery.listArtworks.and.returnValue(Promise.reject(new Error('network')));
      component.toggleCategory('c1');
      await fixture.whenStable();
      expect(component.items()).toEqual([]);
      expect(component.nextCursor()).toBeNull();
      expect(component.initialLoaded()).toBeTrue();
      expect(component.loading()).toBeFalse();
    });
  });

  describe('URL hydration', () => {
    it('reads q, sort, new, price and orientation from the initial query params', async () => {
      initialParamMap = convertToParamMap({
        q: 'sea',
        sort: 'price-asc',
        new: '1',
        price: '100-500',
        orientation: 'portrait,square',
      });
      await setup();
      expect(component.searchInput()).toBe('sea');
      expect(component.sort()).toBe('price-asc');
      expect(component.isNew()).toBeTrue();
      expect(component.priceMin()).toBe(100);
      expect(component.priceMax()).toBe(500);
      expect(component.selectedOrientations()).toEqual(new Set(['portrait', 'square']));
    });

    it('resolves a category slug to an id once categories load', async () => {
      initialParamMap = convertToParamMap({ category: 'portrait' });
      await setup();
      expect(component.selectedCategoryIds()).toEqual(new Set(['c2']));
    });

    it('resolves an artist slug to an id once facets load', async () => {
      initialParamMap = convertToParamMap({ artist: 'ash' });
      await setup();
      expect(component.selectedArtistIds()).toEqual(new Set(['ar1']));
    });

    it('ignores an unrecognised orientation value', async () => {
      initialParamMap = convertToParamMap({ orientation: 'portrait,bogus' });
      await setup();
      expect(component.selectedOrientations()).toEqual(new Set(['portrait']));
    });

    it('re-hydrates when the route query params observable emits', async () => {
      await setup();
      queryParamMap$.next(convertToParamMap({ q: 'mountains' }));
      await fixture.whenStable();
      expect(component.searchInput()).toBe('mountains');
    });
  });

  describe('search input', () => {
    beforeEach(async () => setup());

    it('updates searchInput immediately without committing', () => {
      component.onSearchInput('sea');
      expect(component.searchInput()).toBe('sea');
      expect(gallery.listArtworks).toHaveBeenCalledTimes(1); // only the initial fetch so far
    });

    it('commits and syncs the URL after the debounce window', fakeAsync(() => {
      component.onSearchInput('sea');
      tick(299);
      expect(router.navigate).not.toHaveBeenCalled();
      tick(1); // search debounce fires — commits, then schedules the URL sync
      expect(router.navigate).not.toHaveBeenCalled();
      tick(250); // URL sync debounce fires
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { ...DEFAULT_QUERY_PARAMS, q: 'sea' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      tick(1000); // drain any remaining timers before the test ends
    }));

    it('debounces rapid input to a single commit', fakeAsync(() => {
      component.onSearchInput('s');
      tick(100);
      component.onSearchInput('se');
      tick(100);
      component.onSearchInput('sea');
      tick(300); // search debounce fires
      tick(250); // URL sync debounce fires
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({ queryParams: jasmine.objectContaining({ q: 'sea' }) }),
      );
    }));

    it('clearSearch commits immediately and syncs the URL', fakeAsync(() => {
      component.searchInput.set('sea');
      component.clearSearch();
      tick(250);
      expect(component.searchInput()).toBe('');
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: DEFAULT_QUERY_PARAMS,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }));
  });

  describe('category filter (single-select)', () => {
    beforeEach(async () => setup());

    it('toggleCategory selects then deselects on a second click', fakeAsync(() => {
      component.toggleCategory('c1');
      tick(250);
      expect(component.selectedCategoryIds()).toEqual(new Set(['c1']));
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { ...DEFAULT_QUERY_PARAMS, category: 'landscape' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });

      component.toggleCategory('c1');
      tick(250);
      expect(component.selectedCategoryIds()).toEqual(new Set());
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: DEFAULT_QUERY_PARAMS,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }));

    it('selecting a new category replaces rather than adds to the previous one', () => {
      component.toggleCategory('c1');
      component.toggleCategory('c2');
      expect(component.selectedCategoryIds()).toEqual(new Set(['c2']));
    });

    it('selectedCategories reflects the current selection', () => {
      component.toggleCategory('c2');
      expect(component.selectedCategories()).toEqual([categories[1]]);
    });
  });

  describe('artist facet (multi-select)', () => {
    beforeEach(async () => setup());

    it('toggleArtist adds then removes an id', () => {
      component.toggleArtist('ar1');
      expect(component.selectedArtistIds()).toEqual(new Set(['ar1']));
      component.toggleArtist('ar1');
      expect(component.selectedArtistIds()).toEqual(new Set());
    });
  });

  describe('orientation facet (multi-select)', () => {
    beforeEach(async () => setup());

    it('toggleOrientation adds then removes a key', () => {
      component.toggleOrientation('portrait');
      expect(component.selectedOrientations()).toEqual(new Set(['portrait']));
      component.toggleOrientation('portrait');
      expect(component.selectedOrientations()).toEqual(new Set());
    });

    it('orientationOptions lists only present, known orientations with counts, in a fixed order', () => {
      // Fixed order is portrait/landscape/square (ORIENTATIONS), not facets() order.
      expect(component.orientationOptions()).toEqual([
        { key: 'portrait', count: 2, labelKey: 'gallery.shapePortrait' },
        { key: 'landscape', count: 3, labelKey: 'gallery.shapeLandscape' },
      ]);
    });
  });

  describe('price filter', () => {
    beforeEach(async () => setup());

    it('setPriceMin/setPriceMax parse and store integers', () => {
      component.setPriceMin('100');
      component.setPriceMax('500');
      expect(component.priceMin()).toBe(100);
      expect(component.priceMax()).toBe(500);
    });

    it('treats an empty or invalid value as null', () => {
      component.setPriceMin('');
      expect(component.priceMin()).toBeNull();
      component.setPriceMin('abc');
      expect(component.priceMin()).toBeNull();
      component.setPriceMin('-5');
      expect(component.priceMin()).toBeNull();
    });

    it('clearPrice resets both bounds', () => {
      component.setPriceMin('100');
      component.setPriceMax('500');
      component.clearPrice();
      expect(component.priceMin()).toBeNull();
      expect(component.priceMax()).toBeNull();
    });
  });

  describe('new-arrivals filter', () => {
    beforeEach(async () => setup());

    it('clearNew resets isNew', () => {
      component.isNew.set(true);
      component.clearNew();
      expect(component.isNew()).toBeFalse();
    });
  });

  describe('sort', () => {
    beforeEach(async () => setup());

    it('setSort updates the sort and syncs the URL', fakeAsync(() => {
      component.setSort('price-desc');
      tick(250);
      expect(component.sort()).toBe('price-desc');
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { ...DEFAULT_QUERY_PARAMS, sort: 'price-desc' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }));

    it('is a no-op when re-selecting the current sort', () => {
      (router.navigate as jasmine.Spy).calls.reset();
      component.setSort('newest');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('clearAllFilters', () => {
    beforeEach(async () => setup());

    it('resets every filter but leaves sort untouched', () => {
      component.searchInput.set('sea');
      component.toggleCategory('c1');
      component.toggleArtist('ar1');
      component.toggleOrientation('portrait');
      component.isNew.set(true);
      component.setPriceMin('100');
      component.setSort('price-desc');

      component.clearAllFilters();

      expect(component.searchInput()).toBe('');
      expect(component.searchCommitted()).toBe('');
      expect(component.selectedCategoryIds()).toEqual(new Set());
      expect(component.selectedArtistIds()).toEqual(new Set());
      expect(component.selectedOrientations()).toEqual(new Set());
      expect(component.isNew()).toBeFalse();
      expect(component.priceMin()).toBeNull();
      expect(component.priceMax()).toBeNull();
      expect(component.sort()).toBe('price-desc');
    });
  });

  describe('activeFilterCount / hasActiveFilters', () => {
    beforeEach(async () => setup());

    it('is zero with no filters applied', () => {
      expect(component.activeFilterCount()).toBe(0);
      expect(component.hasActiveFilters()).toBeFalse();
    });

    it('counts each active filter axis', () => {
      component.toggleCategory('c1');
      component.toggleArtist('ar1');
      component.toggleOrientation('portrait');
      component.isNew.set(true);
      component.setPriceMin('100');
      component.searchCommitted.set('sea');
      expect(component.activeFilterCount()).toBe(6);
      expect(component.hasActiveFilters()).toBeTrue();
    });
  });

  describe('loadMore', () => {
    beforeEach(async () => setup());

    it('is a no-op when there is no next page', async () => {
      gallery.listArtworks.calls.reset();
      await component.loadMore();
      expect(gallery.listArtworks).not.toHaveBeenCalled();
    });

    it('is a no-op while already loading', async () => {
      gallery.listArtworks.and.returnValue(
        Promise.resolve({ items: [makeItem('a1')], nextCursor: 'cur-2' }),
      );
      component.toggleCategory('c1');
      await fixture.whenStable();
      gallery.listArtworks.calls.reset();

      component.loading.set(true);
      await component.loadMore();
      expect(gallery.listArtworks).not.toHaveBeenCalled();
    });

    it('appends the next page and advances the cursor', async () => {
      gallery.listArtworks.and.returnValue(
        Promise.resolve({ items: [makeItem('a1')], nextCursor: 'cur-2' }),
      );
      component.toggleCategory('c1');
      await fixture.whenStable();

      gallery.listArtworks.and.returnValue(
        Promise.resolve({ items: [makeItem('a2')], nextCursor: null }),
      );
      await component.loadMore();
      expect(component.items().map((i) => i.id)).toEqual(['a1', 'a2']);
      expect(component.nextCursor()).toBeNull();
      expect(component.loading()).toBeFalse();
    });

    it('ignores a stale response if filters changed mid-flight', async () => {
      gallery.listArtworks.and.returnValue(
        Promise.resolve({ items: [makeItem('a1')], nextCursor: 'cur-2' }),
      );
      component.toggleCategory('c1');
      await fixture.whenStable();

      let resolveLoadMore!: (v: { items: ArtworkListItem[]; nextCursor: string | null }) => void;
      gallery.listArtworks.and.returnValue(
        new Promise((resolve) => (resolveLoadMore = resolve)),
      );
      const loadMorePromise = component.loadMore();

      // Filters change mid-flight, which bumps currentRequestId via resetAndFetch.
      gallery.listArtworks.and.returnValue(Promise.resolve({ items: [], nextCursor: null }));
      component.toggleCategory('c2');
      await fixture.whenStable();

      resolveLoadMore({ items: [makeItem('stale')], nextCursor: 'stale-cursor' });
      await loadMorePromise;

      expect(component.items().some((i) => i.id === 'stale')).toBeFalse();
    });
  });

  describe('pageHeading', () => {
    beforeEach(async () => setup());

    it('is null with no category or new-arrivals filter active', () => {
      expect(component.pageHeading()).toBeNull();
    });

    it('shows the active category name when exactly one is selected', () => {
      component.toggleCategory('c2');
      expect(component.pageHeading()).toBe('Portrait');
    });

    it('falls back to the new-arrivals heading when isNew is set', () => {
      component.isNew.set(true);
      expect(component.pageHeading()).toBe('gallery.newArrivalsHeading');
    });
  });
});
