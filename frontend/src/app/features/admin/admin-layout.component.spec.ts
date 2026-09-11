// frontend/src/app/features/admin/admin-layout.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminLayoutComponent } from './admin-layout.component';
import { I18nService } from '../../core/i18n/i18n.service';

describe('AdminLayoutComponent', () => {
  let fixture: ComponentFixture<AdminLayoutComponent>;

  beforeEach(() => {
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;
    TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([]), provideNoopAnimations(), { provide: I18nService, useValue: i18nStub }],
    });
    fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
  });

  it('renders a nav link for every admin section', () => {
    const el: HTMLElement = fixture.nativeElement;
    for (const path of ['artworks', 'categories', 'artists', 'print-options', 'orders', 'users']) {
      expect(el.querySelector(`a[routerLink="${path}"]`)).withContext(path).toBeTruthy();
    }
  });

  it('renders a router outlet for child routes', () => {
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
