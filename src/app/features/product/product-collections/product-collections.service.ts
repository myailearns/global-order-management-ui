import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface ProductCollection {
  _id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  autoSyncNewVariants: boolean;
  showOnHomeScreen: boolean;
  showAllItemsOnHomeScreen: boolean;
  createdAt?: string;
  updatedAt?: string;
  itemCount?: {
    groups: number;
    variants: number;
    total: number;
  };
}

export interface ProductCollectionAssignment {
  type: 'GROUP' | 'VARIANT';
  referenceId: string;
  assignedAt?: string;
  assignedBy?: string;
  group?: ProductCollectionGroup | null;
  variant?: ProductCollectionVariant | null;
}

export interface ProductCollectionMappingState {
  selectedCategoryIds: string[];
  selectedGroupIds: string[];
  excludedVariantIdsGlobal: string[];
  excludedVariantIdsByGroup: Array<{
    groupId: string;
    variantIds: string[];
  }>;
}

export interface ProductCollectionDetail extends ProductCollection {
  assignments: ProductCollectionAssignment[];
  mappingState?: ProductCollectionMappingState;
}

export interface ProductCollectionCategory {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProductCollectionGroup {
  _id: string;
  name: string;
  categoryId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProductCollectionVariant {
  _id: string;
  name: string;
  groupId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProductCollectionUpsertPayload {
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  autoSyncNewVariants?: boolean;
  showOnHomeScreen?: boolean;
  showAllItemsOnHomeScreen?: boolean;
  assignments?: Array<{ type: 'GROUP' | 'VARIANT'; referenceId: string }>;
  mappingState?: ProductCollectionMappingState;
}

export interface ProductCollectionResolvedGroup {
  type: 'GROUP';
  group: ProductCollectionGroup;
  variants: Array<ProductCollectionVariant & { sourceLabels?: string[] }>;
}

export interface ProductCollectionResolvedVariant {
  type: 'VARIANT';
  variant: ProductCollectionVariant & { sourceLabels?: string[] };
}

export type ProductCollectionResolvedItem = ProductCollectionResolvedGroup | ProductCollectionResolvedVariant;

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiPaginated<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
  };
}

interface ApiPaginatedWithTotals<T> extends ApiPaginated<T> {
  itemCount?: {
    groups: number;
    variants: number;
    total: number;
  };
  resolvedItems?: {
    total: number;
    groups: number;
    variants: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ProductCollectionsService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly apiUrl = `${environment.apiBaseUrl}/product-collections`;

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  list(params?: { page?: number; limit?: number; status?: 'ACTIVE' | 'INACTIVE'; search?: string }): Observable<ApiPaginated<ProductCollection>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const url = queryString ? `${this.apiUrl}?${queryString}` : this.apiUrl;
    return this.http.get<ApiPaginated<ProductCollection>>(url, { headers: this.tenantHeaders });
  }

  create(payload: {
    name: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    assignments?: Array<{ type: 'GROUP' | 'VARIANT'; referenceId: string }>;
    mappingState?: ProductCollectionMappingState;
  }): Observable<ApiSuccess<ProductCollection>> {
    return this.http.post<ApiSuccess<ProductCollection>>(this.apiUrl, payload, { headers: this.tenantHeaders });
  }

  update(id: string, payload: ProductCollectionUpsertPayload): Observable<ApiSuccess<ProductCollection>> {
    return this.http.put<ApiSuccess<ProductCollection>>(`${this.apiUrl}/${id}`, payload, { headers: this.tenantHeaders });
  }

  remove(id: string): Observable<ApiSuccess<{ deleted: boolean }>> {
    return this.http.delete<ApiSuccess<{ deleted: boolean }>>(`${this.apiUrl}/${id}`, { headers: this.tenantHeaders });
  }

  getById(id: string, expand = false): Observable<ApiSuccess<ProductCollectionDetail>> {
    const url = expand ? `${this.apiUrl}/${id}?expand=true` : `${this.apiUrl}/${id}`;
    return this.http.get<ApiSuccess<ProductCollectionDetail>>(url, { headers: this.tenantHeaders });
  }

  assignItems(id: string, payload: { assignments: Array<{ type: 'GROUP' | 'VARIANT'; referenceId: string }> }): Observable<ApiSuccess<ProductCollection>> {
    return this.http.post<ApiSuccess<ProductCollection>>(`${this.apiUrl}/${id}/assign`, payload, { headers: this.tenantHeaders });
  }

  unassignItems(id: string, payload: { referenceIds: string[] }): Observable<ApiSuccess<ProductCollection>> {
    return this.http.request<ApiSuccess<ProductCollection>>('delete', `${this.apiUrl}/${id}/assign`, {
      headers: this.tenantHeaders,
      body: payload,
    });
  }

  getResolvedItems(
    id: string,
    params?: { page?: number; limit?: number; status?: 'ACTIVE' | 'INACTIVE'; groupId?: string }
  ): Observable<ApiPaginatedWithTotals<ProductCollectionResolvedItem>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.groupId) query.set('groupId', params.groupId);

    const queryString = query.toString();
    const url = queryString ? `${this.apiUrl}/${id}/items?${queryString}` : `${this.apiUrl}/${id}/items`;
    return this.http.get<ApiPaginatedWithTotals<ProductCollectionResolvedItem>>(url, { headers: this.tenantHeaders });
  }

  listCategories(params?: { page?: number; limit?: number; status?: 'ACTIVE' | 'INACTIVE'; search?: string }): Observable<ApiPaginated<ProductCollectionCategory>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const baseUrl = `${environment.apiBaseUrl}/categories`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return this.http.get<ApiPaginated<ProductCollectionCategory>>(url, { headers: this.tenantHeaders });
  }

  listGroups(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    categoryId?: string;
  }): Observable<ApiPaginated<ProductCollectionGroup>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', params.categoryId);

    const queryString = query.toString();
    const baseUrl = `${environment.apiBaseUrl}/groups`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return this.http.get<ApiPaginated<ProductCollectionGroup>>(url, { headers: this.tenantHeaders });
  }

  listVariants(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    groupId?: string;
  }): Observable<ApiPaginated<ProductCollectionVariant>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.groupId) query.set('groupId', params.groupId);

    const queryString = query.toString();
    const baseUrl = `${environment.apiBaseUrl}/variants`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return this.http.get<ApiPaginated<ProductCollectionVariant>>(url, { headers: this.tenantHeaders });
  }

  listCollectionsByGroup(groupId: string): Observable<ApiSuccess<ProductCollection[]>> {
    return this.http.get<ApiSuccess<ProductCollection[]>>(`${environment.apiBaseUrl}/groups/${groupId}/collections`, {
      headers: this.tenantHeaders,
    });
  }

  listCollectionsByVariant(variantId: string): Observable<ApiSuccess<ProductCollection[]>> {
    return this.http.get<ApiSuccess<ProductCollection[]>>(`${environment.apiBaseUrl}/variants/${variantId}/collections`, {
      headers: this.tenantHeaders,
    });
  }
}
