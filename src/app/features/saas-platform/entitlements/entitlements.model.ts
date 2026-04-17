export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PackagePlan {
  _id: string;
  planId: string;
  name: string;
  description?: string;
  tier: 'STARTER' | 'GROWTH' | 'SCALE' | 'CUSTOM';
  status: 'ACTIVE' | 'INACTIVE';
  featureKeys: string[];
  limits: Record<string, number | null>;
}

export interface FeatureCatalogItem {
  _id: string;
  featureKey: string;
  displayName: string;
  module: string;
  dependencyKeys: string[];
  planAvailability: string[];
  isBeta: boolean;
  uiVisibilityPolicy: 'always' | 'entitled-only' | 'hidden';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CustomGrant {
  featureKey: string;
  reason: string;
  validFrom: string;
  validTo?: string | null;
  grantedBy: string;
}

export interface TenantEntitlement {
  _id: string;
  tenantId: string;
  packagePlanId: string;
  addOnFeatureKeys: string[];
  customGrants: CustomGrant[];
  suspendedFeatureKeys: string[];
  cacheVersion: number;
}

export interface EffectiveFeaturesResult {
  tenantId: string;
  accountStatus: string;
  reasonCode: string | null;
  source: 'FULL_APP_TRIAL' | 'ENTITLEMENT' | string;
  effectiveFeatures: string[];
  cacheVersion: number;
  packagePlanId?: string;
}
