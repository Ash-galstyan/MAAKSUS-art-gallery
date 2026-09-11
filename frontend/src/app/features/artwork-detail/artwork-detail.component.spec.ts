// frontend/src/app/features/artwork-detail/artwork-detail.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { ArtworkDetailComponent } from './artwork-detail.component';
import { ArtworkDetailService } from './artwork-detail.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtworkDetail, ArtworkImage } from '../../core/api-models/artwork.model';

function makeDetail(overrides: Partial<ArtworkDetail> = {}): ArtworkDetail {
  return {
    id: 'a1',
    slug: 'sunset',
    title: 'Sunset',
    description: null,
    history: null,
    medium: null,
    year: null,
    widthCm: null,
    heightCm: null,
    basePrice: 1000,
    isAvailable: true,
    artist: { id: 'ar1', name: 'Ash' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    images: [],
    ...overrides,
  };
}

function makeImage(id: string, isPrimary = false): ArtworkImage {
  return {
    id,
    originalPath: `${id}.jpg`,
    mediumPath: `${id}-medium.jpg`,
    thumbnailPath: `${id}-thumb.jpg`,
    width: 800,
    height: 600,
    isPrimary,
  };
}

describe('ArtworkDetailComponent', () => {
  let fixture: ComponentFixture<ArtworkDetailComponent>;
  let component: ArtworkDetailComponent;
  let service: jasmine.SpyObj<ArtworkDetailService>;
  let router: Router;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;

  async function setup(initialId: string | null) {
    service = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    service.getById.and.returnValue(Promise.resolve(makeDetail()));
    const initial = convertToParamMap(initialId ? { id: initialId } : {});
    paramMap$ = new BehaviorSubject(initial);
    locale = signal<'en' | 'hy' | 'ru'>('en');
    const i18nStub = { locale, t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [ArtworkDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: service },
        { provide: I18nService, useValue: i18nStub },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$, snapshot: { paramMap: initial } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ArtworkDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('redirects to the gallery and does not fetch when there is no id param', async () => {
    await setup(null);
    expect(router.navigate).toHaveBeenCalledWith(['/gallery']);
    expect(service.getById).not.toHaveBeenCalled();
  });

  it('loads the artwork for a valid id', async () => {
    await setup('a1');
    expect(service.getById).toHaveBeenCalledWith('a1');
    expect(component.artwork()?.id).toBe('a1');
    expect(component.loading()).toBeFalse();
    expect(component.notFound()).toBeFalse();
  });

  it('selects the primary image when present', async () => {
    service = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    const detail = makeDetail({ images: [makeImage('i1'), makeImage('i2', true), makeImage('i3')] });
    service.getById.and.returnValue(Promise.resolve(detail));
    const initial = convertToParamMap({ id: 'a1' });
    paramMap$ = new BehaviorSubject(initial);
    locale = signal('en');
    TestBed.configureTestingModule({
      imports: [ArtworkDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: service },
        { provide: I18nService, useValue: { locale, t: (key: string) => key } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$, snapshot: { paramMap: initial } } },
      ],
    });
    fixture = TestBed.createComponent(ArtworkDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activeImageIx()).toBe(1);
  });

  it('falls back to index 0 when there is no primary image', async () => {
    await setupWithImages([makeImage('i1'), makeImage('i2')]);
    expect(component.activeImageIx()).toBe(0);
  });

  async function setupWithImages(images: ArtworkImage[]) {
    service = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    service.getById.and.returnValue(Promise.resolve(makeDetail({ images })));
    const initial = convertToParamMap({ id: 'a1' });
    paramMap$ = new BehaviorSubject(initial);
    locale = signal('en');
    TestBed.configureTestingModule({
      imports: [ArtworkDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: service },
        { provide: I18nService, useValue: { locale, t: (key: string) => key } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$, snapshot: { paramMap: initial } } },
      ],
    });
    fixture = TestBed.createComponent(ArtworkDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows notFound and clears artwork when the fetch fails', async () => {
    service = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    service.getById.and.returnValue(Promise.reject({ status: 404 }));
    const initial = convertToParamMap({ id: 'missing' });
    paramMap$ = new BehaviorSubject(initial);
    locale = signal('en');
    TestBed.configureTestingModule({
      imports: [ArtworkDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: service },
        { provide: I18nService, useValue: { locale, t: (key: string) => key } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$, snapshot: { paramMap: initial } } },
      ],
    });
    fixture = TestBed.createComponent(ArtworkDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.notFound()).toBeTrue();
    expect(component.artwork()).toBeNull();
    expect(component.loading()).toBeFalse();
  });

  it('re-fetches when the :id route param changes', async () => {
    await setup('a1');
    service.getById.and.returnValue(Promise.resolve(makeDetail({ id: 'a2' })));
    paramMap$.next(convertToParamMap({ id: 'a2' }));
    await fixture.whenStable();
    expect(service.getById).toHaveBeenCalledWith('a2');
    expect(component.artwork()?.id).toBe('a2');
  });

  it('re-fetches when the locale changes', async () => {
    await setup('a1');
    service.getById.calls.reset();
    locale.set('hy');
    await fixture.whenStable();
    expect(service.getById).toHaveBeenCalledWith('a1');
  });

  it('ignores a stale response when the id changes again before the first resolves', async () => {
    service = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    let resolveFirst!: (v: ArtworkDetail) => void;
    service.getById.and.returnValue(new Promise((resolve) => (resolveFirst = resolve)));
    const initial = convertToParamMap({ id: 'a1' });
    paramMap$ = new BehaviorSubject(initial);
    locale = signal('en');
    TestBed.configureTestingModule({
      imports: [ArtworkDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: service },
        { provide: I18nService, useValue: { locale, t: (key: string) => key } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$, snapshot: { paramMap: initial } } },
      ],
    });
    fixture = TestBed.createComponent(ArtworkDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    service.getById.and.returnValue(Promise.resolve(makeDetail({ id: 'a2' })));
    paramMap$.next(convertToParamMap({ id: 'a2' }));
    await fixture.whenStable();

    resolveFirst(makeDetail({ id: 'a1-stale' }));
    await Promise.resolve();

    expect(component.artwork()?.id).toBe('a2');
  });

  describe('computed values', () => {
    beforeEach(async () => setup('a1'));

    it('activeImage is null when there are no images', () => {
      expect(component.activeImage()).toBeNull();
    });

    it('dimensionsLabel is null unless both width and height are known', () => {
      expect(component.dimensionsLabel()).toBeNull();
      component.artwork.set(makeDetail({ widthCm: 40, heightCm: null }));
      expect(component.dimensionsLabel()).toBeNull();
      component.artwork.set(makeDetail({ widthCm: 40, heightCm: 30 }));
      expect(component.dimensionsLabel()).toBe('40 × 30 cm');
    });

    it('activeImage clamps to the last image when the index is out of range', () => {
      const images = [makeImage('i1'), makeImage('i2')];
      component.artwork.set(makeDetail({ images }));
      component.activeImageIx.set(5);
      expect(component.activeImage()?.id).toBe('i2');
    });
  });
});
