// frontend/src/app/app.component.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterOutlet } from '@angular/router';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { I18nService } from './core/i18n/i18n.service';

@Component({ selector: 'app-header', standalone: true, template: '' })
class StubHeader {}

@Component({ selector: 'app-footer', standalone: true, template: '' })
class StubFooter {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let ready: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    ready = signal(false);
    const i18nStub = { ready } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: I18nService, useValue: i18nStub }],
    }).overrideComponent(AppComponent, {
      set: { imports: [RouterOutlet, StubHeader, StubFooter] },
    });
    void HeaderComponent;
    void FooterComponent;

    fixture = TestBed.createComponent(AppComponent);
  });

  it('shows the boot placeholder while i18n is not ready', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.boot')).toBeTruthy();
    expect(el.querySelector('app-header')).toBeFalsy();
  });

  it('shows header, routed content, and footer once i18n is ready', () => {
    ready.set(true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.boot')).toBeFalsy();
    expect(el.querySelector('app-header')).toBeTruthy();
    expect(el.querySelector('app-footer')).toBeTruthy();
    expect(el.querySelector('router-outlet, main.content')).toBeTruthy();
  });
});
