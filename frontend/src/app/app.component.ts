// frontend/src/app/app.component.ts
/**
 * Root component — fixed header, routed body, fixed footer.
 *
 * Shows nothing until i18n.ready() is true, so no flash of untranslated text.
 * The hydrate() call in app.config's APP_INITIALIZER takes care of restoring
 * the session before this renders.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { I18nService } from './core/i18n/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    @if (i18n.ready()) {
      <app-header></app-header>
      <main class="content"><router-outlet></router-outlet></main>
      <app-footer></app-footer>
    } @else {
      <div class="boot">Loading…</div>
    }
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; min-height: 100vh; }
      .content { flex: 1; }
      .boot { display: flex; align-items: center; justify-content: center; height: 100vh; }
    `,
  ],
})
export class AppComponent {
  readonly i18n = inject(I18nService);
}
