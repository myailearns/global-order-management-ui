import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
    tenantPlan?: string;
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
  description?: string;
  allowOutOfStockItems?: boolean;
  outOfStockThreshold?: number;
  items: Array<{
    variantId: string;
    variantName: string;
    quantity: number;
    sellingPrice: number;
    anchorPrice: number;
    actualPrice?: number;
    percentOfTotal?: number;
  }>;
  price: {
    sellingPrice: number;
    anchorPrice: number;
  };
  actualPrice?: number;
  discountPercentage?: number;
  discountDescription?: string;
  badges?: Array<{
    label: string;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'dark';
  }>;
  images?: Array<{
    url: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    thumbnailUrl?: string;
    format?: string;
    mimeType?: string;
  }>;
  stockSummary?: {
    outOfStock: boolean;
    outOfStockItemCount: number;
    threshold: number;
    totalItems: number;
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
    actualPrice?: number;
  };
  price: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice?: number;
  };
}

export interface CreatePackPayload {
  name: string;
  description?: string;
  allowOutOfStockItems?: boolean;
  outOfStockThreshold?: number;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  discountPercentage?: number;
  discountDescription?: string;
  badges?: Array<{
    label: string;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'dark';
  }>;
  images?: Array<{
    url: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    thumbnailUrl?: string;
    format?: string;
    mimeType?: string;
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

  listPacks(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Pack>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.packsUrl}?${query}` : this.packsUrl;
    return this.http.get<ApiPaginated<Pack>>(url);
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
