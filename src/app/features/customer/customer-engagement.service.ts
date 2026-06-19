import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

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

export interface CustomerInsight {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  pinAttempts?: number;
  pinLockedUntil?: string | null;
  pinLocked?: boolean;
  primaryPincode?: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
}

export interface CustomerOrderHistoryItem {
  _id: string;
  orderNo: string;
  status: string;
  orderType: string;
  orderSource: string;
  pricingSnapshot: {
    grandTotal: number;
  };
  createdAt: string;
}

export interface CustomerTopItem {
  variantId: string;
  itemName: string;
  quantity: number;
  amount: number;
  orderCount: number;
}

export interface CustomerSummary {
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
  };
  metrics: {
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalSpend: number;
    averageOrderValue: number;
    firstOrderAt?: string;
    lastOrderAt?: string;
  };
  recentOrders: CustomerOrderHistoryItem[];
  topItems: CustomerTopItem[];
  topCategories: Array<{
    categoryName: string;
    quantity: number;
    amount: number;
  }>;
  groupIds: string[];
}

export interface CustomerDetail {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  pinAttempts?: number;
  pinLockedUntil?: string | null;
}

export interface UnlockPinResult {
  status: string;
  customer: {
    id: string;
    phone: string;
    pinLocked: boolean;
    pinAttempts: number;
    pinLockedUntil?: string | null;
  };
  message: string;
}

export interface LockPinResult {
  status: string;
  customer: {
    id: string;
    phone: string;
    pinLocked: boolean;
    pinAttempts: number;
    pinLockedUntil?: string | null;
  };
  message: string;
}

export interface CustomerGroup {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  tags?: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerGroupMember {
  _id: string;
  groupId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerStatus: string;
  isActive: boolean;
  assignedAt: string;
  removedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerEngagementService {
  private readonly http = inject(HttpClient);
  private readonly customersInsightsUrl = `${environment.apiBaseUrl}/customers-insights`;
  private readonly customerGroupsUrl = `${environment.apiBaseUrl}/customer-groups`;
  private readonly customersUrl = `${environment.apiBaseUrl}/customers`;
  private readonly tenantAdminCustomersUrl = `${environment.apiBaseUrl}/tenant-admin/customers`;

  listCustomerInsights(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'lastOrderAt' | 'totalOrders' | 'totalSpend' | 'averageOrderValue';
    sortOrder?: 'asc' | 'desc';
    pincode?: string;
    groupId?: string;
  }): Observable<ApiPaginated<CustomerInsight>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.pincode) searchParams.set('pincode', params.pincode);
    if (params?.groupId) searchParams.set('groupId', params.groupId);

    const query = searchParams.toString();
    const url = query ? `${this.customersInsightsUrl}?${query}` : this.customersInsightsUrl;
    return this.http.get<ApiPaginated<CustomerInsight>>(url);
  }

  getCustomerSummary(customerId: string): Observable<ApiSuccess<CustomerSummary>> {
    return this.http.get<ApiSuccess<CustomerSummary>>(`${this.customersInsightsUrl}/${customerId}/summary`);
  }

  getCustomerById(customerId: string): Observable<ApiSuccess<CustomerDetail>> {
    return this.http.get<ApiSuccess<CustomerDetail>>(`${this.customersUrl}/${customerId}`);
  }

  listCustomerOrderHistory(customerId: string, page?: number, limit?: number): Observable<ApiPaginated<CustomerOrderHistoryItem>> {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    const url = query
      ? `${this.customersInsightsUrl}/${customerId}/orders?${query}`
      : `${this.customersInsightsUrl}/${customerId}/orders`;
    return this.http.get<ApiPaginated<CustomerOrderHistoryItem>>(url);
  }

  listCustomerGroups(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }): Observable<ApiPaginated<CustomerGroup>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const url = query ? `${this.customerGroupsUrl}?${query}` : this.customerGroupsUrl;
    return this.http.get<ApiPaginated<CustomerGroup>>(url);
  }

  createCustomerGroup(payload: { name: string; code?: string; description?: string; tags?: string[] }): Observable<ApiSuccess<CustomerGroup>> {
    return this.http.post<ApiSuccess<CustomerGroup>>(this.customerGroupsUrl, payload);
  }

  updateCustomerGroup(groupId: string, payload: { name?: string; code?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE'; tags?: string[] }): Observable<ApiSuccess<CustomerGroup>> {
    return this.http.patch<ApiSuccess<CustomerGroup>>(`${this.customerGroupsUrl}/${groupId}`, payload);
  }

  deactivateCustomerGroup(groupId: string): Observable<ApiSuccess<CustomerGroup>> {
    return this.http.delete<ApiSuccess<CustomerGroup>>(`${this.customerGroupsUrl}/${groupId}`);
  }

  listGroupMembers(groupId: string, params?: { page?: number; limit?: number; search?: string }): Observable<ApiPaginated<CustomerGroupMember>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query
      ? `${this.customerGroupsUrl}/${groupId}/members?${query}`
      : `${this.customerGroupsUrl}/${groupId}/members`;
    return this.http.get<ApiPaginated<CustomerGroupMember>>(url);
  }

  addGroupMembers(groupId: string, customerIds: string[]): Observable<ApiSuccess<{ addedCount: number; skippedCount: number; failed: Array<{ customerId: string; reason: string }> }>> {
    return this.http.post<ApiSuccess<{ addedCount: number; skippedCount: number; failed: Array<{ customerId: string; reason: string }> }>>(`${this.customerGroupsUrl}/${groupId}/members`, {
      customerIds,
    });
  }

  removeGroupMember(groupId: string, customerId: string): Observable<ApiSuccess<CustomerGroupMember>> {
    return this.http.delete<ApiSuccess<CustomerGroupMember>>(`${this.customerGroupsUrl}/${groupId}/members/${customerId}`);
  }

  searchCustomers(query: string): Observable<ApiPaginated<{ _id: string; name: string; phone: string }>> {
    return this.http.get<ApiPaginated<{ _id: string; name: string; phone: string }>>(`${this.customersUrl}?search=${encodeURIComponent(query)}`);
  }

  unlockPin(customerId: string, reason: string): Observable<ApiSuccess<UnlockPinResult>> {
    return this.http.post<ApiSuccess<UnlockPinResult>>(`${this.tenantAdminCustomersUrl}/${customerId}/unlock-pin`, { reason });
  }

  lockPin(customerId: string, reason: string): Observable<ApiSuccess<LockPinResult>> {
    return this.http.post<ApiSuccess<LockPinResult>>(`${this.tenantAdminCustomersUrl}/${customerId}/lock-pin`, { reason });
  }
}
