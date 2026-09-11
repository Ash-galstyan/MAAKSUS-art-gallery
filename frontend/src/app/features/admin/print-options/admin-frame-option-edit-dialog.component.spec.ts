// frontend/src/app/features/admin/print-options/admin-frame-option-edit-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminFrameOptionEditDialogComponent } from './admin-frame-option-edit-dialog.component';
import { AdminPrintOptionsService, type AdminFrameOption } from './admin-print-options.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeFrame(): AdminFrameOption {
  return {
    id: 'f1',
    code: 'WOOD',
    frameType: 'WOOD',
    colorHex: '#6b4423',
    additionalPrice: '5000',
    isActive: true,
    position: 1,
    translations: [{ locale: 'EN', label: 'Wood' }],
  };
}

describe('AdminFrameOptionEditDialogComponent', () => {
  let fixture: ComponentFixture<AdminFrameOptionEditDialogComponent>;
  let component: AdminFrameOptionEditDialogComponent;
  let service: jasmine.SpyObj<AdminPrintOptionsService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminFrameOptionEditDialogComponent>>;

  function setup(data: AdminFrameOption | null) {
    service = jasmine.createSpyObj<AdminPrintOptionsService>('AdminPrintOptionsService', [
      'createFrame',
      'updateFrame',
    ]);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AdminFrameOptionEditDialogComponent>>('MatDialogRef', ['close']);
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminFrameOptionEditDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminPrintOptionsService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AdminFrameOptionEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => setup(null));

    it('defaults frameType to WOOD and colorHex to the wood default', () => {
      expect(component.form.get('frameType')?.value).toBe('WOOD');
      expect(component.form.get('colorHex')?.value).toBe('#6b4423');
    });

    it('rejects a malformed hex color', () => {
      component.form.get('colorHex')?.setValue('not-a-hex');
      expect(component.form.get('colorHex')?.invalid).toBeTrue();
      component.form.get('colorHex')?.setValue('#ABCDEF');
      expect(component.form.get('colorHex')?.valid).toBeTrue();
    });

    it('onHexInput pushes the typed value into the colorHex control', () => {
      const input = document.createElement('input');
      input.value = '#123abc';
      component.onHexInput({ target: input } as unknown as Event);
      expect(component.form.get('colorHex')?.value).toBe('#123abc');
    });

    it('save() creates with numeric coercion for additionalPrice', async () => {
      component.form.patchValue({ code: 'WOOD', additionalPrice: '5000' });
      component.translationsArray.at(0).get('label')?.setValue('Wood');
      service.createFrame.and.returnValue(Promise.resolve(makeFrame()));

      await component.save();

      expect(service.createFrame).toHaveBeenCalledWith({
        code: 'WOOD',
        frameType: 'WOOD',
        colorHex: '#6b4423',
        additionalPrice: 5000,
        position: 0,
        isActive: true,
        translations: [{ locale: 'EN', label: 'Wood' }],
      });
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });

    it('save() marks touched and skips the API call while invalid', async () => {
      await component.save();
      expect(service.createFrame).not.toHaveBeenCalled();
      expect(component.form.get('code')?.touched).toBeTrue();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup(makeFrame()));

    it('normalises the string Decimal additionalPrice to a number', () => {
      expect(component.form.get('additionalPrice')?.value).toBe(5000);
    });

    it('save() updates by id', async () => {
      service.updateFrame.and.returnValue(Promise.resolve(makeFrame()));
      await component.save();
      expect(service.updateFrame).toHaveBeenCalledWith('f1', jasmine.objectContaining({ code: 'WOOD' }));
      expect(snack.success).toHaveBeenCalled();
    });
  });

  it('cancel() closes with no result', () => {
    setup(null);
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
