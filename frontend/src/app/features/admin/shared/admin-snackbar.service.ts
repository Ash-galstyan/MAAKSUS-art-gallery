// frontend/src/app/features/admin/shared/admin-snackbar.service.ts
/**
 * Thin wrapper around MatSnackBar so admin components don't each duplicate
 * the open() options. Centralises message lifetime and styling.
 *
 * The error interceptor already handles known HTTP error codes globally,
 * so this service is mainly for success confirmations and validation
 * messages that aren't HTTP-driven.
 */
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class AdminSnackbarService {
  private readonly snack = inject(MatSnackBar);

  success(message: string): void {
    this.snack.open(message, 'OK', {
      duration: 3000,
      panelClass: ['snack-success'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  error(message: string): void {
    this.snack.open(message, 'OK', {
      duration: 5000,
      panelClass: ['snack-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  info(message: string): void {
    this.snack.open(message, undefined, {
      duration: 2500,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}