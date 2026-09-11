// frontend/src/app/features/admin/categories/admin-categories.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminCategoriesComponent } from './admin-categories.component';
import { AdminCategoriesService, type AdminCategory } from './admin-categories.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeCategory(overrides: Partial<AdminCategory> = {}): AdminCategory {
  return {
    id: 'c1',
    slug: 'landscape',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    translations: [
      { locale: 'EN', name: 'Landscape' },
      { locale: 'HY', name: 'Բնանկար' },
    ],
    ...overrides,
  };
}

describe('AdminCategoriesComponent', () => {
  let fixture: ComponentFixture<AdminCategoriesComponent>;
  let component: AdminCategoriesComponent;
  let service: jasmine.SpyObj<AdminCategoriesService>;
  let dialogOpen: jasmine.Spy;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let localeServer: ReturnType<typeof signal<'EN' | 'HY' | 'RU'>>;

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminCategoriesService>('AdminCategoriesService', [
      'list',
      'create',
      'update',
      'remove',
    ]);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    localeServer = signal<'EN' | 'HY' | 'RU'>('EN');
    service.list.and.returnValue(Promise.resolve([makeCategory()]));

    const i18nStub = { locale: signal('en'), t: (k: string) => k, localeServer } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminCategoriesComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminCategoriesService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(AdminCategoriesComponent);
    component = fixture.componentInstance;
    // MatDialogModule provides MatDialog itself, which shadows a plain
    // TestBed provider override — spy on the real instance instead.
    dialogOpen = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    fixture.detectChanges();
  });

  it('loads categories on construction', async () => {
    await fixture.whenStable();
    expect(component.categories().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('sets an error message when reload fails', async () => {
    service.list.and.returnValue(Promise.reject(new Error('down')));
    await component.reload();
    expect(component.error()).toBe('down');
  });

  it('nameFor prefers the current locale translation when present', () => {
    localeServer.set('HY');
    expect(component.nameFor(makeCategory())).toBe('Բնանկար');
  });

  it('nameFor falls back to EN when the current locale has no translation', () => {
    localeServer.set('RU');
    expect(component.nameFor(makeCategory())).toBe('Landscape');
  });

  it('nameFor falls back to the slug when neither the current locale nor EN exist', () => {
    const onlyHy = makeCategory({ translations: [{ locale: 'HY', name: 'Only HY' }] });
    localeServer.set('RU');
    expect(component.nameFor(onlyHy)).toBe('landscape');
  });

  it('localeSummary lists translation locales sorted and joined', () => {
    const cat = makeCategory({
      translations: [
        { locale: 'RU', name: 'Пейзаж' },
        { locale: 'EN', name: 'Landscape' },
      ],
    });
    expect(component.localeSummary(cat)).toBe('EN · RU');
  });

  it('openCreate reloads on reload:true', async () => {
    dialogOpen.and.returnValue({ afterClosed: () => of({ reload: true }) } as never);
    service.list.calls.reset();
    component.openCreate();
    await fixture.whenStable();
    expect(service.list).toHaveBeenCalled();
  });

  it('openEdit passes the row as dialog data', () => {
    dialogOpen.and.returnValue({ afterClosed: () => of(undefined) } as never);
    const row = makeCategory();
    component.openEdit(row);
    expect(dialogOpen).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({ data: row }));
  });

  describe('remove', () => {
    it('does nothing when the confirm dialog is cancelled', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await component.remove(makeCategory());
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('removes, toasts, and reloads on confirm', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.remove.and.returnValue(Promise.resolve());
      await component.remove(makeCategory());
      expect(service.remove).toHaveBeenCalledWith('c1');
      expect(snack.success).toHaveBeenCalled();
    });

    it('swallows a failed removal (409 CATEGORY_IN_USE handled by the interceptor)', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.remove.and.returnValue(Promise.reject(new Error('409')));
      await expectAsync(component.remove(makeCategory())).toBeResolved();
    });
  });
});
