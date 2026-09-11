// frontend/src/app/features/admin/artworks/admin-artwork-edit-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminArtworkEditDialogComponent } from './admin-artwork-edit-dialog.component';
import { AdminArtworksService, type AdminArtwork, type AdminArtworkImage } from './admin-artworks.service';
import { AdminCategoriesService, type AdminCategory } from '../categories/admin-categories.service';
import { AdminArtistsService, type AdminArtist } from '../artists/admin-artists.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeArtwork(overrides: Partial<AdminArtwork> = {}): AdminArtwork {
  return {
    id: 'a1',
    slug: 'sunset',
    artistId: 'ar1',
    categoryId: 'c1',
    year: 2020,
    medium: 'Oil',
    widthCm: '40.5',
    heightCm: 30,
    basePrice: '10000',
    isAvailable: true,
    deletedAt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [{ locale: 'EN', title: 'Sunset' }],
    images: [],
    artist: { id: 'ar1', slug: 'ash', translations: [{ locale: 'EN', name: 'Ash' }] },
    category: { id: 'c1', slug: 'landscape', translations: [{ locale: 'EN', name: 'Landscape' }] },
    ...overrides,
  };
}

const artistOption: AdminArtist = {
  id: 'ar1',
  slug: 'ash',
  birthYear: null,
  deathYear: null,
  portraitPath: null,
  createdAt: '',
  updatedAt: '',
  translations: [{ locale: 'EN', name: 'Ash' }],
};
const categoryOption: AdminCategory = {
  id: 'c1',
  slug: 'landscape',
  createdAt: '',
  updatedAt: '',
  translations: [{ locale: 'EN', name: 'Landscape' }],
};

describe('AdminArtworkEditDialogComponent', () => {
  let fixture: ComponentFixture<AdminArtworkEditDialogComponent>;
  let component: AdminArtworkEditDialogComponent;
  let service: jasmine.SpyObj<AdminArtworksService>;
  let artistsApi: jasmine.SpyObj<AdminArtistsService>;
  let categoriesApi: jasmine.SpyObj<AdminCategoriesService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminArtworkEditDialogComponent>>;

  function setup(data: AdminArtwork | null) {
    service = jasmine.createSpyObj<AdminArtworksService>('AdminArtworksService', [
      'create',
      'update',
      'uploadImage',
      'removeImage',
    ]);
    artistsApi = jasmine.createSpyObj<AdminArtistsService>('AdminArtistsService', ['list']);
    categoriesApi = jasmine.createSpyObj<AdminCategoriesService>('AdminCategoriesService', ['list']);
    artistsApi.list.and.returnValue(Promise.resolve([artistOption]));
    categoriesApi.list.and.returnValue(Promise.resolve([categoryOption]));
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AdminArtworkEditDialogComponent>>('MatDialogRef', ['close']);
    const i18nStub = {
      locale: signal('en'),
      t: (k: string) => k,
      localeServer: signal('EN'),
    } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminArtworkEditDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminArtworksService, useValue: service },
        { provide: AdminArtistsService, useValue: artistsApi },
        { provide: AdminCategoriesService, useValue: categoriesApi },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AdminArtworkEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => setup(null));

    it('loads artist/category picker options', async () => {
      await fixture.whenStable();
      expect(component.artists()).toEqual([artistOption]);
      expect(component.categories()).toEqual([categoryOption]);
    });

    it('isEdit is false and the images-after-save hint applies', () => {
      expect(component.isEdit()).toBeFalse();
    });

    it('save() marks touched and skips the API call while invalid', async () => {
      await component.save();
      expect(service.create).not.toHaveBeenCalled();
      expect(component.form.get('slug')?.touched).toBeTrue();
    });

    it('save() creates the artwork, flips to edit mode, and keeps the dialog open', async () => {
      component.form.patchValue({ slug: 'sunset', artistId: 'ar1', categoryId: 'c1', basePrice: 10000 });
      component.translationsArray.at(0).get('title')?.setValue('Sunset');
      service.create.and.returnValue(Promise.resolve(makeArtwork()));

      await component.save();

      expect(service.create).toHaveBeenCalled();
      expect(component.isEdit()).toBeTrue();
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(snack.success).toHaveBeenCalled();
    });

    it('filters out translations with a blank title and omits optional fields when blank', async () => {
      component.form.patchValue({ slug: 'sunset', artistId: 'ar1', categoryId: 'c1', basePrice: 10000 });
      component.translationsArray.at(0).patchValue({ title: 'Sunset', description: '' });
      service.create.and.returnValue(Promise.resolve(makeArtwork()));

      await component.save();

      const input = service.create.calls.mostRecent().args[0];
      expect(input.translations.length).toBe(1);
      expect(input.translations[0].description).toBeUndefined();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup(makeArtwork()));

    it('normalises string Decimal fields (widthCm, basePrice) to numbers', () => {
      expect(component.form.get('widthCm')?.value).toBe(40.5);
      expect(component.form.get('basePrice')?.value).toBe(10000);
    });

    it('save() updates and closes with reload:true', async () => {
      service.update.and.returnValue(Promise.resolve(makeArtwork()));
      await component.save();
      expect(service.update).toHaveBeenCalledWith('a1', jasmine.any(Object));
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });

    describe('uploadStaged', () => {
      it('is a no-op when there are no staged files', async () => {
        await component.uploadStaged();
        expect(service.uploadImage).not.toHaveBeenCalled();
      });

      it('uploads each staged file and marks only the first as primary when requested', async () => {
        const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
        const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
        component.stagedFiles.set([fileA, fileB]);
        component.setNextPrimary.set(true);
        const imgA: AdminArtworkImage = { id: 'imgA', thumbnailPath: 'a-t.jpg', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: true, position: 0 };
        const imgB: AdminArtworkImage = { id: 'imgB', thumbnailPath: 'b-t.jpg', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: false, position: 1 };
        service.uploadImage.and.callFake((_id, file) =>
          Promise.resolve(file === fileA ? imgA : imgB),
        );

        await component.uploadStaged();

        expect(service.uploadImage).toHaveBeenCalledWith('a1', fileA, { primary: true });
        expect(service.uploadImage).toHaveBeenCalledWith('a1', fileB, { primary: false });
        expect(component.existingImages().map((i) => i.id)).toEqual(['imgA', 'imgB']);
        expect(component.existingImages().find((i) => i.id === 'imgA')?.isPrimary).toBeTrue();
        expect(component.stagedFiles()).toEqual([]);
        expect(component.setNextPrimary()).toBeFalse();
        expect(snack.success).toHaveBeenCalled();
      });

      it('demotes previously-primary existing images when a new one is promoted', async () => {
        component.existingImages.set([
          { id: 'old', thumbnailPath: '', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: true, position: 0 },
        ]);
        component.stagedFiles.set([new File(['a'], 'a.jpg', { type: 'image/jpeg' })]);
        component.setNextPrimary.set(true);
        const newImg: AdminArtworkImage = { id: 'new', thumbnailPath: '', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: true, position: 1 };
        service.uploadImage.and.returnValue(Promise.resolve(newImg));

        await component.uploadStaged();

        const byId = Object.fromEntries(component.existingImages().map((i) => [i.id, i.isPrimary]));
        expect(byId['old']).toBeFalse();
        expect(byId['new']).toBeTrue();
      });
    });

    describe('deleteImage', () => {
      const img: AdminArtworkImage = { id: 'i1', thumbnailPath: '', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: true, position: 0 };

      it('does nothing when the confirm dialog is cancelled', async () => {
        spyOn(window, 'confirm').and.returnValue(false);
        await component.deleteImage(img);
        expect(service.removeImage).not.toHaveBeenCalled();
      });

      it('removes the image and auto-promotes the next one when the primary was deleted', async () => {
        component.existingImages.set([
          img,
          { id: 'i2', thumbnailPath: '', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: false, position: 1 },
        ]);
        spyOn(window, 'confirm').and.returnValue(true);
        service.removeImage.and.returnValue(Promise.resolve());

        await component.deleteImage(img);

        expect(service.removeImage).toHaveBeenCalledWith('a1', 'i1');
        expect(component.existingImages().length).toBe(1);
        expect(component.existingImages()[0].isPrimary).toBeTrue();
      });
    });

    it('done() closes the dialog with reload:true', () => {
      component.done();
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });

    it('cancel() reloads if images changed since the dialog opened', () => {
      component.existingImages.set([
        { id: 'new', thumbnailPath: '', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: true, position: 0 },
      ]);
      component.cancel();
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: true });
    });

    it('cancel() does not force a reload when nothing changed', () => {
      component.cancel();
      expect(dialogRef.close).toHaveBeenCalledWith({ reload: false });
    });
  });
});
