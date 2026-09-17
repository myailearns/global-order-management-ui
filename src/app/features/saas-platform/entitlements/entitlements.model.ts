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

export interface FeatureConfigOverride {
  key: string;
  value: string | number | boolean | null;
}

export type TrialMode = 'FULL_APP_TRIAL' | 'PLAN_BASED_TRIAL' | 'NONE';
export type PostTrialAction = 'CONVERT_TO_PAID' | 'DOWNGRADE_TO_TIER' | 'SUSPEND_PREMIUM_ACCESS';
export type BillingDurationCode = '1_MONTH' | '3_MONTHS' | '6_MONTHS' | '1_YEAR';

export interface TierCyclePricing {
  durationCode: BillingDurationCode;
  baseAmount: number;
  discountPercent: number;
  finalAmount: number;
  isEnabled: boolean;
}

export interface PackagePlan {
  _id: string;
  planId: string;
  name: string;
  description?: string;
  tier: 'STARTER' | 'GROWTH' | 'SCALE' | 'CUSTOM';
  status: 'ACTIVE' | 'INACTIVE';
  packageType?: 'ONLINE' | 'OFFLINE' | 'BOTH';
  tiers?: string[];
  trialEnabledDefault?: boolean;
  defaultTrialMode?: TrialMode;
  defaultTrialDurationDays?: number | null;
  defaultPostTrialAction?: PostTrialAction;
  allowAccountLevelTrialOverride?: boolean;
  featureKeys: string[];
  featureConfigs: Record<string, FeatureConfigOverride[]>;
  limits: Record<string, number | null>;
}

export interface TierFeatureMap {
  _id: string;
  packageId: string;
  tierKey: string;
  displayName?: string;
  trialEnabled?: boolean;
  defaultTrialMode?: TrialMode;
  defaultTrialDurationDays?: number | null;
  postTrialAction?: PostTrialAction;
  fallbackTierKey?: string | null;
  allowCustomTrialDays?: boolean;
  allowFullFeatureTrial?: boolean;
  setupFee?: number;
  currency?: string;
  trialDurationDays?: number;
  cyclePricing?: TierCyclePricing[];
  status: 'ACTIVE' | 'INACTIVE';
  featureKeys: string[];
  featureConfigs: Record<string, unknown>;
  limits: Record<string, number | null>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTierPayload {
  tierKey: string;
  displayName?: string;
  trialEnabled?: boolean;
  defaultTrialMode?: TrialMode;
  defaultTrialDurationDays?: number | null;
  postTrialAction?: PostTrialAction;
  fallbackTierKey?: string | null;
  allowCustomTrialDays?: boolean;
  allowFullFeatureTrial?: boolean;
  setupFee?: number;
  currency?: string;
  trialDurationDays?: number;
  cyclePricing?: TierCyclePricing[];
  status: 'ACTIVE' | 'INACTIVE';
  featureKeys?: string[];
  featureConfigs?: Record<string, unknown>;
  limits?: Record<string, number | null>;
}

export interface TierListResult {
  items: TierFeatureMap[];
  page: number;
  limit: number;
  total: number;
}

export interface PackageFeatureCatalogResult {
  packageId: string;
  items: FeatureCatalogItem[];
  groupedByModule: Record<string, FeatureCatalogItem[]>;
  total: number;
}

export interface FeatureCatalogItem {
  _id: string;
  featureKey: string;
  displayName: string;
  module: string;
  dependencyKeys: string[];
  filters?: Array<{
    key: string;
    defaultValue: string | number | boolean | null;
  }>;
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

export type FeatureConfigValue = string | number | boolean | null;

export interface EffectiveFeaturesResult {
  tenantId: string;
  accountStatus: string;
  reasonCode: string | null;
  source: string;
  effectiveFeatures: string[];
  effectiveFeatureConfigs?: Record<string, Record<string, FeatureConfigValue>>;
  cacheVersion: number;
  packagePlanId?: string;
}

export interface FeatureCatalogSyncResult {
  totalTemplates: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  created: string[];
  updated: string[];
  unchanged: string[];
}

export interface FeatureCatalogDeleteAllResult {
  deletedCount: number;
}

export interface PackagePlanDeleteAllResult {
  deletedCount: number;
}
