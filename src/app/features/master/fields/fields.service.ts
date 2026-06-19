import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type FieldType = 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'LONG_TEXT';
export type FieldKind = 'PRICING' | 'METADATA';
export type FieldStatus = 'ACTIVE' | 'INACTIVE';
export type FieldValueFormat = 'NUMBER' | 'CURRENCY';
export type FieldCurrencyCode = 'INR';

export interface Field {
  _id?: string;
  name: string;
  key: string;
  type: FieldType;
  valueFormat?: FieldValueFormat;
  currencyCode?: FieldCurrencyCode | null;
  fieldKind?: FieldKind;
  defaultValue: number | string;
  isRequired: boolean;
  status: FieldStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldPayload {
  name: string;
  key: string;
  type: FieldType;
  valueFormat?: FieldValueFormat;
  currencyCode?: FieldCurrencyCode | null;
  fieldKind?: FieldKind;
  defaultValue: number | string;
  isRequired: boolean;
  status: FieldStatus;
}

export interface FieldGroupUsage {
  _id: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE';
  fields: Array<{
    fieldId: string;
    order?: number;
    defaultValue?: number | null;
    requiredOverride?: boolean | null;
  }>;
}

export interface FieldGroupUpdatePayload {
  fields: Array<{
    fieldId: string;
    order: number;
    defaultValue?: number | null;
    requiredOverride?: 'REQUIRED' | 'OPTIONAL' | 'INHERIT' | boolean | null;
  }>;
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

@Injectable({
  providedIn: 'root'
})
export class FieldsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/fields`;
  private readonly fieldGroupsUrl = `${environment.apiBaseUrl}/field-groups`;

  constructor(private readonly http: HttpClient) {}

  getFields(params?: {
    page?: number;
    limit?: number;
    status?: FieldStatus;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Field>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.apiUrl}?${query}` : this.apiUrl;
    return this.http.get<ApiPaginated<Field>>(url);
  }

  getFieldGroups(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<FieldGroupUsage>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.fieldGroupsUrl}?${query}` : this.fieldGroupsUrl;
    return this.http.get<ApiPaginated<FieldGroupUsage>>(url);
  }

  createField(payload: FieldPayload): Observable<ApiSuccess<Field>> {
    return this.http.post<ApiSuccess<Field>>(this.apiUrl, payload);
  }

  updateField(id: string, payload: FieldPayload): Observable<ApiSuccess<Field>> {
    return this.http.put<ApiSuccess<Field>>(`${this.apiUrl}/${id}`, payload);
  }

  deleteField(id: string, hardDelete = true): Observable<ApiSuccess<null>> {
    const suffix = hardDelete ? '?hardDelete=true' : '';
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}${suffix}`);
  }

  inactivateField(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}/inactivate`);
  }

  updateFieldGroup(id: string, payload: FieldGroupUpdatePayload): Observable<ApiSuccess<FieldGroupUsage>> {
    return this.http.put<ApiSuccess<FieldGroupUsage>>(`${this.fieldGroupsUrl}/${id}`, payload);
  }
}
