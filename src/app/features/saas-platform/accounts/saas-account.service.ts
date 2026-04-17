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

  listAccounts(page: number, limit: number, search = '', status = ''): Observable<{ items: TenantAccount[]; meta: AccountListResponse['meta'] }> {
    let params = new ngHttp.HttpParams().set('page', String(page)).set('limit', String(limit));

    if (search) {
      params = params.set('search', search);
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http
      .get<AccountListResponse>(this.baseUrl, { headers: this.platformHeaders, params })
      .pipe(map((res) => ({ items: res.data, meta: res.meta })));
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

  getAuditLog(id: string, page = 1, limit = 25): Observable<{ items: AuditLogItem[]; meta: AccountListResponse['meta'] }> {
    const params = new ngHttp.HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http
      .get<{ success: boolean; data: AuditLogItem[]; meta: AccountListResponse['meta'] }>(`${this.baseUrl}/${id}/audit-log`, {
        headers: this.platformHeaders,
        params,
      })
      .pipe(map((res) => ({ items: res.data, meta: res.meta })));
  }
}
