// frontend/src/app/features/artwork-detail/artwork-detail.component.ts
/**
 * Artwork detail page (/artwork/:id).
 *
 * Layout:
 *   - Left column: primary image (medium size) with a thumbnail strip below
 *     for secondary images. Clicking a thumb swaps the main image.
 *   - Right column: title, artist (linked back to filtered gallery), metadata
 *     (year, medium, dimensions), description, history, price, two CTAs:
 *       • "Customize & buy"  → /customize/:artworkId
 *       • "Try on my wall"   → /wall-preview/:artworkId
 *   - Below: artist bio (collapsible).
 *
 * State:
 *   artwork       : ArtworkDetail | null
 *   activeImageIx : number — index into artwork.images
 *   loading / notFound
 *
 * Behaviour:
 *   - Re-fetches when :id changes (router navigation between artworks reuses
 *     the component instance) or when the language changes (titles/descriptions
 *     are locale-specific).
 *   - If isAvailable=false, shows an "unavailable" badge and disables the
 *     customize/buy CTA (wall preview still works — pure visual).
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ArtworkDetailService } from './artwork-detail.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import type { ArtworkDetail } from '../../core/api-models/artwork.model';

@Component({
  selector: 'app-artwork-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatProgressSpinnerModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    @if (loading()) {
      <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="40" /></div>
    } @else if (notFound()) {
      <div class="centered">
        <h2 class="display-3">{{ 'artwork.notFound' | translate }}</h2>
        <a routerLink="/gallery" class="btn btn--sm">{{ 'artwork.backToGallery' | translate }}</a>
      </div>
    } @else if (artwork()) {
      <article class="page wrap">
        <nav class="crumbs">
          <a routerLink="/gallery">{{ 'nav.artPrints' | translate }}</a>
          <span aria-hidden="true">/</span>
          <a routerLink="/gallery" [queryParams]="{ category: artwork()!.category.slug }">
            {{ artwork()!.category.name }}
          </a>
        </nav>

        <div class="layout">
          <!-- ─── Left: imagery ──────────────────────────────────────────── -->
          <section class="gallery">
            <div class="hero ph">
              <img
                [src]="activeImage()?.mediumPath | uploadUrl"
                [alt]="artwork()!.title"
                class="hero-img"
              />
              @if (!artwork()!.isAvailable) {
                <span class="badge">{{ 'artwork.unavailable' | translate }}</span>
              }
            </div>

            @if (artwork()!.images.length > 1) {
              <div class="strip">
                @for (img of artwork()!.images; track img.id; let i = $index) {
                  <button
                    type="button"
                    class="thumb-btn"
                    [class.active]="i === activeImageIx()"
                    (click)="activeImageIx.set(i)"
                    [attr.aria-label]="'artwork.image' | translate: { n: i + 1 }"
                  >
                    <img [src]="img.thumbnailPath | uploadUrl" alt="" />
                  </button>
                }
              </div>
            }
          </section>

          <!-- ─── Right: metadata + CTAs ─────────────────────────────────── -->
          <aside class="meta">
            <span class="category-link">{{ artwork()!.category.name }}</span>

            <h1 class="title display-2">{{ artwork()!.title }}</h1>

            <a class="artist" routerLink="/gallery" [queryParams]="{ q: artwork()!.artist.name }">
              {{ artwork()!.artist.name }}
            </a>

            <dl class="specs">
              @if (artwork()!.year) {
                <div><dt>{{ 'artwork.year' | translate }}</dt><dd>{{ artwork()!.year }}</dd></div>
              }
              @if (artwork()!.medium) {
                <div><dt>{{ 'artwork.medium' | translate }}</dt><dd>{{ artwork()!.medium }}</dd></div>
              }
              @if (dimensionsLabel()) {
                <div>
                  <dt>{{ 'artwork.dimensions' | translate }}</dt>
                  <dd>{{ dimensionsLabel() }}</dd>
                </div>
              }
            </dl>

            @if (artwork()!.description) {
              <p class="description">{{ artwork()!.description }}</p>
            }

            <div class="price-row">
              <span class="price-label">{{ 'artwork.from' | translate }}</span>
              <span class="price">{{ artwork()!.basePrice | price }}</span>
            </div>

            <div class="ctas">
              @if (artwork()!.isAvailable) {
                <a class="btn btn--solid btn--block" [routerLink]="['/customize', artwork()!.id]">
                  {{ 'artwork.customizeAndBuy' | translate }}
                </a>
              } @else {
                <span class="btn btn--block" aria-disabled="true" style="opacity:.45;pointer-events:none">
                  {{ 'artwork.customizeAndBuy' | translate }}
                </span>
              }
              <a class="btn btn--block" [routerLink]="['/wall-preview', artwork()!.id]">
                {{ 'artwork.tryOnWall' | translate }}
              </a>
            </div>
          </aside>
        </div>

        <!-- ─── Below the fold: history + artist bio ───────────────────── -->
        @if (artwork()!.history || artwork()!.artist.bio) {
          <section class="more">
            @if (artwork()!.history) {
              <div class="block">
                <span class="eyebrow">{{ 'artwork.history' | translate }}</span>
                <p>{{ artwork()!.history }}</p>
              </div>
            }
            @if (artwork()!.artist.bio) {
              <div class="block">
                <span class="eyebrow">{{ 'artwork.aboutArtist' | translate: { name: artwork()!.artist.name } }}</span>
                <p>{{ artwork()!.artist.bio }}</p>
              </div>
            }
          </section>
        }
      </article>
    }
  `,
  styles: [
    `
      .centered {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 60vh; gap: 20px; text-align: center;
      }

      .page { padding-block: clamp(24px, 4vw, 44px) clamp(56px, 9vw, 112px); }

      .crumbs {
        display: flex; gap: 10px; align-items: center;
        font-size: 11px; font-weight: 600; letter-spacing: var(--tracking-label);
        text-transform: uppercase; color: var(--c-muted);
        margin-bottom: clamp(24px, 4vw, 44px);
      }
      .crumbs a:hover { color: var(--c-ink); }

      .layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, 1fr); gap: clamp(32px, 6vw, 80px); align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; gap: 32px; } }

      .gallery .hero {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 4 / 3;
      }
      .gallery .hero.ph::after { inset: 0; border: 0; }
      .hero-img { position: relative; z-index: 1; max-width: 100%; max-height: 100%; object-fit: contain; }
      .badge {
        position: absolute; z-index: 2; top: 16px; left: 16px;
        padding: 7px 12px; font-size: 10px; font-weight: 700;
        letter-spacing: 0.12em; text-transform: uppercase;
        background: var(--c-ink); color: var(--c-paper);
      }

      .strip { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
      .thumb-btn {
        width: 74px; height: 74px; padding: 0; border: 1px solid var(--c-line);
        cursor: pointer; background: var(--c-paper-warm);
        overflow: hidden;
      }
      .thumb-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .thumb-btn.active { border-color: var(--c-ink); }

      .meta { display: flex; flex-direction: column; }
      .category-link {
        text-transform: uppercase; font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); color: var(--c-muted);
      }
      .title { margin: 14px 0 6px; }
      .artist {
        font-size: 14px; color: var(--c-muted); margin-bottom: 28px;
        width: fit-content;
      }
      .artist:hover { color: var(--c-ink); }

      .specs {
        display: grid; grid-template-columns: max-content 1fr; gap: 10px 24px;
        margin: 0 0 24px; padding: 20px 0; border-block: 1px solid var(--c-line);
      }
      .specs > div { display: contents; }
      .specs dt {
        font-weight: 600; color: var(--c-muted); font-size: 11px;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
        align-self: center;
      }
      .specs dd { margin: 0; font-size: 14px; }

      .description { line-height: 1.7; margin: 0 0 28px; color: var(--c-muted); }

      .price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 22px; }
      .price-label { font-size: 11px; color: var(--c-muted); text-transform: uppercase; letter-spacing: var(--tracking-label); font-weight: 600; }
      .price { font-family: var(--font-display); font-size: 1.8rem; }

      .ctas { display: flex; flex-direction: column; gap: 12px; }

      .more {
        margin-top: clamp(56px, 8vw, 96px);
        display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(32px, 6vw, 72px);
        padding-top: clamp(40px, 5vw, 60px); border-top: 1px solid var(--c-line);
      }
      @media (max-width: 720px) { .more { grid-template-columns: 1fr; gap: 32px; } }
      .block p { line-height: 1.8; margin: 0; color: var(--c-muted); max-width: 62ch; }
    `,
  ],
})
export class ArtworkDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ArtworkDetailService);
  private readonly i18n = inject(I18nService);

  /** Tracks /artwork/:id changes so we re-fetch on navigation between artworks. */
  private readonly paramId = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly artwork = signal<ArtworkDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly activeImageIx = signal(0);

  readonly activeImage = computed(() => {
    const a = this.artwork();
    if (!a || a.images.length === 0) return null;
    const i = Math.min(this.activeImageIx(), a.images.length - 1);
    return a.images[i] ?? null;
  });

  readonly dimensionsLabel = computed(() => {
    const a = this.artwork();
    if (!a?.widthCm || !a?.heightCm) return null;
    return `${a.widthCm} × ${a.heightCm} cm`;
  });

  private currentFetchId = 0;

  constructor() {
    effect(() => {
      const id = this.paramId().get('id');
      // also re-fetch on locale change (titles/descriptions are localised)
      const _ = this.i18n.locale();
      if (!id) {
        this.router.navigate(['/gallery']);
        return;
      }
      this.load(id);
    }, { allowSignalWrites: true });
  }

  private async load(id: string): Promise<void> {
    const reqId = ++this.currentFetchId;
    this.loading.set(true);
    this.notFound.set(false);
    try {
      const data = await this.service.getById(id);
      if (reqId !== this.currentFetchId) return; // stale
      this.artwork.set(data);
      // Prefer the primary image; fall back to first.
      const primaryIx = data.images.findIndex((i) => i.isPrimary);
      this.activeImageIx.set(primaryIx >= 0 ? primaryIx : 0);
    } catch (err: unknown) {
      if (reqId !== this.currentFetchId) return;
      const status = (err as { status?: number } | null)?.status;
      if (status === 404) this.notFound.set(true);
      else this.notFound.set(true); // any failure is "can't show" — keep it simple
      this.artwork.set(null);
    } finally {
      if (reqId === this.currentFetchId) this.loading.set(false);
    }
  }
}
