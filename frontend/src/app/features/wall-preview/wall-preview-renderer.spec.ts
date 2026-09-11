// frontend/src/app/features/wall-preview/wall-preview-renderer.spec.ts
import { FRAME_STYLES } from './frame-styles';
import {
  clampPlacement,
  drawFrame,
  exportComposite,
  fitToViewport,
  framedHeight,
  getResizeHandleRect,
  hitTestArtwork,
  hitTestResizeHandle,
  MAX_FRAMED_WIDTH_FRACTION,
  MIN_FRAMED_WIDTH_FRACTION,
  RESIZE_HANDLE_SIZE_PX,
  renderToCanvas,
  setupCanvasBackingStore,
  toDisplayCoords,
  toImageCoords,
  type ArtworkOnWall,
  type RenderInputs,
} from './wall-preview-renderer';

/** A canvas doubles as a valid CanvasImageSource without needing to load a real image. */
function makeImageStub(naturalWidth: number, naturalHeight: number): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = naturalWidth;
  canvas.height = naturalHeight;
  (canvas as unknown as { naturalWidth: number }).naturalWidth = naturalWidth;
  (canvas as unknown as { naturalHeight: number }).naturalHeight = naturalHeight;
  return canvas as unknown as HTMLImageElement;
}

function baseInputs(overrides: Partial<RenderInputs> = {}): RenderInputs {
  const placement: ArtworkOnWall = { x: 100, y: 100, width: 300 };
  return {
    wallImage: makeImageStub(1200, 900),
    artworkImage: makeImageStub(400, 300),
    artworkAspect: 400 / 300,
    placement,
    frame: FRAME_STYLES.wood,
    frameColorHex: '#6b4423',
    withMatte: true,
    showHandles: false,
    showSelection: false,
    ...overrides,
  };
}

describe('fitToViewport', () => {
  it('fits by width when the image is wide relative to the viewport', () => {
    const wall = makeImageStub(2000, 1000); // 2:1
    const result = fitToViewport(wall, 800, 800);
    expect(result.displayWidth).toBe(800);
    expect(result.displayHeight).toBe(400);
    expect(result.scale).toBeCloseTo(800 / 2000);
  });

  it('fits by height when the image is tall relative to the viewport', () => {
    const wall = makeImageStub(1000, 2000); // 1:2
    const result = fitToViewport(wall, 800, 800);
    expect(result.displayHeight).toBe(800);
    expect(result.displayWidth).toBe(400);
    expect(result.scale).toBeCloseTo(400 / 1000);
  });
});

describe('setupCanvasBackingStore', () => {
  let originalDpr: number;

  beforeEach(() => {
    originalDpr = window.devicePixelRatio;
  });

  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: originalDpr, configurable: true });
  });

  it('sizes the backing store to displaySize * DPR and scales the context', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    const canvas = document.createElement('canvas');
    const ctx = setupCanvasBackingStore(canvas, 300, 200);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(400);
    expect(canvas.style.width).toBe('300px');
    expect(canvas.style.height).toBe('200px');
    const t = ctx.getTransform();
    expect(t.a).toBe(2);
    expect(t.d).toBe(2);
  });

  it('floors DPR at 1 when devicePixelRatio is falsy', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
    const canvas = document.createElement('canvas');
    const ctx = setupCanvasBackingStore(canvas, 100, 50);
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(50);
    expect(ctx.getTransform().a).toBe(1);
  });
});

describe('toImageCoords / toDisplayCoords', () => {
  it('are inverses of each other under a given scale', () => {
    const scale = 0.4;
    const display = toDisplayCoords(120, 80, scale);
    const image = toImageCoords(display.x, display.y, scale);
    expect(image.x).toBeCloseTo(120);
    expect(image.y).toBeCloseTo(80);
  });
});

describe('framedHeight', () => {
  it('equals width / aspect when the frame has no thickness or matte', () => {
    const h = framedHeight(400, 2, FRAME_STYLES.none, false);
    expect(h).toBeCloseTo(200);
  });

  it('produces a height consistent with the inset/aspect invariant for a framed+matted artwork', () => {
    const width = 300;
    const aspect = 4 / 3;
    const h = framedHeight(width, aspect, FRAME_STYLES.wood, true);
    const inset = (FRAME_STYLES.wood.thicknessFraction + FRAME_STYLES.wood.mattePadFraction) * Math.min(width, h);
    const innerW = width - 2 * inset;
    const innerH = h - 2 * inset;
    expect(innerW / innerH).toBeCloseTo(aspect, 1);
  });

  it('ignores mattePadFraction when withMatte is false', () => {
    // aspect must differ from 1 — at aspect 1 the inset cancels out of the
    // height formula entirely, masking any difference the matte would make.
    const aspect = 2;
    const withMatte = framedHeight(300, aspect, FRAME_STYLES.wood, true);
    const withoutMatte = framedHeight(300, aspect, FRAME_STYLES.wood, false);
    expect(withoutMatte).toBeLessThan(withMatte);
  });
});

describe('clampPlacement', () => {
  const aspect = 4 / 3;
  const wallWidth = 1000;
  const wallHeight = 800;

  it('clamps width to at least MIN_FRAMED_WIDTH_FRACTION of the wall width', () => {
    const result = clampPlacement(
      { x: 0, y: 0, width: 1 },
      aspect,
      FRAME_STYLES.none,
      false,
      wallWidth,
      wallHeight,
    );
    expect(result.width).toBeCloseTo(wallWidth * MIN_FRAMED_WIDTH_FRACTION);
  });

  it('clamps width to at most MAX_FRAMED_WIDTH_FRACTION of the wall width', () => {
    const result = clampPlacement(
      { x: 0, y: 0, width: 100000 },
      aspect,
      FRAME_STYLES.none,
      false,
      wallWidth,
      wallHeight,
    );
    expect(result.width).toBeCloseTo(wallWidth * MAX_FRAMED_WIDTH_FRACTION);
  });

  it('clamps x/y so the framed rectangle stays fully inside the wall', () => {
    const result = clampPlacement(
      { x: -50, y: -50, width: 200 },
      aspect,
      FRAME_STYLES.none,
      false,
      wallWidth,
      wallHeight,
    );
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('clamps a placement that overflows the right/bottom edges', () => {
    const result = clampPlacement(
      { x: 950, y: 750, width: 200 },
      aspect,
      FRAME_STYLES.none,
      false,
      wallWidth,
      wallHeight,
    );
    const h = framedHeight(result.width, aspect, FRAME_STYLES.none, false);
    expect(result.x).toBeCloseTo(wallWidth - result.width);
    expect(result.y).toBeCloseTo(wallHeight - h);
  });
});

describe('getResizeHandleRect', () => {
  it('centres the handle on the bottom-right corner of the framed rect, in display coords', () => {
    const placement: ArtworkOnWall = { x: 0, y: 0, width: 200 };
    const scale = 0.5;
    const handle = getResizeHandleRect(placement, 1, FRAME_STYLES.none, false, scale);
    const expectedCenterX = 200 * scale;
    const expectedCenterY = 200 * scale; // aspect 1, no frame => height == width
    expect(handle.size).toBe(RESIZE_HANDLE_SIZE_PX);
    expect(handle.x + handle.size / 2).toBeCloseTo(expectedCenterX);
    expect(handle.y + handle.size / 2).toBeCloseTo(expectedCenterY);
  });
});

describe('hitTestResizeHandle', () => {
  const handle = { x: 10, y: 10, size: 20 };

  it('is true inside and on the boundary of the handle', () => {
    expect(hitTestResizeHandle(15, 15, handle)).toBeTrue();
    expect(hitTestResizeHandle(10, 10, handle)).toBeTrue();
    expect(hitTestResizeHandle(30, 30, handle)).toBeTrue();
  });

  it('is false outside the handle', () => {
    expect(hitTestResizeHandle(9, 15, handle)).toBeFalse();
    expect(hitTestResizeHandle(31, 15, handle)).toBeFalse();
  });
});

describe('hitTestArtwork', () => {
  const placement: ArtworkOnWall = { x: 100, y: 100, width: 200 };

  it('is true for a point inside the framed rect', () => {
    expect(hitTestArtwork(150, 150, placement, 1, FRAME_STYLES.none, false, 1)).toBeTrue();
  });

  it('is false for a point outside the framed rect', () => {
    expect(hitTestArtwork(50, 50, placement, 1, FRAME_STYLES.none, false, 1)).toBeFalse();
  });

  it('accounts for the display scale', () => {
    // At scale 0.5, image point (100,100) maps to display (50,50).
    expect(hitTestArtwork(50, 50, placement, 1, FRAME_STYLES.none, false, 0.5)).toBeTrue();
    expect(hitTestArtwork(10, 10, placement, 1, FRAME_STYLES.none, false, 0.5)).toBeFalse();
  });
});

describe('drawFrame', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    ctx = canvas.getContext('2d')!;
  });

  it('draws the wall-photo-independent frame body, matte, and artwork for a framed+matted style', () => {
    spyOn(ctx, 'fillRect').and.callThrough();
    spyOn(ctx, 'drawImage').and.callThrough();
    drawFrame(ctx, baseInputs());
    expect(ctx.drawImage).toHaveBeenCalledTimes(1); // artwork image only (wall is drawn by the caller)
    expect(ctx.fillRect).toHaveBeenCalled(); // frame body + matte
  });

  it('skips the frame body entirely for the "none" style', () => {
    spyOn(ctx, 'fillRect').and.callThrough();
    drawFrame(ctx, baseInputs({ frame: FRAME_STYLES.none, withMatte: false }));
    // Only the artwork's zero-width shadow strokeRect path may run; fillRect
    // should not be called for a frame body since thickness is 0.
    const calls = (ctx.fillRect as jasmine.Spy).calls.count();
    expect(calls).toBe(0);
  });

  it('applies a linear gradient for wood and metal finishes', () => {
    spyOn(ctx, 'createLinearGradient').and.callThrough();
    drawFrame(ctx, baseInputs({ frame: FRAME_STYLES.wood }));
    expect(ctx.createLinearGradient).toHaveBeenCalled();

    (ctx.createLinearGradient as jasmine.Spy).calls.reset();
    drawFrame(ctx, baseInputs({ frame: FRAME_STYLES.metal, frameColorHex: '#2b2b2b' }));
    expect(ctx.createLinearGradient).toHaveBeenCalled();
  });

  it('does not paint a gradient for the flat plastic finish', () => {
    spyOn(ctx, 'createLinearGradient').and.callThrough();
    drawFrame(ctx, baseInputs({ frame: FRAME_STYLES.plastic, frameColorHex: '#ffffff' }));
    expect(ctx.createLinearGradient).not.toHaveBeenCalled();
  });

  it('skips the matte fill when withMatte is false', () => {
    spyOn(ctx, 'fillRect').and.callThrough();
    drawFrame(ctx, baseInputs({ frame: FRAME_STYLES.none, withMatte: false }));
    expect((ctx.fillRect as jasmine.Spy).calls.allArgs().length).toBe(0);
  });
});

describe('renderToCanvas', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;
  });

  it('draws the wall photo then the frame, restoring the transform afterward', () => {
    spyOn(ctx, 'drawImage').and.callThrough();
    spyOn(ctx, 'save').and.callThrough();
    spyOn(ctx, 'restore').and.callThrough();
    renderToCanvas(ctx, 1, baseInputs());
    // wall photo + artwork image = 2 drawImage calls
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('draws a selection outline when showSelection is true', () => {
    spyOn(ctx, 'setLineDash').and.callThrough();
    renderToCanvas(ctx, 1, baseInputs({ showSelection: true }));
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
  });

  it('draws a resize handle when showHandles is true', () => {
    spyOn(ctx, 'fillRect').and.callThrough();
    renderToCanvas(ctx, 1, baseInputs({ showHandles: true, frame: FRAME_STYLES.none, withMatte: false }));
    // handle fill uses fillRect with the handle's size
    const calls = (ctx.fillRect as jasmine.Spy).calls.allArgs();
    expect(calls.some(([, , w, h]) => w === RESIZE_HANDLE_SIZE_PX && h === RESIZE_HANDLE_SIZE_PX)).toBeTrue();
  });

  it('draws neither outline nor handle when both flags are false', () => {
    // drawFrame() itself always strokes a (transparent) shadow rect around the
    // artwork, so absence of the selection outline/handle is checked via
    // setLineDash (unique to the dashed selection outline) and the handle's
    // characteristic fillRect size, not via strokeRect call count.
    spyOn(ctx, 'setLineDash').and.callThrough();
    spyOn(ctx, 'fillRect').and.callThrough();
    renderToCanvas(ctx, 1, baseInputs({ showHandles: false, showSelection: false }));
    expect(ctx.setLineDash).not.toHaveBeenCalled();
    const handleFillCalls = (ctx.fillRect as jasmine.Spy).calls
      .allArgs()
      .filter(([, , w, h]) => w === RESIZE_HANDLE_SIZE_PX && h === RESIZE_HANDLE_SIZE_PX);
    expect(handleFillCalls.length).toBe(0);
  });
});

describe('exportComposite', () => {
  it('resolves a PNG blob sized to the wall image at native resolution', async () => {
    const inputs = baseInputs();
    const blob = await exportComposite(inputs);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});
