import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { GomAlertToastService, FormControlsModule, GomButtonComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { environment } from '../../../../environments/environment';

interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
  disabled?: boolean;
}

@Component({
  selector: 'gom-push-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, DisableIfNoFeatureDirective],
  templateUrl: './push-notifications.component.html',
  styleUrl: './push-notifications.component.scss',
})
export class PushNotificationsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);

  private readonly baseUrl = environment.apiBaseUrl;

  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly subscriberCount = signal<number | null>(null);
  readonly lastResult = signal<BroadcastResult | null>(null);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));

  readonly broadcastForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
    message: ['', [Validators.required, Validators.maxLength(200)]],
  });

  ngOnInit(): void {
    this.loadSubscriberCount();
  }

  private loadSubscriberCount(): void {
    this.loading.set(true);
    this.http
      .get<{ success: boolean; data: { count: number } }>(`${this.baseUrl}/notifications/subscribers/count`)
      .subscribe({
        next: (res) => {
          this.subscriberCount.set(res.data.count);
          this.loading.set(false);
        },
        error: () => {
          this.subscriberCount.set(0);
          this.loading.set(false);
        },
      });
  }

  sendBroadcast(): void {
    if (!this.canWrite()) {
      return;
    }

    if (this.broadcastForm.invalid || this.sending()) return;

    this.sending.set(true);
    this.lastResult.set(null);

    const { title, message } = this.broadcastForm.getRawValue();

    this.http
      .post<{ success: boolean; data: BroadcastResult }>(`${this.baseUrl}/notifications/broadcast`, {
        title,
        message,
      })
      .subscribe({
        next: (res) => {
          this.lastResult.set(res.data);
          this.sending.set(false);
          if (res.data.disabled) {
            this.toast.warning('Push notifications are not configured on the server (VAPID keys missing).');
          } else if (res.data.total === 0) {
            this.toast.info('No subscribers found. No notifications were sent.');
          } else {
            this.toast.success(
              `Sent to ${res.data.sent} subscriber${res.data.sent !== 1 ? 's' : ''}${res.data.failed ? ` (${res.data.failed} failed)` : ''}.`,
            );
            this.broadcastForm.reset();
          }
        },
        error: () => {
          this.sending.set(false);
          this.toast.error('Failed to send broadcast. Please try again.');
        },
      });
  }
}
