import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type FieldType = 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'LONG_TEXT';
export type FieldKind = 'PRICING' | 'METADATA';
export type FieldStatus = 'ACTIVE' | 'INACTIVE';

export interface Field {
  _id?: string;
  name: string;
  key: string;
  type: FieldType;
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
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FieldsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/fields`;
  private readonly fieldGroupsUrl = `${environment.apiBaseUrl}/field-groups`;

  constructor(private readonly http: HttpClient) {}

  getFields(): Observable<ApiPaginated<Field>> {
    return this.http.get<ApiPaginated<Field>>(this.apiUrl);
  }

  getFieldGroups(): Observable<ApiPaginated<FieldGroupUsage>> {
    return this.http.get<ApiPaginated<FieldGroupUsage>>(this.fieldGroupsUrl);
  }

  createField(payload: FieldPayload): Observable<ApiSuccess<Field>> {
    return this.http.post<ApiSuccess<Field>>(this.apiUrl, payload);
  }

  updateField(id: string, payload: FieldPayload): Observable<ApiSuccess<Field>> {
    return this.http.put<ApiSuccess<Field>>(`${this.apiUrl}/${id}`, payload);
  }

  deleteField(id: string, hardDelete = false): Observable<ApiSuccess<null>> {
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
