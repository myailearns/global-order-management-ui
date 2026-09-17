import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
  canLoadAll: boolean;
  tenantPlan?: string;
}

export interface ApiPaginated<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Category {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Field {
  _id: string;
  name: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'LONG_TEXT';
  valueFormat?: 'NUMBER' | 'CURRENCY';
  currencyCode?: 'INR' | null;
  fieldKind?: 'PRICING' | 'METADATA';
  defaultValue: number | string;
  isRequired: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FieldGroupItem {
  fieldId: string;
  order: number;
  defaultValue?: number | null;
  requiredOverride?: boolean | null;
}

export interface FieldGroup {
  _id: string;
  name: string;
  version: number;
  fields: FieldGroupItem[];
  categoryIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Unit {
  _id: string;
  name: string;
  symbol: string;
  baseUnitId: string | null;
  conversionFactor: number;
  status: 'ACTIVE' | 'INACTIVE';
  categoryIds?: string[];
}

export interface TaxProfile {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: 'GST' | 'NO_TAX';
  rate: number;
  inclusive: boolean;
  hsnCode: string;
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface GroupResolvedField {
  fieldId: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE';
  value: number;
}

export type PricingRefreshMode = 'FIXED' | 'MANUAL_REFRESH' | 'AUTO_REFRESH';

export interface Group {
  _id: string;
  name: string;
  description?: string;
  groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  categoryId: string;
  quantity: number;
  fieldGroupId: string;
  fieldGroupVersion: number;
  resolvedFields: GroupResolvedField[];
    excludedFieldKeys: string[];
  optionAxes?: Array<{
    key: string;
    label: string;
    values: string[];
  }>;
  formula: {
    sellingPrice: string;
    anchorPrice: string;
    actualPrice: string;
  };
  pricingRefreshMode?: PricingRefreshMode;
  baseUnitId: string;
  allowedUnitIds: string[];
  taxProfileId?: string | null;
  attributeSetId?: string | null;
  pricingTemplateId?: string | null;
  completionState?: 'QUICK_CREATE_PENDING' | 'FIELD_VALUES_PENDING' | 'VARIANTS_PENDING' | 'MEDIA_PENDING' | 'COMPLETE';
  completionChecklist?: {
    fieldValues: boolean;
    variants: boolean;
    media: boolean;
    advancedSettings: boolean;
  };
  completedAt?: string | null;
  completionSummary?: {
    completionState: 'QUICK_CREATE_PENDING' | 'FIELD_VALUES_PENDING' | 'VARIANTS_PENDING' | 'MEDIA_PENDING' | 'COMPLETE';
    completionChecklist: {
      fieldValues: boolean;
      variants: boolean;
      media: boolean;
      advancedSettings: boolean;
    };
    variantCount: number;
    hasMedia: boolean;
  };
  stock?: {
    onHand: number;
    reserved: number;
    available: number;
    reorderLevel: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

export interface GroupDeleteResult {
  id: string;
  unmappedFromCollections?: number;
  removedVariantCount?: number;
}

export interface GroupCompletionStatus {
  groupId: string;
  completionState: 'QUICK_CREATE_PENDING' | 'FIELD_VALUES_PENDING' | 'VARIANTS_PENDING' | 'MEDIA_PENDING' | 'COMPLETE';
  completedAt: string | null;
  checklist: Array<{
    item: 'fieldValues' | 'variants' | 'media' | 'advancedSettings';
    completed: boolean;
  }>;
  allComplete: boolean;
  nextPendingItems: Array<'fieldValues' | 'variants' | 'media' | 'advancedSettings'>;
}

export interface GroupAdvancedPricingPreview {
  currentFormula: {
    actualPrice: string;
    sellingPrice: string;
    anchorPrice: string;
  };
  proposedFormula: {
    actualPrice: string;
    sellingPrice: string;
    anchorPrice: string;
  };
  preview: {
    actualPrice: number;
    sellingPrice: number;
    anchorPrice: number;
  };
}

export interface GroupVariantCombinationItem {
  combinationKey: string;
  quantity: number;
  unitId: string;
  optionSelections: Array<{
    key: string;
    label?: string;
    value: string;
  }>;
  enabled: boolean;
  exists: boolean;
  name: string;
}

export interface GroupVariantGenerationPreview {
  groupId: string;
  groupType: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  total: number;
  items: GroupVariantCombinationItem[];
}

export interface GroupPayload {
  name: string;
  description?: string;
  groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  createDefaultVariant?: boolean;
  defaultVariant?: {
    quantity: number;
    unitId: string;
  };
  categoryId: string;
  quantity: number;
  fieldGroupId: string;
  customFields: Array<{ fieldId: string; value: number }>;
    excludedFieldKeys: string[];
  optionAxes?: Array<{
    key: string;
    label: string;
    values: string[];
  }>;
  formula: {
    sellingPrice: string;
    anchorPrice: string;
    actualPrice: string;
  };
  pricingRefreshMode: PricingRefreshMode;
  baseUnitId: string;
  allowedUnitIds: string[];
  taxProfileId?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly http = inject(HttpClient);

  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/categories`;
  private readonly fieldsUrl = `${environment.apiBaseUrl}/fields`;
  private readonly fieldGroupsUrl = `${environment.apiBaseUrl}/field-groups`;
  private readonly unitsUrl = `${environment.apiBaseUrl}/units`;
  private readonly taxProfilesUrl = `${environment.apiBaseUrl}/tax-profiles`;

  listGroups(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    categoryId?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Group>> {
    let httpParams = new HttpParams();
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.order) httpParams = httpParams.set('order', params.order);
    return this.http.get<ApiPaginated<Group>>(this.groupsUrl, { params: httpParams });
  }

  createGroup(payload: GroupPayload): Observable<ApiSuccess<Group>> {
    return this.http.post<ApiSuccess<Group>>(this.groupsUrl, payload);
  }

  updateGroup(id: string, payload: GroupPayload): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}`, payload);
  }

  getGroupById(id: string): Observable<ApiSuccess<Group>> {
    return this.http.get<ApiSuccess<Group>>(`${this.groupsUrl}/${id}`);
  }

  getGroupOrderStatusBreakdown(groupId: string): Observable<ApiSuccess<{
    draftCount: number;
    confirmedCount: number;
    totalCount: number;
    affectedVariants: Array<{ id: string; name: string; sku: string }>;
  }>> {
    return this.http.get<ApiSuccess<{
      draftCount: number;
      confirmedCount: number;
      totalCount: number;
      affectedVariants: Array<{ id: string; name: string; sku: string }>;
    }>>(`${this.groupsUrl}/${groupId}/order-status-breakdown`);
  }

  getGroupCompletionStatus(id: string): Observable<ApiSuccess<GroupCompletionStatus>> {
    return this.http.get<ApiSuccess<GroupCompletionStatus>>(`${this.groupsUrl}/${id}/completion-status`);
  }

  updateGroupCompletionChecklist(
    id: string,
    payload: Partial<Record<'fieldValues' | 'variants' | 'media' | 'advancedSettings', boolean>>,
  ): Observable<ApiSuccess<Group>> {
    return this.http.patch<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/completion-checklist`, payload);
  }

  markGroupComplete(id: string): Observable<ApiSuccess<Group>> {
    return this.http.post<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/completion/complete`, {});
  }

  updateGroupFieldValues(
    id: string,
    payload: { fieldValues: Array<{ fieldId: string; value: number }>; excludedFieldKeys?: string[] },
  ): Observable<ApiSuccess<Group>> {
    return this.http.patch<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/field-values`, payload);
  }

  previewAdvancedPricing(
    id: string,
    payload: { actualPrice?: string; sellingPrice?: string; anchorPrice?: string },
  ): Observable<ApiSuccess<GroupAdvancedPricingPreview>> {
    return this.http.post<ApiSuccess<GroupAdvancedPricingPreview>>(`${this.groupsUrl}/${id}/pricing/advanced/preview`, payload);
  }

  updateAdvancedPricing(
    id: string,
    payload: { actualPrice?: string; sellingPrice?: string; anchorPrice?: string },
  ): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/pricing/advanced`, payload);
  }

  updateGroupUnits(
    id: string,
    payload: { baseUnitId?: string; allowedUnitIds?: string[] },
  ): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/units`, payload);
  }

  updateGroupMappings(
    id: string,
    payload: { fieldGroupId?: string; attributeSetId?: string | null; pricingTemplateId?: string | null },
  ): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/mappings`, payload);
  }

  updateGroupAdvancedSettings(
    id: string,
    payload: { taxProfileId?: string | null; pricingRefreshMode?: PricingRefreshMode; groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID'; optionAxes?: Array<{ key: string; label: string; values: string[] }> },
  ): Observable<ApiSuccess<Group>> {
    return this.http.put<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/advanced`, payload);
  }

  generateGroupVariants(
    id: string,
    payload?: { measuredOptions?: Array<{ quantity: number; unitId: string }>; disabledCombinationKeys?: string[] },
  ): Observable<ApiSuccess<{ createdCount: number; skippedCount: number; created: unknown[] }>> {
    return this.http.post<ApiSuccess<{ createdCount: number; skippedCount: number; created: unknown[] }>>(`${this.groupsUrl}/${id}/variants/generate`, payload || {});
  }

  previewAutoGenerateVariants(payload: {
    groupId: string;
    measuredOptions?: Array<{ quantity: number; unitId: string }>;
    disabledCombinationKeys?: string[];
  }): Observable<ApiSuccess<GroupVariantGenerationPreview>> {
    return this.http.post<ApiSuccess<GroupVariantGenerationPreview>>(`${this.groupsUrl}/variants/auto-generate/preview`, payload);
  }

  createAutoGenerateVariants(payload: {
    groupId: string;
    measuredOptions?: Array<{ quantity: number; unitId: string }>;
    disabledCombinationKeys?: string[];
  }): Observable<ApiSuccess<{ createdCount: number; skippedCount: number; created: unknown[] }>> {
    return this.http.post<ApiSuccess<{ createdCount: number; skippedCount: number; created: unknown[] }>>(`${this.groupsUrl}/variants/auto-generate/create`, payload);
  }

  deleteGroup(id: string): Observable<ApiSuccess<GroupDeleteResult>> {
    return this.http.delete<ApiSuccess<GroupDeleteResult>>(`${this.groupsUrl}/${id}`);
  }

  patchGroupStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiSuccess<Group>> {
    return this.http.patch<ApiSuccess<Group>>(`${this.groupsUrl}/${id}/status`, { status });
  }

  listCategories(): Observable<ApiPaginated<Category>> {
    return this.http.get<ApiPaginated<Category>>(`${this.categoriesUrl}?status=ACTIVE`);
  }

  listFields(): Observable<ApiPaginated<Field>> {
    return this.http.get<ApiPaginated<Field>>(this.fieldsUrl);
  }

  listFieldGroups(): Observable<ApiPaginated<FieldGroup>> {
    return this.http.get<ApiPaginated<FieldGroup>>(this.fieldGroupsUrl);
  }

  listUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(this.unitsUrl);
  }

  listTaxProfiles(): Observable<ApiPaginated<TaxProfile>> {
    return this.http.get<ApiPaginated<TaxProfile>>(`${this.taxProfilesUrl}?status=ACTIVE`);
  }

    // Simplified getters for quick-create form
    getCategories(): Observable<Category[]> {
      return new Observable(subscriber => {
        this.listCategories().subscribe({
          next: (response) => subscriber.next(response.data),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    }

    getFieldGroups(): Observable<FieldGroup[]> {
      return new Observable(subscriber => {
        this.listFieldGroups().subscribe({
          next: (response) => subscriber.next(response.data),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    }

    getUnits(): Observable<Unit[]> {
      return new Observable(subscriber => {
        this.listUnits().subscribe({
          next: (response) => subscriber.next(response.data),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    }

    getTaxProfiles(): Observable<TaxProfile[]> {
      return new Observable(subscriber => {
        this.listTaxProfiles().subscribe({
          next: (response) => subscriber.next(response.data),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    }

    previewQuickCreate(payload: { 
      categoryId: string; 
      fieldGroupId?: string;
      attributeSetId?: string;
      pricingTemplateId?: string; 
      baseUnitId?: string; 
      taxProfileId?: string;
      groupType?: string;
      pricingRefreshMode?: PricingRefreshMode;
    }): Observable<any> {
    return this.http.post<any>(`${this.groupsUrl}/quick-create/preview`, payload);
  }

    quickCreateGroup(payload: { 
      name: string; 
      categoryId: string; 
      description?: string; 
      fieldGroupId?: string; 
      attributeSetId?: string; 
      pricingTemplateId?: string; 
      baseUnitId?: string; 
      taxProfileId?: string; 
      groupType?: string; 
      pricingRefreshMode?: PricingRefreshMode; 
      allowedUnitIds?: string[]; 
      createDefaultVariant?: boolean 
    }): Observable<ApiSuccess<Group>> {
    return this.http.post<ApiSuccess<Group>>(`${this.groupsUrl}/quick-create`, payload);
  }
}
