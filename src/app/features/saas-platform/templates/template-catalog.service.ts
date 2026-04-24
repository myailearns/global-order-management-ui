import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CategoryAssociations, AvailableAssociations, UpdateAssociationsPayload } from '../../master/categories/categories.service';

export interface TemplateCategory {
  _id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateCategoryDetail {
  category: TemplateCategory;
  fields: TemplateField[];
  fieldGroups: TemplateFieldGroup[];
  units: TemplateUnit[];
  groups: TemplateGroup[];
}

export interface TemplateField {
  _id: string;
  name: string;
  key: string;
  type: string;
  fieldKind: string;
  defaultValue: number | string;
  isRequired: boolean;
  status: string;
}

export interface TemplateFieldGroup {
  _id: string;
  name: string;
  version: number;
  fields: { fieldId: string; order: number; defaultValue: number | null; requiredOverride: boolean | null }[];
  categoryIds: string[];
  status: string;
}

export interface TemplateUnit {
  _id: string;
  name: string;
  symbol: string;
  baseUnitId: string | null;
  conversionFactor: number;
  categoryIds: string[];
  status: string;
}

export interface TemplateGroup {
  _id: string;
  name: string;
  categoryId: string;
  quantity: number;
  status: string;
}

export interface TemplateTaxProfile {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: string;
  rate: number;
  inclusive: boolean;
  hsnCode?: string;
  status: string;
}

export interface BusinessTemplate {
  _id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  categoryIds: TemplateCategory[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessTemplatePreview {
  template: BusinessTemplate;
  categories: Array<{ _id: string; name: string; description?: string }>;
  fieldGroups: Array<{ _id: string; name: string; fields: Array<{ name: string; key: string; type: string }> }>;
  units: Array<{ _id: string; name: string; symbol: string }>;
  taxProfiles: Array<{ _id: string; name: string; rate: number }>;
  summary: { categoryCount: number; fieldGroupCount: number; unitCount: number; taxProfileCount: number };
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class TemplateCatalogService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/platform/templates`;

  private get headers(): HttpHeaders {
    return new HttpHeaders(this.authSession.getPlatformHeaders());
  }

  // --- Categories ---
  listCategories(): Observable<ApiPaginated<TemplateCategory>> {
    return this.http.get<ApiPaginated<TemplateCategory>>(`${this.baseUrl}/categories`, { headers: this.headers });
  }

  getCategoryDetail(id: string): Observable<TemplateCategoryDetail> {
    return this.http
      .get<ApiSuccess<TemplateCategoryDetail>>(`${this.baseUrl}/categories/${id}`, { headers: this.headers })
      .pipe(map((r) => r.data));
  }

  createCategory(payload: { name: string; description?: string }): Observable<ApiSuccess<TemplateCategory>> {
    return this.http.post<ApiSuccess<TemplateCategory>>(`${this.baseUrl}/categories`, payload, { headers: this.headers });
  }

  updateCategory(id: string, payload: Partial<TemplateCategory>): Observable<ApiSuccess<TemplateCategory>> {
    return this.http.put<ApiSuccess<TemplateCategory>>(`${this.baseUrl}/categories/${id}`, payload, { headers: this.headers });
  }

  deleteCategory(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.baseUrl}/categories/${id}`, { headers: this.headers });
  }

  // --- Fields ---
  listFields(): Observable<ApiPaginated<TemplateField>> {
    return this.http.get<ApiPaginated<TemplateField>>(`${this.baseUrl}/fields`, { headers: this.headers });
  }

  createField(payload: Partial<TemplateField> & Record<string, any>): Observable<ApiSuccess<TemplateField>> {
    return this.http.post<ApiSuccess<TemplateField>>(`${this.baseUrl}/fields`, payload, { headers: this.headers });
  }

  updateField(id: string, payload: Partial<TemplateField> & Record<string, any>): Observable<ApiSuccess<TemplateField>> {
    return this.http.put<ApiSuccess<TemplateField>>(`${this.baseUrl}/fields/${id}`, payload, { headers: this.headers });
  }

  deleteField(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.baseUrl}/fields/${id}`, { headers: this.headers });
  }

  // --- Field Groups ---
  listFieldGroups(): Observable<ApiPaginated<TemplateFieldGroup>> {
    return this.http.get<ApiPaginated<TemplateFieldGroup>>(`${this.baseUrl}/field-groups`, { headers: this.headers });
  }

  createFieldGroup(payload: Partial<TemplateFieldGroup>): Observable<ApiSuccess<TemplateFieldGroup>> {
    return this.http.post<ApiSuccess<TemplateFieldGroup>>(`${this.baseUrl}/field-groups`, payload, { headers: this.headers });
  }

  updateFieldGroup(id: string, payload: Partial<TemplateFieldGroup>): Observable<ApiSuccess<TemplateFieldGroup>> {
    return this.http.put<ApiSuccess<TemplateFieldGroup>>(`${this.baseUrl}/field-groups/${id}`, payload, { headers: this.headers });
  }

  deleteFieldGroup(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.baseUrl}/field-groups/${id}`, { headers: this.headers });
  }

  // --- Units ---
  listUnits(): Observable<ApiPaginated<TemplateUnit>> {
    return this.http.get<ApiPaginated<TemplateUnit>>(`${this.baseUrl}/units`, { headers: this.headers });
  }

  createUnit(payload: Partial<TemplateUnit> & Record<string, any>): Observable<ApiSuccess<TemplateUnit>> {
    return this.http.post<ApiSuccess<TemplateUnit>>(`${this.baseUrl}/units`, payload, { headers: this.headers });
  }

  updateUnit(id: string, payload: Partial<TemplateUnit> & Record<string, any>): Observable<ApiSuccess<TemplateUnit>> {
    return this.http.put<ApiSuccess<TemplateUnit>>(`${this.baseUrl}/units/${id}`, payload, { headers: this.headers });
  }

  deleteUnit(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.baseUrl}/units/${id}`, { headers: this.headers });
  }

  // --- Tax Profiles ---
  listTaxProfiles(): Observable<ApiPaginated<TemplateTaxProfile>> {
    return this.http.get<ApiPaginated<TemplateTaxProfile>>(`${this.baseUrl}/tax-profiles`, { headers: this.headers });
  }

  createTaxProfile(payload: Partial<TemplateTaxProfile>): Observable<ApiSuccess<TemplateTaxProfile>> {
    return this.http.post<ApiSuccess<TemplateTaxProfile>>(`${this.baseUrl}/tax-profiles`, payload, { headers: this.headers });
  }

  updateTaxProfile(id: string, payload: Partial<TemplateTaxProfile>): Observable<ApiSuccess<TemplateTaxProfile>> {
    return this.http.put<ApiSuccess<TemplateTaxProfile>>(`${this.baseUrl}/tax-profiles/${id}`, payload, { headers: this.headers });
  }

  deleteTaxProfile(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.baseUrl}/tax-profiles/${id}`, { headers: this.headers });
  }

  // --- Category Associations ---
  getCategoryAssociations(id: string): Observable<ApiSuccess<CategoryAssociations>> {
    return this.http.get<ApiSuccess<CategoryAssociations>>(`${this.baseUrl}/categories/${id}/associations`, { headers: this.headers });
  }

  getAvailableCategoryAssociations(id: string): Observable<ApiSuccess<AvailableAssociations>> {
    return this.http.get<ApiSuccess<AvailableAssociations>>(`${this.baseUrl}/categories/${id}/available-associations`, { headers: this.headers });
  }

  updateCategoryAssociations(id: string, payload: UpdateAssociationsPayload): Observable<ApiSuccess<CategoryAssociations>> {
    return this.http.patch<ApiSuccess<CategoryAssociations>>(`${this.baseUrl}/categories/${id}/associations`, payload, { headers: this.headers });
  }

  // --- Business Templates ---
  private readonly btBaseUrl = `${environment.apiBaseUrl}/platform/business-templates`;

  listBusinessTemplates(): Observable<ApiPaginated<BusinessTemplate>> {
    return this.http.get<ApiPaginated<BusinessTemplate>>(this.btBaseUrl, { headers: this.headers });
  }

  getBusinessTemplatePreview(id: string): Observable<ApiSuccess<BusinessTemplatePreview>> {
    return this.http.get<ApiSuccess<BusinessTemplatePreview>>(`${this.btBaseUrl}/${id}/preview`, { headers: this.headers });
  }

  createBusinessTemplate(payload: { name: string; code: string; description?: string; icon?: string; categoryIds?: string[] }): Observable<ApiSuccess<BusinessTemplate>> {
    return this.http.post<ApiSuccess<BusinessTemplate>>(this.btBaseUrl, payload, { headers: this.headers });
  }

  updateBusinessTemplate(id: string, payload: Record<string, unknown>): Observable<ApiSuccess<BusinessTemplate>> {
    return this.http.put<ApiSuccess<BusinessTemplate>>(`${this.btBaseUrl}/${id}`, payload, { headers: this.headers });
  }

  deleteBusinessTemplate(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.btBaseUrl}/${id}`, { headers: this.headers });
  }
}
