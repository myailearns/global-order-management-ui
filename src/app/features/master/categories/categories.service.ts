import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface Category {
  _id?: string;
  name: string;
  description?: string;
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

export interface UpdateAssociationsPayload {
  addFieldGroupIds?: string[];
  removeFieldGroupIds?: string[];
  addUnitIds?: string[];
  removeUnitIds?: string[];
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
export class CategoriesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/categories`;

  constructor(
    private readonly http: HttpClient,
    private readonly authSession: AuthSessionService,
  ) {}

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  getCategories(): Observable<ApiPaginated<Category>> {
    return this.http.get<ApiPaginated<Category>>(this.apiUrl, { headers: this.tenantHeaders });
  }

  createCategory(category: { name: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiSuccess<Category>> {
    return this.http.post<ApiSuccess<Category>>(this.apiUrl, category, { headers: this.tenantHeaders });
  }

  updateCategory(id: string, category: { name: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiSuccess<Category>> {
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

  updateAssociations(id: string, payload: UpdateAssociationsPayload): Observable<ApiSuccess<CategoryAssociations>> {
    return this.http.patch<ApiSuccess<CategoryAssociations>>(`${this.apiUrl}/${id}/associations`, payload, { headers: this.tenantHeaders });
  }
}
