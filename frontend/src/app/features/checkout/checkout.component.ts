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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CheckoutService } from './checkout.service';
import { CartService } from '../../core/cart/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    PricePipe,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <a mat-button routerLink="/cart">
          <mat-icon>arrow_back</mat-icon>
          {{ 'common.back' | translate }}
        </a>
        <h1>{{ 'checkout.title' | translate }}</h1>
      </header>

      <div class="layout">
        <!-- ─── Shipping form ─────────────────────────────────────────── -->
        <section class="form-section">
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ 'checkout.shipping.title' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
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
                  mat-flat-button
                  color="primary"
                  type="submit"
                  class="pay-btn"
                  [disabled]="form.invalid || submitting() || cart.items().length === 0"
                >
                  @if (submitting()) {
                    <mat-progress-spinner mode="indeterminate" diameter="20"/>
                  } @else {
                    <mat-icon>credit_card</mat-icon>
                    {{ 'checkout.pay' | translate }}
                  }
                </button>

                <p class="pay-hint">{{ 'checkout.payHint' | translate }}</p>
              </form>
            </mat-card-content>
          </mat-card>
        </section>

        <!-- ─── Order summary (stub) ──────────────────────────────────── -->
        <aside class="summary-section">
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ 'checkout.summary.title' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- TODO: render cart.items() with thumbnails, sizes, qty, totals -->
              <div class="todo-block">
                {{ 'checkout.summary.todoHint' | translate }}
              </div>
              <div class="subtotal-row">
                <span>{{ 'cart.subtotal' | translate }}</span>
                <span class="subtotal">{{ cart.subtotal() | price }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
      .page-header h1 { font-size: 24px; margin: 0; }
      .layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr); gap: 24px; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
      .form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
      .pay-btn { height: 48px; font-size: 15px; gap: 8px; margin-top: 8px; }
      .pay-hint { font-size: 12px; color: rgba(0,0,0,0.55); margin: 8px 0 0; }
      .summary-section mat-card { position: sticky; top: 96px; }
      .todo-block {
        padding: 12px; background: #fff8e1; border-radius: 4px;
        font-size: 13px; color: #8a6d3b; margin-bottom: 16px;
      }
      .subtotal-row {
        display: flex; justify-content: space-between; padding-top: 12px;
        border-top: 1px solid #eee;
      }
      .subtotal { font-weight: 700; font-size: 18px; }
    `,
  ],
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly checkoutService = inject(CheckoutService);
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
      // is a full document navigation away from our SPA.
      window.location.href = outcome.redirectUrl;
    } catch {
      // errorInterceptor surfaces the message.
      this.submitting.set(false);
    }
    // Deliberately don't reset submitting() on success — we're navigating away.
  }
}
