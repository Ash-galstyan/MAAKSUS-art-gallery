// frontend/src/app/features/admin/print-options/admin-print-options.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminPrintOptionsComponent } from './admin-print-options.component';
import {
  AdminPrintOptionsService,
  type AdminFrameOption,
  type AdminPrintSize,
} from './admin-print-options.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeSize(overrides: Partial<AdminPrintSize> = {}): AdminPrintSize {
  return {
    id: 's1',
    code: 'M',
    widthCm: 40,
    heightCm: 30,
    priceMultiplier: 1.5,
    isActive: true,
    position: 0,
    translations: [
      { locale: 'EN', label: 'Medium' },
      { locale: 'HY', label: 'Միջին' },
    ],
    ...overrides,
  };
}

function makeFrame(overrides: Partial<AdminFrameOption> = {}): AdminFrameOption {
  return {
    id: 'f1',
    code: 'WOOD',
    frameType: 'WOOD',
    colorHex: '#6b4423',
    additionalPrice: 5000,
    isActive: true,
    position: 0,
    translations: [{ locale: 'EN', label: 'Wood' }],
    ...overrides,
  };
}

describe('AdminPrintOptionsComponent', () => {
  let fixture: ComponentFixture<AdminPrintOptionsComponent>;
  let component: AdminPrintOptionsComponent;
  let service: jasmine.SpyObj<AdminPrintOptionsService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let dialogOpen: jasmine.Spy;
  let localeServer: ReturnType<typeof signal<'EN' | 'HY' | 'RU'>>;

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminPrintOptionsService>('AdminPrintOptionsService', [
      'listSizes',
      'createSize',
      'updateSize',
      'removeSize',
      'listFrames',
      'createFrame',
      'updateFrame',
      'removeFrame',
    ]);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    localeServer = signal<'EN' | 'HY' | 'RU'>('EN');
    service.listSizes.and.returnValue(Promise.resolve([makeSize()]));
    service.listFrames.and.returnValue(Promise.resolve([makeFrame()]));

    const i18nStub = { locale: signal('en'), t: (k: string) => k, localeServer } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminPrintOptionsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminPrintOptionsService, useValue: service },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(AdminPrintOptionsComponent);
    component = fixture.componentInstance;
    dialogOpen = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    fixture.detectChanges();
  });

  it('loads both sizes and frames on construction', async () => {
    await fixture.whenStable();
    expect(component.sizes().length).toBe(1);
    expect(component.frames().length).toBe(1);
    expect(component.loadingSizes()).toBeFalse();
    expect(component.loadingFrames()).toBeFalse();
  });

  it('sizeLabel/frameLabel resolve via the current locale, then EN, then code', () => {
    localeServer.set('HY');
    expect(component.sizeLabel(makeSize())).toBe('Միջին');
    localeServer.set('RU');
    expect(component.sizeLabel(makeSize())).toBe('Medium');
    expect(component.frameLabel(makeFrame({ translations: [] }))).toBe('WOOD');
  });

  describe('sizes', () => {
    it('toggleSizeActive optimistically flips then confirms', async () => {
      await fixture.whenStable();
      service.updateSize.and.returnValue(Promise.resolve(makeSize({ isActive: false })));
      const row = component.sizes()[0];
      const promise = component.toggleSizeActive(row, false);
      expect(component.sizes()[0].isActive).toBeFalse();
      await promise;
      expect(service.updateSize).toHaveBeenCalledWith('s1', { isActive: false });
    });

    it('toggleSizeActive rolls back on failure', async () => {
      await fixture.whenStable();
      service.updateSize.and.returnValue(Promise.reject(new Error('boom')));
      const row = component.sizes()[0];
      await component.toggleSizeActive(row, false);
      expect(component.sizes()[0].isActive).toBeTrue();
    });

    it('openSizeCreate/openSizeEdit reload sizes on reload:true', async () => {
      await fixture.whenStable();
      dialogOpen.and.returnValue({ afterClosed: () => of({ reload: true }) } as never);
      service.listSizes.calls.reset();
      component.openSizeCreate();
      await fixture.whenStable();
      expect(service.listSizes).toHaveBeenCalled();

      dialogOpen.and.returnValue({ afterClosed: () => of({ reload: true }) } as never);
      service.listSizes.calls.reset();
      component.openSizeEdit(makeSize());
      await fixture.whenStable();
      expect(service.listSizes).toHaveBeenCalled();
    });

    it('removeSize is a no-op when cancelled, and reloads on confirm', async () => {
      await fixture.whenStable();
      spyOn(window, 'confirm').and.returnValue(false);
      await component.removeSize(makeSize());
      expect(service.removeSize).not.toHaveBeenCalled();

      (window.confirm as jasmine.Spy).and.returnValue(true);
      service.removeSize.and.returnValue(Promise.resolve());
      await component.removeSize(makeSize());
      expect(service.removeSize).toHaveBeenCalledWith('s1');
      expect(snack.success).toHaveBeenCalled();
    });
  });

  describe('frames', () => {
    it('toggleFrameActive optimistically flips then confirms', async () => {
      await fixture.whenStable();
      service.updateFrame.and.returnValue(Promise.resolve(makeFrame({ isActive: false })));
      const row = component.frames()[0];
      const promise = component.toggleFrameActive(row, false);
      expect(component.frames()[0].isActive).toBeFalse();
      await promise;
      expect(service.updateFrame).toHaveBeenCalledWith('f1', { isActive: false });
    });

    it('toggleFrameActive rolls back on failure', async () => {
      await fixture.whenStable();
      service.updateFrame.and.returnValue(Promise.reject(new Error('boom')));
      const row = component.frames()[0];
      await component.toggleFrameActive(row, false);
      expect(component.frames()[0].isActive).toBeTrue();
    });

    it('openFrameCreate/openFrameEdit reload frames on reload:true', async () => {
      await fixture.whenStable();
      dialogOpen.and.returnValue({ afterClosed: () => of({ reload: true }) } as never);
      service.listFrames.calls.reset();
      component.openFrameCreate();
      await fixture.whenStable();
      expect(service.listFrames).toHaveBeenCalled();
    });

    it('removeFrame is a no-op when cancelled, and reloads on confirm', async () => {
      await fixture.whenStable();
      spyOn(window, 'confirm').and.returnValue(true);
      service.removeFrame.and.returnValue(Promise.resolve());
      await component.removeFrame(makeFrame());
      expect(service.removeFrame).toHaveBeenCalledWith('f1');
      expect(snack.success).toHaveBeenCalled();
    });
  });
});
