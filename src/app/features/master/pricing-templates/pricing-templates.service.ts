import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type PricingTemplateStatus = 'ACTIVE' | 'INACTIVE';

export interface PricingTemplate {
  _id?: string;
  name: string;
  description: string;
  actualPriceFormula: string;
  sellingPriceFormula: string;
  anchorPriceFormula: string;
  supportedFieldKeys: string[];
  categoryIds: string[];
  status: PricingTemplateStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingTemplatePayload {
  name: string;
  description: string;
  actualPriceFormula: string;
  sellingPriceFormula: string;
  anchorPriceFormula: string;
  supportedFieldKeys: string[];
  categoryIds: string[];
  status: PricingTemplateStatus;
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
  canLoadAll: boolean;
  tenantPlan?: string;
}

@Injectable({ providedIn: 'root' })
export class PricingTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/pricing-templates`;

  getPricingTemplates(params?: { page?: number; limit?: number; status?: PricingTemplateStatus; search?: string; sortBy?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<PricingTemplate>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    searchParams.set('_ts', String(Date.now()));

    return this.http.get<ApiPaginated<PricingTemplate>>(`${this.apiUrl}?${searchParams.toString()}`);
  }

  createPricingTemplate(payload: PricingTemplatePayload): Observable<ApiSuccess<PricingTemplate>> {
    return this.http.post<ApiSuccess<PricingTemplate>>(this.apiUrl, payload);
  }

  updatePricingTemplate(id: string, payload: PricingTemplatePayload): Observable<ApiSuccess<PricingTemplate>> {
    return this.http.put<ApiSuccess<PricingTemplate>>(`${this.apiUrl}/${id}`, payload);
  }

  deletePricingTemplate(id: string, hardDelete = false): Observable<ApiSuccess<null>> {
    const suffix = hardDelete ? '?hardDelete=true' : '';
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}${suffix}`);
  }
}
