import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
  canLoadAll: boolean;
  tenantPlan?: string;
}

export interface ApiPaginated<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Category {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Field {
  _id: string;
  name: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'LONG_TEXT';
  valueFormat?: 'NUMBER' | 'CURRENCY';
  currencyCode?: 'INR' | null;
  fieldKind?: 'PRICING' | 'METADATA';
  defaultValue: number | string;
  isRequired: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FieldGroupItem {
  fieldId: string;
  order: number;
  defaultValue?: number | null;
  requiredOverride?: boolean | null;
}

export interface FieldGroup {
  _id: string;
  name: string;
  version: number;
  fields: FieldGroupItem[];
  categoryIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Unit {
  _id: string;
  name: string;
  symbol: string;
  baseUnitId: string | null;
  conversionFactor: number;
  status: 'ACTIVE' | 'INACTIVE';
  categoryIds?: string[];
}

export interface TaxProfile {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: 'GST' | 'NO_TAX';
  rate: number;
  inclusive: boolean;
  hsnCode: string;
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface GroupResolvedField {
  fieldId: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE';
  value: number;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  categoryId: string;
  quantity: number;
  fieldGroupId: string;
  fieldGroupVersion: number;
  resolvedFields: GroupResolvedField[];
    excludedFieldKeys: string[];
  formula: {
    sellingPrice: string;
    anchorPrice: string;
    actualPrice: string;
  };
  baseUnitId: string;
  allowedUnitIds: string[];
  taxProfileId?: string | null;
  stock?: {
    onHand: number;
    reserved: number;
    available: number;
    reorderLevel: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

export interface GroupPayload {
  name: string;
  description?: string;
  categoryId: string;
  quantity: number;
  fieldGroupId: string;
  customFields: Array<{ fieldId: string; value: number }>;
    excludedFieldKeys: string[];
  formula: {
    sellingPrice: string;
    anchorPrice: string;
    actualPrice: string;
  };
  baseUnitId: string;
  allowedUnitIds: string[];
  taxProfileId?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly http = inject(HttpClient);

  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;
  private readonly fieldsUrl = `${environment.apiBaseUrl}/fields`;
  private readonly fieldGroupsUrl = `${environment.apiBaseUrl}/field-groups`;
  private readonly unitsUrl = `${environment.apiBaseUrl}/units`;
  private readonly taxProfilesUrl = `${environment.apiBaseUrl}/tax-profiles`;

  listGroups(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    categoryId?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Group>> {
    let httpParams = new HttpParams();
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.order) httpParams = httpParams.set('order', params.order);
    return this.http.get<ApiPaginated<Group>>(this.groupsUrl, { params: httpParams });
  }

  createGroup(payload: GroupPayload): Observable<ApiSuccess<Group>> {
    return this.http.post<ApiSuccess<Group>>(this.groupsUrl, payload);
  }

  updateGroup(id: string, payload: GroupPayload): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}`, payload);
  }

  patchGroupStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiSuccess<Group>> {
    return this.http.patch<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/status`, { status });
  }

  listCategories(): Observable<ApiPaginated<Category>> {
    return this.http.get<ApiPaginated<Category>>(`${this.categoriesUrl}?status=ACTIVE`);
  }

  listFields(): Observable<ApiPaginated<Field>> {
    return this.http.get<ApiPaginated<Field>>(this.fieldsUrl);
  }

  listFieldGroups(): Observable<ApiPaginated<FieldGroup>> {
    return this.http.get<ApiPaginated<FieldGroup>>(this.fieldGroupsUrl);
  }

  listUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(this.unitsUrl);
  }

  listTaxProfiles(): Observable<ApiPaginated<TaxProfile>> {
    return this.http.get<ApiPaginated<TaxProfile>>(`${this.taxProfilesUrl}?status=ACTIVE`);
  }
}
