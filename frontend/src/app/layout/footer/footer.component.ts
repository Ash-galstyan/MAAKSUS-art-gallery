// frontend/src/app/layout/footer/footer.component.ts
/**
 * App footer. Static for v1 — copyright + a couple of placeholder links.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <footer class="footer">
      <span>{{ 'footer.rights' | translate: { year } }}</span>
      <nav>
        <a routerLink="/contact">{{ 'footer.contact' | translate }}</a>
        <a routerLink="/terms">{{ 'footer.terms' | translate }}</a>
      </nav>
    </footer>
  `,
  styles: [
    `
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: #fafafa;
        border-top: 1px solid #eee;
        font-size: 14px;
      }
      .footer nav { display: flex; gap: 16px; }
      .footer a { color: inherit; text-decoration: none; }
      .footer a:hover { text-decoration: underline; }
    `,
  ],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
