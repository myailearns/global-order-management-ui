export type UserActor = 'platform' | 'tenant';

export type AppCapability =
  | 'platform-admin'
  | 'tenant-admin'
  | 'masters'
  | 'product'
  | 'orders'
  | 'customers'
  | 'customer-groups'
  | 'delivery'
  | 'settings-core';

export type FeatureConfigValue = string | number | boolean | null;

export type EffectiveFeatureConfigs = Record<string, Record<string, FeatureConfigValue>>;

export interface AuthSession {
  actorType: UserActor;
  userId: string;
  displayName: string;
  initials: string;
  email: string;
  tenantId?: string;
  tenantCode?: string;
  planId?: 'STARTER' | 'GROWTH' | 'SCALE';
  roleKeys: string[];
  capabilities: AppCapability[];
  featureKeys?: string[];
  effectiveFeatureConfigs?: EffectiveFeatureConfigs;
}

export interface PlatformLoginRequest {
  email: string;
  password: string;
}

export interface TenantLoginRequest {
  tenantCode: string;
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  errorKey?: string;
}
