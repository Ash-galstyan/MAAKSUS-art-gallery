// frontend/src/app/features/home/home.component.ts
/**
 * Homepage — the landing route ("/").
 *
 * The homepage is a story, not a catalogue (WIKI.md §7). It answers, in
 * order: do I like this? · can I find something for my space? · can I trust
 * the quality? · why build a relationship with this company? The section
 * order and copy follow WIKI.md §8 / §9 / §10; the copy lives in the i18n
 * bundles under `home.*`.
 *
 * Imagery: there is no art-directed photography yet. Category / hero tiles
 * borrow real artwork thumbnails from the catalogue where available and fall
 * back to a warm placeholder block. Room and editorial imagery is
 * placeholder-only for now.  TODO: replace with commissioned photography.
 *
 * State (signals):
 *   works  — a small batch of artworks pulled once (re-pulled on locale
 *            change) to dress the hero and the "curated" tiles.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { GalleryService } from '../gallery/gallery.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import type { ArtworkListItem } from '../../core/api-models/artwork.model';

interface Tile {
  readonly title: string;
  readonly note: string;
  readonly link: string;
  readonly tag?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, TranslatePipe, UploadUrlPipe],
  template: `
    <!-- ═ Hero ═══════════════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="wrap hero__inner">
        <div class="hero__panel">
          @if (heroImage()) {
            <img [src]="heroImage() | uploadUrl" alt="" loading="eager" />
          } @else {
            <span class="ph" aria-hidden="true"></span>
          }
        </div>
        <div class="hero__copy">
          <h1 class="hero__title">
            <span>{{ 'home.hero.titleLine1' | translate }}</span>
            <span class="hero__title-em">{{ 'home.hero.titleLine2' | translate }}</span>
          </h1>
          <p class="lead">{{ 'home.hero.body' | translate }}</p>
          <div class="hero__cta">
            <a routerLink="/gallery" class="btn btn--solid">{{ 'home.hero.ctaPrimary' | translate }}</a>
            <a routerLink="/" fragment="rooms" class="btn">{{ 'home.hero.ctaSecondary' | translate }}</a>
          </div>
        </div>
      </div>

      <div class="strip">
        <div class="wrap strip__inner">
          @for (s of signals; track s.key) {
            <div class="strip__item">
              <mat-icon aria-hidden="true">{{ s.icon }}</mat-icon>
              <div>
                <span class="strip__label">{{ s.key | translate }}</span>
                <span class="strip__note">{{ s.note | translate }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═ Curated discovery ══════════════════════════════════════════════ -->
    <section class="section" id="curated">
      <div class="wrap">
        <header class="sec-head sec-head--center">
          <span class="eyebrow">{{ 'home.curated.eyebrow' | translate }}</span>
          <h2 class="display-2">{{ 'home.curated.title' | translate }}</h2>
          <p class="lead">{{ 'home.curated.lead' | translate }}</p>
        </header>

        <div class="tile-row">
          @for (tile of curatedTiles(); track tile.title; let i = $index) {
            <a class="tile" [routerLink]="tile.link">
              <span class="tile__media">
                @if (imageAt(i)) {
                  <img [src]="imageAt(i) | uploadUrl" [alt]="tile.title" loading="lazy" />
                } @else {
                  <span class="ph" aria-hidden="true"></span>
                }
                @if (tile.tag) {
                  <span class="tile__tag">{{ tile.tag }}</span>
                }
              </span>
              <span class="tile__title">{{ tile.title }}</span>
              <span class="tile__note">{{ tile.note }}</span>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- ═ Shop by space ══════════════════════════════════════════════════ -->
    <section class="section section--warm" id="rooms">
      <div class="wrap">
        <header class="sec-head sec-head--center">
          <span class="eyebrow">{{ 'home.rooms.eyebrow' | translate }}</span>
          <h2 class="display-2">{{ 'home.rooms.title' | translate }}</h2>
          <p class="lead">{{ 'home.rooms.lead' | translate }}</p>
        </header>

        <div class="room-row">
          @for (room of roomTiles(); track room.title) {
            <a class="room" [routerLink]="room.link">
              <span class="ph" aria-hidden="true"></span>
              <span class="room__title">{{ room.title }}</span>
              <span class="room__note">{{ room.note }}</span>
            </a>
          }
        </div>

        <div class="sec-foot">
          <a routerLink="/gallery" class="link-underline">{{ 'home.rooms.cta' | translate }}</a>
        </div>
      </div>
    </section>

    <!-- ═ Craftsmanship ══════════════════════════════════════════════════ -->
    <section class="section" id="craft">
      <div class="wrap">
        <header class="sec-head sec-head--center">
          <span class="eyebrow">{{ 'home.craft.eyebrow' | translate }}</span>
          <h2 class="display-2">{{ 'home.craft.title' | translate }}</h2>
          <p class="lead">{{ 'home.craft.lead' | translate }}</p>
        </header>

        <ol class="pillars">
          @for (p of craftPillars(); track p.title; let i = $index) {
            <li class="pillar">
              <span class="pillar__num">{{ pad(i + 1) }}</span>
              <h3 class="pillar__title">{{ p.title }}</h3>
              <p class="pillar__note">{{ p.note }}</p>
            </li>
          }
        </ol>

        <div class="sec-foot">
          <a routerLink="/" fragment="craft" class="link-underline">{{ 'home.craft.cta' | translate }}</a>
        </div>
      </div>
    </section>

    <!-- ═ Artists & stories ══════════════════════════════════════════════ -->
    <section class="section section--warm" id="artists">
      <div class="wrap editorial">
        <div class="editorial__media"><span class="ph" aria-hidden="true"></span></div>
        <div class="editorial__copy">
          <span class="eyebrow">{{ 'home.artists.eyebrow' | translate }}</span>
          <h2 class="display-2">{{ 'home.artists.title' | translate }}</h2>
          <p class="lead">{{ 'home.artists.body' | translate }}</p>
          <div class="hero__cta">
            <a routerLink="/gallery" class="btn">{{ 'home.artists.ctaArtists' | translate }}</a>
            <a routerLink="/" fragment="artists" class="link-underline editorial__link">
              {{ 'home.artists.ctaStories' | translate }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ═ Art finder ═════════════════════════════════════════════════════ -->
    <section class="section section--ink" id="finder">
      <div class="wrap--narrow finder">
        <span class="eyebrow">{{ 'home.finder.eyebrow' | translate }}</span>
        <h2 class="display-1">{{ 'home.finder.title' | translate }}</h2>
        <p class="lead">{{ 'home.finder.body' | translate }}</p>
        <a routerLink="/gallery" class="btn btn--solid-light">{{ 'home.finder.cta' | translate }}</a>
        <span class="finder__note">{{ 'home.finder.note' | translate }}</span>
      </div>
    </section>

    <!-- ═ Trade & Designers ══════════════════════════════════════════════ -->
    <section class="section section--sand" id="trade">
      <div class="wrap split">
        <header class="sec-head">
          <span class="eyebrow">{{ 'home.trade.eyebrow' | translate }}</span>
          <h2 class="display-2">{{ 'home.trade.title' | translate }}</h2>
          <p class="lead">{{ 'home.trade.body' | translate }}</p>
          <div class="hero__cta">
            <a routerLink="/" fragment="trade" class="btn btn--solid">{{ 'home.trade.ctaPrimary' | translate }}</a>
            <a routerLink="/" fragment="trade" class="btn">{{ 'home.trade.ctaSecondary' | translate }}</a>
          </div>
        </header>
        <ul class="feature-list">
          @for (f of tradePoints(); track f.title) {
            <li>
              <h3>{{ f.title }}</h3>
              <p>{{ f.note }}</p>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- ═ Collector's Circle ═════════════════════════════════════════════ -->
    <section class="section section--ink" id="collector-circle">
      <div class="wrap">
        <header class="sec-head sec-head--center">
          <span class="eyebrow">{{ 'home.circle.eyebrow' | translate }}</span>
          <h2 class="display-2">{{ 'home.circle.title' | translate }}</h2>
          <p class="lead">{{ 'home.circle.body' | translate }}</p>
        </header>

        <div class="benefits">
          @for (b of circleBenefits(); track b.title) {
            <div class="benefit">
              <h3>{{ b.title }}</h3>
              <p>{{ b.note }}</p>
            </div>
          }
        </div>

        <div class="sec-foot">
          <a routerLink="/account/register" class="btn btn--solid-light">{{ 'home.circle.cta' | translate }}</a>
          <span class="finder__note">{{ 'home.circle.note' | translate }}</span>
        </div>
      </div>
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
      .wrap--narrow {
        width: 100%;
        max-width: var(--wrap-narrow);
        margin-inline: auto;
        padding-inline: var(--gutter);
      }

      /* ── Hero ─────────────────────────────────────────────────────── */
      .hero { background: var(--c-paper-warm); }
      .hero__inner {
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        align-items: center;
        gap: clamp(28px, 6vw, 80px);
        padding-block: clamp(40px, 6vw, 76px);
      }
      .hero__panel {
        position: relative;
        aspect-ratio: 4 / 3;
        max-height: 520px;
        background: var(--c-stone);
        overflow: hidden;
      }
      .hero__panel img { width: 100%; height: 100%; object-fit: cover; }
      .hero__panel .ph { position: absolute; inset: 0; }
      .hero__title {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: clamp(2.8rem, 6vw, 5rem);
        line-height: 1.02;
        letter-spacing: 0.005em;
      }
      .hero__title span { display: block; }
      .hero__title-em { font-style: italic; }
      .hero__copy .lead { margin-top: 22px; }
      .hero__cta { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 34px; }

      /* ── Trust strip ──────────────────────────────────────────────── */
      .strip { background: var(--c-ink); color: var(--c-on-dark); }
      .strip__inner {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        padding-block: 22px;
      }
      .strip__item { display: flex; align-items: center; gap: 12px; }
      .strip__item mat-icon { color: var(--c-on-dark); font-size: 22px; width: 22px; height: 22px; flex: none; }
      .strip__label {
        display: block;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
      }
      .strip__note { display: block; font-size: 12px; color: var(--c-on-dark-muted); margin-top: 2px; }

      /* ── Section heads ────────────────────────────────────────────── */
      .sec-head { max-width: 58ch; margin-bottom: clamp(36px, 5vw, 60px); }
      .sec-head--center { max-width: 760px; margin-inline: auto; text-align: center; }
      .sec-head--center .lead { margin-inline: auto; }
      .sec-head .btn { margin-top: 28px; }
      .sec-foot { text-align: center; margin-top: clamp(40px, 5vw, 60px); display: flex; flex-direction: column; align-items: center; gap: 16px; }

      /* ── Curated tiles ────────────────────────────────────────────── */
      .tile-row {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: clamp(14px, 1.6vw, 24px);
      }
      .tile { display: flex; flex-direction: column; }
      .tile__media {
        position: relative;
        aspect-ratio: 3 / 4;
        background: var(--c-stone);
        overflow: hidden;
        margin-bottom: 16px;
      }
      .tile__media img { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms ease; }
      .tile__media .ph { position: absolute; inset: 0; }
      .tile:hover .tile__media img { transform: scale(1.04); }
      .tile__tag {
        position: absolute;
        top: 10px;
        left: 10px;
        background: var(--c-ink);
        color: var(--c-paper);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 5px 9px;
      }
      .tile__title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
      }
      .tile__note { font-size: 13px; color: var(--c-muted); margin-top: 5px; }

      /* ── Shop by space ────────────────────────────────────────────── */
      .split { display: grid; grid-template-columns: minmax(280px, 34%) 1fr; gap: clamp(32px, 6vw, 80px); align-items: start; }
      .room-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(14px, 1.6vw, 22px); }
      .room { display: flex; flex-direction: column; }
      .room .ph { aspect-ratio: 4 / 5; margin-bottom: 14px; }
      .room__title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
      }
      .room__note { font-size: 13px; color: var(--c-muted); margin-top: 4px; }

      /* ── Craft pillars ────────────────────────────────────────────── */
      .pillars {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: clamp(20px, 3vw, 40px);
      }
      .pillar { border-top: 1px solid var(--c-line-strong); padding-top: 20px; }
      .pillar__num {
        font-family: var(--font-display);
        font-size: 14px;
        color: var(--c-muted);
        letter-spacing: 0.1em;
      }
      .pillar__title { font-size: 1.1rem; margin: 14px 0 8px; }
      .pillar__note { font-size: 13px; color: var(--c-muted); line-height: 1.6; }

      /* ── Editorial (artists) ─────────────────────────────────────── */
      .editorial { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(28px, 6vw, 80px); align-items: center; }
      .editorial__media .ph { aspect-ratio: 4 / 3; }
      .editorial__copy .eyebrow { margin-top: 0; }
      .editorial__copy .lead { margin-top: 20px; }
      .editorial__link { margin-left: 4px; }

      /* ── Art finder ──────────────────────────────────────────────── */
      .finder { text-align: center; display: flex; flex-direction: column; align-items: center; }
      .finder .lead { margin-inline: auto; margin-bottom: 34px; }
      .finder__note { font-size: 11px; letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--c-on-dark-muted); margin-top: 18px; }
      .section--sand .finder__note { color: var(--c-muted); }

      /* ── Trade feature list ──────────────────────────────────────── */
      .feature-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; background: var(--c-line-strong); border: 1px solid var(--c-line-strong); }
      .feature-list li { background: var(--c-sand); padding: 26px 24px; }
      .feature-list h3 { font-size: 11px; font-weight: 600; letter-spacing: var(--tracking-label); text-transform: uppercase; font-family: var(--font-sans); }
      .feature-list p { margin: 10px 0 0; font-size: 13px; color: var(--c-muted); line-height: 1.6; }

      /* ── Collector's Circle benefits ─────────────────────────────── */
      .benefits { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(20px, 3vw, 40px); }
      .benefit { border-top: 1px solid rgba(245, 241, 232, 0.28); padding-top: 20px; }
      .benefit h3 { color: var(--c-on-dark); font-size: 1.05rem; margin-bottom: 8px; font-family: var(--font-display); }
      .benefit p { font-size: 13px; color: var(--c-on-dark-muted); line-height: 1.6; margin: 0; }

      /* ── Responsive ──────────────────────────────────────────────── */
      @media (max-width: 1080px) {
        .tile-row { grid-template-columns: repeat(3, 1fr); row-gap: 32px; }
        .room-row { grid-template-columns: repeat(3, 1fr); row-gap: 28px; }
        .pillars { grid-template-columns: repeat(2, 1fr); }
        .benefits { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 900px) {
        .hero__inner { grid-template-columns: 1fr; }
        .hero__panel { order: 2; aspect-ratio: 4 / 3; }
        .split, .editorial { grid-template-columns: 1fr; }
        .strip__inner { grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .feature-list { grid-template-columns: 1fr; }
      }
      @media (max-width: 620px) {
        .tile-row { grid-template-columns: repeat(2, 1fr); }
        .room-row { grid-template-columns: repeat(2, 1fr); }
        .strip__inner { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class HomeComponent {
  private readonly gallery = inject(GalleryService);
  private readonly i18n = inject(I18nService);
  private readonly t = (k: string) => this.i18n.t(k);

  readonly works = signal<ArtworkListItem[]>([]);

  /** Featured artwork for the hero panel. */
  readonly heroImage = computed(() => this.works()[0]?.thumbnailPath ?? null);

  readonly signals = [
    { key: 'announce.prints', note: 'announce.printsNote', icon: 'verified' },
    { key: 'announce.framing', note: 'announce.framingNote', icon: 'crop_free' },
    { key: 'announce.trade', note: 'announce.tradeNote', icon: 'groups' },
    { key: 'announce.delivery', note: 'announce.deliveryNote', icon: 'local_shipping' },
  ] as const;

  readonly curatedTiles = computed<Tile[]>(() => [
    { title: this.t('home.curated.newArrivals'), note: this.t('home.curated.newArrivalsNote'), link: '/gallery', tag: this.t('home.curated.tag') },
    { title: this.t('home.curated.abstract'), note: this.t('home.curated.abstractNote'), link: '/gallery' },
    { title: this.t('home.curated.photography'), note: this.t('home.curated.photographyNote'), link: '/gallery' },
    { title: this.t('home.curated.modern'), note: this.t('home.curated.modernNote'), link: '/gallery' },
    { title: this.t('home.curated.bw'), note: this.t('home.curated.bwNote'), link: '/gallery' },
    { title: this.t('home.curated.collections'), note: this.t('home.curated.collectionsNote'), link: '/gallery' },
  ]);

  readonly roomTiles = computed<Tile[]>(() => [
    { title: this.t('home.rooms.living'), note: this.t('home.rooms.livingNote'), link: '/gallery' },
    { title: this.t('home.rooms.bedroom'), note: this.t('home.rooms.bedroomNote'), link: '/gallery' },
    { title: this.t('home.rooms.dining'), note: this.t('home.rooms.diningNote'), link: '/gallery' },
    { title: this.t('home.rooms.office'), note: this.t('home.rooms.officeNote'), link: '/gallery' },
    { title: this.t('home.rooms.hospitality'), note: this.t('home.rooms.hospitalityNote'), link: '/gallery' },
  ]);

  readonly craftPillars = computed(() => [
    { title: this.t('home.craft.printing'), note: this.t('home.craft.printingNote') },
    { title: this.t('home.craft.materials'), note: this.t('home.craft.materialsNote') },
    { title: this.t('home.craft.framing'), note: this.t('home.craft.framingNote') },
    { title: this.t('home.craft.care'), note: this.t('home.craft.careNote') },
  ]);

  readonly tradePoints = computed(() => [
    { title: this.t('home.trade.pricing'), note: this.t('home.trade.pricingNote') },
    { title: this.t('home.trade.support'), note: this.t('home.trade.supportNote') },
    { title: this.t('home.trade.formats'), note: this.t('home.trade.formatsNote') },
    { title: this.t('home.trade.sourcing'), note: this.t('home.trade.sourcingNote') },
  ]);

  readonly circleBenefits = computed(() => [
    { title: this.t('home.circle.access'), note: this.t('home.circle.accessNote') },
    { title: this.t('home.circle.privileges'), note: this.t('home.circle.privilegesNote') },
    { title: this.t('home.circle.recommendations'), note: this.t('home.circle.recommendationsNote') },
    { title: this.t('home.circle.exclusive'), note: this.t('home.circle.exclusiveNote') },
  ]);

  constructor() {
    // Pull a small batch to dress the hero + curated tiles. Re-pull on locale
    // change so titles/alt text stay in the active language.
    effect(
      () => {
        this.i18n.locale();
        this.gallery
          .listArtworks({ limit: 8 })
          .then((res) => this.works.set(res.items))
          .catch(() => this.works.set([]));
      },
      { allowSignalWrites: true },
    );
  }

  /** Thumbnail for curated tile i — offset by 1 so the hero keeps works()[0]. */
  imageAt(i: number): string | null {
    return this.works()[i + 1]?.thumbnailPath ?? null;
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
