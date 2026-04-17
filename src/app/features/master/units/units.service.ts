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
export class UnitsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/units`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  getUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(`${this.apiUrl}?_ts=${Date.now()}`);
  }

  listCategories(): Observable<ApiPaginated<CategoryOption>> {
    return this.http.get<ApiPaginated<CategoryOption>>(`${this.categoriesUrl}?status=ACTIVE`);
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