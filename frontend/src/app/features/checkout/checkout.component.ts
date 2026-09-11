// frontend/src/app/features/checkout/checkout.component.ts
/**
 * Checkout page (/checkout).
 *
 * STUB STATE — what's implemented vs. what's TODO:
 *   ✅ Auth-guarded route (handled in app.routes.ts)
 *   ✅ Form scaffold with validation (firstName, lastName, phone, city, address, notes)
 *   ✅ Submit handler that actually calls /api/orders/checkout and redirects
 *      to the bank — this had to be real for the flow to work end-to-end.
 *
 *   TODO Phase 9 completion:
 *     - Render the order summary on the right (cart lines + subtotal, read
 *       from CartService.items() / .subtotal()). The CartService is already
 *       injected; just bind to its signals in the template.
 *     - Pre-fill the form from the user's profile (firstName/lastName/phone).
 *       Use AuthService.currentUser() for the names; phone needs a /me fetch
 *       which the auth.service already does on hydrate.
 *     - Empty-cart guard: if cart.items() is empty, route to /cart.
 *     - Disable Pay button until cart is non-empty AND form is valid.
 *     - Snackbar on PAYMENT_INIT_FAILED (the error interceptor already does
 *       this — verify it shows the right message).
 *
 *   FUTURE (out of v1):
 *     - Saved addresses on the user profile, pick from dropdown.
 *     - Yerevan-only vs Armenia-wide shipping calculation. For v1 there's no
 *       shipping fee in the price; add as an Order field when needed.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CheckoutService } from './checkout.service';
import { CartService } from '../../core/cart/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UploadUrlPipe } from '../../shared/pipes/upload-url.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
    UploadUrlPipe,
    PricePipe,
  ],
  template: `
    <div class="page wrap">
      <nav class="crumbs"><a routerLink="/cart">{{ 'common.back' | translate }}</a></nav>
      <header class="page-header">
        <h1 class="display-2">{{ 'checkout.title' | translate }}</h1>
      </header>

      <div class="layout">
        <!-- ─── Shipping form ─────────────────────────────────────────── -->
        <section class="form-section">
          <h2 class="block__title">{{ 'checkout.shipping.title' | translate }}</h2>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'checkout.shipping.firstName' | translate }}</mat-label>
                <input matInput formControlName="shippingFirstName" autocomplete="given-name" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'checkout.shipping.lastName' | translate }}</mat-label>
                <input matInput formControlName="shippingLastName" autocomplete="family-name" required />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'checkout.shipping.phone' | translate }}</mat-label>
              <input matInput formControlName="shippingPhone" autocomplete="tel" required />
              <mat-hint>{{ 'checkout.shipping.phoneHint' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'checkout.shipping.city' | translate }}</mat-label>
              <input matInput formControlName="shippingCity" autocomplete="address-level2" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'checkout.shipping.address' | translate }}</mat-label>
              <textarea matInput formControlName="shippingAddress" rows="2"
                        autocomplete="street-address" required></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'checkout.shipping.notes' | translate }}</mat-label>
              <textarea matInput formControlName="shippingNotes" rows="2"></textarea>
              <mat-hint>{{ 'checkout.shipping.notesHint' | translate }}</mat-hint>
            </mat-form-field>

            <button
              type="submit"
              class="btn btn--solid btn--block pay-btn"
              [disabled]="form.invalid || submitting() || cart.items().length === 0"
            >
              {{ (submitting() ? 'checkout.redirecting' : 'checkout.pay') | translate }}
            </button>

            <p class="pay-hint">{{ 'checkout.payHint' | translate }}</p>
          </form>
        </section>

        <!-- ─── Order summary ─────────────────────────────────────────── -->
        <aside class="summary-section">
          <div class="summary-card">
            <h2 class="block__title">{{ 'checkout.summary.title' | translate }}</h2>

            @if (cart.items().length === 0) {
              <p class="muted">{{ 'checkout.summary.todoHint' | translate }}</p>
            } @else {
              <ul class="lines">
                @for (line of cart.items(); track line.id) {
                  <li class="line">
                    <img class="line__thumb" [src]="line.artwork.thumbnailPath | uploadUrl"
                         [alt]="line.artwork.title" loading="lazy" />
                    <div class="line__info">
                      <span class="line__title">{{ line.artwork.title }}</span>
                      <span class="line__meta">
                        {{ line.printSize.label }}
                        @if (line.frameOption) { · {{ line.frameOption.label }} }
                        @if (line.withMatte) { · {{ 'cart.matte' | translate }} }
                      </span>
                      <span class="line__meta">× {{ line.quantity }}</span>
                    </div>
                    <span class="line__total">{{ line.lineTotal | price }}</span>
                  </li>
                }
              </ul>
            }

            <div class="subtotal-row">
              <span>{{ 'cart.subtotal' | translate }}</span>
              <span class="subtotal">{{ cart.subtotal() | price }}</span>
            </div>
            <p class="muted">{{ 'cart.shippingNote' | translate }}</p>
          </div>
        </aside>
      </div>
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
      .layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr); gap: clamp(32px, 5vw, 64px); align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

      .block__title {
        font-family: var(--font-sans); font-size: 11px; font-weight: 600;
        letter-spacing: var(--tracking-label); text-transform: uppercase;
        color: var(--c-muted); margin: 0 0 20px;
      }

      .form { display: flex; flex-direction: column; gap: 6px; }
      .form mat-form-field { width: 100%; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
      .pay-btn { margin-top: 14px; }
      .pay-hint { font-size: 12px; color: var(--c-muted); margin: 12px 0 0; line-height: 1.6; }

      .summary-card {
        position: sticky; top: calc(var(--header-h) + 24px);
        border: 1px solid var(--c-line); background: var(--c-paper-warm); padding: 28px;
      }
      .muted { color: var(--c-muted); font-size: 12px; margin: 0; }

      .lines { list-style: none; margin: 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 16px; }
      .line { display: grid; grid-template-columns: 52px 1fr auto; gap: 12px; align-items: start; }
      .line__thumb { width: 52px; height: 64px; object-fit: cover; background: var(--c-stone); }
      .line__info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .line__title { font-size: 13px; }
      .line__meta { font-size: 11px; color: var(--c-muted); }
      .line__total { font-size: 13px; white-space: nowrap; }

      .subtotal-row {
        display: flex; justify-content: space-between; align-items: baseline;
        padding-top: 16px; border-top: 1px solid var(--c-line); margin-bottom: 10px;
      }
      .subtotal { font-family: var(--font-display); font-size: 1.4rem; }
    `,
  ],
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly checkoutService = inject(CheckoutService);
  private readonly document = inject(DOCUMENT);
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    shippingFirstName: ['', [Validators.required, Validators.maxLength(80)]],
    shippingLastName: ['', [Validators.required, Validators.maxLength(80)]],
    shippingPhone: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(40)]],
    shippingCity: ['', [Validators.required, Validators.maxLength(120)]],
    shippingAddress: ['', [Validators.required, Validators.maxLength(400)]],
    shippingNotes: ['', [Validators.maxLength(1000)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting() || this.cart.items().length === 0) return;
    this.submitting.set(true);
    try {
      const raw = this.form.getRawValue();
      const outcome = await this.checkoutService.checkout({
        ...raw,
        shippingNotes: raw.shippingNotes || undefined,
      });
      // Leave Angular — go to the bank's hosted page. Don't use router; this
      // is a full document navigation away from our SPA. Goes through the
      // injected DOCUMENT (not the global `window`) so tests can stub it —
      // assigning to the real window.location mid-test disconnects the
      // headless browser and aborts the rest of the suite.
      this.document.defaultView!.location.href = outcome.redirectUrl;
    } catch {
      // errorInterceptor surfaces the message.
      this.submitting.set(false);
    }
    // Deliberately don't reset submitting() on success — we're navigating away.
  }
}
