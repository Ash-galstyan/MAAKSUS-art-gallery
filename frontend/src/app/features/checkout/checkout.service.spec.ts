// frontend/src/app/features/checkout/checkout.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CheckoutService, type CheckoutInput, type CheckoutOutcome } from './checkout.service';
import { environment } from '../../../environments/environment';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;

  const input: CheckoutInput = {
    shippingFirstName: 'Ash',
    shippingLastName: 'G',
    shippingPhone: '+37412345678',
    shippingCity: 'Yerevan',
    shippingAddress: 'Some street 1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the shipping input and returns the raw (unwrapped) outcome', async () => {
    const outcome: CheckoutOutcome = {
      orderId: 'o1',
      orderNumber: 'ORD-1',
      redirectUrl: 'https://bank.example/pay/o1',
    };
    const promise = service.checkout(input);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(outcome);
    expect(await promise).toEqual(outcome);
  });

  it('propagates a failure', async () => {
    const promise = service.checkout(input);
    httpMock
      .expectOne(`${environment.apiBaseUrl}/orders/checkout`)
      .flush({ error: { code: 'PAYMENT_INIT_FAILED', message: 'boom' } }, { status: 502, statusText: 'Bad Gateway' });
    await expectAsync(promise).toBeRejected();
  });
});
