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
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
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
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    @if (loading()) {
      <div class="centered"><mat-progress-spinner mode="indeterminate" diameter="48" /></div>
    } @else if (notFound()) {
      <div class="centered">
        <mat-icon class="big-icon">image_not_supported</mat-icon>
        <h2>{{ 'artwork.notFound' | translate }}</h2>
        <a mat-button routerLink="/">{{ 'artwork.backToGallery' | translate }}</a>
      </div>
    } @else if (artwork()) {
      <article class="page">
        <div class="layout">
          <!-- ─── Left: imagery ──────────────────────────────────────────── -->
          <section class="gallery">
            <div class="hero">
              <img
                [src]="activeImage()?.mediumPath | uploadUrl"
                [alt]="artwork()!.title"
                class="hero-img"
              />
              @if (!artwork()!.isAvailable) {
                <span class="badge unavailable">
                  {{ 'artwork.unavailable' | translate }}
                </span>
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
            <a class="category-link" [routerLink]="['/']" [queryParams]="{ categories: artwork()!.category.id }">
              {{ artwork()!.category.name }}
            </a>

            <h1 class="title">{{ artwork()!.title }}</h1>

            <a
              class="artist"
              [routerLink]="['/']"
              [queryParams]="{ q: artwork()!.artist.name }"
            >
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
              <a
                mat-flat-button
                color="primary"
                class="cta"
                [disabled]="!artwork()!.isAvailable"
                [routerLink]="['/customize', artwork()!.id]"
              >
                <mat-icon>shopping_basket</mat-icon>
                {{ 'artwork.customizeAndBuy' | translate }}
              </a>
              <a
                mat-stroked-button
                class="cta"
                [routerLink]="['/wall-preview', artwork()!.id]"
              >
                <mat-icon>preview</mat-icon>
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
                <h2>{{ 'artwork.history' | translate }}</h2>
                <p>{{ artwork()!.history }}</p>
              </div>
            }
            @if (artwork()!.artist.bio) {
              <mat-expansion-panel class="bio">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    {{ 'artwork.aboutArtist' | translate: { name: artwork()!.artist.name } }}
                  </mat-panel-title>
                </mat-expansion-panel-header>
                <p>{{ artwork()!.artist.bio }}</p>
              </mat-expansion-panel>
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
        min-height: 60vh; gap: 16px; text-align: center;
      }
      .big-icon { font-size: 96px; width: 96px; height: 96px; opacity: 0.4; }

      .page { max-width: 1280px; margin: 0 auto; padding: 32px 24px 64px; }
      .layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr); gap: 48px; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; gap: 32px; } }

      .gallery .hero {
        position: relative;
        background: #fafafa;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 4 / 3;
      }
      .hero-img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .badge {
        position: absolute; top: 16px; left: 16px;
        padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;
      }
      .badge.unavailable { background: #e53935; color: white; }

      .strip { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
      .thumb-btn {
        width: 72px; height: 72px; padding: 0; border: 2px solid transparent;
        border-radius: 4px; cursor: pointer; background: #f4f4f4;
        overflow: hidden;
      }
      .thumb-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .thumb-btn.active { border-color: #673ab7; }

      .meta { display: flex; flex-direction: column; }
      .category-link {
        text-transform: uppercase; font-size: 12px; letter-spacing: 0.06em;
        color: rgba(0,0,0,0.6); text-decoration: none;
      }
      .category-link:hover { text-decoration: underline; }
      .title { font-size: 32px; line-height: 1.2; margin: 8px 0 4px; font-weight: 700; }
      .artist {
        font-size: 16px; color: rgba(0,0,0,0.7); text-decoration: none; margin-bottom: 24px;
      }
      .artist:hover { text-decoration: underline; }

      .specs { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0 0 20px; }
      .specs > div { display: contents; }
      .specs dt { font-weight: 600; color: rgba(0,0,0,0.6); font-size: 13px; }
      .specs dd { margin: 0; font-size: 14px; }

      .description { line-height: 1.55; margin: 0 0 24px; }

      .price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 16px; }
      .price-label { font-size: 13px; color: rgba(0,0,0,0.6); text-transform: uppercase; letter-spacing: 0.05em; }
      .price { font-size: 24px; font-weight: 700; }

      .ctas { display: flex; flex-direction: column; gap: 12px; }
      .cta { height: 48px; font-size: 15px; gap: 8px; }

      .more { margin-top: 64px; display: flex; flex-direction: column; gap: 24px; }
      .block h2 { font-size: 20px; margin: 0 0 8px; }
      .block p { line-height: 1.6; margin: 0; }
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
        this.router.navigate(['/']);
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
