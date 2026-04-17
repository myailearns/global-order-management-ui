export type AccountStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TrialMode = 'FULL_APP_TRIAL' | 'PLAN_BASED_TRIAL' | 'NONE';

export interface TenantAccount {
  _id: string;
  accountName: string;
  legalBusinessName: string;
  tenantCode: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  countryCode: string;
  currency: string;
  timezone: string;
  planId: string;
  gstin?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  supportPhone?: string | null;
  notes?: string | null;
  accountStatus: AccountStatus;
  trialMode: TrialMode;
  trialDurationDays: number;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountListResponse {
  success: boolean;
  data: TenantAccount[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CreateAccountRequest {
  accountName: string;
  legalBusinessName: string;
  tenantCode: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  countryCode: string;
  currency: string;
  timezone: string;
  planId: string;
  billingEmail?: string;
  supportPhone?: string;
  notes?: string;
  trialMode: TrialMode;
  trialDurationDays: number;
  firstTenantAdminName: string;
  firstTenantAdminEmail: string;
  firstTenantAdminPassword: string;
}

export interface TenantAdminBootstrapInfo {
  userId: string;
  email: string;
  fullName: string;
  roleKey: string;
  status: string;
}

export interface CreateAccountResult {
  account: TenantAccount;
  tenantAdminBootstrap: TenantAdminBootstrapInfo | null;
}

export interface UpdateAccountRequest {
  accountName?: string;
  legalBusinessName?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  countryCode?: string;
  currency?: string;
  timezone?: string;
  planId?: string;
  billingEmail?: string;
  supportPhone?: string;
  notes?: string;
}

export interface AuditLogItem {
  _id: string;
  action: string;
  actor: string;
  reason?: string | null;
  createdAt: string;
}
