// frontend/src/app/features/wall-preview/wall-preview.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { WallPreviewComponent } from './wall-preview.component';
import { ArtworkDetailService } from '../artwork-detail/artwork-detail.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { FRAME_STYLES } from './frame-styles';
import { framedHeight, toDisplayCoords } from './wall-preview-renderer';
import type { ArtworkDetail, ArtworkImage } from '../../core/api-models/artwork.model';

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
    title: 'Sunset Over Yerevan!',
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

/** `new Image()` returns a real <canvas> (a valid CanvasImageSource) with img-like src/onload. */
function installFakeImage(naturalWidth = 800, naturalHeight = 600): () => void {
  const original = window.Image;
  (window as unknown as { Image: unknown }).Image = class {
    constructor() {
      const canvas = document.createElement('canvas');
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const c = canvas as unknown as { naturalWidth: number; naturalHeight: number; crossOrigin: string; onload: (() => void) | null; onerror: (() => void) | null; src: string };
      c.naturalWidth = naturalWidth;
      c.naturalHeight = naturalHeight;
      c.crossOrigin = '';
      c.onload = null;
      c.onerror = null;
      let _src = '';
      Object.defineProperty(canvas, 'src', {
        get: () => _src,
        set: (v: string) => {
          _src = v;
          setTimeout(() => c.onload?.());
        },
      });
      // eslint-disable-next-line no-constructor-return
      return canvas as unknown as HTMLImageElement;
    }
  } as unknown as typeof Image;
  return () => {
    window.Image = original;
  };
}

describe('WallPreviewComponent', () => {
  let fixture: ComponentFixture<WallPreviewComponent>;
  let component: WallPreviewComponent;
  let artworkService: jasmine.SpyObj<ArtworkDetailService>;
  let restoreImage: () => void;

  async function setup(artworkId = 'a1') {
    artworkService = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    artworkService.getById.and.returnValue(Promise.resolve(makeDetail()));
    const paramMap = convertToParamMap({ artworkId });
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [WallPreviewComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: artworkService },
        { provide: I18nService, useValue: i18nStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(WallPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    restoreImage = installFakeImage();
  });

  afterEach(() => {
    restoreImage();
  });

  it('reads the artworkId from the route', async () => {
    await setup('a1');
    expect(component.artworkId()).toBe('a1');
  });

  it('loads the artwork and its primary image', async () => {
    await setup();
    expect(artworkService.getById).toHaveBeenCalledWith('a1');
    expect(component.artwork()?.id).toBe('a1');
    expect(component.artworkImage()).toBeTruthy();
    expect(component.artworkAspect()).toBeCloseTo(800 / 600);
    expect(component.loading()).toBeFalse();
  });

  it('clears the artwork and stops loading when the fetch fails', async () => {
    artworkService = jasmine.createSpyObj<ArtworkDetailService>('ArtworkDetailService', ['getById']);
    artworkService.getById.and.returnValue(Promise.reject(new Error('not found')));
    const paramMap = convertToParamMap({ artworkId: 'missing' });
    TestBed.configureTestingModule({
      imports: [WallPreviewComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ArtworkDetailService, useValue: artworkService },
        { provide: I18nService, useValue: { locale: signal('en'), t: (k: string) => k } as unknown as I18nService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    fixture = TestBed.createComponent(WallPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.artwork()).toBeNull();
    expect(component.loading()).toBeFalse();
  });

  describe('frame style color defaulting', () => {
    beforeEach(async () => setup());

    it('starts on the wood style with its default color and matte on', () => {
      expect(component.frameStyleId()).toBe('wood');
      expect(component.frameColorHex()).toBe(FRAME_STYLES.wood.defaultColorHex);
      expect(component.withMatte()).toBeTrue();
    });

    it('follows the new style default when the color was a known default', () => {
      component.frameStyleId.set('metal');
      TestBed.flushEffects();
      expect(component.frameColorHex()).toBe(FRAME_STYLES.metal.defaultColorHex);
    });

    it('preserves a custom color across a style change', () => {
      component.frameColorHex.set('#123456');
      component.frameStyleId.set('metal');
      TestBed.flushEffects();
      expect(component.frameColorHex()).toBe('#123456');
    });
  });

  describe('wall photo upload', () => {
    beforeEach(async () => setup());

    function fileEvent(file: File): Event {
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', { value: [file] });
      return { target: input } as unknown as Event;
    }

    it('accepts a valid image and initialises the placement', async () => {
      const file = new File(['x'], 'wall.jpg', { type: 'image/jpeg' });
      await component.onWallFileSelected(fileEvent(file));
      expect(component.wallImage()).toBeTruthy();
      expect(component.placement().width).toBeGreaterThan(0);
    });

    it('rejects an unsupported file type', async () => {
      const file = new File(['x'], 'wall.gif', { type: 'image/gif' });
      await component.onWallFileSelected(fileEvent(file));
      expect(component.wallImage()).toBeNull();
    });

    it('rejects a file over the size limit', async () => {
      const big = new File([new Uint8Array(16 * 1024 * 1024)], 'wall.jpg', { type: 'image/jpeg' });
      await component.onWallFileSelected(fileEvent(big));
      expect(component.wallImage()).toBeNull();
    });

    it('accepts a dropped file via onWallDrop', async () => {
      const file = new File(['x'], 'wall.png', { type: 'image/png' });
      const dropEvent = {
        preventDefault: () => {},
        dataTransfer: { files: [file] },
      } as unknown as DragEvent;
      await component.onWallDrop(dropEvent);
      expect(component.wallImage()).toBeTruthy();
    });

    it('resetWall clears the wall image', async () => {
      const file = new File(['x'], 'wall.jpg', { type: 'image/jpeg' });
      await component.onWallFileSelected(fileEvent(file));
      expect(component.wallImage()).toBeTruthy();
      component.resetWall();
      expect(component.wallImage()).toBeNull();
    });
  });

  describe('slider resize', () => {
    beforeEach(async () => {
      await setup();
      const file = new File(['x'], 'wall.jpg', { type: 'image/jpeg' });
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [file] });
      await component.onWallFileSelected({ target: input } as unknown as Event);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('updates the placement width, clamped within bounds', () => {
      component.onSliderChange(999999);
      const wall = component.wallImage()!;
      expect(component.placement().width).toBeLessThanOrEqual(wall.naturalWidth * 0.85 + 0.001);
    });

    it('is a no-op when there is no wall image', () => {
      component.resetWall();
      const before = component.placement();
      component.onSliderChange(500);
      expect(component.placement()).toEqual(before);
    });
  });

  describe('pointer drag', () => {
    beforeEach(async () => {
      await setup();
      const file = new File(['x'], 'wall.jpg', { type: 'image/jpeg' });
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [file] });
      await component.onWallFileSelected({ target: input } as unknown as Event);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    function canvasEl(): HTMLCanvasElement {
      return fixture.nativeElement.querySelector('canvas');
    }

    it('moving the pointer inside the artwork translates the placement', () => {
      const canvas = canvasEl();
      const rect = canvas.getBoundingClientRect();
      const startPlacement = component.placement();

      spyOn(canvas, 'setPointerCapture');
      spyOn(canvas, 'hasPointerCapture').and.returnValue(true);
      spyOn(canvas, 'releasePointerCapture');

      // Derive the actual display scale from the canvas's own CSS size (set by
      // setupCanvasBackingStore) rather than guessing pixel offsets, so the
      // down-point reliably lands inside the framed artwork rectangle
      // regardless of the test host's layout width.
      const scale = parseFloat(canvas.style.width) / component.wallImage()!.naturalWidth;
      const h = framedHeight(startPlacement.width, component.artworkAspect(), component.currentStyle(), component.withMatte());
      const center = toDisplayCoords(startPlacement.x + startPlacement.width / 2, startPlacement.y + h / 2, scale);
      const downX = rect.left + center.x;
      const downY = rect.top + center.y;

      component.onPointerDown({ clientX: downX, clientY: downY, pointerId: 1 } as PointerEvent);
      component.onPointerMove({ clientX: downX + 20, clientY: downY + 10, pointerId: 1 } as PointerEvent);
      const moved = component.placement();
      component.onPointerUp({ pointerId: 1 } as PointerEvent);

      expect(moved.x).not.toBe(startPlacement.x);
    });

    it('pointer down outside the artwork does not start a drag', () => {
      const canvas = canvasEl();
      const rect = canvas.getBoundingClientRect();
      const startPlacement = component.placement();

      // Far outside the framed rectangle.
      component.onPointerDown({
        clientX: rect.left + rect.width - 1,
        clientY: rect.top + rect.height - 1,
        pointerId: 1,
      } as PointerEvent);
      component.onPointerMove({
        clientX: rect.left + rect.width - 50,
        clientY: rect.top + rect.height - 50,
        pointerId: 1,
      } as PointerEvent);

      expect(component.placement()).toEqual(startPlacement);
    });

    it('onPointerUp resets the cursor and releases capture', () => {
      const canvas = canvasEl();
      spyOn(canvas, 'hasPointerCapture').and.returnValue(true);
      const releaseSpy = spyOn(canvas, 'releasePointerCapture');
      component.onPointerUp({ pointerId: 1 } as PointerEvent);
      expect(releaseSpy).toHaveBeenCalledWith(1);
      expect(canvas.style.cursor).toBe('grab');
    });
  });

  describe('onSave', () => {
    let createObjectURLSpy: jasmine.Spy;
    let revokeObjectURLSpy: jasmine.Spy;
    let clickSpy: jasmine.Spy;

    beforeEach(async () => {
      await setup();
      const file = new File(['x'], 'wall.jpg', { type: 'image/jpeg' });
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [file] });
      await component.onWallFileSelected({ target: input } as unknown as Event);

      createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:fake');
      revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
      clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
    });

    it('is a no-op without a wall image', async () => {
      component.resetWall();
      await component.onSave();
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });

    it('exports a composite and triggers a download', async () => {
      await component.onSave();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('ignores a second save while one is already in flight', async () => {
      const first = component.onSave();
      const second = component.onSave();
      await Promise.all([first, second]);
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
      void revokeObjectURLSpy;
    });
  });
});
