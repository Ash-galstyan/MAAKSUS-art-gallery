// frontend/src/app/features/customization/customization.component.ts
/**
 * Customization page (/customize/:artworkId).
 *
 * Left column: artwork preview (medium image with the live-selected frame
 *              rendered around it via the wall-preview renderer — keeps
 *              one source of truth for what a frame looks like).
 * Right column: configurator
 *   - Print size (segmented chips; price multiplier hint per chip)
 *   - Frame style + colour picker (or "No frame")
 *   - Matte toggle
 *   - Quantity stepper
 *   - Live price breakdown (computed signal)
 *   - "Add to cart" CTA
 *
 * Once added, the user lands on /cart.
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ArtworkDetailService } from '../artwork-detail/artwork-detail.service';
import { PrintOptionsService } from './print-options.service';
import { CartService } from '../../core/cart/cart.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { calculatePrice } from './price-calculator';
import {
  FRAME_STYLES,
  type FrameStyleId,
} from '../wall-preview/frame-styles';
import {
  framedHeight,
  drawFrame,
} from '../wall-preview/wall-preview-renderer';
import { environment } from '../../../environments/environment';
import type { ArtworkDetail } from '../../core/api-models/artwork.model';
import type { FrameOption, PrintSize } from '../../core/api-models/print-options.model';

@Component({
  selector: 'app-customization',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    @if (loading()) {
      <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40"/></div>
    } @else if (!artwork()) {
      <div class="centered">
        <p>{{ 'customization.loadError' | translate }}</p>
        <a class="btn btn--sm" routerLink="/gallery">{{ 'common.back' | translate }}</a>
      </div>
    } @else {
      <div class="page wrap">
        <nav class="crumbs">
          <a [routerLink]="['/artwork', artwork()!.id]">{{ 'common.back' | translate }}</a>
        </nav>
        <header class="page-header">
          <span class="eyebrow">{{ artwork()!.title }} · {{ artwork()!.artist.name }}</span>
          <h1 class="display-2">{{ 'customization.title' | translate }}</h1>
        </header>

        <div class="layout">
          <!-- ─── Preview ─────────────────────────────────────────────── -->
          <section class="preview">
            <div class="canvas-wrap ph">
              <canvas #previewCanvas></canvas>
            </div>
          </section>

          <!-- ─── Configurator ────────────────────────────────────────── -->
          <aside class="config">
            <!-- Print size -->
            <section class="block">
              <h2 class="block__title">{{ 'customization.size.title' | translate }}</h2>
              @if (sizes().length === 0) {
                <p class="muted">{{ 'customization.noOptions' | translate }}</p>
              } @else {
                <div class="size-grid">
                  @for (s of sizes(); track s.id) {
                    <button
                      type="button"
                      class="opt size-card"
                      [class.active]="selectedSize()?.id === s.id"
                      (click)="selectedSizeId.set(s.id)"
                    >
                      <span class="size-label">{{ s.label }}</span>
                      <span class="size-dims">{{ s.widthCm }} × {{ s.heightCm }} cm</span>
                    </button>
                  }
                </div>
              }
            </section>

            <!-- Frame -->
            <section class="block">
              <h2 class="block__title">{{ 'customization.frame.title' | translate }}</h2>
              <div class="frames-row">
                <button
                  type="button"
                  class="opt frame-card"
                  [class.active]="selectedFrameId() === null"
                  (click)="selectedFrameId.set(null)"
                >
                  <span class="frame-swatch no-frame"><mat-icon>block</mat-icon></span>
                  <span>{{ 'customization.frame.none' | translate }}</span>
                </button>
                @for (f of frames(); track f.id) {
                  <button
                    type="button"
                    class="opt frame-card"
                    [class.active]="selectedFrameId() === f.id"
                    (click)="selectedFrameId.set(f.id)"
                  >
                    <span class="frame-swatch" [style.background]="f.colorHex"></span>
                    <span>{{ f.label }}</span>
                    @if (f.additionalPrice > 0) {
                      <span class="frame-extra">+{{ f.additionalPrice | price }}</span>
                    }
                  </button>
                }
              </div>
              <mat-checkbox
                class="matte-toggle"
                [checked]="withMatte()"
                (change)="withMatte.set($event.checked)"
              >
                {{ 'customization.frame.matte' | translate }}
                <span class="muted small">(+{{ matteAmount() | price }})</span>
              </mat-checkbox>
            </section>

            <!-- Quantity + price + CTA -->
            <section class="block summary">
              <div class="qty-row">
                <span class="block__title">{{ 'customization.quantity' | translate }}</span>
                <div class="qty">
                  <button type="button" (click)="decQty()" [disabled]="quantity() <= 1"
                          aria-label="Decrease quantity">−</button>
                  <span class="qty-val">{{ quantity() }}</span>
                  <button type="button" (click)="incQty()" [disabled]="quantity() >= 20"
                          aria-label="Increase quantity">+</button>
                </div>
              </div>

              <dl class="breakdown">
                <div>
                  <dt>{{ 'customization.price.print' | translate }}</dt>
                  <dd>{{ price().baseLine | price }}</dd>
                </div>
                @if (price().frameLine > 0) {
                  <div>
                    <dt>{{ 'customization.price.frame' | translate }}</dt>
                    <dd>{{ price().frameLine | price }}</dd>
                  </div>
                }
                @if (price().matteLine > 0) {
                  <div>
                    <dt>{{ 'customization.price.matte' | translate }}</dt>
                    <dd>{{ price().matteLine | price }}</dd>
                  </div>
                }
                <div class="total">
                  <dt>{{ 'customization.price.unit' | translate }}</dt>
                  <dd>{{ price().unitPrice | price }}</dd>
                </div>
                @if (quantity() > 1) {
                  <div class="total">
                    <dt>{{ 'customization.price.total' | translate }}</dt>
                    <dd>{{ totalLine() | price }}</dd>
                  </div>
                }
              </dl>

              <button
                type="button"
                class="btn btn--solid btn--block add-btn"
                [disabled]="!canAddToCart() || adding()"
                (click)="onAddToCart()"
              >
                {{ (adding() ? 'common.saving' : 'customization.addToCart') | translate }}
              </button>
            </section>
          </aside>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .centered {
        min-height: 50vh; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 16px;
      }
      .page { padding-block: clamp(24px, 4vw, 44px) clamp(56px, 9vw, 112px); }
      .crumbs {
        font-size: 11px; font-weight: 600; letter-spacing: var(--tracking-label);
        text-transform: uppercase; color: var(--c-muted); margin-bottom: 20px;
      }
      .crumbs a:hover { color: var(--c-ink); }
      .page-header { margin-bottom: clamp(28px, 4vw, 48px); }
      .page-header h1 { margin-top: 12px; }

      .layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr); gap: clamp(32px, 5vw, 64px); align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

      .preview { position: sticky; top: calc(var(--header-h) + 24px); }
      .canvas-wrap {
        padding: clamp(24px, 5vw, 56px);
        display: flex; align-items: center; justify-content: center;
        aspect-ratio: 4 / 3;
      }
      .canvas-wrap.ph::after { inset: 0; border: 0; }
      .canvas-wrap canvas {
        position: relative; z-index: 1;
        max-width: 100%; max-height: 100%;
        filter: drop-shadow(0 18px 36px rgba(20, 18, 15, 0.22));
      }

      .config { display: flex; flex-direction: column; gap: clamp(28px, 4vw, 44px); }
      .block { border-top: 1px solid var(--c-line); padding-top: 20px; }
      .block__title {
        font-family: var(--font-sans); font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
        color: var(--c-muted); margin: 0 0 16px;
      }

      .opt {
        border: 1px solid var(--c-line-strong); background: var(--c-paper);
        cursor: pointer; text-align: left; transition: border-color 140ms ease, background-color 140ms ease;
      }
      .opt:hover { border-color: var(--c-ink); }
      .opt.active { border-color: var(--c-ink); background: var(--c-paper-warm); }

      .size-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 10px; }
      .size-card { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
      .size-label { font-size: 13px; font-weight: 600; }
      .size-dims { font-size: 11px; color: var(--c-muted); letter-spacing: 0.02em; }

      .frames-row { display: flex; gap: 10px; flex-wrap: wrap; }
      .frame-card {
        padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 7px;
        min-width: 84px; font-size: 11px; letter-spacing: 0.04em;
      }
      .frame-swatch {
        width: 40px; height: 40px; border: 1px solid var(--c-line-strong);
      }
      .frame-swatch.no-frame {
        background: var(--c-paper-warm); display: flex; align-items: center; justify-content: center;
        color: var(--c-muted);
      }
      .frame-swatch.no-frame mat-icon { font-size: 18px; width: 18px; height: 18px; }
      .frame-extra { font-size: 10px; color: var(--c-muted); }
      .matte-toggle { margin-top: 18px; }
      .muted { color: var(--c-muted); }
      .small { font-size: 12px; }

      .summary { display: flex; flex-direction: column; gap: 20px; }
      .qty-row { display: flex; align-items: center; justify-content: space-between; }
      .qty-row .block__title { margin: 0; }
      .qty { display: inline-flex; align-items: center; border: 1px solid var(--c-line-strong); }
      .qty button {
        width: 34px; height: 34px; border: 0; background: none; cursor: pointer;
        font-size: 15px; color: var(--c-ink);
      }
      .qty button:disabled { opacity: 0.3; cursor: not-allowed; }
      .qty button:hover:not(:disabled) { background: var(--c-paper-alt); }
      .qty-val { min-width: 34px; text-align: center; font-size: 13px; font-weight: 600; }

      .breakdown { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; margin: 0; }
      .breakdown > div { display: contents; }
      .breakdown dt { color: var(--c-muted); font-size: 13px; }
      .breakdown dd { margin: 0; font-size: 13px; }
      .breakdown .total dt { color: var(--c-ink); font-weight: 600; }
      .breakdown .total dd { font-family: var(--font-display); font-size: 1.05rem; }

      .add-btn { margin-top: 4px; }
    `,
  ],
})
export class CustomizationComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly artworkService = inject(ArtworkDetailService);
  private readonly printOpts = inject(PrintOptionsService);
  private readonly cart = inject(CartService);

  // ─── Refs ────────────────────────────────────────────────────────────────
  readonly previewCanvasRef = viewChild<{ nativeElement: HTMLCanvasElement }>('previewCanvas');

  // ─── Data ────────────────────────────────────────────────────────────────
  readonly artwork = signal<ArtworkDetail | null>(null);
  readonly sizes = signal<PrintSize[]>([]);
  readonly frames = signal<FrameOption[]>([]);
  readonly loading = signal(true);
  readonly adding = signal(false);

  // ─── Config ──────────────────────────────────────────────────────────────
  readonly selectedSizeId = signal<string | null>(null);
  readonly selectedFrameId = signal<string | null>(null);
  readonly withMatte = signal(false);
  readonly quantity = signal(1);

  // ─── Derived ─────────────────────────────────────────────────────────────
  readonly selectedSize = computed<PrintSize | null>(
    () => this.sizes().find((s) => s.id === this.selectedSizeId()) ?? null,
  );
  readonly selectedFrame = computed<FrameOption | null>(
    () => this.frames().find((f) => f.id === this.selectedFrameId()) ?? null,
  );

  readonly price = computed(() =>
    calculatePrice({
      artworkBasePrice: this.artwork()?.basePrice ?? 0,
      printSize: this.selectedSize(),
      frameOption: this.selectedFrame(),
      withMatte: this.withMatte(),
    }),
  );
  readonly matteAmount = computed(() => 3000); // mirrors MATTE_FLAT_AMD
  readonly totalLine = computed(() => Math.round(this.price().unitPrice * this.quantity()));

  readonly canAddToCart = computed(
    () => !!this.artwork() && this.artwork()!.isAvailable && !!this.selectedSize(),
  );

  /** Mirrors a "wall-preview frame style" for the small preview canvas. */
  private readonly previewFrameStyleId = computed<FrameStyleId>(() => {
    const f = this.selectedFrame();
    if (!f) return 'none';
    return (f.frameType.toLowerCase() as FrameStyleId) ?? 'wood';
  });

  private artworkImage: HTMLImageElement | null = null;

  constructor() {
    this.bootstrap();

    // Re-render preview whenever inputs change.
    effect(() => {
      this.artwork();
      this.selectedFrame();
      this.withMatte();
      this.previewCanvasRef();
      this.renderPreview();
    });
  }

  ngAfterViewInit(): void {
    // First render happens via the effect once viewChild resolves.
  }

  private async bootstrap(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('artworkId');
    if (!id) {
      this.router.navigate(['/gallery']);
      return;
    }
    this.loading.set(true);
    try {
      const [art, sizes, frames] = await Promise.all([
        this.artworkService.getById(id),
        this.printOpts.listSizes(),
        this.printOpts.listFrames(),
      ]);
      this.artwork.set(art);
      this.sizes.set(sizes);
      this.frames.set(frames);
      // Sensible defaults: cheapest size by multiplier, no frame.
      const cheapest = [...sizes].sort((a, b) => a.priceMultiplier - b.priceMultiplier)[0];
      if (cheapest) this.selectedSizeId.set(cheapest.id);

      const primary = art.images.find((i) => i.isPrimary) ?? art.images[0];
      if (primary) {
        this.artworkImage = await loadImage(
          `${environment.uploadsBaseUrl}/${primary.mediumPath}`,
        );
      }
    } catch {
      this.artwork.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Stepper ─────────────────────────────────────────────────────────────

  incQty(): void { this.quantity.update((q) => Math.min(20, q + 1)); }
  decQty(): void { this.quantity.update((q) => Math.max(1, q - 1)); }

  // ─── CTA ─────────────────────────────────────────────────────────────────

  async onAddToCart(): Promise<void> {
    if (!this.canAddToCart() || this.adding()) return;
    this.adding.set(true);
    try {
      await this.cart.addItem({
        artworkId: this.artwork()!.id,
        printSizeId: this.selectedSize()!.id,
        frameOptionId: this.selectedFrame()?.id ?? null,
        withMatte: this.withMatte(),
        quantity: this.quantity(),
      });
      this.router.navigate(['/cart']);
    } finally {
      this.adding.set(false);
    }
  }

  // ─── Preview render (shares the wall-preview renderer) ───────────────────

  private renderPreview(): void {
    const canvas = this.previewCanvasRef()?.nativeElement;
    if (!canvas || !this.artworkImage) return;

    const W = 600;
    // Aspect ratio = artwork natural ratio
    const aspect = this.artworkImage.naturalWidth / this.artworkImage.naturalHeight;
    const H = Math.round(W / aspect);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const frameStyle = FRAME_STYLES[this.previewFrameStyleId()];
    const colorHex = this.selectedFrame()?.colorHex ?? frameStyle.defaultColorHex;

    // The frame in customization spans the FULL preview area: framed-width = W.
    // framedHeight gives us the matching height for the framed rectangle.
    const framedH = framedHeight(W, aspect, frameStyle, this.withMatte());
    // If frame makes it taller than the canvas, re-derive both dimensions
    // to fit using the available height.
    let placement = { x: 0, y: 0, width: W };
    if (framedH > H) {
      // Solve inverse: given target height H, what's the framed width?
      // Same iterative trick: thickness depends on min(w, H). One pass converges.
      const insetGuess =
        (frameStyle.thicknessFraction +
          (this.withMatte() ? frameStyle.mattePadFraction : 0)) *
        H;
      const innerH = H - 2 * insetGuess;
      const innerW = innerH * aspect;
      const width = innerW + 2 * insetGuess;
      placement = { x: (W - width) / 2, y: 0, width };
    }

    drawFrame(ctx, {
      wallImage: this.artworkImage, // unused by drawFrame; safe non-null
      artworkImage: this.artworkImage,
      artworkAspect: aspect,
      placement,
      frame: frameStyle,
      frameColorHex: colorHex,
      withMatte: this.withMatte(),
      showHandles: false,
      showSelection: false,
    });
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed: ${src}`));
    img.src = src;
  });
}
