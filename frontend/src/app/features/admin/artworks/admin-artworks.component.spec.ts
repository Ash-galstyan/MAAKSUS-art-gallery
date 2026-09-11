// frontend/src/app/features/admin/artworks/admin-artworks.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminArtworksComponent } from './admin-artworks.component';
import { AdminArtworksService, type AdminArtwork } from './admin-artworks.service';
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
    widthCm: 40,
    heightCm: 30,
    basePrice: 10000,
    isAvailable: true,
    deletedAt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [{ locale: 'EN', title: 'Sunset' }],
    images: [
      { id: 'i1', thumbnailPath: 't1.jpg', mediumPath: 'm1.jpg', originalPath: 'o1.jpg', width: 800, height: 600, isPrimary: false, position: 0 },
      { id: 'i2', thumbnailPath: 't2.jpg', mediumPath: 'm2.jpg', originalPath: 'o2.jpg', width: 800, height: 600, isPrimary: true, position: 1 },
    ],
    artist: { id: 'ar1', slug: 'ash', translations: [{ locale: 'EN', name: 'Ash' }] },
    category: { id: 'c1', slug: 'landscape', translations: [{ locale: 'EN', name: 'Landscape' }] },
    ...overrides,
  };
}

describe('AdminArtworksComponent', () => {
  let fixture: ComponentFixture<AdminArtworksComponent>;
  let component: AdminArtworksComponent;
  let service: jasmine.SpyObj<AdminArtworksService>;
  let dialogOpen: jasmine.Spy;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let localeServer: ReturnType<typeof signal<'EN' | 'HY' | 'RU'>>;

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminArtworksService>('AdminArtworksService', [
      'list',
      'remove',
      'setAvailability',
    ]);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    localeServer = signal<'EN' | 'HY' | 'RU'>('EN');
    service.list.and.returnValue(
      Promise.resolve([makeArtwork(), makeArtwork({ id: 'a2', deletedAt: '2026-01-02' })]),
    );

    const i18nStub = { locale: signal('en'), t: (k: string) => k, localeServer } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminArtworksComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminArtworksService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(AdminArtworksComponent);
    component = fixture.componentInstance;
    // MatDialogModule provides MatDialog itself, which shadows a plain
    // TestBed provider override — spy on the real instance instead.
    dialogOpen = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    fixture.detectChanges();
  });

  it('loads artworks on construction', async () => {
    await fixture.whenStable();
    expect(component.artworks().length).toBe(2);
  });

  describe('visible / hideDeleted', () => {
    it('hides soft-deleted rows by default', async () => {
      await fixture.whenStable();
      expect(component.hideDeleted()).toBeTrue();
      expect(component.visible().length).toBe(1);
      expect(component.visible()[0].id).toBe('a1');
    });

    it('shows all rows when hideDeleted is false', async () => {
      await fixture.whenStable();
      component.hideDeleted.set(false);
      expect(component.visible().length).toBe(2);
    });
  });

  it('primaryThumb prefers the isPrimary image, falling back to the first', () => {
    expect(component.primaryThumb(makeArtwork())).toBe('t2.jpg');
    const noPrimary = makeArtwork({
      images: [{ id: 'i1', thumbnailPath: 'only.jpg', mediumPath: '', originalPath: '', width: 1, height: 1, isPrimary: false, position: 0 }],
    });
    expect(component.primaryThumb(noPrimary)).toBe('only.jpg');
    expect(component.primaryThumb(makeArtwork({ images: [] }))).toBeNull();
  });

  describe('name resolution', () => {
    it('titleFor/artistName/categoryName prefer the current locale then EN then slug', () => {
      const row = makeArtwork();
      localeServer.set('RU'); // no RU translation anywhere -> falls back to EN
      expect(component.titleFor(row)).toBe('Sunset');
      expect(component.artistName(row)).toBe('Ash');
      expect(component.categoryName(row)).toBe('Landscape');
    });

    it('falls back to the slug when neither locale nor EN exist', () => {
      const row = makeArtwork({
        translations: [{ locale: 'HY', title: 'Only HY' }],
        artist: { id: 'ar1', slug: 'ash-slug', translations: [{ locale: 'HY', name: 'Only HY' }] },
        category: { id: 'c1', slug: 'cat-slug', translations: [{ locale: 'HY', name: 'Only HY' }] },
      });
      localeServer.set('RU');
      expect(component.titleFor(row)).toBe('sunset');
      expect(component.artistName(row)).toBe('ash-slug');
      expect(component.categoryName(row)).toBe('cat-slug');
    });
  });

  describe('toggleAvailability', () => {
    it('optimistically flips availability and confirms with a toast on success', async () => {
      await fixture.whenStable();
      service.setAvailability.and.returnValue(Promise.resolve());
      const row = component.artworks()[0];

      const promise = component.toggleAvailability(row, false);
      expect(component.artworks()[0].isAvailable).toBeFalse(); // optimistic
      await promise;

      expect(service.setAvailability).toHaveBeenCalledWith('a1', false);
      expect(snack.success).toHaveBeenCalled();
    });

    it('rolls back on failure', async () => {
      await fixture.whenStable();
      service.setAvailability.and.returnValue(Promise.reject(new Error('boom')));
      const row = component.artworks()[0];

      await component.toggleAvailability(row, false);

      expect(component.artworks()[0].isAvailable).toBeTrue(); // rolled back
      expect(snack.success).not.toHaveBeenCalled();
    });
  });

  describe('dialogs', () => {
    it('openCreate opens the dialog with disableClose and reloads on reload:true', async () => {
      dialogOpen.and.returnValue({ afterClosed: () => of({ reload: true }) } as never);
      service.list.calls.reset();
      component.openCreate();
      await fixture.whenStable();
      expect(dialogOpen).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: null, disableClose: true }),
      );
      expect(service.list).toHaveBeenCalled();
    });

    it('openEdit passes the row as data', () => {
      dialogOpen.and.returnValue({ afterClosed: () => of(undefined) } as never);
      const row = makeArtwork();
      component.openEdit(row);
      expect(dialogOpen).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({ data: row }));
    });
  });

  describe('remove', () => {
    it('is a no-op when the confirm dialog is cancelled', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await component.remove(makeArtwork());
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('removes, toasts, and reloads on confirm', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.remove.and.returnValue(Promise.resolve());
      await component.remove(makeArtwork());
      expect(service.remove).toHaveBeenCalledWith('a1');
      expect(snack.success).toHaveBeenCalled();
    });
  });
});
