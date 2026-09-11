// frontend/src/app/features/admin/shared/admin-snackbar.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminSnackbarService } from './admin-snackbar.service';

describe('AdminSnackbarService', () => {
  let service: AdminSnackbarService;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snack }] });
    service = TestBed.inject(AdminSnackbarService);
  });

  it('success() opens a 3s success-styled snackbar with an OK action', () => {
    service.success('Saved');
    expect(snack.open).toHaveBeenCalledWith('Saved', 'OK', {
      duration: 3000,
      panelClass: ['snack-success'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  });

  it('error() opens a 5s error-styled snackbar with an OK action', () => {
    service.error('Failed');
    expect(snack.open).toHaveBeenCalledWith('Failed', 'OK', {
      duration: 5000,
      panelClass: ['snack-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  });

  it('info() opens a 2.5s snackbar with no action and no panel class', () => {
    service.info('FYI');
    expect(snack.open).toHaveBeenCalledWith('FYI', undefined, {
      duration: 2500,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  });
});
