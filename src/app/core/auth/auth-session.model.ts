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
