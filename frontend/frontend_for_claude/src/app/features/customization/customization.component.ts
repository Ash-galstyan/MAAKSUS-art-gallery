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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
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
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    @if (loading()) {
      <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="48"/></div>
    } @else if (!artwork()) {
      <div class="centered">
        <p>{{ 'customization.loadError' | translate }}</p>
        <a mat-button routerLink="/">{{ 'common.back' | translate }}</a>
      </div>
    } @else {
      <div class="page">
        <header class="page-header">
          <a mat-button [routerLink]="['/artwork', artwork()!.id]">
            <mat-icon>arrow_back</mat-icon>
            {{ 'common.back' | translate }}
          </a>
          <h1>{{ 'customization.title' | translate }}</h1>
        </header>

        <div class="layout">
          <!-- ─── Preview ─────────────────────────────────────────────── -->
          <section class="preview">
            <div class="canvas-wrap">
              <canvas #previewCanvas></canvas>
            </div>
            <p class="preview-label">
              {{ artwork()!.title }} · {{ artwork()!.artist.name }}
            </p>
          </section>

          <!-- ─── Configurator ────────────────────────────────────────── -->
          <aside class="config">
            <!-- Print size -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>{{ 'customization.size.title' | translate }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (sizes().length === 0) {
                  <p class="muted">{{ 'customization.noOptions' | translate }}</p>
                } @else {
                  <div class="size-grid">
                    @for (s of sizes(); track s.id) {
                      <button
                        type="button"
                        class="size-card"
                        [class.active]="selectedSize()?.id === s.id"
                        (click)="selectedSizeId.set(s.id)"
                      >
                        <div class="size-label">{{ s.label }}</div>
                        <div class="size-dims">{{ s.widthCm }} × {{ s.heightCm }} cm</div>
                      </button>
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- Frame -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>{{ 'customization.frame.title' | translate }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="frames-row">
                  <button
                    type="button"
                    class="frame-card"
                    [class.active]="selectedFrameId() === null"
                    (click)="selectedFrameId.set(null)"
                  >
                    <div class="frame-swatch no-frame"><mat-icon>block</mat-icon></div>
                    <span>{{ 'customization.frame.none' | translate }}</span>
                  </button>
                  @for (f of frames(); track f.id) {
                    <button
                      type="button"
                      class="frame-card"
                      [class.active]="selectedFrameId() === f.id"
                      (click)="selectedFrameId.set(f.id)"
                    >
                      <div class="frame-swatch" [style.background]="f.colorHex"></div>
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
              </mat-card-content>
            </mat-card>

            <!-- Quantity + price + CTA -->
            <mat-card>
              <mat-card-content class="summary">
                <div class="qty-row">
                  <span>{{ 'customization.quantity' | translate }}</span>
                  <div class="qty-stepper">
                    <button mat-icon-button (click)="decQty()" [disabled]="quantity() <= 1"
                            aria-label="Decrease quantity">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span class="qty-value">{{ quantity() }}</span>
                    <button mat-icon-button (click)="incQty()" [disabled]="quantity() >= 20"
                            aria-label="Increase quantity">
                      <mat-icon>add</mat-icon>
                    </button>
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
                  mat-flat-button
                  color="primary"
                  class="add-btn"
                  [disabled]="!canAddToCart() || adding()"
                  (click)="onAddToCart()"
                >
                  @if (adding()) {
                    <mat-progress-spinner mode="indeterminate" diameter="20"/>
                  } @else {
                    <mat-icon>add_shopping_cart</mat-icon>
                    {{ 'customization.addToCart' | translate }}
                  }
                </button>
              </mat-card-content>
            </mat-card>
          </aside>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .centered {
        min-height: 50vh; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 12px;
      }
      .page { max-width: 1280px; margin: 0 auto; padding: 24px; }
      .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
      .page-header h1 { font-size: 24px; margin: 0; }

      .layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr); gap: 32px; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

      .preview { display: flex; flex-direction: column; gap: 12px; }
      .canvas-wrap {
        background: #eee; border-radius: 8px; padding: 32px;
        display: flex; align-items: center; justify-content: center;
        aspect-ratio: 4 / 3;
      }
      .canvas-wrap canvas {
        max-width: 100%; max-height: 100%;
        filter: drop-shadow(0 12px 24px rgba(0,0,0,0.15));
      }
      .preview-label { text-align: center; color: rgba(0,0,0,0.6); margin: 0; }

      .config { display: flex; flex-direction: column; gap: 16px; }

      .size-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
      .size-card {
        padding: 12px; border-radius: 8px; border: 2px solid #e0e0e0;
        background: white; cursor: pointer; text-align: left;
        display: flex; flex-direction: column; gap: 4px;
      }
      .size-card:hover { border-color: #b39ddb; }
      .size-card.active { border-color: #673ab7; background: #f5f0ff; }
      .size-label { font-weight: 600; }
      .size-dims { font-size: 12px; color: rgba(0,0,0,0.6); }

      .frames-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .frame-card {
        padding: 8px; border-radius: 8px; border: 2px solid #e0e0e0;
        background: white; cursor: pointer;
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        min-width: 80px;
      }
      .frame-card:hover { border-color: #b39ddb; }
      .frame-card.active { border-color: #673ab7; background: #f5f0ff; }
      .frame-swatch {
        width: 40px; height: 40px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);
      }
      .frame-swatch.no-frame {
        background: #f4f4f4; display: flex; align-items: center; justify-content: center;
        color: rgba(0,0,0,0.4);
      }
      .frame-extra { font-size: 11px; color: rgba(0,0,0,0.5); }
      .matte-toggle { margin-top: 16px; }
      .muted { color: rgba(0,0,0,0.55); }
      .small { font-size: 12px; }

      .summary { display: flex; flex-direction: column; gap: 16px; }
      .qty-row { display: flex; align-items: center; justify-content: space-between; }
      .qty-stepper { display: flex; align-items: center; gap: 4px; }
      .qty-value { min-width: 24px; text-align: center; font-weight: 600; }

      .breakdown { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; margin: 0; }
      .breakdown > div { display: contents; }
      .breakdown dt { color: rgba(0,0,0,0.7); font-size: 14px; }
      .breakdown dd { margin: 0; font-size: 14px; }
      .breakdown .total dt { font-weight: 600; }
      .breakdown .total dd { font-weight: 700; }

      .add-btn { height: 48px; font-size: 15px; gap: 8px; }
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
      this.router.navigate(['/']);
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
