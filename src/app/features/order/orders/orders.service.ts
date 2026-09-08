import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, forkJoin, map, reduce } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ApiPaginated<T> {
  success: boolean;
  message?: string;
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

export interface OrderAttentionCounts {
  paymentPending: number;
  awaitingConfirmation: number;
  returnRequests: number;
  deliveryDelayed: number;
}

export interface OrderNavigationCounts {
  total: number;
  statuses: Record<string, number>;
  attention?: OrderAttentionCounts;
}

export interface BulkOrderStatusResult {
  successful: Array<{ orderId: string; orderNo: string; status: string }>;
  failed: Array<{ orderId: string; message: string; statusCode: number }>;
  summary: {
    requested: number;
    updated: number;
    failed: number;
  };
}

export type PincodeFallbackSuggestion = 'CALL_COURIER' | 'CALL_PICKUP';
export type PincodeMode = 'DISABLED' | 'SERVE_ALL' | 'RESTRICTED';

export interface TenantDeliveryPincodeConfig {
  enabled: boolean;
  pincodeMode: PincodeMode;
  serviceablePincodes: string[];
  nonServiceableSuggestion: PincodeFallbackSuggestion;
}

export type TenantPaymentMethod = 'UPI' | 'CASH' | 'BANK_TRANSFER';
export type TenantPaymentOrderType = 'inStore' | 'pickup' | 'delivery';

export interface TenantPaymentOptionsConfig {
  enabledMethods?: {
    upi?: boolean;
    cash?: boolean;
    bankTransfer?: boolean;
  };
  upiAccounts?: Array<{
    id?: string;
    providerName?: string;
    upiId?: string;
    qrCodeUrl?: string;
    active?: boolean;
  }>;
  bankAccounts?: Array<{
    id?: string;
    bankName?: string;
    accountHolderName?: string;
    accountNumberLast4?: string;
    ifscCode?: string;
    branchName?: string;
    active?: boolean;
  }>;
  orderTypeMethods?: Partial<Record<TenantPaymentOrderType, TenantPaymentMethod[]>>;
}

export interface PickupConfig {
  locationId?: string;
  locationName?: string;
  storeAddressLine1?: string;
  storeAddressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  mapUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  pickupInstructions?: string;
  notes?: string;
  pickupTimingText?: string;
  pickupAdvanceDays?: number | null;
  pickupSameDayLeadMinutes?: number | null;
}

export interface ServiceablePincodeEntry {
  pincode: string;
  deliveryChargeOverride?: number | null;
  estimatedTimeOverride?: number | null;
  estimatedTimeUnit?: 'DAYS' | 'HOURS' | 'MINUTES';
  active?: boolean;
  [key: string]: unknown;
}

export interface TenantConfigPayload {
  tenantId: string;
  deliveryPincodeConfig?: TenantDeliveryPincodeConfig;
  paymentOptions?: TenantPaymentOptionsConfig;
  createOrderConfig?: {
    enableOfflineStorage?: boolean;
    requireMemberForBilling?: boolean;
    paymentStatuses?: {
      pickup?: string[];
      delivery?: string[];
      counter?: string[];
    };
    orderIntakeChannels?: Array<{
      name: string;
      enabled: boolean;
    }>;
  };
  storefrontConfig?: {
    storeSlug?: string;
    deliveryCharge?: number;
    pincodeServiceabilityMode?: 'SERVE_ALL' | 'RESTRICTED';
    serviceablePincodes?: ServiceablePincodeEntry[];
    pickupConfig?: PickupConfig;
    pickupLocations?: PickupConfig[];
    pickupAdvanceDays?: number | null;
    pickupSameDayLeadMinutes?: number | null;
  };
  storefrontShare?: {
    storeSlug?: string;
  };
}

export interface ProductsTabGroupSummary {
  id: string;
  name: string;
  imageUrl?: string;
  variantCount: number;
  groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  baseUnitId?: string;
  allowedUnits?: Array<{
    id: string;
    name: string;
    symbol: string;
    baseUnitId?: string | null;
    conversionFactor: number;
  }>;
}

export interface StorefrontGroupDetail extends ProductsTabGroupSummary {
  description?: string;
  variants: ProductsTabVariantRow[];
}

export interface StorefrontPricePreview {
  convertedQuantity: number;
  sellingPrice: number;
  anchorPrice: number;
  actualPrice: number;
}

export interface ProductsTabVariantRow {
  id: string;
  groupId: string;
  groupName: string;
  groupImageUrl?: string;
  name?: string;
  quantity: number;
  unitId: string;
  unitSymbol?: string;
  convertedQuantity: number;
  effectivePrice: {
    sellingPrice: number;
    anchorPrice?: number;
    actualPrice?: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  images?: Array<{
    url: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    thumbnailUrl?: string;
  }>;
}

export interface ProductsTabCategoryDetail {
  category: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  groups: ProductsTabGroupSummary[];
  activeGroupId: string;
  variants: ProductsTabVariantRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
}

export interface ProductsTabContext {
  collections: Array<{
    id: string;
    name: string;
    categories: Array<{
      id: string;
      name: string;
      imageUrl?: string;
    }>;
  }>;
  others: {
    key: string;
    categories: Array<{
      id: string;
      name: string;
      imageUrl?: string;
    }>;
  };
}

export interface StorefrontSearchProduct {
  variantId: string;
  groupId: string;
  groupName: string;
  variantName?: string;
  variantLabel: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  categoryName: string;
  unitSymbol?: string;
}

export interface StorefrontSearchResults {
  items: StorefrontSearchProduct[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PurgeOrdersResult {
  tenantId: string;
  deleted: {
    orders: number;
    orderItems: number;
    orderEvents: number;
    reservations: number;
    payments: number;
    shipments: number;
    returns: number;
  };
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface CustomerAddress {
  _id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface Variant {
  _id: string;
  groupId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  convertedQuantity?: number;
  price?: {
    sellingPrice: number;
    anchorPrice: number;
  };
  effectivePrice?: {
    sellingPrice: number;
    anchorPrice: number;
  };
}

export interface Group {
  _id: string;
  name: string;
  taxProfileId?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
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
}

export interface Rider {
  _id: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

export interface CourierPartner {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  contactPerson?: string;
  contactPhone?: string;
}

export interface Order {
  _id: string;
  orderNo: string;
  orderSource: 'ADMIN_WEB' | 'CUSTOMER_WEB' | 'SOCIAL_DM' | 'SHOP_COUNTER';
  deliveryType: 'PICKUP' | 'DELIVERY';
  orderType?: 'WALK_IN_INSTANT' | 'CALL_PICKUP' | 'CALL_DELIVERY' | 'CALL_COURIER';
  status: 'DRAFT' | 'PLACED' | 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  customerId?: { _id: string; name: string; phone: string } | string;
  addressSnapshot?: {
    name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } | null;
  deliveryDetails?: {
    postalCode?: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
    preferredDeliveryTime?: string;
    locationText?: string;
    geo?: {
      lat?: number | null;
      lng?: number | null;
    };
    provisionalRider?: {
      name?: string;
      phone?: string;
    };
  } | null;
  assignedRider?: { riderId?: string; name?: string; phone?: string; assignedAt?: string } | null;
  courierDetails?: {
    courierPartnerId?: string;
    courierPartnerName?: string;
    courierCompany?: string;
    trackingNumber?: string;
    awbNumber?: string;
    consignmentNote?: string;
    estimatedDeliveryDate?: string;
    dispatchedAt?: string;
  } | null;
  items?: OrderItem[];
  timeline?: OrderEvent[];
  pricingSnapshot: {
    subTotal?: number;
    discount?: number;
    tax?: number;
    deliveryCharge?: number;
    roundOff?: number;
    grandTotal: number;
  };
  promotionSnapshot?: {
    coupon?: {
      code?: string;
      codes?: string[];
      coupons?: Array<{
        code?: string;
      }>;
    } | null;
  } | null;
  profitabilitySnapshot?: {
    revenueNet?: number;
    cogsTotal?: number;
    grossProfit?: number;
    grossMarginPct?: number | null;
    computedAt?: string;
    version?: number;
    isEstimated?: boolean;
  } | null;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  _id: string;
  variantId: string;
  variantNameSnapshot: string;
  groupNameSnapshot: string;
  categoryNameSnapshot: string;
  unitSnapshot: string;
  quantity: number;
  convertedQtyInBase: number;
  priceSnapshot: {
    sellingPrice: number;
    anchorPrice: number;
    actualCostPerUnit?: number;
    cogsLineTotal?: number;
    grossLineProfit?: number;
    grossLineMarginPct?: number | null;
    discount: number;
    tax: number;
  };
  lineTotal: number;
  status: string;
}

export interface OrderEvent {
  _id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  createdAt: string;
}

export interface CreateDraftPayload {
  orderSource: 'ADMIN_WEB' | 'CUSTOMER_WEB' | 'SOCIAL_DM' | 'SHOP_COUNTER';
  deliveryType: 'PICKUP' | 'DELIVERY';
  orderType: 'WALK_IN_INSTANT' | 'CALL_PICKUP' | 'CALL_DELIVERY' | 'CALL_COURIER';
  customerId: string;
  addressId?: string;
  deliveryAddressText?: string;
  items: Array<{ variantId: string; quantity: number }>;
  deliveryCharge?: number;
  deliveryDetails?: {
    deliveryPostalCode: string;
    deliveryContactName: string;
    deliveryContactPhone: string;
    preferredDeliveryTime: string;
    deliveryLocationText: string;
    deliveryGeoLat: number;
    deliveryGeoLng: number;
    provisionalRiderName: string;
    provisionalRiderPhone: string;
  };
  notes?: string;
}

export interface StockCheckItem {
  index: number;
  variantId: string;
  variantName: string;
  quantity: number;
  convertedQtyInBase: number;
  availableQtyInBase: number;
  isAvailable: boolean;
}

export interface UpdateOrderEditableFieldsPayload {
  customerName?: string;
  customerPhone?: string;
  deliveryAddressText?: string;
  deliveryPostalCode?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  preferredDeliveryTime?: string;
  deliveryLocationText?: string;
  deliveryGeoLat?: number;
  deliveryGeoLng?: number;
  notes?: string;
}

export interface OrderRating {
  id: string;
  orderId: string;
  rating: number;
  riderRating?: number;
  feedback?: string;
  createdAt: string;
}

export interface ReturnRequestItem {
  orderItemId: string;
  quantity: number;
  reason?: string;
  action?: 'REFUND' | 'EXCHANGE';
}

export interface ReturnRequest {
  _id: string;
  orderId: string;
  overallType?: 'REFUND_ONLY' | 'EXCHANGE_ONLY' | 'MIXED';
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'REFUNDED';
  refundStatus: 'PENDING' | 'PROCESSED';
  items: ReturnRequestItem[];
  paymentDetails?: {
    upiId?: string;
    bankAccount?: {
      accountHolderName?: string;
      accountNumber?: string;
      ifscCode?: string;
      bankName?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);

  private readonly ordersUrl = `${environment.apiBaseUrl}/orders`;
  private readonly customersUrl = `${environment.apiBaseUrl}/customers`;
  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;
  private readonly tenantConfigUrl = `${environment.apiBaseUrl}/tenant-config`;

  listOrders(params?: {
    page?: number;
    limit?: number;
    paymentStatus?: string;
    status?: string;
    deliveryDelayed?: string;
    orderSource?: string;
    customerId?: string;
    from?: string;
    to?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Order>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.deliveryDelayed) searchParams.set('deliveryDelayed', params.deliveryDelayed);
    if (params?.orderSource) searchParams.set('orderSource', params.orderSource);
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.ordersUrl}?${query}` : this.ordersUrl;
    return this.http.get<ApiPaginated<Order>>(url);
  }

  getNavigationCounts(params?: { from?: string; to?: string }): Observable<ApiSuccess<OrderNavigationCounts>> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    const query = searchParams.toString();
    const url = query ? `${this.ordersUrl}/navigation-counts?${query}` : `${this.ordersUrl}/navigation-counts`;
    return this.http.get<ApiSuccess<OrderNavigationCounts>>(url);
  }

  listVariants(params?: { groupId?: string; search?: string; page?: number; limit?: number }): Observable<ApiPaginated<Variant>> {
    const searchParams = new URLSearchParams();
    searchParams.set('status', 'ACTIVE');
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    return this.http.get<ApiPaginated<Variant>>(`${this.variantsUrl}?${searchParams.toString()}`);
  }

  listGroups(params?: { categoryId?: string; search?: string; page?: number; limit?: number }): Observable<ApiPaginated<Group>> {
    const searchParams = new URLSearchParams();
    searchParams.set('status', 'ACTIVE');
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    return this.http.get<ApiPaginated<Group>>(`${environment.apiBaseUrl}/groups?${searchParams.toString()}`);
  }

  getStorefrontCategoryProducts(storeSlug: string, categoryId: string): Observable<ProductsTabCategoryDetail> {
    const limit = 100;
    const baseUrl = `${environment.apiBaseUrl}/storefront/${encodeURIComponent(storeSlug)}/products-tab/category/${encodeURIComponent(categoryId)}`;
    const fetchPage = (page: number) => this.http
      .get<ApiSuccess<ProductsTabCategoryDetail>>(baseUrl, {
        params: { page: String(page), limit: String(limit) },
      })
      .pipe(map((response) => response.data));

    return fetchPage(1).pipe(
      expand((detail) => detail.pagination?.hasMore ? fetchPage(detail.pagination.page + 1) : EMPTY),
      reduce((accumulator, page) => {
        if (!accumulator) {
          return page;
        }

        const existingIds = new Set(accumulator.variants.map((variant) => variant.id));
        return {
          ...page,
          variants: [
            ...accumulator.variants,
            ...page.variants.filter((variant) => !existingIds.has(variant.id)),
          ],
        };
      }),
    );
  }

  getStorefrontProductsContext(storeSlug: string): Observable<ProductsTabContext> {
    const url = `${environment.apiBaseUrl}/storefront/${encodeURIComponent(storeSlug)}/products-tab/context`;
    return this.http.get<ApiSuccess<ProductsTabContext>>(url).pipe(map((response) => response.data));
  }

  getStorefrontGroup(storeSlug: string, groupId: string): Observable<StorefrontGroupDetail> {
    const url = `${environment.apiBaseUrl}/storefront/${encodeURIComponent(storeSlug)}/groups/${encodeURIComponent(groupId)}`;
    return this.http.get<ApiSuccess<StorefrontGroupDetail>>(url).pipe(map((response) => response.data));
  }

  previewStorefrontGroupPrice(
    storeSlug: string,
    groupId: string,
    quantity: number,
    unitId: string,
  ): Observable<StorefrontPricePreview> {
    const url = `${environment.apiBaseUrl}/storefront/${encodeURIComponent(storeSlug)}/groups/${encodeURIComponent(groupId)}/preview-price`;
    return this.http.post<ApiSuccess<StorefrontPricePreview>>(url, { quantity, unitId })
      .pipe(map((response) => response.data));
  }

  searchStorefrontProducts(storeSlug: string, search: string): Observable<StorefrontSearchResults> {
    const limit = 100;
    const url = `${environment.apiBaseUrl}/storefront/${encodeURIComponent(storeSlug)}/search`;
    const fetchPage = (page: number) => this.http
      .get<ApiSuccess<StorefrontSearchResults>>(url, {
        params: { q: search, page: String(page), limit: String(limit) },
      })
      .pipe(map((response) => response.data));

    return fetchPage(1).pipe(
      expand((results) => results.pagination?.hasNextPage ? fetchPage(results.pagination.page + 1) : EMPTY),
      reduce((accumulator, page) => {
        if (!accumulator) {
          return page;
        }

        const existingIds = new Set(accumulator.items.map((item) => item.variantId));
        return {
          ...page,
          items: [
            ...accumulator.items,
            ...page.items.filter((item) => !existingIds.has(item.variantId)),
          ],
        };
      }),
    );
  }

  listTaxProfiles(): Observable<ApiPaginated<TaxProfile>> {
    return this.http.get<ApiPaginated<TaxProfile>>(`${environment.apiBaseUrl}/tax-profiles?status=ACTIVE`);
  }

  listRiders(): Observable<ApiPaginated<Rider>> {
    return this.http.get<ApiPaginated<Rider>>(`${environment.apiBaseUrl}/riders?status=ACTIVE&limit=200`);
  }

  listCourierPartners(): Observable<ApiPaginated<CourierPartner>> {
    return this.http.get<ApiPaginated<CourierPartner>>(`${environment.apiBaseUrl}/courier-partners?status=ACTIVE&limit=200`);
  }

  loadCreateOrderLookups(): Observable<{
    variants: ApiPaginated<Variant>;
    groups: ApiPaginated<Group>;
    taxProfiles: ApiPaginated<TaxProfile>;
  }> {
    return forkJoin({
      variants: this.listVariants(),
      groups: this.listGroups(),
      taxProfiles: this.listTaxProfiles(),
    });
  }

  searchCustomersByPhone(phone: string): Observable<ApiPaginated<Customer>> {
    return this.http.get<ApiPaginated<Customer>>(`${this.customersUrl}?phone=${encodeURIComponent(phone)}`);
  }

  resolveCustomer(phone: string, name: string): Observable<ApiSuccess<{ customer: Customer; created: boolean }>> {
    return this.http.post<ApiSuccess<{ customer: Customer; created: boolean }>>(`${this.customersUrl}/resolve`, {
      phone,
      name,
    });
  }

  listCustomerAddresses(customerId: string): Observable<ApiSuccess<CustomerAddress[]>> {
    return this.http.get<ApiSuccess<CustomerAddress[]>>(`${this.customersUrl}/${customerId}/addresses`);
  }

  getTenantConfig(): Observable<ApiSuccess<TenantConfigPayload>> {
    return this.http.get<ApiSuccess<TenantConfigPayload>>(this.tenantConfigUrl);
  }

  createDraft(payload: CreateDraftPayload): Observable<ApiSuccess<{ draftId: string; orderNo?: string; status?: string }>> {
    return this.http.post<ApiSuccess<{ draftId: string; orderNo?: string; status?: string }>>(`${this.ordersUrl}/draft`, payload);
  }

  checkStock(payload: { items: Array<{ variantId: string; quantity: number }> }): Observable<ApiSuccess<{ items: StockCheckItem[] }>> {
    return this.http.post<ApiSuccess<{ items: StockCheckItem[] }>>(`${this.ordersUrl}/stock-check`, payload);
  }

  placeOrder(
    draftId: string,
    payload?: {
      paymentMode?: 'CASH' | 'UPI_MANUAL' | 'CARD' | 'NET_BANKING';
      paymentCollectionStage?: 'AT_ORDER' | 'AT_FULFILLMENT';
      paymentReceived?: boolean;
    }
  ): Observable<ApiSuccess<{ orderId: string; orderNo: string }>> {
    return this.http.post<ApiSuccess<{ orderId: string; orderNo: string }>>(`${this.ordersUrl}/place`, {
      draftId,
      paymentMode: payload?.paymentMode || 'CASH',
      paymentCollectionStage: payload?.paymentCollectionStage || 'AT_FULFILLMENT',
      paymentReceived: Boolean(payload?.paymentReceived),
    });
  }

  updateStatus(
    orderId: string,
    status: string,
    reason?: string,
    courierDetails?: {
      courierCompany?: string;
      trackingNumber?: string;
      awbNumber?: string;
      consignmentNote?: string;
      estimatedDeliveryDate?: string;
    }
  ): Observable<ApiSuccess<Order>> {
    return this.http.patch<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}/status`, {
      status,
      reason,
      courierDetails: courierDetails || undefined,
    });
  }

  bulkUpdateStatus(orderIds: string[], status: string, reason?: string): Observable<ApiSuccess<BulkOrderStatusResult>> {
    return this.http.patch<ApiSuccess<BulkOrderStatusResult>>(`${this.ordersUrl}/bulk/status`, {
      orderIds,
      status,
      reason: reason || '',
    });
  }

  updateEditableFields(
    orderId: string,
    payload: UpdateOrderEditableFieldsPayload
  ): Observable<ApiSuccess<Order>> {
    return this.http.patch<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}/editable-fields`, payload);
  }

  addOrderItem(orderId: string, payload: { variantId: string; quantity: number }): Observable<ApiSuccess<OrderItem>> {
    return this.http.post<ApiSuccess<OrderItem>>(`${this.ordersUrl}/${orderId}/items`, {
      variantId: payload.variantId,
      quantity: payload.quantity,
    });
  }

  updateOrderItem(orderId: string, itemId: string, payload: { quantity: number }): Observable<ApiSuccess<OrderItem>> {
    return this.http.patch<ApiSuccess<OrderItem>>(`${this.ordersUrl}/${orderId}/items/${itemId}`, {
      quantity: payload.quantity,
    });
  }

  cancelOrderItem(orderId: string, itemId: string, payload: { reason: string }): Observable<ApiSuccess<OrderItem>> {
    return this.http.patch<ApiSuccess<OrderItem>>(`${this.ordersUrl}/${orderId}/items/${itemId}/cancel`, {
      reason: payload.reason,
    });
  }

  cancelOrder(orderId: string, reason: string): Observable<ApiSuccess<Order>> {
    return this.http.patch<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}/cancel`, {
      reason,
    });
  }

  markPaymentReceived(orderId: string, payload?: { paymentMode?: 'CASH' | 'UPI_MANUAL' | 'CARD' | 'NET_BANKING'; txnRef?: string }): Observable<ApiSuccess<Order>> {
    return this.http.patch<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}/payment/receive`, {
      paymentMode: payload?.paymentMode || 'CASH',
      txnRef: payload?.txnRef || '',
    });
  }

  getOrderById(orderId: string): Observable<ApiSuccess<Order>> {
    return this.http.get<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}`);
  }

  assignRider(
    orderId: string,
    payload: { riderId: string; name?: string; phone?: string }
  ): Observable<ApiSuccess<Order>> {
    return this.http.patch<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}/assign-rider`, {
      riderId: payload.riderId,
      name: payload.name || '',
      phone: payload.phone || '',
    });
  }

  assignCourier(
    orderId: string,
    payload: {
      courierPartnerId: string;
      trackingNumber?: string;
      awbNumber?: string;
      consignmentNote?: string;
      estimatedDeliveryDate?: string;
      reason?: string;
    }
  ): Observable<ApiSuccess<Order>> {
    return this.http.patch<ApiSuccess<Order>>(`${this.ordersUrl}/${orderId}/assign-courier`, {
      courierPartnerId: payload.courierPartnerId,
      trackingNumber: payload.trackingNumber || '',
      awbNumber: payload.awbNumber || '',
      consignmentNote: payload.consignmentNote || '',
      estimatedDeliveryDate: payload.estimatedDeliveryDate || '',
      reason: payload.reason || '',
    });
  }

  deleteOrder(orderId: string): Observable<ApiSuccess<{ orderId: string; deleted: boolean }>> {
    return this.http.delete<ApiSuccess<{ orderId: string; deleted: boolean }>>(`${this.ordersUrl}/${orderId}`);
  }

  purgeAllOrdersDev(): Observable<ApiSuccess<PurgeOrdersResult>> {
    return this.http.delete<ApiSuccess<PurgeOrdersResult>>(`${this.ordersUrl}/dev/purge-all`);
  }

  getOrderRating(orderId: string): Observable<ApiSuccess<OrderRating | null>> {
    return this.http.get<ApiSuccess<OrderRating | null>>(`${this.ordersUrl}/${orderId}/rating`);
  }

  listReturns(orderId: string, params?: { page?: number; limit?: number; status?: string }): Observable<ApiPaginated<ReturnRequest>> {
    const searchParams = new URLSearchParams();
    searchParams.set('orderId', orderId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    return this.http.get<ApiPaginated<ReturnRequest>>(`${environment.apiBaseUrl}/returns?${searchParams.toString()}`);
  }
}
