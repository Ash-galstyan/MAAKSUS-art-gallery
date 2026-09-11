// frontend/src/app/features/home/home.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HomeComponent } from './home.component';
import { GalleryService } from '../gallery/gallery.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';

function makeItem(id: string, thumbnailPath: string | null): ArtworkListItem {
  return {
    id,
    slug: id,
    title: `Artwork ${id}`,
    artist: { id: 'ar1', name: 'Ash' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    basePrice: 1000,
    thumbnailPath,
    mediumPath: null,
    width: null,
    height: null,
  };
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let gallery: jasmine.SpyObj<GalleryService>;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;

  async function setup(
    listArtworksResult: Promise<{ items: ArtworkListItem[]; nextCursor: string | null }> = Promise.resolve({
      items: [],
      nextCursor: null,
    }),
  ) {
    gallery = jasmine.createSpyObj<GalleryService>('GalleryService', ['listArtworks']);
    gallery.listArtworks.and.returnValue(listArtworksResult);
    locale = signal<'en' | 'hy' | 'ru'>('en');
    const i18nStub = { locale, t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: GalleryService, useValue: gallery },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('fetches a batch of 8 artworks on init', async () => {
    await setup();
    expect(gallery.listArtworks).toHaveBeenCalledWith({ limit: 8 });
  });

  it('clears works on a failed fetch', async () => {
    await setup(Promise.reject(new Error('network')));
    expect(component.works()).toEqual([]);
    expect(component.heroImage()).toBeNull();
  });

  it('re-fetches when the locale changes', async () => {
    await setup();
    gallery.listArtworks.calls.reset();
    locale.set('hy');
    await fixture.whenStable();
    expect(gallery.listArtworks).toHaveBeenCalledWith({ limit: 8 });
  });

  describe('heroImage', () => {
    it('is null when there are no works', async () => {
      await setup();
      expect(component.heroImage()).toBeNull();
    });

    it('is the first work\'s thumbnail', async () => {
      await setup(
        Promise.resolve({
          items: [makeItem('a1', '/a1.jpg'), makeItem('a2', '/a2.jpg')],
          nextCursor: null,
        }),
      );
      expect(component.heroImage()).toBe('/a1.jpg');
    });
  });

  describe('imageAt', () => {
    it('is offset by 1 so the hero keeps works()[0]', async () => {
      await setup(
        Promise.resolve({
          items: [makeItem('a1', '/a1.jpg'), makeItem('a2', '/a2.jpg')],
          nextCursor: null,
        }),
      );
      expect(component.imageAt(0)).toBe('/a2.jpg');
    });

    it('is null past the end of the batch', async () => {
      await setup();
      expect(component.imageAt(0)).toBeNull();
    });
  });

  describe('pad', () => {
    it('zero-pads single digits', async () => {
      await setup();
      expect(component.pad(1)).toBe('01');
      expect(component.pad(12)).toBe('12');
    });
  });

  describe('static content tiles', () => {
    beforeEach(async () => setup());

    it('curatedTiles has 6 entries, the first tagged', () => {
      const tiles = component.curatedTiles();
      expect(tiles.length).toBe(6);
      expect(tiles[0].tag).toBe('home.curated.tag');
      expect(tiles.slice(1).every((t) => !t.tag)).toBeTrue();
    });

    it('roomTiles has 5 entries', () => {
      expect(component.roomTiles().length).toBe(5);
    });

    it('craftPillars, tradePoints and circleBenefits each have 4 entries', () => {
      expect(component.craftPillars().length).toBe(4);
      expect(component.tradePoints().length).toBe(4);
      expect(component.circleBenefits().length).toBe(4);
    });
  });
});
