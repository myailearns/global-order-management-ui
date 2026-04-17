import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
    requiredOverride: 'REQUIRED' | 'OPTIONAL' | 'INHERIT';
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

  listFieldGroups(): Observable<ApiPaginated<FieldGroup>> {
    return this.http.get<ApiPaginated<FieldGroup>>(this.fieldGroupsUrl);
  }

  listFields(): Observable<ApiPaginated<PricingField>> {
    return this.http.get<ApiPaginated<PricingField>>(this.fieldsUrl);
  }

  listGroups(): Observable<ApiPaginated<ProductGroupUsage>> {
    return this.http.get<ApiPaginated<ProductGroupUsage>>(this.groupsUrl);
  }

  listCategories(): Observable<ApiPaginated<CategoryOption>> {
    return this.http.get<ApiPaginated<CategoryOption>>(`${this.categoriesUrl}?status=ACTIVE`);
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