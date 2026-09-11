// frontend/src/app/layout/footer/footer.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { FooterComponent } from './footer.component';
import { I18nService } from '../../core/i18n/i18n.service';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;
  let t: jasmine.Spy;

  beforeEach(() => {
    t = jasmine.createSpy('t').and.callFake((key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    );
    const i18nStub = { locale: signal('en'), t } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([]), { provide: I18nService, useValue: i18nStub }],
    });
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sets year to the current calendar year', () => {
    expect(component.year).toBe(new Date().getFullYear());
  });

  it('passes the year into the rights translation', () => {
    expect(t).toHaveBeenCalledWith('footer.rights', { year: component.year });
  });

  it('renders contact and terms links (placeholders to "/" — no dedicated routes yet)', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = Array.from(el.querySelectorAll('a[routerLink="/"]')).map((a) => a.textContent?.trim());
    expect(links).toContain('footer.linkContact');
    expect(links).toContain('footer.terms');
  });
});
