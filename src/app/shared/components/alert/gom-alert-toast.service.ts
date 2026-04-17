import { Injectable, signal } from '@angular/core';

export type GomAlertVariant = 'success' | 'error' | 'info' | 'warning';

export interface GomAlertToast {
  title?: string;
  message: string;
  variant: GomAlertVariant;
  durationMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class GomAlertToastService {
  readonly currentToast = signal<GomAlertToast | null>(null);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(toast: Omit<GomAlertToast, 'durationMs'> & { durationMs?: number }): void {
    this.clearTimer();

    this.currentToast.set({
      ...toast,
      durationMs: toast.durationMs ?? 3500,
    });

    this.timeoutId = setTimeout(() => {
      this.dismiss();
    }, this.currentToast()!.durationMs);
  }

  success(message: string, title = 'Success', durationMs = 3000): void {
    this.show({ message, title, variant: 'success', durationMs });
  }

  error(message: string, title = 'Error', durationMs = 4500): void {
    this.show({ message, title, variant: 'error', durationMs });
  }

  info(message: string, title = 'Info', durationMs = 3500): void {
    this.show({ message, title, variant: 'info', durationMs });
  }

  warning(message: string, title = 'Warning', durationMs = 4000): void {
    this.show({ message, title, variant: 'warning', durationMs });
  }

  dismiss(): void {
    this.clearTimer();
    this.currentToast.set(null);
  }

  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
