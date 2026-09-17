import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GomAlertToastService, GomButtonComponent, GomChipComponent, GomChipTone } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { environment } from '../../../../environments/environment';

interface DispatchItem {
  _id: string;
  orderNo: string;
  channel: 'PUSH' | 'IN_APP' | 'WHATSAPP';
  state: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  toStatus: string;
  templateKey: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  nextRetryAt: string | null;
  sentAt: string | null;
  failureCategory?: string | null;
}

interface DispatchListResponse {
  success: boolean;
  data: DispatchItem[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean; totalPages: number };
}

interface SlaResponse {
  success: boolean;
  data: {
    filtersApplied: { channel: string | null; fromDate: string | null; toDate: string | null };
    totals: { total: number; PENDING: number; SENT: number; FAILED: number; SKIPPED: number; successRate: number };
    latency: { avgLatencyMs: number; minLatencyMs: number; maxLatencyMs: number; sentCount: number };
    failureCategories: Array<{ category: string; count: number }>;
    byChannel: Record<string, { PENDING: number; SENT: number; FAILED: number; SKIPPED: number }>;
  };
}

@Component({
  selector: 'gom-notification-ops',
  standalone: true,
  imports: [CommonModule, FormsModule, GomButtonComponent, GomChipComponent, DatePipe],
  templateUrl: './notification-ops.component.html',
  styleUrl: './notification-ops.component.scss',
})
export class NotificationOpsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);

  private readonly baseUrl = environment.apiBaseUrl;

  readonly loading = signal(false);
  readonly retryingId = signal<string | null>(null);
  readonly canEdit = computed(() => this.authSession.hasFeature('notification.manage'));

  readonly selectedChannel = signal<string>('');
  readonly selectedStatus = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');

  readonly page = signal(1);
  readonly limit = signal(25);

  readonly dispatches = signal<DispatchItem[]>([]);
  readonly total = signal(0);
  readonly hasMore = signal(false);

  readonly sla = signal<SlaResponse['data'] | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadSla();
    this.loadDispatches();
  }

  onApplyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  onResetFilters(): void {
    this.selectedChannel.set('');
    this.selectedStatus.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.page.set(1);
    this.reload();
  }

  private buildParams(): HttpParams {
    let params = new HttpParams()
      .set('page', String(this.page()))
      .set('limit', String(this.limit()));

    if (this.selectedChannel()) params = params.set('channel', this.selectedChannel());
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.fromDate()) params = params.set('fromDate', new Date(this.fromDate()).toISOString());
    if (this.toDate()) {
      const end = new Date(this.toDate());
      end.setHours(23, 59, 59, 999);
      params = params.set('toDate', end.toISOString());
    }

    return params;
  }

  private loadDispatches(): void {
    this.loading.set(true);

    this.http
      .get<DispatchListResponse>(`${this.baseUrl}/notification-dispatches`, { params: this.buildParams() })
      .subscribe({
        next: (res) => {
          this.dispatches.set(res.data || []);
          this.total.set(res.pagination?.total || 0);
          this.hasMore.set(Boolean(res.pagination?.hasMore));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load dispatch records.');
        },
      });
  }

  private loadSla(): void {
    this.http
      .get<SlaResponse>(`${this.baseUrl}/notification-dispatches/sla`, { params: this.buildParams() })
      .subscribe({
        next: (res) => this.sla.set(res.data),
        error: () => {
          this.sla.set(null);
          this.toast.error('Failed to load SLA metrics.');
        },
      });
  }

  retry(dispatchId: string): void {
    if (!this.canEdit()) return;

    this.retryingId.set(dispatchId);
    this.http
      .post<{ success: boolean; message: string }>(`${this.baseUrl}/notification-dispatches/${dispatchId}/retry`, {})
      .subscribe({
        next: () => {
          this.retryingId.set(null);
          this.toast.success('Retry queued.');
          this.reload();
        },
        error: () => {
          this.retryingId.set(null);
          this.toast.error('Retry failed.');
        },
      });
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadDispatches();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.page.update((p) => p + 1);
    this.loadDispatches();
  }

  toneForState(state: string): GomChipTone {
    const s = String(state || '').toUpperCase();
    if (s === 'SENT') return 'success';
    if (s === 'FAILED') return 'danger';
    if (s === 'PENDING') return 'warning';
    return 'neutral';
  }
}
