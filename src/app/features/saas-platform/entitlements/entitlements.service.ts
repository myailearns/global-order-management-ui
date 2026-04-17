import * as ngHttp from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  ApiResponse,
  EffectiveFeaturesResult,
  FeatureCatalogItem,
  PackagePlan,
  PaginatedResponse,
  TenantEntitlement,
} from './entitlements.model';

@Injectable({ providedIn: 'root' })
export class EntitlementsService {
  private readonly http = inject(ngHttp.HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/saas`;

  private get platformHeaders(): ngHttp.HttpHeaders {
    return new ngHttp.HttpHeaders(this.authSession.getPlatformHeaders());
  }

  listPackages(page = 1, limit = 50): Observable<PackagePlan[]> {
    const params = new ngHttp.HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http
      .get<PaginatedResponse<PackagePlan>>(`${this.baseUrl}/packages`, { params, headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  createPackage(payload: Partial<PackagePlan> & Pick<PackagePlan, 'planId' | 'name' | 'tier'>): Observable<PackagePlan> {
    return this.http
      .post<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updatePackage(id: string, payload: Partial<PackagePlan>): Observable<PackagePlan> {
    return this.http
      .put<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages/${id}`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  listFeatures(page = 1, limit = 100): Observable<FeatureCatalogItem[]> {
    const params = new ngHttp.HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http
      .get<PaginatedResponse<FeatureCatalogItem>>(`${this.baseUrl}/features`, { params, headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  createFeature(payload: Partial<FeatureCatalogItem> & Pick<FeatureCatalogItem, 'featureKey' | 'displayName' | 'module'>): Observable<FeatureCatalogItem> {
    return this.http
      .post<ApiResponse<FeatureCatalogItem>>(`${this.baseUrl}/features`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updateFeature(id: string, payload: Partial<FeatureCatalogItem>): Observable<FeatureCatalogItem> {
    return this.http
      .put<ApiResponse<FeatureCatalogItem>>(`${this.baseUrl}/features/${id}`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  getTenantEntitlement(tenantId: string): Observable<TenantEntitlement> {
    return this.http
      .get<ApiResponse<TenantEntitlement>>(`${this.baseUrl}/tenants/${tenantId}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  upsertTenantEntitlement(tenantId: string, payload: {
    packagePlanId: string;
    addOnFeatureKeys: string[];
    customGrants: TenantEntitlement['customGrants'];
    suspendedFeatureKeys: string[];
    reason?: string;
  }): Observable<TenantEntitlement> {
    return this.http
      .put<ApiResponse<TenantEntitlement>>(`${this.baseUrl}/tenants/${tenantId}`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  getEffectiveFeatures(tenantId: string): Observable<EffectiveFeaturesResult> {
    return this.http
      .get<ApiResponse<EffectiveFeaturesResult>>(`${this.baseUrl}/tenants/${tenantId}/effective`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }
}
