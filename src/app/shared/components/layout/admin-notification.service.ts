import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface AdminNotification {
  _id: string;
  tenantId: string;
  type: 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'RETURN_REQUESTED' | 'ORDER_RETURNED' | 'ORDER_REFUNDED';
  title: string;
  body: string;
  route: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);

  private get baseUrl(): string {
    return `${environment.apiBaseUrl}/admin-notifications`;
  }

  getUnreadCount(): Observable<ApiSuccess<{ count: number }>> {
    const headers = this.authSession.getTenantHeaders();
    return this.http
      .get<ApiSuccess<{ count: number }>>(`${this.baseUrl}/unread-count`, { headers })
      .pipe(catchError(() => of({ success: false, data: { count: 0 } })));
  }

  listNotifications(page = 1, limit = 20): Observable<ApiPaginated<AdminNotification>> {
    const headers = this.authSession.getTenantHeaders();
    return this.http
      .get<ApiPaginated<AdminNotification>>(`${this.baseUrl}?page=${page}&limit=${limit}`, { headers })
      .pipe(catchError(() => of({ success: false, data: [], pagination: { page: 1, limit, total: 0, hasMore: false, totalPages: 0 } })));
  }

  markAsRead(id: string): Observable<ApiSuccess<{ updated: boolean }>> {
    const headers = this.authSession.getTenantHeaders();
    return this.http
      .patch<ApiSuccess<{ updated: boolean }>>(`${this.baseUrl}/${id}/read`, {}, { headers })
      .pipe(catchError(() => of({ success: false, data: { updated: false } })));
  }

  markAllAsRead(): Observable<ApiSuccess<{ updated: number }>> {
    const headers = this.authSession.getTenantHeaders();
    return this.http
      .patch<ApiSuccess<{ updated: number }>>(`${this.baseUrl}/read-all`, {}, { headers })
      .pipe(catchError(() => of({ success: false, data: { updated: 0 } })));
  }
}
