// frontend/src/app/features/gallery/artwork-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ArtworkCardComponent } from './artwork-card.component';
import { environment } from '../../../environments/environment';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';

describe('ArtworkCardComponent', () => {
  let fixture: ComponentFixture<ArtworkCardComponent>;

  const artwork: ArtworkListItem = {
    id: 'a1',
    slug: 'sunset',
    title: 'Sunset Over Yerevan',
    artist: { id: 'ar1', name: 'Ash Galstyan' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    basePrice: 15000,
    thumbnailPath: 'artworks/a1/thumb.jpg',
    mediumPath: null,
    width: 40,
    height: 30,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ArtworkCardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ArtworkCardComponent);
    fixture.componentRef.setInput('artwork', artwork);
    fixture.detectChanges();
  });

  it('links to the artwork detail page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.card-link');
    expect(link.getAttribute('href')).toBe('/artwork/a1');
    expect(link.getAttribute('aria-label')).toBe('Sunset Over Yerevan');
  });

  it('renders the title, artist, and formatted price', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.title')?.textContent).toContain('Sunset Over Yerevan');
    expect(el.querySelector('.artist')?.textContent).toContain('Ash Galstyan');
    expect(el.querySelector('.price')?.textContent).toContain('15,000');
  });

  it('resolves the thumbnail through the upload-url pipe', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.thumb');
    expect(img.getAttribute('src')).toBe(`${environment.uploadsBaseUrl}/artworks/a1/thumb.jpg`);
  });

  it('uses the SVG placeholder when there is no thumbnail', () => {
    fixture.componentRef.setInput('artwork', { ...artwork, thumbnailPath: null });
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.thumb');
    expect(img.getAttribute('src')).toContain('data:image/svg+xml');
  });
});
