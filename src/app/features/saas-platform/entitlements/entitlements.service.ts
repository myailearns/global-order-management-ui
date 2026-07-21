import * as ngHttp from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  ApiResponse,
  FeatureCatalogDeleteAllResult,
  EffectiveFeaturesResult,
  FeatureCatalogItem,
  FeatureCatalogSyncResult,
  PackagePlan,
  PackagePlanDeleteAllResult,
  PaginatedResponse,
  PackageFeatureCatalogResult,
  CreateTierPayload,
  TierFeatureMap,
  TierListResult,
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

  createPackage(payload: Partial<PackagePlan> & Pick<PackagePlan, 'name'>): Observable<PackagePlan> {
    return this.http
      .post<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updatePackage(id: string, payload: Partial<PackagePlan>): Observable<PackagePlan> {
    return this.http
      .put<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages/${id}`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deletePackage(id: string): Observable<PackagePlan> {
    return this.http
      .delete<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages/${id}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  listPackageTiers(packageId: string, page = 1, limit = 50): Observable<TierListResult> {
    const params = new ngHttp.HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http
      .get<ApiResponse<TierListResult>>(`${this.baseUrl}/packages/${packageId}/tiers`, { params, headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  createTier(packageId: string, payload: CreateTierPayload): Observable<TierFeatureMap> {
    return this.http
      .post<ApiResponse<TierFeatureMap>>(`${this.baseUrl}/packages/${packageId}/tiers`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  listPackageFeatures(packageId: string, module?: string, search?: string): Observable<PackageFeatureCatalogResult> {
    let params = new ngHttp.HttpParams();
    if (module) {
      params = params.set('module', module);
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<ApiResponse<PackageFeatureCatalogResult>>(`${this.baseUrl}/packages/${packageId}/tiers/features`, { params, headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updateTierFeatures(packageId: string, tierId: string, featureKeys: string[], status?: 'ACTIVE' | 'INACTIVE'): Observable<TierFeatureMap> {
    const payload: { featureKeys: string[]; status?: 'ACTIVE' | 'INACTIVE' } = { featureKeys };
    if (status) {
      payload.status = status;
    }

    return this.http
      .put<ApiResponse<TierFeatureMap>>(`${this.baseUrl}/packages/${packageId}/tiers/${tierId}/features`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updateTierFeatureConfigs(packageId: string, tierId: string, featureConfigs: Record<string, unknown>): Observable<TierFeatureMap> {
    return this.http
      .put<ApiResponse<TierFeatureMap>>(`${this.baseUrl}/packages/${packageId}/tiers/${tierId}/feature-configs`, { featureConfigs }, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  updateTier(packageId: string, tierId: string, payload: Partial<TierFeatureMap>): Observable<TierFeatureMap> {
    return this.http
      .put<ApiResponse<TierFeatureMap>>(`${this.baseUrl}/packages/${packageId}/tiers/${tierId}`, payload, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deleteTier(packageId: string, tierId: string): Observable<TierFeatureMap> {
    return this.http
      .delete<ApiResponse<TierFeatureMap>>(`${this.baseUrl}/packages/${packageId}/tiers/${tierId}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deleteAllPackages(): Observable<PackagePlanDeleteAllResult> {
    return this.http
      .delete<ApiResponse<PackagePlanDeleteAllResult>>(`${this.baseUrl}/packages`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  listFeatures(page = 1, limit = 100): Observable<FeatureCatalogItem[]> {
    const boundedLimit = Math.min(Math.max(limit || 100, 1), 100);
    const requestPage = (targetPage: number) => {
      const params = new ngHttp.HttpParams().set('page', String(targetPage)).set('limit', String(boundedLimit));
      return this.http.get<PaginatedResponse<FeatureCatalogItem>>(`${this.baseUrl}/features`, { params, headers: this.platformHeaders });
    };

    return requestPage(Math.max(page, 1)).pipe(
      expand((res) => {
        const currentPage = Number(res.meta?.page || 1);
        const totalPages = Number(res.meta?.totalPages || 1);
        if (currentPage >= totalPages) {
          return EMPTY;
        }
        return requestPage(currentPage + 1);
      }),
      reduce((all, res) => all.concat(res.data ?? []), [] as FeatureCatalogItem[]),
    );
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

  syncFeatureTemplates(templates: Array<Partial<FeatureCatalogItem> & Pick<FeatureCatalogItem, 'featureKey' | 'displayName' | 'module'>>): Observable<FeatureCatalogSyncResult> {
    return this.http
      .post<ApiResponse<FeatureCatalogSyncResult>>(`${this.baseUrl}/features/sync-templates`, { templates }, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deleteAllFeatures(): Observable<FeatureCatalogDeleteAllResult> {
    return this.http
      .delete<ApiResponse<FeatureCatalogDeleteAllResult>>(`${this.baseUrl}/features`, { headers: this.platformHeaders })
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
