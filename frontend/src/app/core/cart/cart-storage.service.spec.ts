// frontend/src/app/core/cart/cart-storage.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { CartStorageService } from './cart-storage.service';

describe('CartStorageService', () => {
  let service: CartStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartStorageService);
  });

  it('starts at zero', () => {
    expect(service.itemCount()).toBe(0);
  });

  it('setCountForHeader updates the readonly signal', () => {
    service.setCountForHeader(7);
    expect(service.itemCount()).toBe(7);
    service.setCountForHeader(0);
    expect(service.itemCount()).toBe(0);
  });
});
