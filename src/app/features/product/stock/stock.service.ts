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
  isLowStock: boolean;
}

export interface StockHistoryEntry {
  _id: string;
  groupId: string;
  movementType: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  convertedQuantityInBase: number;
  unitId: {
    _id: string;
    name: string;
    symbol: string;
  };
  referenceType: 'purchase' | 'sale' | 'adjustment' | 'return';
  referenceId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AddStockPayload {
  groupId: string;
  quantity: number;
  unitId: string;
  referenceId?: string;
  notes?: string;
}

export interface UpdateStockPayload {
  quantity: number;
  unitId: string;
  notes?: string;
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

  getHistory(groupId: string, page = 1, limit = 20): Observable<ApiPaginated<StockHistoryEntry>> {
    return this.http.get<ApiPaginated<StockHistoryEntry>>(
      `${this.stockUrl}/history?groupId=${groupId}&page=${page}&limit=${limit}`
    );
  }

  addStock(payload: AddStockPayload): Observable<ApiSuccess<unknown>> {
    return this.http.post<ApiSuccess<unknown>>(`${this.stockUrl}/in`, payload);
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
}
