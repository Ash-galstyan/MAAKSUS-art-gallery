// frontend/src/app/features/admin/users/admin-users.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AdminUsersComponent } from './admin-users.component';
import { AdminUsersService, type AdminUser } from './admin-users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminSnackbarService } from '../shared/admin-snackbar.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { AuthUser } from '../../../core/api-models/user.model';

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u1',
    email: 'a@b.com',
    firstName: 'Ash',
    lastName: 'G',
    phone: null,
    role: 'USER',
    status: 'ACTIVE',
    locale: 'EN',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let component: AdminUsersComponent;
  let service: jasmine.SpyObj<AdminUsersService>;
  let snack: jasmine.SpyObj<AdminSnackbarService>;
  let currentUser: ReturnType<typeof signal<AuthUser | null>>;

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminUsersService>('AdminUsersService', ['list', 'detail', 'setStatus']);
    snack = jasmine.createSpyObj<AdminSnackbarService>('AdminSnackbarService', ['success', 'error', 'info']);
    currentUser = signal<AuthUser | null>({
      id: 'admin1',
      email: 'admin@b.com',
      firstName: null,
      lastName: null,
      role: 'ADMIN',
      locale: 'EN',
    });
    service.list.and.returnValue(Promise.resolve([makeUser(), makeUser({ id: 'admin1', role: 'ADMIN' })]));

    const authStub = { currentUser } as unknown as AuthService;
    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;

    TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminUsersService, useValue: service },
        { provide: AuthService, useValue: authStub },
        { provide: AdminSnackbarService, useValue: snack },
        { provide: I18nService, useValue: i18nStub },
      ],
    });
    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads users on construction', async () => {
    await fixture.whenStable();
    expect(component.users().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('sets an error message when reload fails', async () => {
    service.list.and.returnValue(Promise.reject(new Error('down')));
    await component.reload();
    expect(component.error()).toBe('down');
  });

  it('currentUserId reflects the authenticated user', () => {
    expect(component.currentUserId()).toBe('admin1');
    currentUser.set(null);
    expect(component.currentUserId()).toBeNull();
  });

  describe('setStatus', () => {
    it('refuses to block the current admin themselves, with an error toast', async () => {
      await component.setStatus(makeUser({ id: 'admin1' }), 'BLOCKED');
      expect(snack.error).toHaveBeenCalled();
      expect(service.setStatus).not.toHaveBeenCalled();
    });

    it('does nothing when the confirm dialog is cancelled', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await component.setStatus(makeUser(), 'BLOCKED');
      expect(service.setStatus).not.toHaveBeenCalled();
    });

    it('blocks the user, updates the row in place, and shows a success toast', async () => {
      await fixture.whenStable();
      spyOn(window, 'confirm').and.returnValue(true);
      const updated = makeUser({ status: 'BLOCKED' });
      service.setStatus.and.returnValue(Promise.resolve(updated));

      await component.setStatus(makeUser(), 'BLOCKED');

      expect(service.setStatus).toHaveBeenCalledWith('u1', 'BLOCKED');
      expect(component.users().find((u) => u.id === 'u1')?.status).toBe('BLOCKED');
      expect(snack.success).toHaveBeenCalled();
    });

    it('unblocks with the appropriate confirm/success messages', async () => {
      await fixture.whenStable();
      spyOn(window, 'confirm').and.returnValue(true);
      service.setStatus.and.returnValue(Promise.resolve(makeUser({ status: 'ACTIVE' })));
      await component.setStatus(makeUser({ status: 'BLOCKED' }), 'ACTIVE');
      expect(service.setStatus).toHaveBeenCalledWith('u1', 'ACTIVE');
      expect(snack.success).toHaveBeenCalled();
    });

    it('swallows a failed status change (interceptor shows the toast)', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      service.setStatus.and.returnValue(Promise.reject(new Error('boom')));
      await expectAsync(component.setStatus(makeUser(), 'BLOCKED')).toBeResolved();
      expect(snack.success).not.toHaveBeenCalled();
    });
  });
});
