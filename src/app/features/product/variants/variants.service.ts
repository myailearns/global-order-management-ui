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

export interface Group {
  _id: string;
  name: string;
  categoryId?: string;
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
  tenantId?: string;
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
  private readonly authSession = inject(AuthSessionService);

  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;
  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;
  private readonly unitsUrl = `${environment.apiBaseUrl}/units`;

  private get tenantHeaders(): Record<string, string> {
    const headers = this.authSession.getTenantHeaders();
    // Fallback: read directly from storage if signal hasn't hydrated yet
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

  deleteVariant(id: string): Observable<ApiSuccess<{ id: string }>> {
    return this.http.delete<ApiSuccess<{ id: string }>>(`${this.variantsUrl}/${id}`, { headers: this.tenantHeaders });
  }

  previewVariantPrice(payload: {
    groupId: string;
    quantity: number;
    unitId: string;
  }): Observable<ApiSuccess<VariantPricePreview>> {
    return this.http.post<ApiSuccess<VariantPricePreview>>(`${this.variantsUrl}/preview-price`, payload, { headers: this.tenantHeaders });
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

  listUnits(): Observable<ApiPaginated<Unit>> {
    return this.http.get<ApiPaginated<Unit>>(`${this.unitsUrl}?status=ACTIVE`, { headers: this.tenantHeaders });
  }
}
