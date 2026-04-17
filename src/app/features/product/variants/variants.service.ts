import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Group {
  _id: string;
  name: string;
  baseUnitId: string;
  allowedUnitIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Unit {
  _id: string;
  name: string;
  symbol: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Variant {
  _id: string;
  groupId: string;
  name: string;
  itemType: 'INDIVIDUAL' | 'PACK';
  quantity: number;
  unitId: string;
  convertedQuantity: number;
  additionalPrice?: number;
  additionalPriceReason?: string | null;
  price: {
    sellingPrice: number;
    anchorPrice: number;
  };
  pricingMode: 'FORMULA' | 'OVERRIDE';
  override?: {
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
    itemType?: 'INDIVIDUAL' | 'PACK';
    quantity: number;
    unitId: string;
    additionalPrice?: number;
    additionalPriceReason?: string;
    pricingMode?: 'FORMULA' | 'OVERRIDE';
    discountType?: 'PERCENT' | 'AMOUNT';
    discountValue?: number;
    finalAnchorPrice?: number;
    reason?: string;
  }>;
}

export interface UpdateVariantPayload {
  itemType?: 'INDIVIDUAL' | 'PACK';
  quantity: number;
  unitId: string;
  additionalPrice?: number;
  additionalPriceReason?: string;
  pricingMode?: 'FORMULA' | 'OVERRIDE';
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
  finalAnchorPrice?: number;
  reason?: string;
}

export interface VariantPricePreview {
  convertedQuantity: number;
  sellingPrice: number;
  anchorPrice: number;
}

@Injectable({
  providedIn: 'root',
})
export class VariantsService {
  private readonly http = inject(HttpClient);

  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;
  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly unitsUrl = `${environment.apiBaseUrl}/units`;

  listVariants(groupId: string): Observable<ApiPaginated<Variant>> {
    return this.http.get<ApiPaginated<Variant>>(`${this.variantsUrl}?groupId=${groupId}`);
  }

  createVariants(payload: CreateVariantsPayload): Observable<ApiSuccess<Variant[]>> {
    return this.http.post<ApiSuccess<Variant[]>>(this.variantsUrl, payload);
  }

  updateVariant(id: string, payload: UpdateVariantPayload): Observable<ApiSuccess<Variant>> {
    return this.http.put<ApiSuccess<Variant>>(`${this.variantsUrl}/${id}`, payload);
  }

  deleteVariant(id: string): Observable<ApiSuccess<{ id: string }>> {
    return this.http.delete<ApiSuccess<{ id: string }>>(`${this.variantsUrl}/${id}`);
  }

  previewVariantPrice(payload: {
    groupId: string;
    quantity: number;
    unitId: string;
  }): Observable<ApiSuccess<VariantPricePreview>> {
    return this.http.post<ApiSuccess<VariantPricePreview>>(`${this.variantsUrl}/preview-price`, payload);
  }

  listGroups(): Observable<ApiPaginated<Group>> {
    return this.http.get<ApiPaginated<Group>>(`${this.groupsUrl}?status=ACTIVE`);
  }

  listUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(`${this.unitsUrl}?status=ACTIVE`);
  }
}
