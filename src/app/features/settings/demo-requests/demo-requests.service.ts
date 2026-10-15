import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface DemoRequestRecord {
  bookingId: string;
  name: string;
  email: string;
  mobileNumber: string;
  businessCategoryId: string;
  businessCategoryName: string;
  businessTypeIds: string[];
  businessTypeNames: string[];
  businessTypeLabel: string;
  status: 'new' | 'in_progress' | 'done';
  connected: boolean;
  subscribed: boolean;
  packagePlanId: string;
  packagePlanName: string;
  tierId: string;
  tierName: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface DemoPackageTierOption {
  _id: string;
  tierKey: string;
  displayName: string | null;
}

export interface DemoPackageOption {
  _id: string;
  planId: string;
  name: string;
  description?: string;
  tiers: DemoPackageTierOption[];
}

export interface DemoRequestListResponse {
  success: boolean;
  message?: string;
  data: DemoRequestRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface UpdateDemoRequestPayload {
  connected: boolean;
  subscribed: boolean;
  packagePlanId?: string;
  tierId?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class DemoRequestsService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/demo/admin/requests`;
  private readonly packagesUrl = `${environment.apiBaseUrl}/saas/public/packages-with-tiers`;

  private get platformHeaders(): HttpHeaders {
    return new HttpHeaders(this.authSession.getPlatformHeaders());
  }

  listRequests(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Observable<DemoRequestListResponse> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    if (params?.order) {
      httpParams = httpParams.set('order', params.order);
    }

    return this.http.get<DemoRequestListResponse>(this.baseUrl, {
      headers: this.platformHeaders,
      params: httpParams,
    });
  }

  listPackagesWithTiers(): Observable<DemoPackageOption[]> {
    return this.http.get<ApiResponse<DemoPackageOption[]>>(this.packagesUrl, { headers: this.platformHeaders })
      .pipe(map((response) => response.data || []));
  }

  updateRequest(bookingId: string, payload: UpdateDemoRequestPayload): Observable<DemoRequestRecord> {
    return this.http.patch<ApiResponse<DemoRequestRecord>>(`${this.baseUrl}/${bookingId}`, payload, {
      headers: this.platformHeaders,
    }).pipe(map((response) => response.data));
  }
}