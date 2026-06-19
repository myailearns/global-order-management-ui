import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface Category {
  _id?: string;
  name: string;
  description?: string;
  imageAssetId?: string | null;
  imageUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface AssociationItem {
  _id: string;
  name: string;
  symbol?: string;
  status?: string;
}

export interface CategoryAssociations {
  fieldGroups: AssociationItem[];
  units: AssociationItem[];
  groups: AssociationItem[];
}

export interface AvailableAssociations {
  fieldGroups: AssociationItem[];
  units: AssociationItem[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
  canLoadAll: boolean;
  tenantPlan?: string;
}

export interface UpdateAssociationsPayload {
  addFieldGroupIds?: string[];
  removeFieldGroupIds?: string[];
  addUnitIds?: string[];
  removeUnitIds?: string[];
}

export type AssociationResourceType = 'fieldGroups' | 'units' | 'groups';
export type AvailableAssociationResourceType = 'fieldGroups' | 'units';

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

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/categories`;

  constructor(
    private readonly http: HttpClient,
    private readonly authSession: AuthSessionService,
  ) {}

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  getCategories(page?: number, limit?: number, status?: 'ACTIVE' | 'INACTIVE', search?: string, sortBy?: string, order?: 'asc' | 'desc'): Observable<ApiPaginated<Category>> {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (order) params.set('order', order);

    const query = params.toString();
    const url = query ? `${this.apiUrl}?${query}` : this.apiUrl;
    return this.http.get<ApiPaginated<Category>>(url, { headers: this.tenantHeaders });
  }

  createCategory(category: { name: string; description?: string; imageAssetId?: string | null; imageUrl?: string; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiSuccess<Category>> {
    return this.http.post<ApiSuccess<Category>>(this.apiUrl, category, { headers: this.tenantHeaders });
  }

  updateCategory(id: string, category: { name: string; description?: string; imageAssetId?: string | null; imageUrl?: string; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiSuccess<Category>> {
    return this.http.put<ApiSuccess<Category>>(`${this.apiUrl}/${id}`, category, { headers: this.tenantHeaders });
  }

  deleteCategory(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}`, { headers: this.tenantHeaders });
  }

  getAssociations(id: string): Observable<ApiSuccess<CategoryAssociations>> {
    return this.http.get<ApiSuccess<CategoryAssociations>>(`${this.apiUrl}/${id}/associations`, { headers: this.tenantHeaders });
  }

  getAvailableAssociations(id: string): Observable<ApiSuccess<AvailableAssociations>> {
    return this.http.get<ApiSuccess<AvailableAssociations>>(`${this.apiUrl}/${id}/available-associations`, { headers: this.tenantHeaders });
  }

  getAssociationsResource(
    id: string,
    params: { resource: AssociationResourceType; page?: number; limit?: number; search?: string },
  ): Observable<ApiPaginated<AssociationItem>> {
    const query = new URLSearchParams();
    query.set('resource', params.resource);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    return this.http.get<ApiPaginated<AssociationItem>>(`${this.apiUrl}/${id}/associations?${query.toString()}`, { headers: this.tenantHeaders });
  }

  getAvailableAssociationsResource(
    id: string,
    params: { resource: AvailableAssociationResourceType; page?: number; limit?: number; search?: string },
  ): Observable<ApiPaginated<AssociationItem>> {
    const query = new URLSearchParams();
    query.set('resource', params.resource);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    return this.http.get<ApiPaginated<AssociationItem>>(`${this.apiUrl}/${id}/available-associations?${query.toString()}`, { headers: this.tenantHeaders });
  }

  updateAssociations(id: string, payload: UpdateAssociationsPayload): Observable<ApiSuccess<CategoryAssociations>> {
    return this.http.patch<ApiSuccess<CategoryAssociations>>(`${this.apiUrl}/${id}/associations`, payload, { headers: this.tenantHeaders });
  }
}
