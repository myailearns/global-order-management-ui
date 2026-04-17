import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

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

export interface CustomerInsight {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
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

  listCustomerInsights(params?: {
    search?: string;
    sortBy?: 'lastOrderAt' | 'totalOrders' | 'totalSpend' | 'averageOrderValue';
    sortOrder?: 'asc' | 'desc';
    pincode?: string;
    groupId?: string;
  }): Observable<ApiPaginated<CustomerInsight>> {
    const searchParams = new URLSearchParams();
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

  listCustomerOrderHistory(customerId: string): Observable<ApiPaginated<CustomerOrderHistoryItem>> {
    return this.http.get<ApiPaginated<CustomerOrderHistoryItem>>(`${this.customersInsightsUrl}/${customerId}/orders`);
  }

  listCustomerGroups(params?: { search?: string; status?: 'ACTIVE' | 'INACTIVE' }): Observable<ApiPaginated<CustomerGroup>> {
    const searchParams = new URLSearchParams();
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

  listGroupMembers(groupId: string): Observable<ApiPaginated<CustomerGroupMember>> {
    return this.http.get<ApiPaginated<CustomerGroupMember>>(`${this.customerGroupsUrl}/${groupId}/members`);
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
}
