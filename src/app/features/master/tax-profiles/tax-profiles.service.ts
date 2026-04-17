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

export type TaxMode = 'GST' | 'NO_TAX';
export type TaxStatus = 'ACTIVE' | 'INACTIVE';

export interface TaxProfile {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: TaxMode;
  rate: number;
  inclusive: boolean;
  hsnCode?: string;
  status: TaxStatus;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  updatedAt: string;
}

export interface TaxProfilePayload {
  name: string;
  countryCode: string;
  taxMode: TaxMode;
  rate: number;
  inclusive: boolean;
  hsnCode?: string;
  status: TaxStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TaxProfilesService {
  private readonly http = inject(HttpClient);
  private readonly taxProfilesUrl = `${environment.apiBaseUrl}/tax-profiles`;

  listTaxProfiles(page = 1, limit = 100): Observable<ApiPaginated<TaxProfile>> {
    return this.http.get<ApiPaginated<TaxProfile>>(`${this.taxProfilesUrl}?page=${page}&limit=${limit}`);
  }

  createTaxProfile(payload: TaxProfilePayload): Observable<ApiSuccess<TaxProfile>> {
    return this.http.post<ApiSuccess<TaxProfile>>(this.taxProfilesUrl, payload);
  }

  updateTaxProfile(id: string, payload: TaxProfilePayload): Observable<ApiSuccess<TaxProfile>> {
    return this.http.put<ApiSuccess<TaxProfile>>(`${this.taxProfilesUrl}/${id}`, payload);
  }
}
