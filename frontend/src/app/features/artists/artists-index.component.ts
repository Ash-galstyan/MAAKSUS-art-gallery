// frontend/src/app/features/artists/artists-index.component.ts
/**
 * Artists index (/artists) — the "Artists" nav destination.
 *
 * A grid of every artist with public work. Each card links to the gallery
 * pre-filtered to that artist (`/gallery?artist=<slug>`), so it's a discovery
 * entry point for the artist facet. Data comes from GET /api/artists (already
 * public + localised); re-fetched on locale change.
 */
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/http/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import type { ArtistListItem } from '../../core/api-models/artist.model';

@Component({
  selector: 'app-artists-index',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatProgressSpinnerModule, TranslatePipe, UploadUrlPipe],
  template: `
    <header class="page-head wrap">
      <span class="eyebrow">{{ 'artists.pageEyebrow' | translate }}</span>
      <h1 class="display-2">{{ 'artists.pageTitle' | translate }}</h1>
      <p class="lead">{{ 'artists.pageLead' | translate }}</p>
    </header>

    <section class="wrap body">
      @if (loading()) {
        <div class="loading"><mat-progress-spinner mode="indeterminate" diameter="40" /></div>
      } @else if (artists().length === 0) {
        <p class="empty">{{ 'artists.empty' | translate }}</p>
      } @else {
        <ul class="grid">
          @for (a of artists(); track a.id) {
            <li>
              <a class="card" routerLink="/gallery" [queryParams]="{ artist: a.slug }">
                <span class="card__portrait">
                  @if (a.portraitPath) {
                    <img [src]="a.portraitPath | uploadUrl" [alt]="a.name" loading="lazy" />
                  } @else {
                    <span class="ph" aria-hidden="true"></span>
                  }
                </span>
                <span class="card__name">{{ a.name }}</span>
                @if (yearLabel(a)) {
                  <span class="card__years">{{ yearLabel(a) }}</span>
                }
                <span class="card__cta">{{ 'artists.viewWorks' | translate }}</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .wrap {
        width: 100%;
        max-width: var(--wrap);
        margin-inline: auto;
        padding-inline: var(--gutter);
      }
      .page-head { padding: clamp(40px, 6vw, 80px) var(--gutter) clamp(24px, 3vw, 40px); }
      .page-head .lead { margin-top: 14px; }

      .body { padding-bottom: clamp(56px, 9vw, 112px); }
      .loading { display: flex; justify-content: center; padding: 64px; }
      .empty { color: var(--c-muted); padding: 48px 0; }

      .grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        column-gap: 36px;
        row-gap: 48px;
      }
      .card { display: flex; flex-direction: column; }
      .card__portrait {
        position: relative;
        aspect-ratio: 4 / 5;
        background: var(--c-stone);
        overflow: hidden;
        margin-bottom: 16px;
      }
      .card__portrait img { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms ease; }
      .card__portrait .ph { position: absolute; inset: 0; }
      .card:hover .card__portrait img { transform: scale(1.04); }
      .card__name { font-family: var(--font-display); font-size: 1.15rem; line-height: 1.2; }
      .card__years { font-size: 12px; color: var(--c-muted); margin-top: 4px; }
      .card__cta {
        margin-top: 10px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-muted);
      }
      .card:hover .card__cta { color: var(--c-ink); }
    `,
  ],
})
export class ArtistsIndexComponent {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  readonly artists = signal<ArtistListItem[]>([]);
  readonly loading = signal(true);

  constructor() {
    effect(
      () => {
        this.i18n.locale();
        this.loading.set(true);
        this.api
          .get<ArtistListItem[]>('/artists')
          .then((rows) => this.artists.set(rows))
          .catch(() => this.artists.set([]))
          .finally(() => this.loading.set(false));
      },
      { allowSignalWrites: true },
    );
  }

  yearLabel(a: ArtistListItem): string | null {
    if (a.birthYear && a.deathYear) return `${a.birthYear}–${a.deathYear}`;
    if (a.birthYear) return `b. ${a.birthYear}`;
    return null;
  }
}
