// frontend/src/app/features/customization/customization.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { CustomizationComponent } from './customization.component';
import { ArtworkDetailService } from '../artwork-detail/artwork-detail.service';
import { PrintOptionsService } from './print-options.service';
import { CartService } from '../../core/cart/cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ArtworkDetail, ArtworkImage } from '../../core/api-models/artwork.model';
import type { FrameOption, PrintSize } from '../../core/api-models/print-options.model';

const SIZES: PrintSize[] = [
  { id: 'p-large', code: 'L', label: 'Large', widthCm: 60, heightCm: 45, priceMultiplier: 2 },
  { id: 'p-small', code: 'S', label: 'Small', widthCm: 30, heightCm: 20, priceMultiplier: 1 },
];
const FRAMES: FrameOption[] = [
  { id: 'f1', code: 'WOOD', label: 'Wood', frameType: 'WOOD', colorHex: '#6b4423', additionalPrice: 5000 },
];

function makeImage(isPrimary = true): ArtworkImage {
  return {
    id: 'i1',
    originalPath: 'i1.jpg',
    mediumPath: 'i1-medium.jpg',
    thumbnailPath: 'i1-thumb.jpg',
    width: 800,
    height: 600,
    isPrimary,
  };
}

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
    basePrice: 10000,
    isAvailable: true,
    artist: { id: 'ar1', name: 'Ash' },
    category: { id: 'c1', slug: 'landscape', name: 'Landscape' },
    images: [makeImage()],
    ...overrides,
  };
}

/** Replaces window.Image with a stub that "loads" instantly with a fixed size. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  naturalWidth = 800;
  naturalHeight = 600;
  private _src = '';
  set src(v: string) {
    this._src = v;
    setTimeout(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

describe('CustomizationComponent', () => {
  let fixture: ComponentFixture<CustomizationComponent>;
  let component: CustomizationComponent;
  let artworkService: jasmine.SpyObj<ArtworkDetailService>;
  let printOpts: jasmine.SpyObj<PrintOptionsService>;
  let cart: jasmine.SpyObj<CartService>;
  let router: Router;
  let originalImage: typeof Image;

  beforeEach(() => {
    originalImage = window.Image;
    (window as unknown as { Image: unknown }).Image = FakeImage;
  });

  afterEach(() => {
    window.Image = originalImage;
  });

  async function setup(artworkId: string | null) {
    artworkService = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    printOpts = jasmine.createSpyObj<PrintOptionsService>('PrintOptionsService', ['listSizes', 'listFrames']);
    cart = jasmine.createSpyObj<CartService>('CartService', ['addItem']);
    artworkService.getById.and.returnValue(Promise.resolve(makeDetail()));
    printOpts.listSizes.and.returnValue(Promise.resolve(SIZES));
    printOpts.listFrames.and.returnValue(Promise.resolve(FRAMES));

    const paramMap = convertToParamMap(artworkId ? { artworkId } : {});
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [CustomizationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: artworkService },
        { provide: PrintOptionsService, useValue: printOpts },
        { provide: CartService, useValue: cart },
        { provide: I18nService, useValue: i18nStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(CustomizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('redirects to the gallery and does not fetch when there is no artworkId param', async () => {
    await setup(null);
    expect(router.navigate).toHaveBeenCalledWith(['/gallery']);
    expect(artworkService.getById).not.toHaveBeenCalled();
  });

  it('loads artwork, sizes, and frames for a valid id', async () => {
    await setup('a1');
    expect(artworkService.getById).toHaveBeenCalledWith('a1');
    expect(component.artwork()?.id).toBe('a1');
    expect(component.sizes()).toEqual(SIZES);
    expect(component.frames()).toEqual(FRAMES);
    expect(component.loading()).toBeFalse();
  });

  it('defaults to the cheapest size by price multiplier', async () => {
    await setup('a1');
    expect(component.selectedSizeId()).toBe('p-small');
    expect(component.selectedSize()?.id).toBe('p-small');
  });

  it('defaults to no frame selected', async () => {
    await setup('a1');
    expect(component.selectedFrameId()).toBeNull();
    expect(component.selectedFrame()).toBeNull();
  });

  it('clears the artwork and stops loading when the fetch fails', async () => {
    artworkService = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    artworkService.getById.and.returnValue(Promise.reject(new Error('not found')));
    printOpts = jasmine.createSpyObj<PrintOptionsService>('PrintOptionsService', ['listSizes', 'listFrames']);
    printOpts.listSizes.and.returnValue(Promise.resolve(SIZES));
    printOpts.listFrames.and.returnValue(Promise.resolve(FRAMES));
    cart = jasmine.createSpyObj<CartService>('CartService', ['addItem']);
    const paramMap = convertToParamMap({ artworkId: 'missing' });
    TestBed.configureTestingModule({
      imports: [CustomizationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: artworkService },
        { provide: PrintOptionsService, useValue: printOpts },
        { provide: CartService, useValue: cart },
        { provide: I18nService, useValue: { locale: signal('en'), t: (k: string) => k } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(CustomizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.artwork()).toBeNull();
    expect(component.loading()).toBeFalse();
  });

  describe('price + quantity', () => {
    beforeEach(async () => setup('a1'));

    it('computes price from the selected size, frame, and matte', () => {
      component.selectedSizeId.set('p-large'); // multiplier 2 -> baseLine 20000
      component.selectedFrameId.set('f1'); // +5000
      component.withMatte.set(true); // +3000
      expect(component.price().unitPrice).toBe(28000);
    });

    it('totalLine multiplies unit price by quantity', () => {
      component.selectedSizeId.set('p-small'); // multiplier 1 -> unit 10000
      component.quantity.set(3);
      expect(component.totalLine()).toBe(30000);
    });

    it('incQty/decQty clamp to [1, 20]', () => {
      component.quantity.set(20);
      component.incQty();
      expect(component.quantity()).toBe(20);
      component.quantity.set(1);
      component.decQty();
      expect(component.quantity()).toBe(1);
      component.quantity.set(5);
      component.incQty();
      expect(component.quantity()).toBe(6);
      component.decQty();
      expect(component.quantity()).toBe(5);
    });
  });

  describe('canAddToCart', () => {
    it('is true once a size is selected on an available artwork', async () => {
      await setup('a1');
      expect(component.canAddToCart()).toBeTrue();
    });

    it('is false when the artwork is unavailable', async () => {
      artworkService = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
      artworkService.getById.and.returnValue(Promise.resolve(makeDetail({ isAvailable: false })));
      printOpts = jasmine.createSpyObj<PrintOptionsService>('PrintOptionsService', ['listSizes', 'listFrames']);
      printOpts.listSizes.and.returnValue(Promise.resolve(SIZES));
      printOpts.listFrames.and.returnValue(Promise.resolve(FRAMES));
      cart = jasmine.createSpyObj<CartService>('CartService', ['addItem']);
      const paramMap = convertToParamMap({ artworkId: 'a1' });
      TestBed.configureTestingModule({
        imports: [CustomizationComponent],
        providers: [
          provideRouter([]),
          provideNoopAnimations(),
          { provide: ArtworkDetailService, useValue: artworkService },
          { provide: PrintOptionsService, useValue: printOpts },
          { provide: CartService, useValue: cart },
          { provide: I18nService, useValue: { locale: signal('en'), t: (k: string) => k } as unknown as I18nService },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
        ],
      });
      fixture = TestBed.createComponent(CustomizationComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.canAddToCart()).toBeFalse();
    });
  });

  describe('onAddToCart', () => {
    beforeEach(async () => setup('a1'));

    it('adds the configured item to the cart and navigates to /cart', async () => {
      component.selectedFrameId.set('f1');
      component.withMatte.set(true);
      component.quantity.set(2);
      cart.addItem.and.returnValue(Promise.resolve());

      await component.onAddToCart();

      expect(cart.addItem).toHaveBeenCalledWith({
        artworkId: 'a1',
        printSizeId: 'p-small',
        frameOptionId: 'f1',
        withMatte: true,
        quantity: 2,
      });
      expect(router.navigate).toHaveBeenCalledWith(['/cart']);
      expect(component.adding()).toBeFalse();
    });

    it('resets adding() even if addItem rejects', async () => {
      cart.addItem.and.returnValue(Promise.reject(new Error('boom')));
      await expectAsync(component.onAddToCart()).toBeRejected();
      expect(component.adding()).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalledWith(['/cart']);
    });

    it('is a no-op when canAddToCart is false', async () => {
      component.selectedSizeId.set(null);
      await component.onAddToCart();
      expect(cart.addItem).not.toHaveBeenCalled();
    });

    it('ignores a second call while one is already in flight', async () => {
      let resolveFn!: () => void;
      cart.addItem.and.returnValue(new Promise((resolve) => (resolveFn = () => resolve())));
      const first = component.onAddToCart();
      const second = component.onAddToCart();
      resolveFn();
      await Promise.all([first, second]);
      expect(cart.addItem).toHaveBeenCalledTimes(1);
    });
  });
});
