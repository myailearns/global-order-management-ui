import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type AttributeStatus = 'ACTIVE' | 'INACTIVE';

export interface AttributeDefinition {
  _id?: string;
  name: string;
  key: string;
  allowedValues: string[];
  status: AttributeStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttributeDefinitionPayload {
  name: string;
  key: string;
  allowedValues: string[];
  status: AttributeStatus;
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
export class AttributesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/attributes`;

  getAttributes(params?: {
    page?: number;
    limit?: number;
    status?: AttributeStatus;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<AttributeDefinition>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    searchParams.set('_ts', String(Date.now()));

    return this.http.get<ApiPaginated<AttributeDefinition>>(`${this.apiUrl}?${searchParams.toString()}`);
  }

  createAttribute(payload: AttributeDefinitionPayload): Observable<ApiSuccess<AttributeDefinition>> {
    return this.http.post<ApiSuccess<AttributeDefinition>>(this.apiUrl, payload);
  }

  updateAttribute(id: string, payload: AttributeDefinitionPayload): Observable<ApiSuccess<AttributeDefinition>> {
    return this.http.put<ApiSuccess<AttributeDefinition>>(`${this.apiUrl}/${id}`, payload);
  }

  deleteAttribute(id: string, hardDelete = false): Observable<ApiSuccess<null>> {
    const suffix = hardDelete ? '?hardDelete=true' : '';
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}${suffix}`);
  }
}
