import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { DeliveryService, OrderNotificationSettings } from '../../delivery/delivery.service';

@Component({
  selector: 'gom-notification-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    DisableIfNoFeatureDirective,
  ],
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.scss',
})
export class NotificationSettingsComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canEdit = computed(() => this.authSession.hasFeature('notification.manage'));

  readonly tabs = [{ id: 'orders', label: 'Order Notifications' }] as const;
  readonly activeTab = signal<'orders'>('orders');

  readonly form = this.fb.group({
    adminEmailEnabled: [false],
    adminEmail: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  switchTab(tabId: string | number): void {
    if (String(tabId) === 'orders') {
      this.activeTab.set('orders');
    }
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const orderSettings = res?.data?.notificationSettings?.orderNotifications;
          const fallbackEmail = String(
            this.authSession.session()?.email || ''
          ).trim().toLowerCase();

          this.form.patchValue({
            adminEmailEnabled: Boolean(orderSettings?.adminEmailEnabled),
            adminEmail: String(orderSettings?.adminEmail || fallbackEmail || '').trim().toLowerCase(),
          });

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load notification settings.');
        },
      });
  }

  save(): void {
    if (!this.canEdit()) {
      return;
    }

    if (this.form.invalid) {
      this.errorMessage.set('Please provide a valid email address.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload: Partial<OrderNotificationSettings> = {
      adminEmailEnabled: Boolean(raw.adminEmailEnabled),
      adminEmail: String(raw.adminEmail || '').trim().toLowerCase(),
    };

    this.service
      .updateOrderNotificationSettings(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Notification settings saved.');
        },
        error: (err) => {
          this.saving.set(false);
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save notification settings.');
        },
      });
  }
}
