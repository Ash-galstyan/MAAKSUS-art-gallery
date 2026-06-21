// frontend/src/app/core/i18n/i18n.service.ts
/**
 * i18n service.
 *
 * Loads `/assets/i18n/<lang>.json` once per language and caches it.
 * Exposes:
 *   - locale()         : signal<'en' | 'hy' | 'ru'>
 *   - localeServer()   : computed signal mapping to backend's 'EN'|'HY'|'RU'
 *   - ready()          : signal<boolean> — true once the current locale is loaded
 *   - setLocale(lang)  : load + switch language, persist to localStorage
 *   - t(key, params?)  : resolve a translation by dot-path; falls back to key
 *
 * Format example:  i18n.t('auth.login.title')
 *                  i18n.t('cart.itemsCount', { count: 3 })  // "3 items"
 *
 * Param interpolation is {{name}} style. Missing keys return the key
 * itself so the UI never shows blank — easier to spot missing strings.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Locale } from '../api-models/user.model';

type Lang = (typeof environment.supportedLocales)[number]; // 'en' | 'hy' | 'ru'

const STORAGE_KEY = 'gallery.locale';

type Bundle = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);

  private readonly bundles = new Map<Lang, Bundle>();
  private readonly _locale = signal<Lang>(this.readInitialLocale());
  private readonly _ready = signal(false);

  readonly locale = this._locale.asReadonly();
  readonly ready = this._ready.asReadonly();

  /** Backend expects 'EN'|'HY'|'RU' — derived so callers don't have to map. */
  readonly localeServer = computed<Locale>(() => this._locale().toUpperCase() as Locale);

  /** Call once at bootstrap before the first render that needs strings. */
  async init(): Promise<void> {
    await this.loadBundle(this._locale());
    this._ready.set(true);
  }

  async setLocale(lang: Lang): Promise<void> {
    if (lang === this._locale()) return;
    await this.loadBundle(lang);
    this._locale.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  }

  /**
   * Translate a key. `params` interpolates `{{name}}` placeholders.
   * Returns the key unchanged if missing — never returns null/empty.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const bundle = this.bundles.get(this._locale());
    const value = bundle ? this.resolvePath(bundle, key) : null;
    let out = typeof value === 'string' ? value : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        out = out.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return out;
  }

  private resolvePath(obj: Bundle, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return null;
    }, obj);
  }

  private async loadBundle(lang: Lang): Promise<void> {
    if (this.bundles.has(lang)) return;
    const data = await firstValueFrom(this.http.get<Bundle>(`/assets/i18n/${lang}.json`));
    this.bundles.set(lang, data);
  }

  private readInitialLocale(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && (environment.supportedLocales as readonly string[]).includes(stored)) {
      return stored;
    }
    // Best-effort browser detection — fall back to default.
    const browser = navigator.language?.slice(0, 2).toLowerCase() as Lang;
    return (environment.supportedLocales as readonly string[]).includes(browser)
      ? browser
      : environment.defaultLocale;
  }
}
