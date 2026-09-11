// frontend/src/app/features/admin/print-options/admin-print-size-edit-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminPrintSizeEditDialogComponent } from './admin-print-size-edit-dialog.component';
import { AdminPrintOptionsService, type AdminPrintSize } from './admin-print-options.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeSize(): AdminPrintSize {
  return {
    id: 's1',
    code: 'M',
    widthCm: '40',
    heightCm: '30',
    priceMultiplier: '1.5',
    isActive: true,
    position: 2,
    translations: [{ locale: 'EN', label: 'Medium' }],
  };
}

describe('AdminPrintSizeEditDialogComponent', () => {
  let fixture: ComponentFixture<AdminPrintSizeEditDialogComponent>;
  let component: AdminPrintSizeEditDialogComponent;
  let service: jasmine.SpyObj<AdminPrintOptionsService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminPrintSizeEditDialogComponent>>;

  function setup(data: AdminPrintSize | null) {
    service = jasmine.createSpyObj<AdminPrintOptionsService>('AdminPrintOptionsService', [
      'createSize',
      'updateSize',
    ]);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AdminPrintSizeEditDialogComponent>>('MatDialogRef', ['close']);
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminPrintSizeEditDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminPrintOptionsService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AdminPrintSizeEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => setup(null));

    it('defaults priceMultiplier to 1 and position to 0', () => {
      expect(component.form.get('priceMultiplier')?.value).toBe(1);
      expect(component.form.get('position')?.value).toBe(0);
    });

    it('is invalid until code/width/height/EN label are set', () => {
      expect(component.form.invalid).toBeTrue();
      component.form.patchValue({ code: 'M', widthCm: 40, heightCm: 30 });
      component.translationsArray.at(0).get('label')?.setValue('Medium');
      expect(component.form.valid).toBeTrue();
    });

    it('save() creates with numeric coercion and filtered translations', async () => {
      component.form.patchValue({ code: 'M', widthCm: '40', heightCm: '30', priceMultiplier: '1.5' });
      component.translationsArray.at(0).get('label')?.setValue('Medium');
      service.createSize.and.returnValue(Promise.resolve(makeSize()));

      await component.save();

      expect(service.createSize).toHaveBeenCalledWith({
        code: 'M',
        widthCm: 40,
        heightCm: 30,
        priceMultiplier: 1.5,
        position: 0,
        isActive: true,
        translations: [{ locale: 'EN', label: 'Medium' }],
      });
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });

    it('save() marks touched and skips the API call while invalid', async () => {
      await component.save();
      expect(service.createSize).not.toHaveBeenCalled();
      expect(component.form.get('code')?.touched).toBeTrue();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup(makeSize()));

    it('normalises string Decimal fields to numbers', () => {
      expect(component.form.get('widthCm')?.value).toBe(40);
      expect(component.form.get('heightCm')?.value).toBe(30);
      expect(component.form.get('priceMultiplier')?.value).toBe(1.5);
    });

    it('save() updates by id', async () => {
      service.updateSize.and.returnValue(Promise.resolve(makeSize()));
      await component.save();
      expect(service.updateSize).toHaveBeenCalledWith('s1', jasmine.objectContaining({ code: 'M' }));
      expect(snack.success).toHaveBeenCalled();
    });
  });

  it('cancel() closes with no result', () => {
    setup(null);
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
