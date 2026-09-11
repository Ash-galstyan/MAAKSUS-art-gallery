// frontend/src/app/features/admin/orders/admin-order-detail-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminOrderDetailDialogComponent } from './admin-order-detail-dialog.component';
import { AdminOrdersService, type AdminOrderDetail, type OrderStatus } from './admin-orders.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeDetail(status: OrderStatus = 'PAID'): AdminOrderDetail {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    status,
    totalAmount: 5000,
    currency: 'AMD',
    shippingFirstName: 'Ash',
    shippingLastName: 'G',
    shippingCity: 'Yerevan',
    shippingPhone: '+37412345678',
    shippingAddress: 'Some street',
    shippingNotes: null,
    paymentProvider: 'ameriabank',
    paidAt: '2026-01-01',
    createdAt: '2026-01-01',
    items: [],
    payments: [],
    user: { id: 'u1', email: 'a@b.com', firstName: 'Ash', lastName: 'G', phone: null },
  };
}

describe('AdminOrderDetailDialogComponent', () => {
  let fixture: ComponentFixture<AdminOrderDetailDialogComponent>;
  let component: AdminOrderDetailDialogComponent;
  let service: jasmine.SpyObj<AdminOrdersService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminOrderDetailDialogComponent>>;

  // The component's constructor synchronously kicks off load(), which calls
  // service.detail() — so the spy's return value MUST be configured before
  // TestBed.createComponent() runs, not after.
  async function setup(detailResult: Promise<AdminOrderDetail>) {
    service = jasmine.createSpyObj<AdminOrdersService>('AdminOrdersService', ['detail', 'updateStatus']);
    service.detail.and.returnValue(detailResult);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AdminOrderDetailDialogComponent>>('MatDialogRef', ['close']);
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminOrderDetailDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminOrdersService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { orderId: 'o1' } },
      ],
    });
    fixture = TestBed.createComponent(AdminOrderDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('loads the order detail by id on construction', async () => {
    await setup(Promise.resolve(makeDetail()));
    expect(service.detail).toHaveBeenCalledWith('o1');
    expect(component.order()?.orderNumber).toBe('ORD-1');
    expect(component.loading()).toBeFalse();
  });

  it('sets an error message when loading fails', async () => {
    await setup(Promise.reject(new Error('not found')));
    expect(component.error()).toBe('not found');
    expect(component.order()).toBeNull();
  });

  describe('status transition availability', () => {
    it('PAID allows fulfill and refund but not cancel', async () => {
      await setup(Promise.resolve(makeDetail('PAID')));
      expect(component.canFulfill()).toBeTrue();
      expect(component.canRefund()).toBeTrue();
      expect(component.canCancel()).toBeFalse();
    });

    it('FULFILLED allows only refund', async () => {
      await setup(Promise.resolve(makeDetail('FULFILLED')));
      expect(component.canFulfill()).toBeFalse();
      expect(component.canRefund()).toBeTrue();
      expect(component.canCancel()).toBeFalse();
    });

    it('PENDING allows only cancel', async () => {
      await setup(Promise.resolve(makeDetail('PENDING')));
      expect(component.canFulfill()).toBeFalse();
      expect(component.canRefund()).toBeFalse();
      expect(component.canCancel()).toBeTrue();
    });

    it('a terminal status (REFUNDED) allows none', async () => {
      await setup(Promise.resolve(makeDetail('REFUNDED')));
      expect(component.canFulfill()).toBeFalse();
      expect(component.canRefund()).toBeFalse();
      expect(component.canCancel()).toBeFalse();
    });
  });

  describe('changeStatus', () => {
    beforeEach(async () => {
      await setup(Promise.resolve(makeDetail('PAID')));
    });

    it('does nothing when the confirm dialog is cancelled', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await component.changeStatus('FULFILLED');
      expect(service.updateStatus).not.toHaveBeenCalled();
    });

    it('updates the order and marks it changed on success', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.updateStatus.and.returnValue(Promise.resolve(makeDetail('FULFILLED')));
      await component.changeStatus('FULFILLED');
      expect(service.updateStatus).toHaveBeenCalledWith('o1', 'FULFILLED');
      expect(component.order()?.status).toBe('FULFILLED');
      expect(snack.success).toHaveBeenCalled();
      expect(component.updating()).toBeFalse();

      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith({ changed: true });
    });

    it('leaves state unchanged on failure', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.updateStatus.and.returnValue(Promise.reject(new Error('boom')));
      await component.changeStatus('FULFILLED');
      expect(component.order()?.status).toBe('PAID');
      expect(component.updating()).toBeFalse();

      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith(undefined);
    });
  });

  it('close() reports unchanged when no status update happened', async () => {
    await setup(Promise.resolve(makeDetail()));
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
