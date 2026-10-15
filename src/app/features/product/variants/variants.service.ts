import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

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

export interface GroupResolvedField {
  fieldId: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE';
  value: number;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  categoryId?: string;
  groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  fieldGroupId?: string;
  fieldGroupVersion?: number;
  resolvedFields?: GroupResolvedField[];
  excludedFieldKeys?: string[];
  formula?: {
    sellingPrice?: string;
    anchorPrice?: string;
    actualPrice?: string;
  };
  optionAxes?: Array<{
    key: string;
    label: string;
    values: string[];
  }>;
  baseUnitId: string;
  allowedUnitIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface VariantCombinationItem {
  combinationKey: string;
  quantity: number;
  unitId: string;
  optionSelections: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  enabled: boolean;
  exists: boolean;
  name: string;
}

export interface VariantCombinationPreview {
  groupId: string;
  groupType: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  total: number;
  items: VariantCombinationItem[];
}

export interface Unit {
  _id: string;
  name: string;
  symbol: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Variant {
  _id: string;
  tenantId?: string;
  groupId: string;
  name: string;
  itemType: 'INDIVIDUAL' | 'PACK';
  quantity: number;
  unitId: string;
  convertedQuantity: number;
  variantDescription?: string;
  useOnlyVariantMedia?: boolean;
  useOnlyVariantDescription?: boolean;
  effectiveDescription?: string;
  effectiveMediaCount?: number;
  effectiveMediaSource?: 'NONE' | 'GROUP_ONLY' | 'VARIANT_ONLY' | 'GROUP_AND_VARIANT';
  optionSelections?: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  fieldOverrides?: Record<string, number>;
  additionalPrice?: number;
  additionalPriceReason?: string | null;
  price: {
    sellingPrice: number;
    anchorPrice: number;
  };
  pricingMode: 'FORMULA' | 'OVERRIDE';
  override?: {
    fixedSellingPrice?: number | null;
    discountType: 'PERCENT' | 'AMOUNT';
    discountValue: number;
    finalAnchorPrice?: number | null;
    reason?: string | null;
  } | null;
  effectivePrice?: {
    sellingPrice: number;
    anchorPrice: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

export interface CreateVariantsPayload {
  groupId: string;
  variants: Array<{
    name?: string;
    itemType?: 'INDIVIDUAL' | 'PACK';
    quantity: number;
    unitId: string;
    optionSelections?: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    fieldOverrides?: Record<string, number>;
    additionalPrice?: number;
    additionalPriceReason?: string;
    pricingMode?: 'FORMULA' | 'OVERRIDE';
    fixedSellingPrice?: number;
    discountType?: 'PERCENT' | 'AMOUNT';
    discountValue?: number;
    finalAnchorPrice?: number | null;
    reason?: string;
    combinationKey?: string;
    variantDescription?: string;
    useOnlyVariantMedia?: boolean;
    useOnlyVariantDescription?: boolean;
  }>;
}

export interface UpdateVariantPayload {
  name?: string;
  itemType?: 'INDIVIDUAL' | 'PACK';
  quantity: number;
  unitId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  additionalPrice?: number;
  additionalPriceReason?: string;
  fieldOverrides?: Record<string, number>;
  pricingMode?: 'FORMULA' | 'OVERRIDE';
  fixedSellingPrice?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
  finalAnchorPrice?: number | null;
  reason?: string;
  clearOverride?: boolean;
  variantDescription?: string;
  useOnlyVariantMedia?: boolean;
  useOnlyVariantDescription?: boolean;
}

export interface VariantPricePreview {
  convertedQuantity: number;
  sellingPrice: number;
  anchorPrice: number;
}

export interface TargetMarginPreview {
  targetMarginPercent: number;
  unitCost: number;
  recommendedSellingPrice: number;
  expectedMarginPercent: number;
  currentMarginPercent?: number | null;
  costing?: {
    effectiveCostPerBaseUnit: number;
    convertedQuantity: number;
    estimatedUnitCost: number;
  };
}

export interface PricingSnapshot {
  name: string;
  convertedQuantity: number;
  price: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice: number;
  };
  effectivePrice: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice: number;
  };
  additionalPrice?: number;
  pricingBreakdown?: {
    baseSellingPrice: number;
    additionalPrice: number;
    finalSellingPrice: number;
  };
}

export interface PricingRefreshSuggestion {
  _id: string;
  tenantId: string;
  groupId: string;
  variantId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  triggerSource: 'GROUP_UPDATE' | 'STOCK_EVENT' | 'MANUAL_REFRESH';
  previousSnapshot: PricingSnapshot;
  suggestedSnapshot: PricingSnapshot;
  marginImpact?: {
    oldMarginPercent: number;
    newMarginPercent: number;
    blendedMarginPercent: number;
    thresholdPercent: number;
    changePercent: number;
    isBelowThreshold: boolean;
  };
  targetMarginPreview?: TargetMarginPreview | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRefreshDecisionPayload {
  suggestionIds?: string[];
  reason: string;
  targetMarginPercent?: number;
  useTargetMarginPricing?: boolean;
}

export interface ManualPriceUpdatePayload {
  scope: 'VARIANT' | 'GROUP';
  reason: string;
  variantId?: string;
  fixedSellingPrice?: number;
  groupId?: string;
  adjustmentType?: 'AMOUNT' | 'PERCENT';
  adjustmentValue?: number;
}

export interface ManualPriceUpdateResult {
  scope: 'VARIANT' | 'GROUP';
  updatedCount: number;
  variantId?: string;
  groupId?: string;
  historyCount?: number;
  adjustmentType?: 'AMOUNT' | 'PERCENT';
  adjustmentValue?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VariantsService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);

  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;
  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly unitsUrl = `${environment.apiBaseUrl}/units`;

  private get tenantHeaders(): Record<string, string> {
    const headers = this.authSession.getTenantHeaders();
    if (!headers['x-tenant-id']) {
      try {
        const raw = localStorage.getItem('gom-auth-session');
        const session = raw ? JSON.parse(raw) : null;
        if (session?.actorType === 'tenant' && session?.tenantId) {
          return {
            'x-tenant-id': session.tenantId,
            'x-user-id': session.userId || '',
            'x-actor-id': session.userId || '',
          };
        }
      } catch {
        // ignore parse errors
      }
    }
    return headers;
  }

  listVariants(
    groupId?: string,
    page?: number,
    limit?: number,
    status?: 'ACTIVE' | 'INACTIVE',
    search?: string,
    sortBy?: string,
    order?: 'asc' | 'desc'
  ): Observable<ApiPaginated<Variant>> {
    const params = new URLSearchParams();
    if (groupId) params.set('groupId', groupId);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (order) params.set('order', order);

    const query = params.toString();
    const url = query ? `${this.variantsUrl}?${query}` : this.variantsUrl;
    return this.http.get<ApiPaginated<Variant>>(url, { headers: this.tenantHeaders });
  }

  createVariants(payload: CreateVariantsPayload): Observable<ApiSuccess<Variant[]>> {
    return this.http.post<ApiSuccess<Variant[]>>(this.variantsUrl, payload, { headers: this.tenantHeaders });
  }

  updateVariant(id: string, payload: UpdateVariantPayload): Observable<ApiSuccess<Variant>> {
    return this.http.put<ApiSuccess<Variant>>(`${this.variantsUrl}/${id}`, payload, { headers: this.tenantHeaders });
  }

  deleteVariant(id: string): Observable<ApiSuccess<{ id: string; unmappedFromCollections?: number }>> {
    return this.http.delete<ApiSuccess<{ id: string; unmappedFromCollections?: number }>>(`${this.variantsUrl}/${id}`, { headers: this.tenantHeaders });
  }

  getVariantOrderCount(variantId: string): Observable<ApiSuccess<{ orderCount: number }>> {
    return this.http.get<ApiSuccess<{ orderCount: number }>>(`${this.variantsUrl}/${variantId}/order-count`, { headers: this.tenantHeaders });
  }

  getVariantOrderStatusBreakdown(variantId: string): Observable<ApiSuccess<{ draftCount: number; confirmedCount: number; totalCount: number }>> {
    return this.http.get<ApiSuccess<{ draftCount: number; confirmedCount: number; totalCount: number }>>(`${this.variantsUrl}/${variantId}/order-status-breakdown`, { headers: this.tenantHeaders });
  }

  previewVariantPrice(payload: {
    groupId: string;
    quantity: number;
    unitId: string;
    fieldOverrides?: Record<string, number>;
  }): Observable<ApiSuccess<VariantPricePreview>> {
    return this.http.post<ApiSuccess<VariantPricePreview>>(`${this.variantsUrl}/preview-price`, payload, { headers: this.tenantHeaders });
  }

  previewTargetMargin(payload: {
    targetMarginPercent: number;
    variantId?: string;
    groupId?: string;
    quantity?: number;
    unitId?: string;
  }): Observable<ApiSuccess<TargetMarginPreview>> {
    return this.http.post<ApiSuccess<TargetMarginPreview>>(`${this.variantsUrl}/target-margin-preview`, payload, { headers: this.tenantHeaders });
  }

  manualPriceUpdate(payload: ManualPriceUpdatePayload): Observable<ApiSuccess<ManualPriceUpdateResult>> {
    return this.http.post<ApiSuccess<ManualPriceUpdateResult>>(`${this.variantsUrl}/manual-price-update`, payload, { headers: this.tenantHeaders });
  }

  listGroups(page?: number, limit?: number, status?: 'ACTIVE' | 'INACTIVE'): Observable<ApiPaginated<Group>> {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);

    const query = params.toString();
    const url = query ? `${this.groupsUrl}?${query}` : this.groupsUrl;
    return this.http.get<ApiPaginated<Group>>(url, { headers: this.tenantHeaders });
  }

  previewVariantCombinations(payload: {
    groupId: string;
    measuredOptions?: Array<{ quantity: number; unitId: string; enabled?: boolean }>;
    disabledCombinationKeys?: string[];
  }): Observable<ApiSuccess<VariantCombinationPreview>> {
    return this.http.post<ApiSuccess<VariantCombinationPreview>>(`${this.groupsUrl}/variants/auto-generate/preview`, payload, { headers: this.tenantHeaders });
  }

  listUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(`${this.unitsUrl}?status=ACTIVE`, { headers: this.tenantHeaders });
  }

  listPricingRefreshSuggestions(groupId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' = 'PENDING'): Observable<ApiPaginated<PricingRefreshSuggestion>> {
    const params = new URLSearchParams();
    params.set('status', status);
    return this.http.get<ApiPaginated<PricingRefreshSuggestion>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions?${params.toString()}`, { headers: this.tenantHeaders });
  }

  listPricingRefreshSuggestionsWithTargetMargin(groupId: string, targetMarginPercent: number): Observable<ApiPaginated<PricingRefreshSuggestion>> {
    const params = new URLSearchParams();
    params.set('status', 'PENDING');
    params.set('targetMarginPercent', String(targetMarginPercent));
    return this.http.get<ApiPaginated<PricingRefreshSuggestion>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions?${params.toString()}`, { headers: this.tenantHeaders });
  }

  approvePricingRefreshSuggestions(groupId: string, payload: PricingRefreshDecisionPayload): Observable<ApiSuccess<{ approvedCount: number; appliedCount: number }>> {
    return this.http.post<ApiSuccess<{ approvedCount: number; appliedCount: number }>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions/approve`, payload, { headers: this.tenantHeaders });
  }

  rejectPricingRefreshSuggestions(groupId: string, payload: PricingRefreshDecisionPayload): Observable<ApiSuccess<{ rejectedCount: number }>> {
    return this.http.post<ApiSuccess<{ rejectedCount: number }>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions/reject`, payload, { headers: this.tenantHeaders });
  }
}
