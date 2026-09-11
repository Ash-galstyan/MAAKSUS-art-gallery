// frontend/src/app/features/account/profile.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    const i18nStub = { locale: signal('en'), t: (key: string) => key } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates with empty profile and password forms', () => {
    expect(component.profileForm.value).toEqual({ firstName: '', lastName: '', phone: '' });
    expect(component.passwordForm.valid).toBeFalse();
  });

  it('logout() calls AuthService.logout then navigates home', async () => {
    auth.logout.and.returnValue(Promise.resolve());
    await component.logout();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('saveProfile() and changePassword() are stubs that do not throw', () => {
    expect(() => component.saveProfile()).not.toThrow();
    expect(() => component.changePassword()).not.toThrow();
  });

  it('renders the three placeholder sections', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('section.panel');
    expect(cards.length).toBe(3);
  });
});
