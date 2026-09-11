// frontend/src/app/features/admin/artists/admin-artists.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminArtistsComponent } from './admin-artists.component';
import { AdminArtistsService, type AdminArtist } from './admin-artists.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeArtist(overrides: Partial<AdminArtist> = {}): AdminArtist {
  return {
    id: 'ar1',
    slug: 'ash',
    birthYear: null,
    deathYear: null,
    portraitPath: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [
      { locale: 'EN', name: 'Ash EN' },
      { locale: 'HY', name: 'Ash HY' },
    ],
    ...overrides,
  };
}

describe('AdminArtistsComponent', () => {
  let fixture: ComponentFixture<AdminArtistsComponent>;
  let component: AdminArtistsComponent;
  let service: jasmine.SpyObj<AdminArtistsService>;
  let dialogOpen: jasmine.Spy;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let localeServer: ReturnType<typeof signal<'EN' | 'HY' | 'RU'>>;

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminArtistsService>('AdminArtistsService', ['list', 'create', 'update', 'remove']);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    localeServer = signal<'EN' | 'HY' | 'RU'>('EN');
    service.list.and.returnValue(Promise.resolve([makeArtist()]));

    const i18nStub = {
      locale: signal('en'),
      t: (k: string) => k,
      localeServer,
    } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminArtistsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminArtistsService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(AdminArtistsComponent);
    component = fixture.componentInstance;
    // MatDialogModule provides MatDialog itself (not just providedIn: 'root'),
    // so a plain TestBed provider override is shadowed by the component's own
    // `imports: [MatDialogModule]`. Spy on the real instance instead.
    dialogOpen = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    fixture.detectChanges();
  });

  it('loads the artist list on construction', async () => {
    await fixture.whenStable();
    expect(service.list).toHaveBeenCalled();
    expect(component.artists().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('sets an error message when reload fails', async () => {
    service.list.and.returnValue(Promise.reject(new Error('network down')));
    await component.reload();
    expect(component.error()).toBe('network down');
    expect(component.loading()).toBeFalse();
  });

  describe('nameFor', () => {
    it('prefers the name in the current server locale', () => {
      localeServer.set('HY');
      expect(component.nameFor(makeArtist())).toBe('Ash HY');
    });

    it('falls back to EN when the current locale has no translation', () => {
      localeServer.set('RU');
      expect(component.nameFor(makeArtist())).toBe('Ash EN');
    });

    it('falls back to the slug when neither locale nor EN exist', () => {
      const artist = makeArtist({ translations: [{ locale: 'HY', name: 'Only HY' }] });
      localeServer.set('RU');
      expect(component.nameFor(artist)).toBe('ash');
    });
  });

  describe('dialogs', () => {
    it('openCreate reloads the list when the dialog reports reload:true', async () => {
      dialogOpen.and.returnValue({ afterClosed: () => of({ reload: true }) } as never);
      service.list.calls.reset();
      component.openCreate();
      await fixture.whenStable();
      expect(service.list).toHaveBeenCalled();
    });

    it('openCreate does not reload when the dialog is dismissed without reload', async () => {
      dialogOpen.and.returnValue({ afterClosed: () => of(undefined) } as never);
      service.list.calls.reset();
      component.openCreate();
      await fixture.whenStable();
      expect(service.list).not.toHaveBeenCalled();
    });

    it('openEdit passes the row as dialog data', () => {
      dialogOpen.and.returnValue({ afterClosed: () => of(undefined) } as never);
      const row = makeArtist();
      component.openEdit(row);
      expect(dialogOpen).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: row }),
      );
    });
  });

  describe('remove', () => {
    it('does nothing when the user cancels the confirm dialog', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await component.remove(makeArtist());
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('removes, shows a success toast, and reloads on confirm', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.remove.and.returnValue(Promise.resolve());
      service.list.calls.reset();
      service.list.and.returnValue(Promise.resolve([]));
      await component.remove(makeArtist());
      expect(service.remove).toHaveBeenCalledWith('ar1');
      expect(snack.success).toHaveBeenCalled();
      expect(service.list).toHaveBeenCalled();
    });

    it('swallows a failed removal (errorInterceptor shows the toast)', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.remove.and.returnValue(Promise.reject(new Error('409 ARTIST_IN_USE')));
      await expectAsync(component.remove(makeArtist())).toBeResolved();
      expect(snack.success).not.toHaveBeenCalled();
    });
  });
});
