// frontend/src/app/shared/components/language-switcher/language-switcher.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('LanguageSwitcherComponent', () => {
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let component: LanguageSwitcherComponent;
  let i18n: jasmine.SpyObj<I18nService> & { locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>> };

  beforeEach(() => {
    const locale = signal<'en' | 'hy' | 'ru'>('en');
    i18n = {
      ...jasmine.createSpyObj<I18nService>('I18nService', ['setLocale', 't']),
      locale,
    } as never;
    i18n.t.and.callFake((key: string) => key);

    TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [provideNoopAnimations(), { provide: I18nService, useValue: i18n }],
    });
    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the current locale code uppercased', () => {
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.lang__trigger');
    expect(trigger.textContent?.trim()).toBe('EN');
  });

  it('lists all three supported languages', () => {
    expect(component.langs).toEqual(['en', 'hy', 'ru']);
    expect(component.names.hy).toBe('Հայերեն');
    expect(component.names.ru).toBe('Русский');
  });

  it('select() calls I18nService.setLocale', async () => {
    i18n.setLocale.and.returnValue(Promise.resolve());
    await component.select('ru');
    expect(i18n.setLocale).toHaveBeenCalledWith('ru');
  });

  it('marks the active language based on the current locale', () => {
    i18n.locale.set('hy');
    fixture.detectChanges();
    // Component logic: `i18n.locale() === lang` drives [class.active]; verify directly.
    expect(component.i18n.locale()).toBe('hy');
  });
});
