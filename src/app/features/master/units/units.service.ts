import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type UnitStatus = 'ACTIVE' | 'INACTIVE';

export interface CategoryOption {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Unit {
  _id?: string;
  name: string;
  symbol: string;
  baseUnitId: string | null;
  conversionFactor: number;
  status: UnitStatus;
  categoryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitPayload {
  name: string;
  symbol: string;
  baseUnitId: string | null;
  conversionFactor: number;
  status: UnitStatus;
  categoryIds: string[];
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
export class UnitsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/units`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  getUnits(params?: {
    page?: number;
    limit?: number;
    status?: UnitStatus;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Unit>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    searchParams.set('_ts', String(Date.now()));

    return this.http.get<ApiPaginated<Unit>>(`${this.apiUrl}?${searchParams.toString()}`);
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

  createUnit(payload: UnitPayload): Observable<ApiSuccess<Unit>> {
    return this.http.post<ApiSuccess<Unit>>(this.apiUrl, payload);
  }

  updateUnit(id: string, payload: UnitPayload): Observable<ApiSuccess<Unit>> {
    return this.http.put<ApiSuccess<Unit>>(`${this.apiUrl}/${id}`, payload);
  }

  deleteUnit(id: string, hardDelete = false): Observable<ApiSuccess<null>> {
    const suffix = hardDelete ? '?hardDelete=true' : '';
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}${suffix}`);
  }
}