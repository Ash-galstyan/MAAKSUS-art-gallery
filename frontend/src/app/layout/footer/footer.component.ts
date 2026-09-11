// frontend/src/app/layout/footer/footer.component.ts
/**
 * Site footer.
 *
 *   1. Newsletter band (ink) — WIKI.md §8.8. Not called "newsletter"; no
 *      discount lead. Submit is a local no-op with a thank-you state until a
 *      backend endpoint exists.  TODO: POST to a subscribe endpoint.
 *   2. Main — brand statement (§8.9, headed with the storefront brand) plus
 *      four link columns.
 *   3. Legal row — copyright + Terms / Privacy.
 *
 * Link targets for pages that don't exist yet point at "/" — wire them up as
 * those routes land.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <footer class="footer">
      <!-- 1 ─ Newsletter ─────────────────────────────────────────────── -->
      <section class="news">
        <div class="wrap news__inner">
          <div class="news__copy">
            <h2 class="display-3">{{ 'footer.newsletterTitle' | translate }}</h2>
            <p>{{ 'footer.newsletterBody' | translate }}</p>
          </div>
          @if (subscribed()) {
            <p class="news__thanks">{{ 'footer.joined' | translate }}</p>
          } @else {
            <form class="news__form" (submit)="subscribe($event)">
              <input
                type="email"
                name="email"
                required
                autocomplete="email"
                [attr.placeholder]="'footer.emailPlaceholder' | translate"
                [attr.aria-label]="'footer.emailPlaceholder' | translate"
              />
              <button type="submit" class="btn btn--solid-light btn--sm">
                {{ 'footer.join' | translate }}
              </button>
            </form>
          }
        </div>
      </section>

      <!-- 2 ─ Main ──────────────────────────────────────────────────── -->
      <div class="wrap footer__main">
        <div class="brandblock">
          <span class="brandblock__mark">{{ 'common.appName' | translate }}</span>
          <p class="brandblock__statement">{{ 'footer.statement' | translate }}</p>
        </div>

        <nav class="cols" aria-label="Footer">
          <div class="col">
            <h3>{{ 'footer.colShop' | translate }}</h3>
            <a routerLink="/gallery">{{ 'footer.linkArtPrints' | translate }}</a>
            <a routerLink="/gallery" [queryParams]="{ category: 'photography' }">{{ 'footer.linkPhotography' | translate }}</a>
            <a routerLink="/gallery">{{ 'footer.linkNewArrivals' | translate }}</a>
            <a routerLink="/gallery">{{ 'footer.linkCollections' | translate }}</a>
          </div>
          <div class="col">
            <h3>{{ 'footer.colExplore' | translate }}</h3>
            <a routerLink="/gallery">{{ 'footer.linkArtists' | translate }}</a>
            <a routerLink="/" fragment="craft">{{ 'footer.linkCraft' | translate }}</a>
            <a routerLink="/" fragment="artists">{{ 'footer.linkStory' | translate }}</a>
            <a routerLink="/" fragment="finder">{{ 'footer.linkFinder' | translate }}</a>
          </div>
          <div class="col">
            <h3>{{ 'footer.colServices' | translate }}</h3>
            <a routerLink="/" fragment="trade">{{ 'footer.linkTrade' | translate }}</a>
            <a routerLink="/" fragment="collector-circle">{{ 'footer.linkCircle' | translate }}</a>
            <a routerLink="/">{{ 'footer.linkGiftCards' | translate }}</a>
          </div>
          <div class="col">
            <h3>{{ 'footer.colSupport' | translate }}</h3>
            <a routerLink="/">{{ 'footer.linkContact' | translate }}</a>
            <a routerLink="/">{{ 'footer.linkShipping' | translate }}</a>
            <a routerLink="/">{{ 'footer.linkReturns' | translate }}</a>
            <a routerLink="/">{{ 'footer.linkFaq' | translate }}</a>
          </div>
        </nav>
      </div>

      <!-- 3 ─ Legal ─────────────────────────────────────────────────── -->
      <div class="wrap footer__legal">
        <span>{{ 'footer.rights' | translate: { year } }}</span>
        <nav aria-label="Legal">
          <a routerLink="/">{{ 'footer.terms' | translate }}</a>
          <a routerLink="/">{{ 'footer.privacy' | translate }}</a>
        </nav>
      </div>
    </footer>
  `,
  styles: [
    `
      .footer { margin-top: auto; }
      .wrap {
        width: 100%;
        max-width: var(--wrap);
        margin-inline: auto;
        padding-inline: var(--gutter);
      }

      /* ── Newsletter ──────────────────────────────────────────────── */
      .news { background: var(--c-ink); color: var(--c-on-dark); }
      .news__inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: clamp(24px, 6vw, 80px);
        padding-block: clamp(40px, 6vw, 68px);
        flex-wrap: wrap;
      }
      .news__copy { max-width: 46ch; }
      .news__copy h2 { color: var(--c-on-dark); }
      .news__copy p { margin: 12px 0 0; color: var(--c-on-dark-muted); font-size: 14px; }
      .news__form { display: flex; gap: 12px; flex: 1; min-width: 280px; max-width: 460px; }
      .news__form input {
        flex: 1;
        min-width: 0;
        background: none;
        border: 0;
        border-bottom: 1px solid rgba(245, 241, 232, 0.4);
        color: var(--c-on-dark);
        font: inherit;
        font-size: 14px;
        padding: 12px 2px;
      }
      .news__form input::placeholder { color: var(--c-on-dark-muted); }
      .news__form input:focus { outline: 0; border-bottom-color: var(--c-on-dark); }
      .news__thanks {
        flex: 1;
        min-width: 280px;
        max-width: 460px;
        margin: 0;
        font-size: 14px;
        color: var(--c-on-dark);
        border-top: 1px solid rgba(245, 241, 232, 0.25);
        padding-top: 16px;
      }

      /* ── Main ────────────────────────────────────────────────────── */
      .footer__main {
        background: var(--c-paper-warm);
        display: grid;
        grid-template-columns: minmax(260px, 1fr) 2fr;
        gap: clamp(32px, 7vw, 96px);
        padding-block: clamp(48px, 8vw, 96px);
      }
      .brandblock__mark {
        font-family: var(--font-display);
        font-size: 24px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--c-ink);
      }
      .brandblock__statement {
        margin: 20px 0 0;
        font-family: var(--font-display);
        font-size: clamp(1.05rem, 1.6vw, 1.3rem);
        line-height: 1.5;
        color: var(--c-muted);
        max-width: 42ch;
      }
      .cols {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 32px;
      }
      .col { display: flex; flex-direction: column; gap: 12px; }
      .col h3 {
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: var(--tracking-label);
        text-transform: uppercase;
        color: var(--c-muted);
        margin-bottom: 4px;
      }
      .col a {
        font-size: 13px;
        color: var(--c-ink);
        width: fit-content;
      }
      .col a:hover { color: var(--c-muted); }

      /* ── Legal ───────────────────────────────────────────────────── */
      .footer__legal {
        background: var(--c-paper-warm);
        border-top: 1px solid var(--c-line);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-block: 24px;
        font-size: 12px;
        color: var(--c-muted);
      }
      .footer__legal nav { display: flex; gap: 24px; }
      .footer__legal a:hover { color: var(--c-ink); }

      @media (max-width: 900px) {
        .footer__main { grid-template-columns: 1fr; }
        .cols { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 560px) {
        .news__inner { flex-direction: column; align-items: flex-start; }
        .footer__legal { flex-direction: column; align-items: flex-start; }
      }
    `,
  ],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  readonly subscribed = signal(false);

  subscribe(event: Event): void {
    event.preventDefault();
    // TODO: POST the address to a subscribe endpoint once one exists.
    this.subscribed.set(true);
  }
}
