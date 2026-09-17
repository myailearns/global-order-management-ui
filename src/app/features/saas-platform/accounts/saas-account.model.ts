export type AccountStatus = 'INCOMPLETE' | 'TRIAL' | 'TRIAL_ENDED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TrialMode = 'FULL_APP_TRIAL' | 'PLAN_BASED_TRIAL' | 'NONE';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
export type BillingDurationCode = '1_MONTH' | '3_MONTHS' | '6_MONTHS' | '1_YEAR';
export type PaymentRecordStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
export type PaymentMethod = 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'UNPAID' | 'OVERDUE';
export type AmountMatchStatus = 'MATCH' | 'UNDERPAID' | 'OVERPAID';

export interface FirstAdminInfo {
  fullName: string;
  email: string;
  status: string;
}

export const BILLING_DURATION_LABELS: Record<BillingDurationCode, string> = {
  '1_MONTH': '1 Month',
  '3_MONTHS': '3 Months',
  '6_MONTHS': '6 Months',
  '1_YEAR': '1 Year',
};

export interface SaasSubscription {
  _id: string;
  accountId: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingDate?: string | null;
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
  paymentFailureCount?: number;
  nextRetryDate?: string | null;
  gracePeriodEndDate?: string | null;
  pendingPaymentRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  _id: string;
  tenantId: string;
  accountId: string;
  packageId: string;
  tierId: string;
  previousTierId?: string | null;
  amount: number;
  baseAmount: number;
  tierDiscountPercent: number;
  tierDiscountAmount: number;
  tierFinalAmount: number;
  manualDiscountPercent: number;
  manualDiscountAmount: number;
  manualDiscountReason?: string | null;
  expectedAmountAtRequest: number;
  paidAmountAtRequest: number;
  amountDifference: number;
  amountMatchStatus: AmountMatchStatus;
  currency: string;
  durationCode: BillingDurationCode;
  billingCycleDays: 30 | 90 | 180 | 365;
  paymentMethod: PaymentMethod;
  paymentId: string;
  referenceNumber?: string | null;
  paymentProof: string | null;
  status: PaymentRecordStatus;
  requestedAt: string;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  verificationReason?: string | null;
  nextBillingDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasInvoice {
  _id: string;
  tenantId: string;
  invoiceNumber: string;
  accountId: string;
  paymentRecordId?: string | null;
  amount: number;
  currency: string;
  billingCycleDays: 30 | 90 | 180 | 365;
  dueDate: string;
  paidDate?: string | null;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantAccount {
  _id: string;
  accountName: string;
  legalBusinessName: string;
  tenantCode: string;
  packageId?: string | null;
  tierId?: string | null;
  tierKey?: string | null;
  selectedTierDisplayName?: string | null;
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
  businessEmail?: string | null;
  accountOwnerEmail?: string | null;
  supportPhone?: string | null;
  notes?: string | null;
  accountStatus: AccountStatus;
  trialMode: TrialMode;
  trialDurationDays: number;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  lastTrialEmailSentAt?: string | null;
  subscriptionId?: string | null;
  subscriptionStartAt?: string | null;
  subscriptionEndAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountListResponse {
  success: boolean;
  data: TenantAccount[];
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

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CreateAccountRequest {
  accountName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  countryCode: string;
  packageId: string;
  tierId: string;
  legalBusinessName?: string;
  tenantCode?: string;
  primaryContactName?: string;
  currency?: string;
  timezone?: string;
  planId?: string;
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

export interface CompleteIncompleteAccountPayload {
  planId: string;
  packageId: string;
  tierId: string;
  tierKey?: string;
  trialMode: string;
  trialDurationDays: number;
  firstTenantAdminName: string;
  firstTenantAdminEmail: string;
  firstTenantAdminPassword: string;
}

export interface DeleteAllAccountsResult {
  deletedCount: number;
  deletedTenantCodes: string[];
  cleanupCounts: {
    tenantConfigs: number;
    tenantEntitlements: number;
    roles: number;
    userAccounts: number;
    userRoleAssignments: number;
    taxProfiles: number;
    auditLogs: number;
  };
}

export interface DeleteAccountResult {
  deletedAccountId: string;
  tenantCode: string;
  cleanupCounts: {
    tenantConfigs: number;
    tenantEntitlements: number;
    roles: number;
    userAccounts: number;
    userRoleAssignments: number;
    taxProfiles: number;
    auditLogs: number;
  };
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
  packageId?: string;
  tierId?: string;
  tierKey?: string;
  billingEmail?: string;
  businessEmail?: string;
  accountOwnerEmail?: string;
  supportPhone?: string;
  notes?: string;
  // Optional tenant admin update fields (used when editing Step 2)
  firstTenantAdminName?: string;
  firstTenantAdminEmail?: string;
  firstTenantAdminPassword?: string;
}

export interface AuditLogItem {
  _id: string;
  action: string;
  actor: string;
  reason?: string | null;
  createdAt: string;
}

export interface TenantStorageItem {
  tenantCode: string;
  size: number;
  count: number;
}

export interface PaymentRequestPayload {
  paymentId: string;
  referenceNumber?: string;
  durationCode: BillingDurationCode;
  paymentMethod: PaymentMethod;
  tierId: string;
  paidAmount: number;
  manualDiscountPercent?: number;
  manualDiscountReason?: string;
  packageId?: string;
  paymentProof?: string;
}

export interface UploadPaymentProofPayload {
  paymentId: string;
  paymentProof: string;
  referenceNumber?: string;
}

export interface VerifyPaymentPayload {
  reason?: string;
  overrideReason?: string;
}

export interface RejectPaymentPayload {
  reason: string;
}

export interface ApplyPaymentTierPayload {
  tierId: string;
  reason?: string;
}

export interface SetPaymentDurationPayload {
  durationCode: BillingDurationCode;
  reason?: string;
}

export type PendingVerificationPaymentRecord = Omit<PaymentRecord, 'accountId' | 'tierId'> & {
  accountId: {
    _id: string;
    accountName?: string;
    tenantCode?: string;
    accountStatus?: AccountStatus;
    primaryContactEmail?: string;
  };
  tierId: {
    _id: string;
    tierKey?: string;
    displayName?: string;
  };
};

export interface PendingVerificationListResponse {
  items: PendingVerificationPaymentRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface VerifyPaymentResult {
  payment: PaymentRecord;
  account: TenantAccount;
  subscription: SaasSubscription;
  invoice: SaasInvoice;
}

export interface PaymentContextCurrentSubscription {
  accountStatus: AccountStatus;
  tierId?: string | null;
  tierKey?: string | null;
  tierDisplayName?: string | null;
  subscriptionEndAt?: string | null;
  isExpired: boolean;
  daysDelta: number;
}

export interface PaymentContextPreviousPayment {
  paymentId: string;
  verifiedAt?: string | null;
  durationCode: BillingDurationCode;
  expectedAmountAtRequest: number;
  paidAmountAtRequest: number;
  tierDiscountPercent: number;
  manualDiscountPercent: number;
  currency: string;
  tierId?: string | null;
  tierKey?: string | null;
  tierDisplayName?: string | null;
}

export interface PaymentContextResponse {
  currentSubscription: PaymentContextCurrentSubscription;
  previousPayment: PaymentContextPreviousPayment | null;
}
