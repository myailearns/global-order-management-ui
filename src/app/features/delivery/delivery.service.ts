import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

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

export type RiderStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface StaffCodeConfig {
  employeePrefix: string;
  riderPrefix: string;
  separator: string;
  sequencePadding: number;
  allowManualOverride: boolean;
}

export type NonServiceableSuggestion = 'CALL_COURIER' | 'CALL_PICKUP';

export type PincodeMode = 'DISABLED' | 'SERVE_ALL' | 'RESTRICTED';

export interface DeliveryPincodeConfig {
  enabled: boolean;
  pincodeMode: PincodeMode;
  serviceablePincodes: string[];
  nonServiceableSuggestion: NonServiceableSuggestion;
}

export interface AuthSecurityConfig {
  maxAttempts: number;
  lockoutMinutes: number;
  allowUnlimitedAttempts: boolean;
  enableAutoUnlock: boolean;
  unlockWindowMinutes: number;
}

export interface OrderNotificationSettings {
  adminEmailEnabled: boolean;
  adminEmail: string;
}

export interface NotificationSettings {
  orderNotifications?: OrderNotificationSettings;
}

export interface TenantConfig {
  tenantId: string;
  staffCodeConfig: StaffCodeConfig;
  deliveryPincodeConfig?: DeliveryPincodeConfig;
  storefrontConfig?: StorefrontConfig;
  storefrontShare?: StorefrontShare;
  returnPolicy?: ReturnPolicy;  // Legacy - keep for backward compatibility
  deliveryReturnPolicy?: ReturnPolicy;
  pickupReturnPolicy?: ReturnPolicy;
  authSecurityConfig?: AuthSecurityConfig;
  notificationSettings?: NotificationSettings;
}

export interface StorefrontPlanSummary {
  planId: string;
  planName: string;
  planTier: string;
  subscriptionStatus: string;
  planStartAt: string | null;
  planExpiresAt: string | null;
  trialEndsAt: string | null;
}

export interface StorefrontShare {
  storefrontUrl: string;
  tenantAdminUrl: string;
  storeSlug: string;
  qrPngDataUrl: string;
  qrFileName: string;
  lastGeneratedAt: string | null;
  planSummary: StorefrontPlanSummary;
}

export interface StorefrontShareEventPayload {
  action: 'SHARE_CENTER_VIEWED' | 'LINK_COPIED' | 'QR_DOWNLOADED' | 'WHATSAPP_SHARE_INITIATED';
  channel?: string;
}

export type LayoutMode = 'GRID' | 'GRID3' | 'LIST';
export type ProductsTabLayout = 'LAYOUT_1_CATEGORY_FIRST' | 'LAYOUT_2_COLLECTION_FIRST' | 'LAYOUT_3_CUSTOM';
export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NET_BANKING';
export type FulfillmentMode = 'DELIVERY' | 'PICKUP' | 'BOTH';
export type PincodeServiceabilityMode = 'SERVE_ALL' | 'RESTRICTED';
export type DeliveryModeType = 'PINCODE' | 'GEOGRAPHICAL';

export interface ServiceablePincodeEntry {
  pincode: string;
  deliveryChargeOverride?: number | null;
  estimatedTimeOverride?: number | null;
  estimatedTimeUnit?: DeliveryTimeUnit;
  active: boolean;
  [key: string]: unknown;
}

export type DeliveryTimeUnit = 'DAYS' | 'HOURS' | 'MINUTES';

export interface GeoDeliveryZone {
  zoneId: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  deliveryCharge: number;
  estimatedDeliveryTime?: number | null;
  estimatedDeliveryTimeUnit?: DeliveryTimeUnit;
  instructions: string;
  active: boolean;
  [key: string]: unknown;
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
  pickupTimingText?: string;
  pickupAdvanceDays?: number | null;
  pickupSameDayLeadMinutes?: number | null;
}

export type ReturnWindowUnit = 'DAYS' | 'HOURS' | 'MONTHS';
export type RefundProcessingUnit = 'WORKING_DAYS' | 'DAYS' | 'HOURS';

export interface ReturnPolicy {
  returnsEnabled: boolean;
  allowRefund: boolean;
  allowExchange: boolean;
  returnWindowDays: number;
  returnWindowUnit?: ReturnWindowUnit;
  allowUpiRefund?: boolean;
  allowBankTransferRefund?: boolean;
  refundProcessingTime?: number;
  refundProcessingUnit?: RefundProcessingUnit;
  guidelines?: string;
}

export interface BannerImage {
  url: string;
  text: string;
  sortOrder: number;
}

export interface SocialLinks {
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
}

export interface StorefrontConfig {
  enabled: boolean;
  logoUrl?: string;
  storeDisplayName?: string;
  storeSlug: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  layoutMode: LayoutMode;
  productsTabLayout?: ProductsTabLayout;
  productsTabEnabled?: boolean;
  b1g1HomeCardsPerRow?: number;
  catalogInitialCategoryCount?: number;
  catalogGroupsPerCategoryPage?: number;
  bannerImages: BannerImage[];
  welcomeMessage: string;
  footerText: string;
  socialLinks: SocialLinks;
  showPacks: boolean;
  fulfillmentMode?: FulfillmentMode;
  deliveryCharge?: number;
  deliveryChargeNote: string;
  estimatedDeliveryDays?: number;
  estimatedDeliveryTime?: number;
  estimatedDeliveryTimeUnit?: DeliveryTimeUnit;
  deliveryModeType?: DeliveryModeType;
  pincodeServiceabilityMode?: PincodeServiceabilityMode;
  serviceablePincodes?: ServiceablePincodeEntry[];
  nonServiceableSuggestion?: NonServiceableSuggestion;
  geoDeliveryZones?: GeoDeliveryZone[];
  pickupConfig?: PickupConfig;
  pickupLocations?: PickupConfig[];
  pickupWindowType?: 'DAYS' | 'HOURS';
  pickupWindowValue?: number;
  pickupMaxAdvanceDays?: number;
  pickupAdvanceDays?: number;
  pickupSameDayLeadMinutes?: number;
  minimumOrderValue: number;
  whatsappNumber: string;
  paymentMethods: PaymentMethod[];
  // Per-mode cancellation policies
  cancellationPolicies?: {
    delivery?: {
      mode: 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE';
      timeValue?: number;
      timeUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
      blockedAfterStatus?: 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY';
    };
    pickup?: {
      mode: 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE';
      timeValue?: number;
      timeUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
      blockedAfterStatus?: 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY';
    };
  };
  // Legacy fields - kept for backward compatibility
  allowCustomerCancellation?: boolean;
  cancellationWindowMinutes?: number;
  cancellationPolicy?: 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE';
  cancellationTimeValue?: number;
  cancellationTimeUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  cancellationBlockedAfterStatus?: 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY';
  // Used when updating cancellation policies
  applyDeliveryPolicyToExisting?: boolean;
  applyPickupPolicyToExisting?: boolean;
}

export interface EmployeeCodePreview {
  employeeCode: string;
  allowManualOverride: boolean;
}

export interface Rider {
  _id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  employeeCode?: string;
  status: RiderStatus;
  leaveFrom?: string | null;
  leaveTill?: string | null;
  vehicleType?: string;
  vehicleNumber?: string;
  zoneTags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiderPayload {
  name: string;
  phone: string;
  whatsapp?: string;
  employeeCode?: string;
  status: RiderStatus;
  leaveFrom?: string;
  leaveTill?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  zoneTags?: string[];
  notes?: string;
}

export type CourierPartnerStatus = 'ACTIVE' | 'INACTIVE';

export interface CourierPartner {
  _id: string;
  name: string;
  status: CourierPartnerStatus;
  contactPerson?: string;
  contactPhone?: string;
  supportPhone?: string;
  serviceAreas?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourierPartnerPayload {
  name: string;
  status: CourierPartnerStatus;
  contactPerson?: string;
  contactPhone?: string;
  supportPhone?: string;
  serviceAreas?: string[];
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  private readonly http = inject(HttpClient);
  private readonly ridersUrl = `${environment.apiBaseUrl}/riders`;
  private readonly courierPartnersUrl = `${environment.apiBaseUrl}/courier-partners`;
  private readonly tenantConfigUrl = `${environment.apiBaseUrl}/tenant-config`;

  listRiders(params?: {
    page?: number;
    limit?: number;
    status?: RiderStatus;
    search?: string;
    employeeCode?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<Rider>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.employeeCode) searchParams.set('employeeCode', params.employeeCode);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.ridersUrl}?${query}` : this.ridersUrl;
    return this.http.get<ApiPaginated<Rider>>(url);
  }

  createRider(payload: RiderPayload): Observable<ApiSuccess<Rider>> {
    return this.http.post<ApiSuccess<Rider>>(this.ridersUrl, payload);
  }

  updateRider(id: string, payload: RiderPayload): Observable<ApiSuccess<Rider>> {
    return this.http.put<ApiSuccess<Rider>>(`${this.ridersUrl}/${id}`, payload);
  }

  updateRiderStatus(id: string, status: RiderStatus, leaveFrom?: string, leaveTill?: string): Observable<ApiSuccess<Rider>> {
    return this.http.patch<ApiSuccess<Rider>>(`${this.ridersUrl}/${id}/status`, { status, leaveFrom, leaveTill });
  }

  deleteRider(id: string): Observable<ApiSuccess<Rider>> {
    return this.http.delete<ApiSuccess<Rider>>(`${this.ridersUrl}/${id}`);
  }

  previewEmployeeCode(): Observable<ApiSuccess<EmployeeCodePreview>> {
    return this.http.get<ApiSuccess<EmployeeCodePreview>>(`${this.ridersUrl}/preview-employee-code`);
  }

  getTenantConfig(): Observable<ApiSuccess<TenantConfig>> {
    return this.http.get<ApiSuccess<TenantConfig>>(this.tenantConfigUrl);
  }

  updateTenantConfig(cfg: Partial<StaffCodeConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { staffCodeConfig: cfg });
  }

  updateDeliveryPincodeConfig(cfg: Partial<DeliveryPincodeConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { deliveryPincodeConfig: cfg });
  }

  updateStorefrontConfig(cfg: Partial<StorefrontConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { storefrontConfig: cfg });
  }

  trackStorefrontShareEvent(payload: StorefrontShareEventPayload): Observable<ApiSuccess<{ success?: boolean; ignored?: boolean }>> {
    return this.http.post<ApiSuccess<{ success?: boolean; ignored?: boolean }>>(`${this.tenantConfigUrl}/storefront-share/events`, payload);
  }

  updateReturnPolicy(policy: Partial<ReturnPolicy>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { returnPolicy: policy });
  }

  updateDeliveryReturnPolicy(policy: Partial<ReturnPolicy>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { deliveryReturnPolicy: policy });
  }

  updatePickupReturnPolicy(policy: Partial<ReturnPolicy>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { pickupReturnPolicy: policy });
  }

  getAuthSecurityConfig(): Observable<ApiSuccess<AuthSecurityConfig>> {
    return this.http.get<ApiSuccess<AuthSecurityConfig>>(`${this.tenantConfigUrl}/auth-security`);
  }

  updateAuthSecurityConfig(config: Partial<AuthSecurityConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, {
      authSecurityConfig: {
        pinPolicy: config,
      },
    });
  }

  updateOrderNotificationSettings(config: Partial<OrderNotificationSettings>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, {
      notificationSettings: {
        orderNotifications: config,
      },
    });
  }

  listCourierPartners(params?: {
    page?: number;
    limit?: number;
    status?: CourierPartnerStatus;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Observable<ApiPaginated<CourierPartner>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = query ? `${this.courierPartnersUrl}?${query}` : this.courierPartnersUrl;
    return this.http.get<ApiPaginated<CourierPartner>>(url);
  }

  createCourierPartner(payload: CourierPartnerPayload): Observable<ApiSuccess<CourierPartner>> {
    return this.http.post<ApiSuccess<CourierPartner>>(this.courierPartnersUrl, payload);
  }

  updateCourierPartner(id: string, payload: CourierPartnerPayload): Observable<ApiSuccess<CourierPartner>> {
    return this.http.put<ApiSuccess<CourierPartner>>(`${this.courierPartnersUrl}/${id}`, payload);
  }

  updateCourierPartnerStatus(id: string, status: CourierPartnerStatus): Observable<ApiSuccess<CourierPartner>> {
    return this.http.patch<ApiSuccess<CourierPartner>>(`${this.courierPartnersUrl}/${id}/status`, { status });
  }

  deleteCourierPartner(id: string): Observable<ApiSuccess<CourierPartner>> {
    return this.http.delete<ApiSuccess<CourierPartner>>(`${this.courierPartnersUrl}/${id}`);
  }
}
