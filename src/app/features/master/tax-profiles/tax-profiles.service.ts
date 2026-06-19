import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
  canLoadAll: boolean;
  tenantPlan?: string;
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type TaxMode = 'GST' | 'NO_TAX';
export type TaxStatus = 'ACTIVE' | 'INACTIVE';

export interface TaxProfile {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: TaxMode;
  rate: number;
  inclusive: boolean;
  hsnCode?: string;
  status: TaxStatus;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  updatedAt: string;
}

export interface TaxProfilePayload {
  name: string;
  countryCode: string;
  taxMode: TaxMode;
  rate: number;
  inclusive: boolean;
  hsnCode?: string;
  status: TaxStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TaxProfilesService {
  private readonly http = inject(HttpClient);
  private readonly taxProfilesUrl = `${environment.apiBaseUrl}/tax-profiles`;

  listTaxProfiles(params?: {
    page?: number;
    limit?: number;
    status?: TaxStatus;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<TaxProfile>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.taxProfilesUrl}?${query}` : this.taxProfilesUrl;
    return this.http.get<ApiPaginated<TaxProfile>>(url);
  }

  createTaxProfile(payload: TaxProfilePayload): Observable<ApiSuccess<TaxProfile>> {
    return this.http.post<ApiSuccess<TaxProfile>>(this.taxProfilesUrl, payload);
  }

  updateTaxProfile(id: string, payload: TaxProfilePayload): Observable<ApiSuccess<TaxProfile>> {
    return this.http.put<ApiSuccess<TaxProfile>>(`${this.taxProfilesUrl}/${id}`, payload);
  }
}
