// frontend/src/app/features/wall-preview/wall-preview-renderer.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  WALL PREVIEW — CANVAS MATH
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coordinate systems
 * ──────────────────
 *
 *   There are TWO coordinate systems and one device-pixel-ratio scale on top.
 *
 *   1. Image coordinates — pixels of the user's wall photo (the source image).
 *      The artwork's saved position {x, y, width, height} is stored in THIS
 *      system. This is what we serialise to PNG/JSON: it's invariant to
 *      display size.
 *
 *   2. Canvas display coordinates — CSS pixels of the on-screen canvas, after
 *      "fit-into-viewport" scaling. Pointer events arrive in this system; we
 *      convert them to image coordinates via the same scale factor used to
 *      draw.
 *
 *   3. Device pixel ratio (DPR) — the canvas backing store is sized to
 *      `display × DPR` so the result is crisp on retina screens. CSS sets
 *      the display size; ctx.scale(DPR, DPR) once per draw means everything
 *      else can be written in CSS pixels.
 *
 *   Helpers below:
 *     toImageCoords(displayX, displayY)  — pointer → image
 *     toDisplayCoords(imageX, imageY)    — image → canvas (for handle hit-tests)
 *
 *
 * Artwork placement
 * ─────────────────
 *
 *   ArtworkOnWall = { x, y, width }
 *     x, y   — top-left corner of the FRAMED rectangle in image coords
 *     width  — width of the FRAMED rectangle in image coords
 *
 *   Height is derived from `width` and the artwork's intrinsic aspect ratio,
 *   so resizing is single-axis and aspect ratio is preserved automatically.
 *
 *   Frame and matte expand around the inner artwork. The "framed rectangle"
 *   includes them. Inner-artwork rect is computed by inset:
 *     thickness = frame.thicknessFraction * min(width, height)
 *     mattePad  = frame.mattePadFraction  * min(width, height)
 *     inner = framed inset by (thickness + mattePad)
 *
 *
 * Drag and resize
 * ───────────────
 *
 *   Drag handle is the body of the artwork. Resize handle is a corner widget
 *   (bottom-right) we draw in display coords. Hit-testing happens in display
 *   coords because that's where the user's finger/pointer actually is.
 *
 *   Resize math (corner drag):
 *     newWidth = clamp(pointer.imageX - artwork.x, minWidth, maxWidth)
 *     Height follows from aspect ratio.
 *
 *   The artwork is constrained to stay inside the wall photo: clamp x/y so
 *   the framed rectangle is fully contained.
 *
 *
 * Export
 * ──────
 *
 *   exportComposite() renders one final frame to an OFFSCREEN canvas at the
 *   wall photo's native resolution (no DPR scaling, no fit-to-viewport),
 *   then returns a Blob via canvas.toBlob('image/png'). This gives the user
 *   a full-resolution download regardless of how big they had the preview
 *   on screen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { FrameStyle } from './frame-styles';

// ─── Public types ───────────────────────────────────────────────────────────

export interface ArtworkOnWall {
  /** Top-left of the framed rect in image pixels. */
  x: number;
  y: number;
  /** Width of the framed rect in image pixels. */
  width: number;
}

export interface RenderInputs {
  wallImage: HTMLImageElement;
  artworkImage: HTMLImageElement;
  /** Intrinsic aspect ratio of the artwork (width / height). Cached. */
  artworkAspect: number;
  placement: ArtworkOnWall;
  frame: FrameStyle;
  frameColorHex: string;
  withMatte: boolean;
  /**
   * If provided, draw a resize handle at the bottom-right corner.
   * Render passes false for the export composite.
   */
  showHandles: boolean;
  /**
   * If true, draw a selection outline. False when exporting so the saved
   * image is clean.
   */
  showSelection: boolean;
}

export interface FitToViewportResult {
  /** Multiply image-coord values by this to get display-coord values. */
  scale: number;
  /** Display (CSS) size for the canvas element. */
  displayWidth: number;
  displayHeight: number;
}

export const RESIZE_HANDLE_SIZE_PX = 18; // CSS pixels — touch-friendly
export const MIN_FRAMED_WIDTH_FRACTION = 0.08; // ≥ 8% of wall width
export const MAX_FRAMED_WIDTH_FRACTION = 0.85;

// ─── Layout helpers ─────────────────────────────────────────────────────────

/**
 * Compute display size + scale so the wall image fits inside the available
 * viewport while preserving aspect ratio. Caller writes the result onto the
 * canvas element's style.width/style.height; the backing-store size is
 * computed below in `setupCanvasBackingStore`.
 */
export function fitToViewport(
  wallImage: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
): FitToViewportResult {
  const ratio = wallImage.naturalWidth / wallImage.naturalHeight;
  let displayWidth = maxWidth;
  let displayHeight = maxWidth / ratio;
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = maxHeight * ratio;
  }
  const scale = displayWidth / wallImage.naturalWidth;
  return { scale, displayWidth, displayHeight };
}

/**
 * Sets canvas backing-store size for the current DPR and applies a single
 * `scale(dpr, dpr)` to the context. After this, all drawing can be done in
 * CSS pixels and will be crisp on high-DPI screens.
 */
export function setupCanvasBackingStore(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number,
): CanvasRenderingContext2D {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(displayWidth * dpr);
  canvas.height = Math.round(displayHeight * dpr);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function toImageCoords(
  displayX: number,
  displayY: number,
  scale: number,
): { x: number; y: number } {
  return { x: displayX / scale, y: displayY / scale };
}

export function toDisplayCoords(
  imageX: number,
  imageY: number,
  scale: number,
): { x: number; y: number } {
  return { x: imageX * scale, y: imageY * scale };
}

// ─── Placement math ─────────────────────────────────────────────────────────

export function framedHeight(width: number, artworkAspect: number, frame: FrameStyle, withMatte: boolean): number {
  // Solve for height given the framed width, where:
  //   innerW = width  - 2 * (thickness + matte)
  //   innerH = innerW / artworkAspect
  //   height = innerH + 2 * (thickness + matte)
  //   thickness/matte depend on min(width, height) — but for typical aspect
  //   ratios the dominant constraint is `width`. We iterate once to converge
  //   on a stable height, which is plenty for visual fidelity.
  const insetGuess = (frame.thicknessFraction + (withMatte ? frame.mattePadFraction : 0)) * width;
  let height = (width - 2 * insetGuess) / artworkAspect + 2 * insetGuess;
  const inset = (frame.thicknessFraction + (withMatte ? frame.mattePadFraction : 0)) * Math.min(width, height);
  height = (width - 2 * inset) / artworkAspect + 2 * inset;
  return height;
}

export function clampPlacement(
  placement: ArtworkOnWall,
  artworkAspect: number,
  frame: FrameStyle,
  withMatte: boolean,
  wallWidth: number,
  wallHeight: number,
): ArtworkOnWall {
  const minW = Math.max(20, wallWidth * MIN_FRAMED_WIDTH_FRACTION);
  const maxW = Math.min(wallWidth, wallWidth * MAX_FRAMED_WIDTH_FRACTION);
  const width = Math.min(maxW, Math.max(minW, placement.width));
  const height = framedHeight(width, artworkAspect, frame, withMatte);
  const x = Math.min(Math.max(0, placement.x), wallWidth - width);
  const y = Math.min(Math.max(0, placement.y), wallHeight - height);
  return { x, y, width };
}

export function getResizeHandleRect(
  placement: ArtworkOnWall,
  artworkAspect: number,
  frame: FrameStyle,
  withMatte: boolean,
  scale: number,
): { x: number; y: number; size: number } {
  const h = framedHeight(placement.width, artworkAspect, frame, withMatte);
  const br = toDisplayCoords(placement.x + placement.width, placement.y + h, scale);
  const size = RESIZE_HANDLE_SIZE_PX;
  return { x: br.x - size / 2, y: br.y - size / 2, size };
}

export function hitTestResizeHandle(
  displayX: number,
  displayY: number,
  handle: { x: number; y: number; size: number },
): boolean {
  return (
    displayX >= handle.x &&
    displayX <= handle.x + handle.size &&
    displayY >= handle.y &&
    displayY <= handle.y + handle.size
  );
}

export function hitTestArtwork(
  displayX: number,
  displayY: number,
  placement: ArtworkOnWall,
  artworkAspect: number,
  frame: FrameStyle,
  withMatte: boolean,
  scale: number,
): boolean {
  const h = framedHeight(placement.width, artworkAspect, frame, withMatte);
  const tl = toDisplayCoords(placement.x, placement.y, scale);
  const br = toDisplayCoords(placement.x + placement.width, placement.y + h, scale);
  return displayX >= tl.x && displayX <= br.x && displayY >= tl.y && displayY <= br.y;
}

// ─── Drawing ────────────────────────────────────────────────────────────────

/**
 * Draws a complete frame onto `ctx` in image coordinates.
 *
 * The caller has already set up the transform so 1 unit = 1 image pixel.
 * (For export this means we draw at native resolution; for the on-screen
 * canvas the transform additionally includes the fit-to-viewport scale and
 * the DPR.)
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  inputs: RenderInputs,
): void {
  const { placement, frame, frameColorHex, withMatte, artworkImage, artworkAspect } = inputs;
  const h = framedHeight(placement.width, artworkAspect, frame, withMatte);
  const { x, y, width } = placement;

  const minSide = Math.min(width, h);
  const thickness = frame.thicknessFraction * minSide;
  const matte = withMatte ? frame.mattePadFraction * minSide : 0;

  // 1) Frame body
  if (frame.id !== 'none' && thickness > 0) {
    drawFrameBody(ctx, x, y, width, h, thickness, frameColorHex, frame.finish);
  }

  // 2) Matte (inside frame, outside artwork)
  const matteX = x + thickness;
  const matteY = y + thickness;
  const matteW = width - 2 * thickness;
  const matteH = h - 2 * thickness;
  if (matte > 0 && matteW > 0 && matteH > 0) {
    ctx.fillStyle = '#f6f1e4'; // soft cream matte
    ctx.fillRect(matteX, matteY, matteW, matteH);
  }

  // 3) Artwork itself
  const artX = matteX + matte;
  const artY = matteY + matte;
  const artW = matteW - 2 * matte;
  const artH = matteH - 2 * matte;
  if (artW > 0 && artH > 0) {
    ctx.drawImage(artworkImage, artX, artY, artW, artH);
    // subtle shadow inside the matte gives the print a sense of depth
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = Math.max(2, thickness * 0.5);
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.strokeRect(artX, artY, artW, artH);
    ctx.restore();
  }
}

function drawFrameBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  thickness: number,
  colorHex: string,
  finish: FrameStyle['finish'],
): void {
  // Filled outer rect
  ctx.fillStyle = colorHex;
  ctx.fillRect(x, y, w, h);

  // Carve out the inner rect so we can paint matte/art over it cleanly
  // (we just overpaint, but a finish gradient on top of the rim adds depth)
  if (finish === 'wood') {
    // Subtle vertical grain
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, shade(colorHex, 0.08));
    grad.addColorStop(0.5, colorHex);
    grad.addColorStop(1, shade(colorHex, -0.12));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  } else if (finish === 'metal') {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, shade(colorHex, 0.25));
    grad.addColorStop(0.5, colorHex);
    grad.addColorStop(1, shade(colorHex, -0.2));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  // Drop shadow on the wall — small offset so it reads as "hanging on a wall"
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = thickness * 1.2;
  ctx.shadowOffsetX = thickness * 0.25;
  ctx.shadowOffsetY = thickness * 0.6;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Lighten (positive) or darken (negative) a hex colour by `amount` in [-1,1]. */
function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const adjust = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
  r = adjust(r);
  g = adjust(g);
  b = adjust(b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Full draw of one frame onto the on-screen canvas.
 * Caller is responsible for clearing first; this only paints.
 */
export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  scale: number,
  inputs: RenderInputs,
): void {
  // Save the DPR transform set by setupCanvasBackingStore, then layer the
  // image-coord transform on top.
  ctx.save();
  ctx.scale(scale, scale);

  // 1) Wall photo as background
  ctx.drawImage(inputs.wallImage, 0, 0);

  // 2) Frame + artwork
  drawFrame(ctx, inputs);

  ctx.restore(); // back to DPR-only transform; handles drawn in CSS pixels

  if (inputs.showSelection || inputs.showHandles) {
    const h = framedHeight(
      inputs.placement.width,
      inputs.artworkAspect,
      inputs.frame,
      inputs.withMatte,
    );
    const tl = toDisplayCoords(inputs.placement.x, inputs.placement.y, scale);
    const br = toDisplayCoords(inputs.placement.x + inputs.placement.width, inputs.placement.y + h, scale);

    if (inputs.showSelection) {
      ctx.save();
      ctx.strokeStyle = 'rgba(103, 58, 183, 0.85)'; // primary
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.restore();
    }

    if (inputs.showHandles) {
      const handle = getResizeHandleRect(
        inputs.placement,
        inputs.artworkAspect,
        inputs.frame,
        inputs.withMatte,
        scale,
      );
      ctx.save();
      ctx.fillStyle = '#673ab7';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.fillRect(handle.x, handle.y, handle.size, handle.size);
      ctx.strokeRect(handle.x, handle.y, handle.size, handle.size);
      ctx.restore();
    }
  }
}

// ─── Export ─────────────────────────────────────────────────────────────────

/**
 * Renders to an offscreen canvas at the wall image's NATIVE resolution and
 * returns a PNG Blob. No DPR scaling, no handles, no selection outline.
 */
export async function exportComposite(
  inputs: Omit<RenderInputs, 'showHandles' | 'showSelection'>,
): Promise<Blob> {
  const off = document.createElement('canvas');
  off.width = inputs.wallImage.naturalWidth;
  off.height = inputs.wallImage.naturalHeight;
  const ctx = off.getContext('2d')!;
  // Native resolution — no scaling needed. drawImage takes image coords directly.
  ctx.drawImage(inputs.wallImage, 0, 0);
  drawFrame(ctx, { ...inputs, showHandles: false, showSelection: false });

  return new Promise<Blob>((resolve, reject) => {
    off.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode PNG'))),
      'image/png',
    );
  });
}
