import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type NotificationStatus = 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed' | 'Cancelled';
export type NotificationTab = 'all' | 'drafts' | 'scheduled' | 'sent' | 'failed';
export type NotificationChannel = 'Push' | 'Email' | 'WhatsApp';

export interface NotificationCampaign {
  id: string;
  title: string;
  summary: string;
  content?: {
    pushMessage?: string;
    emailSubject?: string;
    emailBodyHtml?: string;
    emailBodyText?: string;
    whatsAppTemplate?: string;
    whatsAppBody?: string;
  };
  channels: NotificationChannel[];
  audience: string;
  recipients: number | null;
  schedule: string;
  status: NotificationStatus;
  createdOn: string;
  errorMessage?: string;
  progress?: number;
}

export interface CreateNotificationRequest {
  title: string;
  summary: string;
  content?: {
    pushMessage?: string;
    emailSubject?: string;
    emailBodyHtml?: string;
    emailBodyText?: string;
    whatsAppTemplate?: string;
    whatsAppBody?: string;
  };
  channels: NotificationChannel[];
  audience: string;
  recipients: number | null;
  schedule: string;
  scheduleAt?: string | null;
  timezone?: string;
  status: NotificationStatus;
  errorMessage?: string;
}

interface CampaignApiItem {
  _id: string;
  title: string;
  summary: string;
  content?: {
    pushMessage?: string;
    emailSubject?: string;
    emailBodyHtml?: string;
    emailBodyText?: string;
    whatsAppTemplate?: string;
    whatsAppBody?: string;
  };
  channels: Array<'PUSH' | 'EMAIL' | 'WHATSAPP'>;
  audience?: {
    type?: 'ALL_CUSTOMERS' | 'CUSTOMER_GROUP' | 'CUSTOM_SEGMENT';
    name?: string;
    estimatedRecipients?: number;
  };
  schedule?: {
    mode?: 'NOW' | 'LATER';
    runAt?: string | null;
  };
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  progress?: number;
  errorMessage?: string;
  createdAt: string;
}

interface CampaignListResponse {
  success: boolean;
  data: CampaignApiItem[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean; totalPages: number };
}

interface CampaignActionResponse {
  success: boolean;
  data: { campaignId: string; status: string; queuedAt?: string };
}

interface CampaignGetResponse {
  success: boolean;
  data: CampaignApiItem;
}

interface PaginatedCountResponse {
  success: boolean;
  pagination?: {
    total?: number;
  };
}

function toUiStatus(status: CampaignApiItem['status']): NotificationStatus {
  if (status === 'DRAFT') return 'Draft';
  if (status === 'SCHEDULED') return 'Scheduled';
  if (status === 'SENDING') return 'Sending';
  if (status === 'SENT') return 'Sent';
  if (status === 'FAILED') return 'Failed';
  return 'Cancelled';
}

function toApiStatus(status: NotificationStatus): CampaignApiItem['status'] {
  if (status === 'Draft') return 'DRAFT';
  if (status === 'Scheduled') return 'SCHEDULED';
  if (status === 'Sending') return 'SENDING';
  if (status === 'Sent') return 'SENT';
  if (status === 'Failed') return 'FAILED';
  return 'CANCELLED';
}

function toApiChannel(channel: NotificationChannel): 'PUSH' | 'EMAIL' | 'WHATSAPP' {
  if (channel === 'Push') return 'PUSH';
  if (channel === 'Email') return 'EMAIL';
  return 'WHATSAPP';
}

function toUiChannel(channel: CampaignApiItem['channels'][number]): NotificationChannel {
  if (channel === 'PUSH') return 'Push';
  if (channel === 'EMAIL') return 'Email';
  return 'WhatsApp';
}

function formatSchedule(item: CampaignApiItem): string {
  if (item.schedule?.mode === 'LATER' && item.schedule?.runAt) {
    return new Date(item.schedule.runAt).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return 'Immediate';
}

function toUiCampaign(item: CampaignApiItem): NotificationCampaign {
  return {
    id: String(item._id),
    title: item.title,
    summary: item.summary || '',
    content: item.content || {},
    channels: Array.isArray(item.channels) ? item.channels.map(toUiChannel) : [],
    audience: item.audience?.name || 'Selected audience',
    recipients: Number(item.audience?.estimatedRecipients || 0),
    schedule: formatSchedule(item),
    status: toUiStatus(item.status),
    createdOn: new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
    errorMessage: item.errorMessage || undefined,
    progress: typeof item.progress === 'number' ? item.progress : undefined,
  };
}

function tabToStatus(tab: NotificationTab): CampaignApiItem['status'] | '' {
  if (tab === 'drafts') return 'DRAFT';
  if (tab === 'scheduled') return 'SCHEDULED';
  if (tab === 'sent') return 'SENT';
  if (tab === 'failed') return 'FAILED';
  return '';
}

@Injectable({ providedIn: 'root' })
export class NotificationCenterStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly _campaigns = signal<NotificationCampaign[]>([]);

  readonly campaigns = computed(() => this._campaigns());

  async getAudienceCounts(): Promise<{ allCustomers: number; customerGroups: number; customSegments: number }> {
    try {
      const [customersRes, groupsRes] = await Promise.all([
        firstValueFrom(
          this.http.get<PaginatedCountResponse>(`${this.baseUrl}/customers`, {
            params: new HttpParams().set('page', '1').set('limit', '1').set('status', 'ACTIVE'),
          }),
        ),
        firstValueFrom(
          this.http.get<PaginatedCountResponse>(`${this.baseUrl}/customer-groups`, {
            params: new HttpParams().set('page', '1').set('limit', '1').set('status', 'ACTIVE'),
          }),
        ),
      ]);

      return {
        allCustomers: Number(customersRes?.pagination?.total || 0),
        customerGroups: Number(groupsRes?.pagination?.total || 0),
        // Saved segment definitions are not modeled yet, so show zero instead of fake data.
        customSegments: 0,
      };
    } catch {
      return {
        allCustomers: 0,
        customerGroups: 0,
        customSegments: 0,
      };
    }
  }

  async loadCampaigns(tab: NotificationTab = 'all'): Promise<void> {
    let params = new HttpParams().set('page', '1').set('limit', '100');
    const status = tabToStatus(tab);
    if (status) {
      params = params.set('status', status);
    }

    const res = await firstValueFrom(
      this.http.get<CampaignListResponse>(`${this.baseUrl}/notification-campaigns`, { params }),
    );

    this._campaigns.set((res.data || []).map(toUiCampaign));
  }

  async createCampaign(request: CreateNotificationRequest): Promise<{ campaignId: string; status: string }> {
    const isLater = request.status === 'Scheduled';
    const payload = {
      title: request.title,
      summary: request.summary,
      content: {
        pushMessage: String(request.content?.pushMessage || '').trim(),
        emailSubject: String(request.content?.emailSubject || '').trim(),
        emailBodyHtml: String(request.content?.emailBodyHtml || '').trim(),
        emailBodyText: String(request.content?.emailBodyText || '').trim(),
        whatsAppTemplate: String(request.content?.whatsAppTemplate || '').trim(),
        whatsAppBody: String(request.content?.whatsAppBody || '').trim(),
      },
      channels: request.channels.map(toApiChannel),
      audience: {
        type: request.audience.toLowerCase().includes('all') ? 'ALL_CUSTOMERS' : 'CUSTOMER_GROUP',
        name: request.audience,
        estimatedRecipients: Number(request.recipients || 0),
      },
      schedule: {
        mode: isLater ? 'LATER' : 'NOW',
        runAt: isLater ? request.scheduleAt || new Date(Date.now() + 60000).toISOString() : null,
        timezone: request.timezone || 'UTC',
      },
      status: toApiStatus(request.status),
    };

    const res = await firstValueFrom(
      this.http.post<CampaignActionResponse>(`${this.baseUrl}/notification-campaigns`, payload),
    );

    await this.loadCampaigns('all');

    return {
      campaignId: res.data.campaignId,
      status: res.data.status,
    };
  }

  async getCampaign(campaignId: string): Promise<NotificationCampaign> {
    const res = await firstValueFrom(
      this.http.get<CampaignGetResponse>(`${this.baseUrl}/notification-campaigns/${campaignId}`),
    );

    return toUiCampaign(res.data);
  }

  async duplicateCampaign(id: string): Promise<boolean> {
    const source = await this.getCampaign(id);
    await this.createCampaign({
      title: `${source.title} Copy`,
      summary: source.summary,
      channels: source.channels,
      audience: source.audience,
      recipients: source.recipients,
      schedule: 'Immediate',
      status: 'Draft',
    });
    return true;
  }

  async cancelCampaign(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/notification-campaigns/${id}/cancel`, {}));
    await this.loadCampaigns('all');
  }

  async retryCampaign(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/notification-campaigns/${id}/retry`, {}));
    await this.loadCampaigns('all');
  }

  async pollCampaign(
    campaignId: string,
    timeoutMs = 30000,
    onUpdate?: (campaign: NotificationCampaign) => void,
  ): Promise<NotificationCampaign> {
    const started = Date.now();
    let latest = await this.getCampaign(campaignId);
    onUpdate?.(latest);

    while (Date.now() - started < timeoutMs) {
      if (latest.status === 'Sent' || latest.status === 'Failed' || latest.status === 'Cancelled') {
        return latest;
      }

      await new Promise((resolve) => setTimeout(resolve, 750));
      latest = await this.getCampaign(campaignId);
      onUpdate?.(latest);
    }

    return latest;
  }
}
