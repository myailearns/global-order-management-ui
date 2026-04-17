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
  categoryId: string;
  quantity: number;
  fieldGroupId: string;
  fieldGroupVersion: number;
  resolvedFields: GroupResolvedField[];
  formula: {
    sellingPrice: string;
    anchorPrice: string;
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
  categoryId: string;
  quantity: number;
  fieldGroupId: string;
  customFields: Array<{ fieldId: string; value: number }>;
  formula: {
    sellingPrice: string;
    anchorPrice: string;
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

  listGroups(): Observable<ApiPaginated<Group>> {
    return this.http.get<ApiPaginated<Group>>(this.groupsUrl);
  }

  createGroup(payload: GroupPayload): Observable<ApiSuccess<Group>> {
    return this.http.post<ApiSuccess<Group>>(this.groupsUrl, payload);
  }

  updateGroup(id: string, payload: GroupPayload): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}`, payload);
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
