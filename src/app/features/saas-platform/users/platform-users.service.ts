import * as ngHttp from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface PlatformUser {
  userId: string;
  email: string;
  fullName: string;
  role: 'platform_super_admin' | 'platform_admin' | 'platform_support';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformUsersResponse {
  success: boolean;
  data: PlatformUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class PlatformUsersService {
  private readonly http = inject(ngHttp.HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/platform/users`;

  private get platformHeaders(): ngHttp.HttpHeaders {
    return new ngHttp.HttpHeaders(this.authSession.getPlatformHeaders());
  }

  listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Observable<PlatformUsersResponse> {
    let httpParams = new ngHttp.HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
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

    return this.http.get<PlatformUsersResponse>(this.baseUrl, { headers: this.platformHeaders, params: httpParams });
  }
}
