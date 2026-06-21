// frontend/src/app/features/gallery/artwork-card.component.ts
/**
 * Single tile in the gallery grid.
 *
 * Inputs:
 *   artwork — ArtworkListItem (required)
 *
 * Behaviour:
 *   - Whole card is a router link to /artwork/:id
 *   - Image lazy-loads via native loading="lazy" (good enough for v1; the
 *     IntersectionObserver directive is reserved for the scroll sentinel)
 *   - Aspect ratio is enforced by CSS so cards stay consistent even before
 *     the image loads
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-artwork-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UploadUrlPipe, PricePipe],
  template: `
    <a [routerLink]="['/artwork', artwork().id]" class="card-link" [attr.aria-label]="artwork().title">
      <div class="thumb-wrap">
        <img
          class="thumb"
          loading="lazy"
          decoding="async"
          [src]="artwork().thumbnailPath | uploadUrl"
          [alt]="artwork().title"
        />
      </div>
      <div class="meta">
        <h3 class="title">{{ artwork().title }}</h3>
        <p class="artist">{{ artwork().artist.name }}</p>
        <p class="price">{{ artwork().basePrice | price }}</p>
      </div>
    </a>
  `,
  styles: [
    `
      /* Flat tile: no card chrome or shadow. The frame slot is a uniform
         size; the artwork sits inside it fully visible (never cropped),
         centred and letterboxed against the page — like a matted print.
         On hover a thin frame outlines the slot. */
      .card-link { display: block; text-decoration: none; color: inherit; }
      .thumb-wrap {
        aspect-ratio: 4 / 3;
        overflow: hidden;
        background: var(--gallery-bg);
        border: 1px solid transparent;
        transition: border-color 150ms ease;
      }
      .thumb {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        /* Restrained, quick hover fade — no lift, no zoom. */
        transition: opacity 150ms ease;
      }
      .card-link:hover .thumb-wrap { border-color: var(--gallery-ink); }
      .card-link:hover .thumb { opacity: 0.88; }

      .meta { padding: 18px 2px 0; }
      .title {
        margin: 0 0 6px;
        font-family: var(--gallery-serif);
        font-size: 20px;
        font-weight: 500;
        line-height: 1.2;
        letter-spacing: 0.01em;
        color: var(--gallery-ink);
      }
      .artist {
        margin: 0 0 12px;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 500;
        color: var(--gallery-muted);
      }
      .price { margin: 0; font-size: 13px; letter-spacing: 0.02em; color: var(--gallery-ink); }
    `,
  ],
})
export class ArtworkCardComponent {
  readonly artwork = input.required<ArtworkListItem>();
}
