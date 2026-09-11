// frontend/src/app/features/admin/categories/admin-category-edit-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminCategoryEditDialogComponent } from './admin-category-edit-dialog.component';
import { AdminCategoriesService, type AdminCategory } from './admin-categories.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeCategory(): AdminCategory {
  return {
    id: 'c1',
    slug: 'landscape',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [{ locale: 'EN', name: 'Landscape' }],
  };
}

describe('AdminCategoryEditDialogComponent', () => {
  let fixture: ComponentFixture<AdminCategoryEditDialogComponent>;
  let component: AdminCategoryEditDialogComponent;
  let service: jasmine.SpyObj<AdminCategoriesService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminCategoryEditDialogComponent>>;

  function setup(data: AdminCategory | null) {
    service = jasmine.createSpyObj<AdminCategoriesService>('AdminCategoriesService', ['create', 'update']);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AdminCategoryEditDialogComponent>>('MatDialogRef', ['close']);
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminCategoryEditDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminCategoriesService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AdminCategoryEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => setup(null));

    it('is invalid until slug + EN name are set', () => {
      expect(component.form.invalid).toBeTrue();
      component.form.get('slug')?.setValue('landscape');
      component.translationsArray.at(0).get('name')?.setValue('Landscape');
      expect(component.form.valid).toBeTrue();
    });

    it('save() does not call create() while invalid, and touches the form', async () => {
      await component.save();
      expect(service.create).not.toHaveBeenCalled();
      expect(component.form.get('slug')?.touched).toBeTrue();
    });

    it('save() creates with only non-blank translations', async () => {
      component.form.get('slug')?.setValue('landscape');
      component.translationsArray.at(0).get('name')?.setValue('Landscape');
      service.create.and.returnValue(Promise.resolve(makeCategory()));

      await component.save();

      expect(service.create).toHaveBeenCalledWith({
        slug: 'landscape',
        translations: [{ locale: 'EN', name: 'Landscape' }],
      });
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup(makeCategory()));

    it('pre-fills the form from the existing category', () => {
      expect(component.isEdit()).toBeTrue();
      expect(component.form.get('slug')?.value).toBe('landscape');
      expect(component.translationsArray.at(0).get('name')?.value).toBe('Landscape');
    });

    it('save() updates by id', async () => {
      service.update.and.returnValue(Promise.resolve(makeCategory()));
      await component.save();
      expect(service.update).toHaveBeenCalledWith('c1', {
        slug: 'landscape',
        translations: [{ locale: 'EN', name: 'Landscape' }],
      });
      expect(snack.success).toHaveBeenCalled();
    });
  });

  it('cancel() closes with no result', () => {
    setup(null);
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
