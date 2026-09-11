// frontend/src/app/features/admin/shared/translation-tabs.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { TranslationTabsComponent, type TranslationField } from './translation-tabs.component';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('TranslationTabsComponent', () => {
  let fixture: ComponentFixture<TranslationTabsComponent>;
  let component: TranslationTabsComponent;
  let fb: FormBuilder;
  let translations: FormArray;

  const fields: TranslationField[] = [
    { key: 'title', labelKey: 'admin.fields.title', required: true },
    { key: 'description', labelKey: 'admin.fields.description', multiline: true },
  ];

  beforeEach(() => {
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;
    TestBed.configureTestingModule({
      imports: [TranslationTabsComponent],
      providers: [provideNoopAnimations(), { provide: I18nService, useValue: i18nStub }],
    });
    fb = TestBed.inject(FormBuilder);
    translations = fb.array([
      fb.group({ locale: ['EN'], title: ['', Validators.required], description: [''] }),
      fb.group({ locale: ['HY'], title: ['', Validators.required], description: [''] }),
      fb.group({ locale: ['RU'], title: ['', Validators.required], description: [''] }),
    ]);

    fixture = TestBed.createComponent(TranslationTabsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('translations', translations);
    fixture.componentRef.setInput('fields', fields);
    fixture.detectChanges();
  });

  it('maps each FormArray control to a translationGroup', () => {
    expect(component.translationGroups().length).toBe(3);
  });

  it('renders one tab label per locale, in order', () => {
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.mdc-tab__text-label')).map((n) => n.textContent?.trim());
    expect(labels[0]).toContain('English');
    expect(labels[1]).toContain('Հայերեն');
    expect(labels[2]).toContain('Русский');
  });

  describe('localeLabel', () => {
    it('maps known locale codes to their display names', () => {
      expect(component.localeLabel('EN')).toBe('English');
      expect(component.localeLabel('HY')).toBe('Հայերեն');
      expect(component.localeLabel('RU')).toBe('Русский');
    });

    it('falls back to the raw code for an unknown locale', () => {
      expect(component.localeLabel('FR')).toBe('FR');
    });
  });

  describe('groupHasError', () => {
    it('is false for an invalid but untouched group', () => {
      const group = component.translationGroups()[0];
      expect(group.invalid).toBeTrue();
      expect(component.groupHasError(group)).toBeFalse();
    });

    it('is true once the group has been touched while invalid', () => {
      const group = component.translationGroups()[0];
      group.markAsTouched();
      expect(component.groupHasError(group)).toBeTrue();
    });

    it('is false for a touched, valid group', () => {
      const group = component.translationGroups()[0];
      group.get('title')!.setValue('Filled in');
      group.markAsTouched();
      expect(component.groupHasError(group)).toBeFalse();
    });
  });

  it('renders a textarea for multiline fields and an input for single-line fields', () => {
    // [formControlName] is a property binding, not a reflected HTML attribute,
    // so select on the static `matInput` attribute + tag name instead.
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('textarea[matInput]')).toBeTruthy();
    expect(el.querySelector('input[matInput]')).toBeTruthy();
  });
});
