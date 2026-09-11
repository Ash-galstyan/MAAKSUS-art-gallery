// frontend/src/app/layout/header/header.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatMenuTrigger } from '@angular/material/menu';
import { OverlayContainer } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../core/auth/auth.service';
import { CartStorageService } from '../../core/cart/cart-storage.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let authed: ReturnType<typeof signal<boolean>>;
  let isAdmin: ReturnType<typeof signal<boolean>>;
  let itemCount: ReturnType<typeof signal<number>>;
  let logoutSpy: jasmine.Spy;

  beforeEach(() => {
    authed = signal(false);
    isAdmin = signal(false);
    itemCount = signal(0);
    logoutSpy = jasmine.createSpy('logout').and.returnValue(Promise.resolve());

    const authStub = {
      isAuthenticated: authed,
      isAdmin,
      logout: logoutSpy,
    } as unknown as AuthService;
    const cartStub = { itemCount } as unknown as CartStorageService;
    const i18nStub = {
      locale: signal('en'),
      t: (k: string) => k,
      setLocale: () => Promise.resolve(),
    } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authStub },
        { provide: CartStorageService, useValue: cartStub },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows a login link when not authenticated', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[routerLink="/account/login"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="nav.account"]')).toBeFalsy();
  });

  it('shows the account menu trigger when authenticated', () => {
    authed.set(true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button[aria-label="nav.account"]')).toBeTruthy();
    expect(el.querySelector('a[routerLink="/account/login"]')).toBeFalsy();
  });

  // mat-menu content is attached via the CDK overlay once opened — queried
  // through OverlayContainer (the pattern Angular Material's own tests use).
  // IMPORTANT: <app-language-switcher> renders before the account button and
  // has its own [matMenuTriggerFor], so the trigger must be looked up via the
  // "Account" button specifically — a bare `By.directive(MatMenuTrigger))`
  // query matches the language switcher's trigger first.
  function accountMenuTrigger(): MatMenuTrigger {
    const button = fixture.debugElement.query(By.css('button[aria-label="nav.account"]'));
    return button.injector.get(MatMenuTrigger);
  }

  it('hides the admin link for a non-admin', fakeAsync(() => {
    authed.set(true);
    fixture.detectChanges();
    accountMenuTrigger().openMenu();
    fixture.detectChanges();
    tick(500);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('a[routerLink="/admin"]')).toBeFalsy();
  }));

  it('shows the admin link for an admin', fakeAsync(() => {
    authed.set(true);
    isAdmin.set(true);
    fixture.detectChanges();
    accountMenuTrigger().openMenu();
    fixture.detectChanges();
    tick(500);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('a[routerLink="/admin"]')).toBeTruthy();
  }));

  it('renders the embedded language switcher', () => {
    expect(fixture.nativeElement.querySelector('app-language-switcher')).toBeTruthy();
  });

  it('logout() delegates to AuthService.logout', async () => {
    await component.logout();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
