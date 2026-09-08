import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

// ─────────────────────────────────────────────
// Shared models
// ─────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

export interface ApiPaginated<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiPaginatedWithExport<T> extends ApiPaginated<T> {
  export?: {
    filename: string;
    contentType: string;
    content: string;
  };
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ─────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────

export interface SimplePricingCategory {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// ─────────────────────────────────────────────
// Group (minimal shape needed for pricing)
// ─────────────────────────────────────────────

export interface SimplePricingResolvedField {
  fieldId: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE';
  value: number;
}

export interface SimplePricingGroup {
  _id: string;
  name: string;
  groupType: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  categoryId: string;
  baseUnitId: string;
  allowedUnitIds: string[];
  resolvedFields?: SimplePricingResolvedField[];
  formula?: {
    sellingPrice?: string;
    anchorPrice?: string;
    actualPrice?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

// ─────────────────────────────────────────────
// Variant (minimal shape needed for pricing)
// ─────────────────────────────────────────────

export interface SimplePricingVariant {
  _id: string;
  groupId: string;
  name: string;
  sku?: string;
  quantity: number;
  unitId: string;
  convertedQuantity: number;
  optionSelections?: Array<{ key: string; label: string; value: string }>;
  pricingMode: 'FORMULA' | 'OVERRIDE';
  additionalPrice?: number;
  additionalPriceReason?: string | null;
  price: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice?: number;
  };
  override?: {
    fixedSellingPrice?: number | null;
    discountType?: 'PERCENT' | 'AMOUNT' | null;
    discountValue?: number | null;
    finalAnchorPrice?: number | null;
    reason?: string | null;
  } | null;
  effectivePrice?: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice?: number;
  };
  fieldOverrides?: Record<string, number>;
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Pricing entity — the unified table row model
// ─────────────────────────────────────────────

export type PricingEntityType = 'GROUP' | 'VARIANT';
export type PricingState = 'INHERITED' | 'ADJUSTED' | 'OVERRIDDEN' | 'DIRECT';
export type GroupType = 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
export type SimplePricingTemplateEntityType = 'GROUP' | 'VARIANT' | 'UNKNOWN';

export interface SimplePricingTemplateRefreshItem {
  item: string;
  entityType: SimplePricingTemplateEntityType;
}

export interface PricingEntity {
  /** Stable unique key for @for track */
  trackId: string;
  entityType: PricingEntityType;
  entityId: string;          // groupId for GROUP rows, variantId for VARIANT rows
  displayName: string;
  groupType: GroupType;
  categoryId: string;
  categoryName: string;

  // Prices
  sellingPrice: number;
  anchorPrice: number;
  actualPrice: number | null;

  // Formula / policy
  formulaSummary: string | null;
  resolvedFields?: SimplePricingResolvedField[];

  // Profit
  definedProfitPercent: number | null;
  affectedProfitPercent: number | null;

  // Pricing state
  pricingState: PricingState;
  pricingMode: 'FORMULA' | 'OVERRIDE';

  // For GROUP rows: child variant count
  variantCount?: number;

  // Raw references for modals
  group: SimplePricingGroup;
  variant?: SimplePricingVariant;
}

// ─────────────────────────────────────────────
// Update payloads
// ─────────────────────────────────────────────

export interface SimplePriceUpdatePayload {
  scope: 'VARIANT' | 'GROUP';
  reason: string;
  variantId?: string;
  groupId?: string;
  fixedSellingPrice?: number;
  adjustmentType?: 'AMOUNT' | 'PERCENT';
  adjustmentValue?: number;
}

export interface FieldInputUpdatePayload {
  variantId: string;
  quantity: number;
  unitId: string;
  additionalPrice?: number;
  fieldOverrides?: Record<string, number>;
  pricingMode?: 'FORMULA' | 'OVERRIDE';
  clearOverride?: boolean;
  reason?: string;
}

export interface GroupFieldValuesPayload {
  fieldValues: Array<{ fieldId: string; value: number }>;
  excludedFieldKeys?: string[];
}

export interface GroupUpdatePayload {
  formula?: {
    sellingPrice: string;
    anchorPrice: string;
    actualPrice: string;
  };
}

export interface SimplePricingTemplateDownloadFilters {
  categoryIds?: string[];
  groupTypes?: GroupType[];
  groupIds?: string[];
}

export interface SimplePricingSearchSuggestion {
  id: string;
  name: string;
  entityType: 'GROUP' | 'VARIANT';
  groupType: 'MEASURED' | 'HYBRID' | 'ATTRIBUTE';
  categoryId: string;
  groupId?: string;   // only present when entityType === 'VARIANT'
}

export interface SimplePricingPriceHistoryEntry {
  id: string;
  groupId: string;
  groupName: string | null;
  variantId: string;
  variantName: string | null;
  scope: 'GROUP' | 'VARIANT';
  eventType: string;
  fromPricingMode: 'FORMULA' | 'OVERRIDE' | null;
  toPricingMode: 'FORMULA' | 'OVERRIDE' | null;
  oldPrice: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice: number;
  };
  newPrice: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice: number;
  };
  reason: string | null;
  source: 'MANUAL_PRICING' | 'STOCK_REFRESH' | 'GROUP_REFRESH';
  actorId: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SimplePricingService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);

  private readonly apiBase = environment.apiBaseUrl;

  private get headers(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  // ── Categories ──────────────────────────────

  listCategories(): Observable<ApiPaginated<SimplePricingCategory>> {
    return this.http.get<ApiPaginated<SimplePricingCategory>>(
      `${this.apiBase}/categories?status=ACTIVE&limit=200`,
      { headers: this.headers }
    );
  }

  // ── Groups ──────────────────────────────────

  listGroups(params?: {
    groupId?: string;
    categoryId?: string;
    groupType?: GroupType;
    status?: 'ACTIVE' | 'INACTIVE';
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<ApiPaginated<SimplePricingGroup>> {
    let httpParams = new HttpParams();
    if (params?.groupId) httpParams = httpParams.set('groupId', params.groupId);
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params?.groupType) httpParams = httpParams.set('groupType', params.groupType);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<ApiPaginated<SimplePricingGroup>>(
      `${this.apiBase}/groups`,
      { headers: this.headers, params: httpParams }
    );
  }

  // ── Variants ────────────────────────────────

  listVariantsByGroup(groupId: string, params?: { page?: number; limit?: number }): Observable<ApiPaginated<SimplePricingVariant>> {
    let httpParams = new HttpParams().set('groupId', groupId).set('status', 'ACTIVE');
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ApiPaginated<SimplePricingVariant>>(
      `${this.apiBase}/variants`,
      { headers: this.headers, params: httpParams }
    );
  }

  // ── Price updates ────────────────────────────

  manualPriceUpdate(payload: SimplePriceUpdatePayload): Observable<ApiSuccess<unknown>> {
    return this.http.post<ApiSuccess<unknown>>(
      `${this.apiBase}/variants/manual-price-update`,
      payload,
      { headers: this.headers }
    );
  }

  updateVariantFieldInputs(id: string, payload: FieldInputUpdatePayload): Observable<ApiSuccess<SimplePricingVariant>> {
    return this.http.put<ApiSuccess<SimplePricingVariant>>(
      `${this.apiBase}/variants/${id}`,
      payload,
      { headers: this.headers }
    );
  }

  updateGroupFieldValues(id: string, payload: GroupFieldValuesPayload): Observable<ApiSuccess<SimplePricingGroup>> {
    return this.http.patch<ApiSuccess<SimplePricingGroup>>(
      `${this.apiBase}/groups/${id}/field-values`,
      payload,
      { headers: this.headers }
    );
  }

  updateGroup(id: string, payload: GroupUpdatePayload): Observable<ApiSuccess<SimplePricingGroup>> {
    return this.http.put<ApiSuccess<SimplePricingGroup>>(
      `${this.apiBase}/groups/${id}`,
      payload,
      { headers: this.headers }
    );
  }

  downloadTemplate(filters?: SimplePricingTemplateDownloadFilters): Observable<Blob> {
    const payload: SimplePricingTemplateDownloadFilters = {};
    if (filters?.categoryIds?.length) payload.categoryIds = filters.categoryIds;
    if (filters?.groupTypes?.length) payload.groupTypes = filters.groupTypes;
    if (filters?.groupIds?.length) payload.groupIds = filters.groupIds;

    return this.http.post<Blob>(
      `${this.apiBase}/variants/simple-pricing/template/download`,
      payload,
      {
        headers: this.headers,
        responseType: 'blob' as 'json',
      }
    );
  }

  listPriceHistory(params: {
    groupId?: string;
    variantId?: string;
    page?: number;
    limit?: number;
    eventType?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<ApiPaginatedWithExport<SimplePricingPriceHistoryEntry>> {
    let httpParams = new HttpParams();

    if (params.groupId) httpParams = httpParams.set('groupId', params.groupId);
    if (params.variantId) httpParams = httpParams.set('variantId', params.variantId);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    if (params.eventType) httpParams = httpParams.set('eventType', params.eventType);
    if (params.actorId) httpParams = httpParams.set('actorId', params.actorId);
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);

    return this.http.get<ApiPaginatedWithExport<SimplePricingPriceHistoryEntry>>(
      `${this.apiBase}/variants/price-history`,
      { headers: this.headers, params: httpParams }
    );
  }

  exportPriceHistoryCsv(params: {
    groupId?: string;
    variantId?: string;
    eventType?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<ApiPaginatedWithExport<SimplePricingPriceHistoryEntry>> {
    let httpParams = new HttpParams().set('format', 'csv');

    if (params.groupId) httpParams = httpParams.set('groupId', params.groupId);
    if (params.variantId) httpParams = httpParams.set('variantId', params.variantId);
    if (params.eventType) httpParams = httpParams.set('eventType', params.eventType);
    if (params.actorId) httpParams = httpParams.set('actorId', params.actorId);
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);

    return this.http.get<ApiPaginatedWithExport<SimplePricingPriceHistoryEntry>>(
      `${this.apiBase}/variants/price-history`,
      { headers: this.headers, params: httpParams }
    );
  }

  refreshTemplate(file: File): Observable<ApiSuccess<{
    refreshedAt: string;
    totalRows: number;
    addedRows: number;
    retainedRows: number;
    removedRows: number;
    addedItems: SimplePricingTemplateRefreshItem[];
    removedItems: SimplePricingTemplateRefreshItem[];
    file: string;
    filename: string;
  }>> {
    const formData = new FormData();
    formData.append('templateFile', file);

    return this.http.post<ApiSuccess<{
      refreshedAt: string;
      totalRows: number;
      addedRows: number;
      retainedRows: number;
      removedRows: number;
      addedItems: SimplePricingTemplateRefreshItem[];
      removedItems: SimplePricingTemplateRefreshItem[];
      file: string;
      filename: string;
    }>>(
      `${this.apiBase}/variants/simple-pricing/template/refresh`,
      formData,
      { headers: this.headers }
    );
  }

    searchEntities(query: string, limit = 20): Observable<ApiSuccess<SimplePricingSearchSuggestion[]>> {
    let params = new HttpParams().set('q', query).set('limit', String(limit));
    return this.http.get<ApiSuccess<SimplePricingSearchSuggestion[]>>(
      `${this.apiBase}/variants/simple-pricing/search`,
      { headers: this.headers, params }
    );
  }
}
