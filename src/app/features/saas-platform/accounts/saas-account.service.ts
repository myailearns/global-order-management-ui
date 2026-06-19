import * as ngHttp from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  AccountListResponse,
  AccountStatus,
  ApiResponse,
  AuditLogItem,
  CreateAccountResult,
  CreateAccountRequest,
  TenantAccount,
  TenantStorageItem,
  UpdateAccountRequest,
} from './saas-account.model';

@Injectable({ providedIn: 'root' })
export class SaasAccountService {
  private readonly http = inject(ngHttp.HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/saas/accounts`;

  private get platformHeaders(): ngHttp.HttpHeaders {
    return new ngHttp.HttpHeaders(this.authSession.getPlatformHeaders());
  }

  listAccounts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tier?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<AccountListResponse> {
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

    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params?.tier) {
      httpParams = httpParams.set('tier', params.tier);
    }

    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }

    if (params?.order) {
      httpParams = httpParams.set('order', params.order);
    }

    return this.http.get<AccountListResponse>(this.baseUrl, { headers: this.platformHeaders, params: httpParams });
  }

  createAccount(payload: CreateAccountRequest): Observable<CreateAccountResult> {
    return this.http
      .post<ApiResponse<CreateAccountResult>>(this.baseUrl, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  getAccountById(id: string): Observable<TenantAccount> {
    return this.http
      .get<ApiResponse<TenantAccount>>(`${this.baseUrl}/${id}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updateAccount(id: string, payload: UpdateAccountRequest): Observable<TenantAccount> {
    return this.http
      .patch<ApiResponse<TenantAccount>>(`${this.baseUrl}/${id}`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updateStatus(id: string, status: AccountStatus, reason: string): Observable<TenantAccount> {
    return this.http
      .patch<ApiResponse<TenantAccount>>(
        `${this.baseUrl}/${id}/status`,
        { status, reason },
        { headers: this.platformHeaders },
      )
      .pipe(map((res) => res.data));
  }

  extendTrial(id: string, extensionDays: number, reason: string): Observable<TenantAccount> {
    return this.http
      .patch<ApiResponse<TenantAccount>>(
        `${this.baseUrl}/${id}/extend-trial`,
        { extensionDays, reason },
        { headers: this.platformHeaders },
      )
      .pipe(map((res) => res.data));
  }

  getAuditLog(id: string, page = 1, limit = 25): Observable<{ items: AuditLogItem[]; pagination: AccountListResponse['pagination'] }> {
    const params = new ngHttp.HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http
      .get<{ success: boolean; data: AuditLogItem[]; pagination: AccountListResponse['pagination'] }>(`${this.baseUrl}/${id}/audit-log`, {
        headers: this.platformHeaders,
        params,
      })
      .pipe(map((res) => ({ items: res.data, pagination: res.pagination })));
  }

  getPerTenantStorage(): Observable<TenantStorageItem[]> {
    const url = `${environment.apiBaseUrl}/platform/templates/media/tenant-storage`;
    return this.http
      .get<ApiResponse<TenantStorageItem[]>>(url, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }
}
