import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { GomAlertToastService, GomButtonComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import {
  NotificationCampaign,
  NotificationCenterStore,
  NotificationStatus,
  NotificationTab,
} from './notification-center.store';

interface StatusMeta {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

@Component({
  selector: 'gom-push-notifications',
  standalone: true,
  imports: [CommonModule, GomButtonComponent, DisableIfNoFeatureDirective],
  templateUrl: './push-notifications.component.html',
  styleUrl: './push-notifications.component.scss',
})
export class PushNotificationsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);
  private readonly store = inject(NotificationCenterStore);

  readonly loading = signal(false);
  readonly activeTab = signal<NotificationTab>('all');
  readonly campaigns = computed(() => this.store.campaigns().filter((campaign) => this.matchesTab(campaign, this.activeTab())));
  readonly isEmpty = computed(() => this.campaigns().length === 0);
  readonly tabCounts = computed(() => {
    const campaigns = this.store.campaigns();

    return {
      all: campaigns.filter((campaign) => campaign.status !== 'Cancelled').length,
      drafts: campaigns.filter((campaign) => campaign.status === 'Draft').length,
      scheduled: campaigns.filter((campaign) => campaign.status === 'Scheduled').length,
      sent: campaigns.filter((campaign) => campaign.status === 'Sent').length,
      failed: campaigns.filter((campaign) => campaign.status === 'Failed').length,
    };
  });

  readonly canBroadcast = computed(() => this.authSession.hasFeature('notification.broadcast'));
  readonly tabs: Array<{ id: NotificationTab; label: string; count: number }> = [
    { id: 'all', label: 'All', count: 0 },
    { id: 'drafts', label: 'Drafts', count: 0 },
    { id: 'scheduled', label: 'Scheduled', count: 0 },
    { id: 'sent', label: 'Sent', count: 0 },
    { id: 'failed', label: 'Failed', count: 0 },
  ];

  readonly statusMeta: Record<NotificationStatus, StatusMeta> = {
    Draft: { label: 'Draft', tone: 'neutral' },
    Scheduled: { label: 'Scheduled', tone: 'warning' },
    Sending: { label: 'Sending', tone: 'info' },
    Sent: { label: 'Sent', tone: 'success' },
    Failed: { label: 'Failed', tone: 'danger' },
    Cancelled: { label: 'Cancelled', tone: 'neutral' },
  };

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.store
      .loadCampaigns('all')
      .catch(() => {
        this.toast.error('Failed to load notifications.');
      })
      .finally(() => {
        this.loading.set(false);
      });
  }

  setTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
  }

  countFor(tab: NotificationTab): number {
    return this.tabCounts()[tab] ?? 0;
  }

  openCreateNotification(): void {
    if (!this.canBroadcast()) {
      this.toast.error('You do not have permission to create notifications.');
      return;
    }

    this.router.navigate(['/settings/push-notifications/create']);
  }

  viewNotification(campaign: NotificationCampaign): void {
    if (campaign.errorMessage) {
      this.toast.info(`${campaign.title}: ${campaign.errorMessage}`);
      return;
    }

    this.toast.info(`${campaign.title} is ${campaign.status.toLowerCase()}.`);
  }

  editNotification(campaign: NotificationCampaign): void {
    if (campaign.status !== 'Draft') {
      this.toast.warning('Only draft notifications can be edited.');
      return;
    }

    this.router.navigate(['/settings/push-notifications/create'], { queryParams: { copyFrom: campaign.id } });
  }

  rescheduleNotification(campaign: NotificationCampaign): void {
    this.router.navigate(['/settings/push-notifications/create'], {
      queryParams: {
        copyFrom: campaign.id,
        forceSchedule: 'true',
      },
    });
  }

  duplicateNotification(campaign: NotificationCampaign): void {
    this.store
      .duplicateCampaign(campaign.id)
      .then(() => {
        this.toast.success('Notification duplicated as a new draft.');
        this.reload();
        this.activeTab.set('drafts');
      })
      .catch(() => {
        this.toast.error('Unable to duplicate notification.');
      });
  }

  cancelNotification(campaign: NotificationCampaign): void {
    this.store
      .cancelCampaign(campaign.id)
      .then(() => {
        this.toast.success('Notification cancelled.');
        this.reload();
      })
      .catch(() => {
        this.toast.error('Unable to cancel notification.');
      });
  }

  retryNotification(campaign: NotificationCampaign): void {
    this.store
      .retryCampaign(campaign.id)
      .then(() => {
        this.toast.success('Retry started.');
        this.reload();
      })
      .catch(() => {
        this.toast.error('Unable to retry notification.');
      });
  }

  statusTone(status: NotificationStatus): StatusMeta['tone'] {
    return this.statusMeta[status]?.tone ?? 'neutral';
  }

  private matchesTab(campaign: NotificationCampaign, tab: NotificationTab): boolean {
    if (tab === 'all') {
      return campaign.status !== 'Cancelled';
    }

    if (tab === 'drafts') return campaign.status === 'Draft';
    if (tab === 'scheduled') return campaign.status === 'Scheduled';
    if (tab === 'sent') return campaign.status === 'Sent';
    if (tab === 'failed') return campaign.status === 'Failed';

    return true;
  }
}
