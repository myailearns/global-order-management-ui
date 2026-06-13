import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export type RiderStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export type EmployeeCodeStrategy = 'DEFAULT_FORMULA' | 'PREFIX_SEQUENCE' | 'MANUAL';

export interface EmployeeCodeConfig {
  strategy: EmployeeCodeStrategy;
  prefix: string;
  separator: string;
  sequencePadding: number;
  sequenceStart: number;
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

export interface TenantConfig {
  tenantId: string;
  employeeCodeConfig: EmployeeCodeConfig;
  deliveryPincodeConfig?: DeliveryPincodeConfig;
  storefrontConfig?: StorefrontConfig;
  returnPolicy?: ReturnPolicy;
}

export type LayoutMode = 'GRID' | 'GRID3' | 'LIST';
export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NET_BANKING';

export interface ReturnPolicy {
  returnsEnabled: boolean;
  allowRefund: boolean;
  allowExchange: boolean;
  returnWindowDays: number;
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
  b1g1HomeCardsPerRow?: number;
  bannerImages: BannerImage[];
  welcomeMessage: string;
  footerText: string;
  socialLinks: SocialLinks;
  showPacks: boolean;
  deliveryCharge?: number;
  deliveryChargeNote: string;
  estimatedDeliveryDays: number;
  minimumOrderValue: number;
  whatsappNumber: string;
  paymentMethods: PaymentMethod[];
}

export interface EmployeeCodePreview {
  employeeCode: string;
  strategy: EmployeeCodeStrategy;
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

  listRiders(page = 1, limit = 200): Observable<ApiPaginated<Rider>> {
    return this.http.get<ApiPaginated<Rider>>(`${this.ridersUrl}?page=${page}&limit=${limit}`);
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

  previewEmployeeCode(name: string, phone: string): Observable<ApiSuccess<EmployeeCodePreview>> {
    const params = new HttpParams().set('name', name).set('phone', phone);
    return this.http.get<ApiSuccess<EmployeeCodePreview>>(`${this.ridersUrl}/preview-employee-code`, { params });
  }

  getTenantConfig(): Observable<ApiSuccess<TenantConfig>> {
    return this.http.get<ApiSuccess<TenantConfig>>(this.tenantConfigUrl);
  }

  updateTenantConfig(cfg: Partial<EmployeeCodeConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { employeeCodeConfig: cfg });
  }

  updateDeliveryPincodeConfig(cfg: Partial<DeliveryPincodeConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { deliveryPincodeConfig: cfg });
  }

  updateStorefrontConfig(cfg: Partial<StorefrontConfig>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { storefrontConfig: cfg });
  }

  updateReturnPolicy(policy: Partial<ReturnPolicy>): Observable<ApiSuccess<TenantConfig>> {
    return this.http.patch<ApiSuccess<TenantConfig>>(this.tenantConfigUrl, { returnPolicy: policy });
  }

  listCourierPartners(page = 1, limit = 200): Observable<ApiPaginated<CourierPartner>> {
    return this.http.get<ApiPaginated<CourierPartner>>(`${this.courierPartnersUrl}?page=${page}&limit=${limit}`);
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
