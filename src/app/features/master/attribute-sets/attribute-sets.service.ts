import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type AttributeSetStatus = 'ACTIVE' | 'INACTIVE';

export interface AttributeSetItem {
  attributeId: string;
  order: number;
  requiredOverride: boolean | null;
}

export interface AttributeSet {
  _id?: string;
  name: string;
  description: string;
  attributes: AttributeSetItem[];
  /** @deprecated Category association removed - attribute sets are now global */
  categoryIds?: string[];
  status: AttributeSetStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttributeSetPayload {
  name: string;
  description: string;
  attributes: AttributeSetItem[];
  /** @deprecated Category association removed - attribute sets are now global */
  categoryIds?: string[];
  status: AttributeSetStatus;
}

export interface AttributeDefinitionOption {
  _id: string;
  name: string;
  key: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CategoryOption {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
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
export class AttributeSetsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/attribute-sets`;
  private readonly attributesUrl = `${environment.apiBaseUrl}/attributes`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;

  getAttributeSets(params?: {
    page?: number;
    limit?: number;
    status?: AttributeSetStatus;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<AttributeSet>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    searchParams.set('_ts', String(Date.now()));

    return this.http.get<ApiPaginated<AttributeSet>>(`${this.apiUrl}?${searchParams.toString()}`);
  }

  getAttributes(params?: { page?: number; limit?: number; status?: 'ACTIVE' | 'INACTIVE'; search?: string }): Observable<ApiPaginated<AttributeDefinitionOption>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    return this.http.get<ApiPaginated<AttributeDefinitionOption>>(`${this.attributesUrl}?${searchParams.toString()}`);
  }

  listCategories(params?: { page?: number; limit?: number; status?: 'ACTIVE' | 'INACTIVE'; search?: string }): Observable<ApiPaginated<CategoryOption>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    return this.http.get<ApiPaginated<CategoryOption>>(`${this.categoriesUrl}?${searchParams.toString()}`);
  }

  createAttributeSet(payload: AttributeSetPayload): Observable<ApiSuccess<AttributeSet>> {
    return this.http.post<ApiSuccess<AttributeSet>>(this.apiUrl, payload);
  }

  updateAttributeSet(id: string, payload: AttributeSetPayload): Observable<ApiSuccess<AttributeSet>> {
    return this.http.put<ApiSuccess<AttributeSet>>(`${this.apiUrl}/${id}`, payload);
  }

  deleteAttributeSet(id: string, hardDelete = false): Observable<ApiSuccess<null>> {
    const suffix = hardDelete ? '?hardDelete=true' : '';
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}${suffix}`);
  }
}
