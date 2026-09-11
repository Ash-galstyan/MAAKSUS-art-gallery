// frontend/src/app/features/admin/artists/admin-artist-edit-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminArtistEditDialogComponent } from './admin-artist-edit-dialog.component';
import { AdminArtistsService, type AdminArtist } from './admin-artists.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeArtist(): AdminArtist {
  return {
    id: 'ar1',
    slug: 'ash',
    birthYear: 1990,
    deathYear: null,
    portraitPath: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [
      { locale: 'EN', name: 'Ash', bio: 'An artist' },
      { locale: 'HY', name: 'Աշ' },
    ],
  };
}

describe('AdminArtistEditDialogComponent', () => {
  let fixture: ComponentFixture<AdminArtistEditDialogComponent>;
  let component: AdminArtistEditDialogComponent;
  let service: jasmine.SpyObj<AdminArtistsService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminArtistEditDialogComponent>>;

  function setup(data: AdminArtist | null) {
    service = jasmine.createSpyObj<AdminArtistsService>('AdminArtistsService', ['create', 'update']);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AdminArtistEditDialogComponent>>('MatDialogRef', ['close']);
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminArtistEditDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminArtistsService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AdminArtistEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => setup(null));

    it('isEdit is false and the form starts empty', () => {
      expect(component.isEdit()).toBeFalse();
      expect(component.form.get('slug')?.value).toBe('');
    });

    it('the form is invalid until slug and an EN name are filled', () => {
      expect(component.form.invalid).toBeTrue();
      component.form.get('slug')?.setValue('ash');
      component.translationsArray.at(0).get('name')?.setValue('Ash');
      expect(component.form.valid).toBeTrue();
    });

    it('rejects a slug with invalid characters', () => {
      component.form.get('slug')?.setValue('Ash Galstyan!');
      expect(component.form.get('slug')?.invalid).toBeTrue();
    });

    it('save() marks all as touched and does not call the service when invalid', async () => {
      await component.save();
      expect(service.create).not.toHaveBeenCalled();
      expect(component.form.get('slug')?.touched).toBeTrue();
    });

    it('save() creates the artist, filtering translations with a blank name', async () => {
      component.form.get('slug')?.setValue('ash');
      component.form.get('birthYear')?.setValue(1990);
      component.translationsArray.at(0).patchValue({ name: 'Ash', bio: 'Bio EN' });
      // HY/RU left blank -> should be filtered out.
      service.create.and.returnValue(Promise.resolve(makeArtist()));

      await component.save();

      expect(service.create).toHaveBeenCalledWith({
        slug: 'ash',
        birthYear: 1990,
        deathYear: undefined,
        translations: [{ locale: 'EN', name: 'Ash', bio: 'Bio EN' }],
      });
      expect(snack.success).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
      expect(component.saving()).toBeFalse();
    });

    it('converts a blank bio to undefined', async () => {
      component.form.get('slug')?.setValue('ash');
      component.translationsArray.at(0).patchValue({ name: 'Ash', bio: '' });
      service.create.and.returnValue(Promise.resolve(makeArtist()));
      await component.save();
      expect(service.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ translations: [{ locale: 'EN', name: 'Ash', bio: undefined }] }),
      );
    });

    it('does not close the dialog when create() fails', async () => {
      component.form.get('slug')?.setValue('ash');
      component.translationsArray.at(0).patchValue({ name: 'Ash' });
      service.create.and.returnValue(Promise.reject(new Error('boom')));
      await component.save();
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('cancel() closes with no result', () => {
      component.cancel();
      expect(dialogRef.close).toHaveBeenCalledWith(undefined);
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup(makeArtist()));

    it('isEdit is true and the form is pre-filled', () => {
      expect(component.isEdit()).toBeTrue();
      expect(component.form.get('slug')?.value).toBe('ash');
      expect(component.translationsArray.at(0).get('name')?.value).toBe('Ash');
    });

    it('save() updates the existing artist by id', async () => {
      service.update.and.returnValue(Promise.resolve(makeArtist()));
      await component.save();
      expect(service.update).toHaveBeenCalledWith(
        'ar1',
        jasmine.objectContaining({ slug: 'ash' }),
      );
      expect(snack.success).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });
  });
});
