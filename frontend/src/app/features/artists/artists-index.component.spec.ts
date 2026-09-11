// frontend/src/app/features/artists/artists-index.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ArtistsIndexComponent } from './artists-index.component';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtistListItem } from '../../core/api-models/artist.model';

function makeArtist(overrides: Partial<ArtistListItem> = {}): ArtistListItem {
  return {
    id: 'ar1',
    slug: 'ash',
    name: 'Ash',
    bio: null,
    portraitPath: null,
    birthYear: null,
    deathYear: null,
    ...overrides,
  };
}

describe('ArtistsIndexComponent', () => {
  let fixture: ComponentFixture<ArtistsIndexComponent>;
  let component: ArtistsIndexComponent;
  let api: jasmine.SpyObj<ApiService>;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;

  async function setup(getResult: Promise<ArtistListItem[]> = Promise.resolve([])) {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(getResult);
    locale = signal<'en' | 'hy' | 'ru'>('en');
    const i18nStub = { locale, t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [ArtistsIndexComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(ArtistsIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('fetches artists from /artists on init', async () => {
    await setup();
    expect(api.get).toHaveBeenCalledWith('/artists');
  });

  it('sets loading false and populates artists on success', async () => {
    const artists = [makeArtist()];
    await setup(Promise.resolve(artists));
    expect(component.loading()).toBeFalse();
    expect(component.artists()).toEqual(artists);
  });

  it('clears artists and stops loading on a failed fetch', async () => {
    await setup(Promise.reject(new Error('network')));
    expect(component.loading()).toBeFalse();
    expect(component.artists()).toEqual([]);
  });

  it('re-fetches when the locale changes', async () => {
    await setup();
    api.get.calls.reset();
    locale.set('hy');
    await fixture.whenStable();
    expect(api.get).toHaveBeenCalledWith('/artists');
  });

  describe('yearLabel', () => {
    beforeEach(async () => setup());

    it('is null with no birth year', () => {
      expect(component.yearLabel(makeArtist())).toBeNull();
    });

    it('shows "b. <year>" with only a birth year', () => {
      expect(component.yearLabel(makeArtist({ birthYear: 1950 }))).toBe('b. 1950');
    });

    it('shows a year range with both birth and death year', () => {
      expect(component.yearLabel(makeArtist({ birthYear: 1950, deathYear: 2020 }))).toBe('1950–2020');
    });
  });
});
