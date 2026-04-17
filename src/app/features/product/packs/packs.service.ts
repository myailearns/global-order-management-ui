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

export interface Pack {
  _id: string;
  name: string;
  items: Array<{
    variantId: string;
    variantName: string;
    quantity: number;
    sellingPrice: number;
    anchorPrice: number;
  }>;
  price: {
    sellingPrice: number;
    anchorPrice: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

export interface VariantOption {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  effectivePrice?: {
    sellingPrice: number;
    anchorPrice: number;
  };
  price: {
    sellingPrice: number;
    anchorPrice: number;
  };
}

export interface CreatePackPayload {
  name: string;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  status?: 'ACTIVE' | 'INACTIVE';
}

@Injectable({
  providedIn: 'root',
})
export class PacksService {
  private readonly http = inject(HttpClient);

  private readonly packsUrl = `${environment.apiBaseUrl}/packs`;
  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;

  listPacks(page = 1, limit = 100): Observable<ApiPaginated<Pack>> {
    return this.http.get<ApiPaginated<Pack>>(`${this.packsUrl}?page=${page}&limit=${limit}`);
  }

  createPack(payload: CreatePackPayload): Observable<ApiSuccess<Pack>> {
    return this.http.post<ApiSuccess<Pack>>(this.packsUrl, payload);
  }

  updatePack(id: string, payload: CreatePackPayload): Observable<ApiSuccess<Pack>> {
    return this.http.put<ApiSuccess<Pack>>(`${this.packsUrl}/${id}`, payload);
  }

  deletePack(id: string): Observable<ApiSuccess<{ id: string }>> {
    return this.http.delete<ApiSuccess<{ id: string }>>(`${this.packsUrl}/${id}`);
  }

  listVariantOptions(page = 1, limit = 100): Observable<ApiPaginated<VariantOption>> {
    return this.http.get<ApiPaginated<VariantOption>>(`${this.variantsUrl}?status=ACTIVE&page=${page}&limit=${limit}`);
  }
}
