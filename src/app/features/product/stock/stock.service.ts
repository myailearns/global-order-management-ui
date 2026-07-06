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

export interface GroupResolvedField {
  fieldId: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE';
  value: number;
}

export interface GroupFormula {
  actualPrice?: string;
  sellingPrice?: string;
  anchorPrice?: string;
}

export interface Group {
  _id: string;
  name: string;
  baseUnitId: string;
  allowedUnitIds: string[];
  groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  pricingRefreshMode?: 'FIXED' | 'MANUAL_REFRESH' | 'AUTO_REFRESH';
  formula?: GroupFormula;
  resolvedFields: GroupResolvedField[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Unit {
  _id: string;
  name: string;
  symbol: string;
  conversionFactor?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';
export type StockReferenceType = 'purchase' | 'sale' | 'adjustment' | 'return';
export type CorrectionReasonType = 'DAMAGE' | 'RETURN' | 'EXPIRY' | 'OTHER';
export type CostingMethodType = 'WAC' | 'LATEST' | 'FIFO';
export type CostingMethodScopeType = 'GROUP' | 'TENANT_DEFAULT';

export interface StockSummary {
  groupId: string;
  groupName: string;
  baseUnit: {
    _id: string;
    name: string;
    symbol: string;
  };
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  costingMethod?: CostingMethodType;
  costingMethodScope?: CostingMethodScopeType;
  tenantDefaultCostingMethod?: CostingMethodType | null;
  effectiveCostPerBaseUnit?: number;
  effectiveInventoryCostBasisTotal?: number;
  costingSnapshot?: {
    wac: { costPerBaseUnit: number; inventoryCostBasisTotal: number };
    latest: { costPerBaseUnit: number; inventoryCostBasisTotal: number };
    fifo: { costPerBaseUnit: number; inventoryCostBasisTotal: number };
  };
  avgCostPerBaseUnit: number;
  inventoryCostBasisTotal: number;
  lastLandedCostPerBaseUnit: number;
  isLowStock: boolean;
}

export interface CostingMethodConfig {
  groupId: string;
  groupName: string;
  supportedMethods: Array<CostingMethodType>;
  tenantDefaultMethod: CostingMethodType;
  groupCostingMethod: CostingMethodType | null;
  effectiveMethod: CostingMethodType;
  effectiveScope: CostingMethodScopeType;
}

export interface StockHistoryEntry {
  _id: string;
  groupId: string;
  movementType: StockMovementType;
  quantity: number;
  convertedQuantityInBase: number;
  unitId: {
    _id: string;
    name: string;
    symbol: string;
  };
  referenceType: StockReferenceType;
  referenceId: string | null;
  notes: string | null;
  costComponents?: Array<{
    key: string;
    label: string;
    value: number;
    isRequired?: boolean;
  }>;
  costSummary?: {
    totalCost: number;
    costPerBaseUnit: number;
    componentCount: number;
  };
  pricingImpact?: {
    mode: 'FIXED' | 'MANUAL_REFRESH' | 'AUTO_REFRESH';
    triggerSource: string;
    planCount: number;
    appliedCount: number;
    suggestionCount: number;
    historyCount: number;
    totals: {
      sellingPrice: number;
      anchorPrice: number;
      actualPrice: number;
      marginPercent: number;
      profitValue: number;
    };
    variantChanges: Array<{
      variantId: string;
      variantName: string;
      triggerSource: string;
      before: {
        sellingPrice: number;
        anchorPrice: number;
        actualPrice: number;
        marginPercent: number;
        profitValue: number;
      };
      after: {
        sellingPrice: number;
        anchorPrice: number;
        actualPrice: number;
        marginPercent: number;
        profitValue: number;
      };
      delta: {
        sellingPrice: number;
        anchorPrice: number;
        actualPrice: number;
        marginPercent: number;
        profitValue: number;
      };
    }>;
  } | null;
  variantAllocations?: Array<{
    variantId: string;
    quantity: number;
    convertedQuantityInBase: number;
  }>;
  createdBy: string;
  createdAt: string;
}

export interface GroupPricingHistoryEntry {
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

export interface AddStockPayload {
  groupId: string;
  quantity: number;
  unitId: string;
  variantId?: string;
  variantAllocations?: Array<{
    variantId: string;
    quantity: number;
  }>;
  costComponents?: Array<{
    key: string;
    label: string;
    value: number;
    isRequired?: boolean;
  }>;
  referenceId?: string;
  notes?: string;
}

export interface AdjustStockPayload {
  groupId: string;
  quantityDelta: number;
  unitId: string;
  variantId?: string;
  correctionReason: CorrectionReasonType;
  notes?: string;
}

export interface UpdateStockPayload {
  quantity: number;
  unitId: string;
  correctionReason?: CorrectionReasonType;
  notes?: string;
}

export interface StockVariantItem {
  _id: string;
  name: string;
  quantity: number;
  convertedQuantity: number;
  unitId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface VariantStockInfo {
  variantId: string;
  variantName: string;
  quantity: number;
  convertedQuantity: number;
  unit: { _id: string; name: string; symbol: string } | null;
  onHand: number;
  reserved: number;
  available: number;
}

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private readonly http = inject(HttpClient);

  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly unitsUrl = `${environment.apiBaseUrl}/units`;
  private readonly stockUrl = `${environment.apiBaseUrl}/stock`;

  listGroups(): Observable<ApiPaginated<Group>> {
    return this.http.get<ApiPaginated<Group>>(`${this.groupsUrl}?status=ACTIVE`);
  }

  listUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(`${this.unitsUrl}?status=ACTIVE`);
  }

  getSummary(groupId: string): Observable<ApiSuccess<StockSummary>> {
    return this.http.get<ApiSuccess<StockSummary>>(`${this.stockUrl}/summary?groupId=${groupId}`);
  }

  getHistory(params: {
    groupId: string;
    page?: number;
    limit?: number;
    movementType?: StockMovementType;
    transactionType?: StockMovementType;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<ApiPaginated<StockHistoryEntry>> {
    const query = new URLSearchParams();
    query.set('groupId', params.groupId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.movementType) query.set('movementType', params.movementType);
    if (params.transactionType) query.set('transactionType', params.transactionType);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);

    return this.http.get<ApiPaginated<StockHistoryEntry>>(`${this.stockUrl}/history?${query.toString()}`);
  }

  addStock(payload: AddStockPayload): Observable<ApiSuccess<unknown>> {
    return this.http.post<ApiSuccess<unknown>>(`${this.stockUrl}/in`, payload);
  }

  adjustStock(payload: AdjustStockPayload): Observable<ApiSuccess<unknown>> {
    return this.http.post<ApiSuccess<unknown>>(`${this.stockUrl}/adjust`, payload);
  }

  updateStockEntry(id: string, payload: UpdateStockPayload): Observable<ApiSuccess<unknown>> {
    return this.http.put<ApiSuccess<unknown>>(`${this.stockUrl}/history/${id}`, payload);
  }

  deleteStockEntry(id: string): Observable<ApiSuccess<unknown>> {
    return this.http.delete<ApiSuccess<unknown>>(`${this.stockUrl}/history/${id}`);
  }

  updateReorderLevel(groupId: string, reorderLevel: number): Observable<ApiSuccess<unknown>> {
    return this.http.patch<ApiSuccess<unknown>>(`${this.stockUrl}/${groupId}/reorder-level`, { reorderLevel });
  }

  updateGroupResolvedFields(groupId: string, fields: Array<{ fieldId: string; value: number }>): Observable<ApiSuccess<unknown>> {
    const payload = {
      customFields: fields,
    };
    return this.http.put<ApiSuccess<unknown>>(`${this.groupsUrl}/${groupId}`, payload);
  }

  listVariantsByGroup(groupId: string): Observable<ApiPaginated<StockVariantItem>> {
    return this.http.get<ApiPaginated<StockVariantItem>>(
      `${environment.apiBaseUrl}/variants?groupId=${groupId}&status=ACTIVE&limit=200`
    );
  }

  getVariantStockSummary(groupId: string): Observable<ApiSuccess<VariantStockInfo[]>> {
    return this.http.get<ApiSuccess<VariantStockInfo[]>>(
      `${this.stockUrl}/variant-summary?groupId=${groupId}`
    );
  }

  getCostingMethodConfig(groupId: string): Observable<ApiSuccess<CostingMethodConfig>> {
    return this.http.get<ApiSuccess<CostingMethodConfig>>(`${this.stockUrl}/costing-method?groupId=${groupId}`);
  }

  updateGroupCostingMethod(groupId: string, costingMethod: 'WAC' | 'LATEST' | 'FIFO'): Observable<ApiSuccess<unknown>> {
    return this.http.patch<ApiSuccess<unknown>>(`${this.stockUrl}/costing-method`, {
      scope: 'GROUP',
      groupId,
      costingMethod,
    });
  }

  listPricingRefreshSuggestions(groupId: string): Observable<ApiPaginated<{ _id: string; variantId: string; status: string; previousSnapshot: { name: string; effectivePrice: { sellingPrice: number }; additionalPrice?: number }; suggestedSnapshot: { name: string; effectivePrice: { sellingPrice: number }; additionalPrice?: number }; marginImpact?: { oldMarginPercent: number; newMarginPercent: number; changePercent: number; isBelowThreshold: boolean } }>> {
    return this.http.get<ApiPaginated<never>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions?status=PENDING`);
  }

  approvePricingRefreshSuggestions(groupId: string, payload: { reason: string; suggestionIds?: string[] }): Observable<ApiSuccess<{ approvedCount: number; appliedCount: number }>> {
    return this.http.post<ApiSuccess<{ approvedCount: number; appliedCount: number }>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions/approve`, payload);
  }

  rejectPricingRefreshSuggestions(groupId: string, payload: { reason: string; suggestionIds?: string[] }): Observable<ApiSuccess<{ rejectedCount: number }>> {
    return this.http.post<ApiSuccess<{ rejectedCount: number }>>(`${this.groupsUrl}/${groupId}/pricing-refresh-suggestions/reject`, payload);
  }

  getPendingPricingSuggestionsCount(): Observable<ApiSuccess<{ count: number }>> {
    return this.http.get<ApiSuccess<{ count: number }>>(`${this.groupsUrl}/pricing-refresh-suggestions/pending-count`);
  }

  getPendingGroupsSummary(): Observable<ApiSuccess<{ totalPending: number; groups: Array<{ groupId: string; groupName: string; pendingCount: number; lastCreatedAt: string }> }>> {
    return this.http.get<ApiSuccess<{ totalPending: number; groups: Array<{ groupId: string; groupName: string; pendingCount: number; lastCreatedAt: string }> }>>(`${this.groupsUrl}/pricing-refresh-suggestions/pending-groups`);
  }

  listGroupPricingHistory(groupId: string, limit = 25): Observable<ApiPaginated<GroupPricingHistoryEntry>> {
    const query = new URLSearchParams();
    query.set('groupId', groupId);
    query.set('page', '1');
    query.set('limit', String(limit));
    return this.http.get<ApiPaginated<GroupPricingHistoryEntry>>(`${environment.apiBaseUrl}/variants/price-history?${query.toString()}`);
  }
}
