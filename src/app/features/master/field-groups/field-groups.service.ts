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

export interface FieldGroupFieldItem {
  fieldId: string;
  order: number;
  defaultValue: number | null;
  requiredOverride?: boolean | null;
}

export interface FieldGroup {
  _id: string;
  name: string;
  version: number;
  fields: FieldGroupFieldItem[];
  categoryIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryOption {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PricingField {
  _id: string;
  name: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'LONG_TEXT';
  valueFormat?: 'NUMBER' | 'CURRENCY';
  currencyCode?: 'INR' | null;
  fieldKind?: 'PRICING' | 'METADATA';
  defaultValue: number | string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FieldGroupPayload {
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  categoryIds: string[];
  fields: Array<{
    fieldId: string;
    order: number;
    defaultValue: number | null;
    requiredOverride: boolean | null;
  }>;
}

export interface ProductGroupUsage {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  resolvedFields: Array<{
    fieldId: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class FieldGroupsService {
  private readonly http = inject(HttpClient);

  private readonly fieldGroupsUrl = `${environment.apiBaseUrl}/field-groups`;
  private readonly fieldsUrl = `${environment.apiBaseUrl}/fields`;
  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;

  listFieldGroups(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<FieldGroup>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.fieldGroupsUrl}?${query}` : this.fieldGroupsUrl;
    return this.http.get<ApiPaginated<FieldGroup>>(url);
  }

  listFields(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<PricingField>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.fieldsUrl}?${query}` : this.fieldsUrl;
    return this.http.get<ApiPaginated<PricingField>>(url);
  }

  listGroups(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<ProductGroupUsage>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.groupsUrl}?${query}` : this.groupsUrl;
    return this.http.get<ApiPaginated<ProductGroupUsage>>(url);
  }

  listCategories(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<CategoryOption>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.categoriesUrl}?${query}` : this.categoriesUrl;
    return this.http.get<ApiPaginated<CategoryOption>>(url);
  }

  createFieldGroup(payload: FieldGroupPayload): Observable<ApiSuccess<FieldGroup>> {
    return this.http.post<ApiSuccess<FieldGroup>>(this.fieldGroupsUrl, payload);
  }

  updateFieldGroup(id: string, payload: FieldGroupPayload): Observable<ApiSuccess<FieldGroup>> {
    return this.http.put<ApiSuccess<FieldGroup>>(`${this.fieldGroupsUrl}/${id}`, payload);
  }

  deleteFieldGroup(id: string, hardDelete = false): Observable<ApiSuccess<null>> {
    const suffix = hardDelete ? '?hardDelete=true' : '';
    return this.http.delete<ApiSuccess<null>>(`${this.fieldGroupsUrl}/${id}${suffix}`);
  }
}