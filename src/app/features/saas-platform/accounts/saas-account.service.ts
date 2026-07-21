import * as ngHttp from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  AccountListResponse,
  ApplyPaymentTierPayload,
  AccountStatus,
  ApiResponse,
  AuditLogItem,
  CompleteIncompleteAccountPayload,
  CreateAccountResult,
  CreateAccountRequest,
  DeleteAccountResult,
  DeleteAllAccountsResult,
  FirstAdminInfo,
  PaymentRecord,
  PaymentContextResponse,
  PaymentRequestPayload,
  PendingVerificationListResponse,
  PendingVerificationPaymentRecord,
  RejectPaymentPayload,
  SetPaymentDurationPayload,
  TenantAccount,
  TenantStorageItem,
  UploadPaymentProofPayload,
  UpdateAccountRequest,
  VerifyPaymentPayload,
  VerifyPaymentResult,
} from './saas-account.model';

@Injectable({ providedIn: 'root' })
export class SaasAccountService {
  private readonly http = inject(ngHttp.HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/saas/accounts`;
  private readonly saasPaymentsUrl = `${environment.apiBaseUrl}/saas/payments`;

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

  createIncompleteAccount(payload: { accountName: string; primaryContactPhone: string; primaryContactEmail: string; countryCode: string }): Observable<TenantAccount> {
    return this.http
      .post<ApiResponse<TenantAccount>>(`${this.baseUrl}/incomplete`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  completeIncompleteAccount(id: string, payload: CompleteIncompleteAccountPayload): Observable<TenantAccount> {
    return this.http
      .patch<ApiResponse<TenantAccount>>(`${this.baseUrl}/incomplete/${id}/complete`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deleteAllAccounts(): Observable<DeleteAllAccountsResult> {
    return this.http
      .delete<ApiResponse<DeleteAllAccountsResult>>(this.baseUrl, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deleteAccount(id: string): Observable<DeleteAccountResult> {
    return this.http
      .delete<ApiResponse<DeleteAccountResult>>(`${this.baseUrl}/${id}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  getAccountById(id: string): Observable<TenantAccount> {
    return this.http
      .get<ApiResponse<TenantAccount>>(`${this.baseUrl}/${id}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  getAccountFirstAdmin(id: string): Observable<FirstAdminInfo | null> {
    return this.http
      .get<ApiResponse<FirstAdminInfo | null>>(`${this.baseUrl}/${id}/first-admin`, { headers: this.platformHeaders })
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

  requestPayment(accountId: string, payload: PaymentRequestPayload): Observable<PaymentRecord> {
    return this.http
      .post<ApiResponse<PaymentRecord>>(`${this.saasPaymentsUrl}/${accountId}/request`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  uploadPaymentProof(accountId: string, payload: UploadPaymentProofPayload): Observable<PaymentRecord> {
    return this.http
      .post<ApiResponse<PaymentRecord>>(`${this.saasPaymentsUrl}/${accountId}/upload-proof`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  listPendingVerification(params?: { page?: number; limit?: number; tenantId?: string; accountId?: string }): Observable<PendingVerificationListResponse> {
    let httpParams = new ngHttp.HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.tenantId) {
      httpParams = httpParams.set('tenantId', params.tenantId);
    }
    if (params?.accountId) {
      httpParams = httpParams.set('accountId', params.accountId);
    }

    return this.http
      .get<{ success: boolean; data: PendingVerificationPaymentRecord[]; meta: { page: number; limit: number; total: number } }>(
        `${this.saasPaymentsUrl}/pending-verification`,
        { headers: this.platformHeaders, params: httpParams },
      )
      .pipe(
        map((res) => ({
          items: res.data || [],
          page: Number(res.meta?.page || 1),
          limit: Number(res.meta?.limit || (res.data || []).length || 1),
          total: Number(res.meta?.total || 0),
        })),
      );
  }

  getPaymentContext(accountId: string): Observable<PaymentContextResponse> {
    return this.http
      .get<ApiResponse<PaymentContextResponse>>(`${this.saasPaymentsUrl}/${accountId}/context`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  verifyPayment(paymentId: string, payload: VerifyPaymentPayload = {}): Observable<VerifyPaymentResult> {
    return this.http
      .patch<ApiResponse<VerifyPaymentResult>>(`${this.saasPaymentsUrl}/${paymentId}/verify`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  rejectPayment(paymentId: string, payload: RejectPaymentPayload): Observable<PaymentRecord> {
    return this.http
      .patch<ApiResponse<PaymentRecord>>(`${this.saasPaymentsUrl}/${paymentId}/reject`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  applyPaymentTier(paymentId: string, payload: ApplyPaymentTierPayload): Observable<PaymentRecord> {
    return this.http
      .patch<ApiResponse<PaymentRecord>>(`${this.saasPaymentsUrl}/${paymentId}/apply-tier`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  setPaymentDuration(paymentId: string, payload: SetPaymentDurationPayload): Observable<PaymentRecord> {
    return this.http
      .patch<ApiResponse<PaymentRecord>>(`${this.saasPaymentsUrl}/${paymentId}/set-duration`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }
}
