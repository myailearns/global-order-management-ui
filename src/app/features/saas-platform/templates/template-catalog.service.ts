import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
  valueFormat?: 'NUMBER' | 'CURRENCY';
  currencyCode?: 'INR' | null;
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

export interface BusinessCategory {
  _id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessType {
  _id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  businessCategoryIds: BusinessCategory[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export type BusinessTypeConfigSectionKey = 'categories' | 'fields' | 'field-groups' | 'units' | 'tax-profiles';

export interface BusinessTypeConfigSection {
  key: BusinessTypeConfigSectionKey;
  label: string;
  count: number;
}

export interface BusinessTypeConfigurationSummary {
  businessType: {
    _id: string;
    name: string;
    code: string;
    description: string;
    icon: string;
    status: 'ACTIVE' | 'INACTIVE';
    businessCategories: BusinessCategory[];
    updatedAt?: string;
    createdAt?: string;
  };
  sections: BusinessTypeConfigSection[];
}

export interface BusinessTypeConfigItem {
  _id: string;
  name: string;
  description?: string;
  key?: string;
  type?: string;
  defaultValue?: unknown;
  version?: number;
  fieldCount?: number;
  categoryCount?: number;
  symbol?: string;
  conversionFactor?: number;
  countryCode?: string;
  taxMode?: string;
  rate?: number;
  inclusive?: boolean;
  status: string;
  updatedAt?: string;
  createdAt?: string;
  attached: boolean;
}

export interface BusinessTypeConfigItemsResponse {
  resource: BusinessTypeConfigSectionKey;
  label: string;
  businessType: { _id: string; name: string; status: string };
  counts: { all: number; attached: number; available: number };
  items: BusinessTypeConfigItem[];
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
  };
}

export interface TemplateCategoryBulkUploadAcceptedResponse {
  success: boolean;
  message: string;
  data: {
    jobId: string;
    status: string;
    queuedAt: string;
  };
}

export interface TemplateCategoryBulkUploadJobStatus {
  jobId: string;
  status: 'QUEUED' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  isTerminal: boolean;
  totals: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    unresolvedRows: number;
  };
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string;
  userAcknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface BusinessTemplateTemplateDownloadResponse {
  success: boolean;
}

export interface BusinessTypeBulkImportResultRow {
  rowNumber: number;
  id?: string;
  name: string;
  categoryName: string;
  status: 'CREATED' | 'FAILED';
  message: string;
}

export interface BusinessTypeBulkImportResult {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  results: BusinessTypeBulkImportResultRow[];
}

@Injectable({ providedIn: 'root' })
export class TemplateCatalogService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/platform/templates`;
  private readonly taxonomyBaseUrl = `${environment.apiBaseUrl}/platform/business-taxonomy`;

  private get headers(): HttpHeaders {
    return new HttpHeaders(this.authSession.getPlatformHeaders());
  }

  private buildListParams(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): HttpParams {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    if (params?.order) {
      httpParams = httpParams.set('order', params.order);
    }

    return httpParams;
  }

  // --- Categories ---
  listCategories(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<TemplateCategory>> {
    return this.http.get<ApiPaginated<TemplateCategory>>(`${this.baseUrl}/categories`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
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

  downloadCategoryBulkTemplate(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/categories/bulk/template`, {
      headers: this.headers.set('Accept', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      responseType: 'blob',
    });
  }

  uploadCategoryBulkFile(file: File): Observable<TemplateCategoryBulkUploadAcceptedResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TemplateCategoryBulkUploadAcceptedResponse>(`${this.baseUrl}/categories/bulk/upload`, formData, {
      headers: this.headers,
    });
  }

  getCategoryBulkUploadStatus(jobId: string): Observable<ApiSuccess<TemplateCategoryBulkUploadJobStatus>> {
    return this.http.get<ApiSuccess<TemplateCategoryBulkUploadJobStatus>>(`${this.baseUrl}/categories/bulk/jobs/${jobId}/status`, {
      headers: this.headers,
    });
  }

  // --- Business Taxonomy Categories ---
  listBusinessCategories(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<BusinessCategory>> {
    return this.http.get<ApiPaginated<BusinessCategory>>(`${this.taxonomyBaseUrl}/categories`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
  }

  createBusinessCategory(payload: { name: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiSuccess<BusinessCategory>> {
    return this.http.post<ApiSuccess<BusinessCategory>>(`${this.taxonomyBaseUrl}/categories`, payload, { headers: this.headers });
  }

  updateBusinessCategory(id: string, payload: Partial<BusinessCategory>): Observable<ApiSuccess<BusinessCategory>> {
    return this.http.put<ApiSuccess<BusinessCategory>>(`${this.taxonomyBaseUrl}/categories/${id}`, payload, { headers: this.headers });
  }

  deleteBusinessCategory(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.taxonomyBaseUrl}/categories/${id}`, { headers: this.headers });
  }

  downloadBusinessCategoryBulkTemplate(): Observable<Blob> {
    return this.http.get(`${this.taxonomyBaseUrl}/categories/bulk/template`, {
      headers: this.headers.set('Accept', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      responseType: 'blob',
    });
  }

  uploadBusinessCategoryBulkFile(file: File): Observable<TemplateCategoryBulkUploadAcceptedResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TemplateCategoryBulkUploadAcceptedResponse>(`${this.taxonomyBaseUrl}/categories/bulk/upload`, formData, {
      headers: this.headers,
    });
  }

  getBusinessCategoryBulkUploadStatus(jobId: string): Observable<ApiSuccess<TemplateCategoryBulkUploadJobStatus>> {
    return this.http.get<ApiSuccess<TemplateCategoryBulkUploadJobStatus>>(`${this.taxonomyBaseUrl}/categories/bulk/jobs/${jobId}/status`, {
      headers: this.headers,
    });
  }

  // --- Business Taxonomy Types ---
  listBusinessTypes(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<BusinessType>> {
    return this.http.get<ApiPaginated<BusinessType>>(`${this.taxonomyBaseUrl}/types`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
  }

  createBusinessType(payload: { name: string; code: string; description?: string; icon?: string; businessCategoryIds?: string[]; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiSuccess<BusinessType>> {
    return this.http.post<ApiSuccess<BusinessType>>(`${this.taxonomyBaseUrl}/types`, payload, { headers: this.headers });
  }

  uploadBusinessTypeBulkFile(file: File): Observable<ApiSuccess<BusinessTypeBulkImportResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiSuccess<BusinessTypeBulkImportResult>>(`${this.taxonomyBaseUrl}/types/bulk/upload`, formData, {
      headers: this.headers,
    });
  }

  updateBusinessType(id: string, payload: Record<string, unknown>): Observable<ApiSuccess<BusinessType>> {
    return this.http.put<ApiSuccess<BusinessType>>(`${this.taxonomyBaseUrl}/types/${id}`, payload, { headers: this.headers });
  }

  getBusinessTypeConfiguration(id: string): Observable<ApiSuccess<BusinessTypeConfigurationSummary>> {
    return this.http.get<ApiSuccess<BusinessTypeConfigurationSummary>>(`${this.taxonomyBaseUrl}/types/${id}/configuration`, {
      headers: this.headers,
    });
  }

  listBusinessTypeConfigItems(id: string, resource: BusinessTypeConfigSectionKey): Observable<ApiSuccess<BusinessTypeConfigItemsResponse>> {
    return this.http.get<ApiSuccess<BusinessTypeConfigItemsResponse>>(`${this.taxonomyBaseUrl}/types/${id}/configuration/${resource}`, {
      headers: this.headers,
    });
  }

  updateBusinessTypeConfigItems(id: string, resource: BusinessTypeConfigSectionKey, payload: { addIds?: string[]; removeIds?: string[]; setIds?: string[] }): Observable<ApiSuccess<{ resource: string; attachedCount: number; attachedIds: string[] }>> {
    return this.http.patch<ApiSuccess<{ resource: string; attachedCount: number; attachedIds: string[] }>>(`${this.taxonomyBaseUrl}/types/${id}/configuration/${resource}`, payload, {
      headers: this.headers,
    });
  }

  deleteBusinessType(id: string): Observable<ApiSuccess<null>> {
    return this.http.delete<ApiSuccess<null>>(`${this.taxonomyBaseUrl}/types/${id}`, { headers: this.headers });
  }

  downloadBusinessTypeTemplate(): Observable<Blob> {
    return this.http.get(`${this.taxonomyBaseUrl}/types/template`, {
      headers: this.headers.set('Accept', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      responseType: 'blob',
    });
  }

  // --- Fields ---
  listFields(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<TemplateField>> {
    return this.http.get<ApiPaginated<TemplateField>>(`${this.baseUrl}/fields`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
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
  listFieldGroups(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<TemplateFieldGroup>> {
    return this.http.get<ApiPaginated<TemplateFieldGroup>>(`${this.baseUrl}/field-groups`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
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
  listUnits(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<TemplateUnit>> {
    return this.http.get<ApiPaginated<TemplateUnit>>(`${this.baseUrl}/units`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
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
  listTaxProfiles(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: 'asc' | 'desc' }): Observable<ApiPaginated<TemplateTaxProfile>> {
    return this.http.get<ApiPaginated<TemplateTaxProfile>>(`${this.baseUrl}/tax-profiles`, {
      headers: this.headers,
      params: this.buildListParams(params),
    });
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
