import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type DispatchState = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NotificationDispatchDto {
  _id: string;
  orderNo: string;
  channel: 'PUSH' | 'IN_APP' | 'EMAIL' | 'WHATSAPP';
  state: DispatchState;
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

interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T;
  pagination: { page: number; limit: number; total: number; hasMore: boolean; totalPages: number };
}

export interface DispatchListQuery {
  toStatus?: string;
  channel?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationDispatchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/notification-dispatches`;

  listDispatches(query: DispatchListQuery): Observable<ApiPaginatedResponse<NotificationDispatchDto[]>> {
    let params = new HttpParams();

    if (query.page !== undefined) {
      params = params.set('page', String(query.page));
    }
    if (query.limit !== undefined) {
      params = params.set('limit', String(query.limit));
    }
    if (query.toStatus) {
      params = params.set('toStatus', query.toStatus);
    }
    if (query.channel) {
      params = params.set('channel', query.channel);
    }

    return this.http.get<ApiPaginatedResponse<NotificationDispatchDto[]>>(this.baseUrl, { params });
  }
}
