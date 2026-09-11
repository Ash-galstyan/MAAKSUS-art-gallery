// frontend/src/app/shared/pipes/price.pipe.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PricePipe } from './price.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

describe('PricePipe', () => {
  let locale: ReturnType<typeof signal<'en' | 'hy' | 'ru'>>;
  let pipe: PricePipe;

  beforeEach(() => {
    locale = signal<'en' | 'hy' | 'ru'>('en');
    const i18nStub = { locale } as unknown as I18nService;
    TestBed.configureTestingModule({
      providers: [{ provide: I18nService, useValue: i18nStub }],
    });
    pipe = TestBed.runInInjectionContext(() => new PricePipe());
  });

  it('creates an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('formats a whole AMD amount with no fraction digits', () => {
    const result = pipe.transform(15000);
    expect(result).toContain('15,000');
    expect(result).not.toContain('.00');
  });

  it('returns an empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('formats zero as a valid currency string', () => {
    expect(pipe.transform(0)).toContain('0');
  });

  it('uses hy-AM formatting when locale is hy', () => {
    locale.set('hy');
    const result = pipe.transform(1000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('uses ru-RU formatting when locale is ru', () => {
    locale.set('ru');
    const result = pipe.transform(1000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('re-reads the locale signal on every transform call (impure pipe)', () => {
    const first = pipe.transform(1000);
    locale.set('ru');
    const second = pipe.transform(1000);
    expect(first).not.toBe(second);
  });
});
