// frontend/src/app/features/wall-preview/wall-preview.component.ts
/**
 * Wall Preview screen (/wall-preview/:artworkId).
 *
 * Flow:
 *   1. Load the artwork (medium image is good enough for preview).
 *   2. User uploads a wall photo (file input). We load it as an HTMLImageElement.
 *   3. Canvas appears with the artwork centred at a sensible default size.
 *   4. User drags the artwork around, drags the bottom-right corner to resize
 *      (aspect ratio of the artwork is locked).
 *   5. User picks a frame style and colour from the side panel.
 *   6. User clicks "Save preview" — composite PNG downloads.
 *
 * State (signals):
 *   wallImage         — HTMLImageElement | null
 *   artworkImage      — HTMLImageElement | null
 *   artworkAspect     — number (width/height)
 *   placement         — { x, y, width } in image coords
 *   frameStyleId      — FrameStyleId
 *   frameColorHex     — string
 *   withMatte         — boolean
 *
 * Pointer logic owns three drag modes: none / move / resize.
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { ArtworkDetailService } from '../artwork-detail/artwork-detail.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import {
  FRAME_COLOR_SWATCHES,
  FRAME_STYLES,
  type FrameStyle,
  type FrameStyleId,
} from './frame-styles';
import {
  type ArtworkOnWall,
  clampPlacement,
  exportComposite,
  fitToViewport,
  framedHeight,
  getResizeHandleRect,
  hitTestArtwork,
  hitTestResizeHandle,
  renderToCanvas,
  setupCanvasBackingStore,
  toImageCoords,
} from './wall-preview-renderer';
import type { ArtworkDetail } from '../../core/api-models/artwork.model';
import { environment } from '../../../environments/environment';

type DragMode = 'none' | 'move' | 'resize';

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_WALL_BYTES = 15 * 1024 * 1024; // 15 MB — typical phone photo

@Component({
  selector: 'app-wall-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    TranslatePipe,
    UploadUrlPipe,
  ],
  template: `
    <div class="page wrap">
      <nav class="crumbs"><a [routerLink]="['/artwork', artworkId()]">{{ 'common.back' | translate }}</a></nav>
      <header class="page-header">
        <span class="eyebrow">{{ 'wallPreview.frame.title' | translate }}</span>
        <h1 class="display-2">{{ 'wallPreview.title' | translate }}</h1>
      </header>

      @if (loading()) {
        <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40"/></div>
      } @else if (!artwork()) {
        <div class="centered">
          <p>{{ 'wallPreview.artworkLoadError' | translate }}</p>
        </div>
      } @else {
        <div class="layout">
          <!-- ─── Canvas area ─────────────────────────────────────────── -->
          <section class="stage-wrap">
            @if (!wallImage()) {
              <div class="dropzone" (click)="filePicker.click()" (dragover)="$event.preventDefault()"
                   (drop)="onWallDrop($event)" role="button" tabindex="0"
                   (keydown.enter)="filePicker.click()">
                <p class="dropzone-title">{{ 'wallPreview.upload.title' | translate }}</p>
                <p class="dropzone-hint">{{ 'wallPreview.upload.hint' | translate }}</p>
              </div>
            } @else {
              <div #stage class="stage">
                <canvas
                  #canvas
                  (pointerdown)="onPointerDown($event)"
                  (pointermove)="onPointerMove($event)"
                  (pointerup)="onPointerUp($event)"
                  (pointercancel)="onPointerUp($event)"
                  (pointerleave)="onPointerUp($event)"
                ></canvas>
              </div>
              <button type="button" class="btn btn--sm change-wall" (click)="resetWall()">
                {{ 'wallPreview.changeWall' | translate }}
              </button>
            }
            <input
              #filePicker
              type="file"
              hidden
              [accept]="acceptAttr"
              (change)="onWallFileSelected($event)"
            />
          </section>

          <!-- ─── Side panel ─────────────────────────────────────────── -->
          <aside class="controls">
            <section class="block">
              <h2 class="block__title">{{ 'wallPreview.frame.title' | translate }}</h2>
              <mat-button-toggle-group
                [value]="frameStyleId()"
                (change)="frameStyleId.set($event.value)"
                class="style-toggle"
                [hideSingleSelectionIndicator]="true"
              >
                @for (style of frameStyleList; track style.id) {
                  <mat-button-toggle [value]="style.id">
                    {{ style.labelKey | translate }}
                  </mat-button-toggle>
                }
              </mat-button-toggle-group>

              @if (currentStyle().id !== 'none') {
                <div class="swatches">
                  @for (color of swatches; track color) {
                    <button
                      type="button"
                      class="swatch"
                      [class.active]="color === frameColorHex()"
                      [style.background]="color"
                      (click)="frameColorHex.set(color)"
                      [attr.aria-label]="color"
                    ></button>
                  }
                </div>

                <mat-checkbox
                  [checked]="withMatte()"
                  (change)="withMatte.set($event.checked)"
                >
                  {{ 'wallPreview.frame.matte' | translate }}
                </mat-checkbox>
              }
            </section>

            @if (wallImage()) {
              <section class="block">
                <h2 class="block__title">{{ 'wallPreview.size.title' | translate }}</h2>
                <mat-slider
                  [min]="minSliderWidth()"
                  [max]="maxSliderWidth()"
                  [step]="1"
                  [discrete]="false"
                  class="size-slider"
                >
                  <input matSliderThumb
                         [value]="placement().width"
                         (valueChange)="onSliderChange($event)" />
                </mat-slider>
                <p class="hint">{{ 'wallPreview.size.hint' | translate }}</p>
              </section>

              <button
                type="button"
                class="btn btn--solid btn--block save-btn"
                [disabled]="saving()"
                (click)="onSave()"
              >
                {{ (saving() ? 'common.saving' : 'wallPreview.save') | translate }}
              </button>

              <a class="btn btn--block" [routerLink]="['/customize', artworkId()]">
                {{ 'wallPreview.continueToBuy' | translate }}
              </a>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { padding-block: clamp(24px, 4vw, 44px) clamp(56px, 9vw, 112px); }
      .crumbs {
        font-size: 11px; font-weight: 600; letter-spacing: var(--tracking-label);
        text-transform: uppercase; color: var(--c-muted); margin-bottom: 20px;
      }
      .crumbs a:hover { color: var(--c-ink); }
      .page-header { margin-bottom: clamp(28px, 4vw, 48px); }
      .page-header h1 { margin-top: 12px; }
      .centered {
        min-height: 50vh; display: flex; align-items: center; justify-content: center;
      }

      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: clamp(24px, 4vw, 48px); align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

      .stage-wrap { display: flex; flex-direction: column; gap: 14px; align-items: stretch; }
      .stage {
        background: var(--c-ink);
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
      }
      .stage canvas {
        display: block;
        touch-action: none; /* critical — prevents browser scrolling during drag */
        cursor: grab;
        box-shadow: 0 18px 44px rgba(0,0,0,0.45);
      }
      .change-wall { align-self: flex-end; }

      .dropzone {
        border: 1px dashed var(--c-line-strong);
        padding: clamp(48px, 9vw, 88px) 24px;
        text-align: center;
        cursor: pointer;
        background: var(--c-paper-warm);
        transition: border-color 200ms ease, background 200ms ease;
      }
      .dropzone:hover, .dropzone:focus { border-color: var(--c-ink); outline: none; }
      .dropzone-title {
        margin: 0 0 6px; font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
      }
      .dropzone-hint { margin: 0; font-size: 13px; color: var(--c-muted); }

      .controls { display: flex; flex-direction: column; gap: clamp(24px, 4vw, 40px); }
      .block { border-top: 1px solid var(--c-line); padding-top: 20px; }
      .block__title {
        font-family: var(--font-sans); font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
        color: var(--c-muted); margin: 0 0 16px;
      }
      .style-toggle { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }

      .swatches { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
      .swatch {
        width: 30px; height: 30px; border: 1px solid var(--c-line-strong);
        cursor: pointer; padding: 0;
      }
      .swatch.active { outline: 2px solid var(--c-ink); outline-offset: 2px; }

      .size-slider { width: 100%; }
      .hint { font-size: 12px; color: var(--c-muted); margin: 4px 0 0; }

      .save-btn { margin-top: 4px; }
    `,
  ],
})
export class WallPreviewComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ArtworkDetailService);

  // ─── Refs ────────────────────────────────────────────────────────────────
  readonly canvasRef = viewChild<{ nativeElement: HTMLCanvasElement }>('canvas');
  readonly stageRef = viewChild<{ nativeElement: HTMLDivElement }>('stage');

  // ─── Route state ─────────────────────────────────────────────────────────
  readonly artworkId = signal<string>(this.route.snapshot.paramMap.get('artworkId') ?? '');
  readonly artwork = signal<ArtworkDetail | null>(null);
  readonly loading = signal(true);

  // ─── Composition state ───────────────────────────────────────────────────
  readonly wallImage = signal<HTMLImageElement | null>(null);
  readonly artworkImage = signal<HTMLImageElement | null>(null);
  readonly artworkAspect = signal<number>(1); // w / h
  readonly placement = signal<ArtworkOnWall>({ x: 0, y: 0, width: 0 });
  readonly frameStyleId = signal<FrameStyleId>('wood');
  readonly frameColorHex = signal<string>(FRAME_STYLES['wood'].defaultColorHex);
  readonly withMatte = signal(true);
  readonly saving = signal(false);

  readonly currentStyle = computed<FrameStyle>(() => FRAME_STYLES[this.frameStyleId()]);
  readonly minSliderWidth = computed(() => {
    const w = this.wallImage()?.naturalWidth ?? 0;
    return Math.round(w * 0.08);
  });
  readonly maxSliderWidth = computed(() => {
    const w = this.wallImage()?.naturalWidth ?? 0;
    return Math.round(w * 0.85);
  });

  readonly frameStyleList: FrameStyle[] = Object.values(FRAME_STYLES);
  readonly swatches = FRAME_COLOR_SWATCHES;
  readonly acceptAttr = ACCEPT_TYPES.join(',');

  // ─── Drag state (non-signal — pure render-loop ephemeral) ────────────────
  private dragMode: DragMode = 'none';
  private dragStartImage = { x: 0, y: 0 };           // pointer pos at drag start (image coords)
  private dragStartPlacement: ArtworkOnWall = { x: 0, y: 0, width: 0 };
  private fitScale = 1;                              // image→display scale, captured per resize
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.loadArtwork();

    // Re-render whenever any input that affects the canvas changes.
    effect(() => {
      // Read everything we depend on so Angular tracks them.
      this.wallImage();
      this.artworkImage();
      this.placement();
      this.frameStyleId();
      this.frameColorHex();
      this.withMatte();
      // viewChild() is also a signal — touching it makes us re-run after view init.
      this.canvasRef();
      this.render();
    });

    // When the frame style changes, snap colour to its default IF the current
    // colour was the previous style's default — so the user's manual pick isn't
    // overwritten.
    effect(() => {
      const id = this.frameStyleId();
      const newDefault = FRAME_STYLES[id].defaultColorHex;
      const knownDefaults = new Set(Object.values(FRAME_STYLES).map((s) => s.defaultColorHex));
      if (knownDefaults.has(this.frameColorHex())) {
        this.frameColorHex.set(newDefault);
      }
    },
    { allowSignalWrites: true }
    );
  }

  ngAfterViewInit(): void {
    // Re-fit on window resize so the canvas keeps its sensible size.
    this.resizeObserver = new ResizeObserver(() => this.render());
    if (this.stageRef()?.nativeElement) {
      this.resizeObserver.observe(this.stageRef()!.nativeElement);
    }
  }

  // ─── Data loading ────────────────────────────────────────────────────────

  private async loadArtwork(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.service.getById(this.artworkId());
      this.artwork.set(data);
      const primary = data.images.find((i) => i.isPrimary) ?? data.images[0];
      if (!primary) {
        this.loading.set(false);
        return;
      }
      // Use the medium size — original is wastefully large for preview.
      const img = await loadImage(`${environment.uploadsBaseUrl}/${primary.mediumPath}`);
      this.artworkImage.set(img);
      this.artworkAspect.set(img.naturalWidth / img.naturalHeight);
    } catch {
      this.artwork.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Wall upload ─────────────────────────────────────────────────────────

  async onWallFileSelected(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    (ev.target as HTMLInputElement).value = ''; // allow re-selecting same file
    if (file) await this.acceptWallFile(file);
  }

  async onWallDrop(ev: DragEvent): Promise<void> {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) await this.acceptWallFile(file);
  }

  resetWall(): void {
    this.wallImage.set(null);
  }

  private async acceptWallFile(file: File): Promise<void> {
    if (!ACCEPT_TYPES.includes(file.type)) return;
    if (file.size > MAX_WALL_BYTES) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      this.wallImage.set(img);
      this.initialisePlacement(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Place the artwork at 30% wall width, centred horizontally, roughly eye-level. */
  private initialisePlacement(wall: HTMLImageElement): void {
    const width = wall.naturalWidth * 0.3;
    const style = this.currentStyle();
    const h = framedHeight(width, this.artworkAspect(), style, this.withMatte());
    const x = (wall.naturalWidth - width) / 2;
    const y = wall.naturalHeight * 0.35 - h / 2; // a bit above centre
    this.placement.set(
      clampPlacement(
        { x, y, width },
        this.artworkAspect(),
        style,
        this.withMatte(),
        wall.naturalWidth,
        wall.naturalHeight,
      ),
    );
  }

  // ─── Pointer handlers ────────────────────────────────────────────────────

  onPointerDown(ev: PointerEvent): void {
    const canvas = this.canvasRef()?.nativeElement;
    const wall = this.wallImage();
    if (!canvas || !wall) return;

    const local = canvasLocalPoint(canvas, ev);
    const handle = getResizeHandleRect(
      this.placement(),
      this.artworkAspect(),
      this.currentStyle(),
      this.withMatte(),
      this.fitScale,
    );

    if (hitTestResizeHandle(local.x, local.y, handle)) {
      this.dragMode = 'resize';
    } else if (
      hitTestArtwork(
        local.x,
        local.y,
        this.placement(),
        this.artworkAspect(),
        this.currentStyle(),
        this.withMatte(),
        this.fitScale,
      )
    ) {
      this.dragMode = 'move';
    } else {
      this.dragMode = 'none';
      return;
    }

    canvas.setPointerCapture(ev.pointerId);
    this.dragStartImage = toImageCoords(local.x, local.y, this.fitScale);
    this.dragStartPlacement = { ...this.placement() };
    canvas.style.cursor = this.dragMode === 'resize' ? 'nwse-resize' : 'grabbing';
  }

  onPointerMove(ev: PointerEvent): void {
    if (this.dragMode === 'none') return;
    const canvas = this.canvasRef()?.nativeElement;
    const wall = this.wallImage();
    if (!canvas || !wall) return;

    const local = canvasLocalPoint(canvas, ev);
    const cur = toImageCoords(local.x, local.y, this.fitScale);
    const dx = cur.x - this.dragStartImage.x;
    const dy = cur.y - this.dragStartImage.y;

    let next: ArtworkOnWall;
    if (this.dragMode === 'move') {
      next = {
        ...this.dragStartPlacement,
        x: this.dragStartPlacement.x + dx,
        y: this.dragStartPlacement.y + dy,
      };
    } else {
      // resize: new width = pointer.x − placement.x
      const newWidth = cur.x - this.dragStartPlacement.x;
      next = { ...this.dragStartPlacement, width: newWidth };
    }

    this.placement.set(
      clampPlacement(
        next,
        this.artworkAspect(),
        this.currentStyle(),
        this.withMatte(),
        wall.naturalWidth,
        wall.naturalHeight,
      ),
    );
  }

  onPointerUp(ev: PointerEvent): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (canvas?.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
    if (canvas) canvas.style.cursor = 'grab';
    this.dragMode = 'none';
  }

  // ─── Slider ──────────────────────────────────────────────────────────────

  onSliderChange(value: number): void {
    const wall = this.wallImage();
    if (!wall) return;
    this.placement.update((p) =>
      clampPlacement(
        { ...p, width: value },
        this.artworkAspect(),
        this.currentStyle(),
        this.withMatte(),
        wall.naturalWidth,
        wall.naturalHeight,
      ),
    );
  }

  // ─── Render loop ─────────────────────────────────────────────────────────

  private render(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const stage = this.stageRef()?.nativeElement;
    const wall = this.wallImage();
    const art = this.artworkImage();
    if (!canvas || !stage || !wall || !art) return;

    // Available area inside the dark stage container (accounting for its 16px padding).
    const stageRect = stage.getBoundingClientRect();
    const maxW = Math.max(200, stageRect.width - 32);
    const maxH = Math.max(200, Math.min(window.innerHeight * 0.75, 800));

    const fit = fitToViewport(wall, maxW, maxH);
    this.fitScale = fit.scale;

    const ctx = setupCanvasBackingStore(canvas, fit.displayWidth, fit.displayHeight);
    ctx.clearRect(0, 0, fit.displayWidth, fit.displayHeight);

    renderToCanvas(ctx, fit.scale, {
      wallImage: wall,
      artworkImage: art,
      artworkAspect: this.artworkAspect(),
      placement: this.placement(),
      frame: this.currentStyle(),
      frameColorHex: this.frameColorHex(),
      withMatte: this.withMatte(),
      showHandles: true,
      showSelection: true,
    });
  }

  // ─── Save / download ─────────────────────────────────────────────────────

  async onSave(): Promise<void> {
    const wall = this.wallImage();
    const art = this.artworkImage();
    const artwork = this.artwork();
    if (!wall || !art || !artwork || this.saving()) return;

    this.saving.set(true);
    try {
      const blob = await exportComposite({
        wallImage: wall,
        artworkImage: art,
        artworkAspect: this.artworkAspect(),
        placement: this.placement(),
        frame: this.currentStyle(),
        frameColorHex: this.frameColorHex(),
        withMatte: this.withMatte(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wall-preview-${slugify(artwork.title)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a moment to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      this.saving.set(false);
    }
  }
}

// ─── Module-private helpers ───────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // safe with same-origin /uploads in dev (proxied)
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function canvasLocalPoint(canvas: HTMLCanvasElement, ev: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
