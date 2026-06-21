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
import { MatCardModule } from '@angular/material/card';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-artwork-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, UploadUrlPipe, PricePipe],
  template: `
    <a [routerLink]="['/artwork', artwork().id]" class="card-link" [attr.aria-label]="artwork().title">
      <mat-card class="card">
        <div class="thumb-wrap">
          <img
            class="thumb"
            loading="lazy"
            decoding="async"
            [src]="artwork().thumbnailPath | uploadUrl"
            [alt]="artwork().title"
          />
        </div>
        <mat-card-content class="meta">
          <h3 class="title">{{ artwork().title }}</h3>
          <p class="artist">{{ artwork().artist.name }}</p>
          <p class="price">{{ artwork().basePrice | price }}</p>
        </mat-card-content>
      </mat-card>
    </a>
  `,
  styles: [
    `
      .card-link { display: block; text-decoration: none; color: inherit; }
      .card {
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        z-index: 1;
        transition: transform 200ms ease, box-shadow 200ms ease;
      }
      .card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); } }
      .thumb-wrap {
        aspect-ratio: 4 / 3;
        overflow: hidden;
        background: #f4f4f4;
      }
      .thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
      .meta { padding: 12px 16px 16px; }
      .title { margin: 0 0 4px; font-size: 16px; font-weight: 600; line-height: 1.3; }
      .artist { margin: 0 0 8px; font-size: 13px; color: rgba(0,0,0,0.6); }
      .price { margin: 0; font-weight: 600; }
    `,
  ],
})
export class ArtworkCardComponent {
  readonly artwork = input.required<ArtworkListItem>();
}
