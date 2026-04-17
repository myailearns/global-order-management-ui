import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';

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

export type PincodeFallbackSuggestion = 'CALL_COURIER' | 'CALL_PICKUP';

export interface TenantDeliveryPincodeConfig {
  enabled: boolean;
  serviceablePincodes: string[];
  nonServiceableSuggestion: PincodeFallbackSuggestion;
}

export interface TenantConfigPayload {
  tenantId: string;
  deliveryPincodeConfig?: TenantDeliveryPincodeConfig;
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
    grandTotal: number;
  };
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

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);

  private readonly ordersUrl = `${environment.apiBaseUrl}/orders`;
  private readonly customersUrl = `${environment.apiBaseUrl}/customers`;
  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;
  private readonly tenantConfigUrl = `${environment.apiBaseUrl}/tenant-config`;

  listOrders(): Observable<ApiPaginated<Order>> {
    return this.http.get<ApiPaginated<Order>>(this.ordersUrl);
  }

  listVariants(): Observable<ApiPaginated<Variant>> {
    return this.http.get<ApiPaginated<Variant>>(`${this.variantsUrl}?status=ACTIVE`);
  }

  listGroups(): Observable<ApiPaginated<Group>> {
    return this.http.get<ApiPaginated<Group>>(`${environment.apiBaseUrl}/groups?status=ACTIVE`);
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

  createDraft(payload: CreateDraftPayload): Observable<ApiSuccess<{ draftId: string }>> {
    return this.http.post<ApiSuccess<{ draftId: string }>>(`${this.ordersUrl}/draft`, payload);
  }

  checkStock(payload: { items: Array<{ variantId: string; quantity: number }> }): Observable<ApiSuccess<{ items: StockCheckItem[] }>> {
    return this.http.post<ApiSuccess<{ items: StockCheckItem[] }>>(`${this.ordersUrl}/stock-check`, payload);
  }

  placeOrder(
    draftId: string,
    payload?: {
      paymentMode?: 'CASH' | 'UPI_MANUAL';
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
}
