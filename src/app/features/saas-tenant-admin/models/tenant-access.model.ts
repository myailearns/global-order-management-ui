/**
 * EPIC 3 UI Models for Tenant Access & User/Role Management
 * Mirrors backend schemas: UserAccount, EmployeeProfile, Role, UserRoleAssignment
 */

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ScopeType {
  TENANT = 'TENANT',
  TEAM = 'TEAM',
  SELF = 'SELF',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
}

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * UserAccount: Individual user in the system
 */
export interface UserAccount {
  _id: string;
  tenantId: string;
  email: string;
  fullName: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * EmployeeProfile: Business profile linked to user or standalone
 */
export interface EmployeeProfile {
  _id: string;
  tenantId: string;
  employeeCode: string;
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
  userId?: string | UserAccount;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Role: Tenant-specific role with permission set
 */
export interface Role {
  _id: string;
  tenantId: string;
  roleKey: string;
  name: string;
  description?: string;
  permissionKeys: string[];
  isSystem: boolean;
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * UserRoleAssignment: Maps user to roles with scope
 */
export interface UserRoleAssignment {
  _id: string;
  tenantId: string;
  userId: string;
  roleId: string | Role;
  scopeType: ScopeType;
  scopeRef?: string;
  status: AssignmentStatus;
  assignedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permission: Action on a feature module
 * Format: module.action (e.g., users.view, users.add, roles.edit)
 */
export enum StandardAction {
  VIEW = 'view',
  ADD = 'add',
  EDIT = 'edit',
  DELETE = 'delete',
  APPROVE = 'approve',
  CANCEL = 'cancel',
  EXPORT = 'export',
}

export interface Permission {
  key: string; // feature key, e.g. 'orders.place'
  module: string; // e.g. 'orders'
  action: StandardAction | string; // kept for compat — equals displayName
  displayName?: string; // human-readable feature name, e.g. 'Place Order'
  description?: string;
  requiresView?: boolean;
}

/**
 * UserWithRoles: Extended view of user with assigned roles
 */
export interface UserWithRoles extends UserAccount {
  assignedRoles?: Array<{
    roleId: string;
    roleKey: string;
    roleName: string;
    scopeType: ScopeType;
  }>;
  linkedEmployee?: EmployeeProfile;
}

/**
 * RoleWithPermissions: Extended view of role with detailed permissions
 */
export interface RoleWithPermissions extends Role {
  groupedPermissions: Map<string, Permission[]>;
  permissionCount: number;
  mappedUserCount?: number;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  reasonCode?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Create/Update request types
 */
export interface CreateUserRequest {
  fullName: string;
  email: string;
}

export interface UpdateUserRequest {
  status?: UserStatus;
  mfaEnabled?: boolean;
}

export interface CreateEmployeeRequest {
  employeeCode?: string;
  fullName: string;
  email: string;
  passwordMode?: 'auto' | 'manual';
  password?: string;
  phone?: string;
  department?: string;
  designation?: string;
  userId?: string;
  status?: EmployeeStatus;
}

export interface EmployeeCodePreview {
  employeeCode: string;
  allowManualOverride: boolean;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  phone?: string;
  department?: string;
  designation?: string;
  userId?: string | null;
  status?: EmployeeStatus;
}

export interface CreateRoleRequest {
  roleKey?: string;
  name: string;
  description?: string;
  permissionKeys: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionKeys?: string[];
  status?: RoleStatus;
}

/**
 * UI State helpers
 */
export interface UserListState {
  users: UserWithRoles[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  searchTerm: string;
  filterStatus: UserStatus | null;
}

export interface RoleMatrixState {
  roles: RoleWithPermissions[];
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  selectedRoleId: string | null;
}

export interface TenantAdminEntitledFeature {
  featureKey: string;
  displayName: string;
  module: string;
}

export interface TenantAdminSummary {
  tenant: {
    accountName: string;
    tenantCode: string;
    accountStatus: string;
    trialMode: string;
    trialEndAt?: string | null;
  } | null;
  package: {
    planId: string;
    name: string;
    tier: string;
    status: string;
  } | null;
  limits: {
    maxEmployees: number | null;
    maxRoles: number | null;
    maxUsers: number | null;
  };
  counts: {
    users: number;
    employees: number;
    roles: number;
  };
  entitledFeatures: TenantAdminEntitledFeature[];
  entitledModules: string[];
  availablePermissions: Permission[];
  reasonCode?: string | null;
}

export interface BillingSupportCallbackRequest {
  source?: string;
  preferredChannel?: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'OTHER';
  note?: string;
}

export interface BillingSupportCallbackResponse {
  requestId: string;
  requestedAt: string;
  tenantCode: string;
  accountName: string;
  accountStatus: string;
}

export interface DashboardUnavailableCard {
  code: string;
  reason: 'NO_PERMISSION' | 'NO_FEATURE' | 'DATA_NOT_READY' | 'SERVICE_ERROR';
  message: string;
}

export interface DashboardSalesToday {
  grossAmount: number;
  discountAmount: number;
  refundAmount: number;
  netAmount: number;
  currency: string;
}

export interface DashboardPaymentPending {
  pendingAmount: number;
  pendingOrderCount: number;
  currency: string;
}

export interface DashboardLowStock {
  count: number;
  criticalCount: number;
  thresholdSource: string;
}

export interface DashboardQuickActionItem {
  code: string;
  label: string;
  route: string;
  count: number | null;
}

export interface TenantDashboardSummary {
  success: boolean;
  generatedAt: string;
  tenantId: string;
  timezone: string;
  metricVersion: string;
  visibleCards: string[];
  unavailableCards: DashboardUnavailableCard[];
  data: {
    activeOrders: { count: number } | null;
    ordersNeedingAction: { count: number } | null;
    newOrdersToday: { count: number } | null;
    salesToday: DashboardSalesToday | null;
    paymentPending: DashboardPaymentPending | null;
    lowStock: DashboardLowStock | null;
    outOfStock: { count: number } | null;
    quickActions: { items: DashboardQuickActionItem[] } | null;
    statusFunnel: DashboardStatusFunnel | null;
    topProducts: DashboardTopProducts | null;
    slowProducts: DashboardSlowProducts | null;
    salesTrends: DashboardSalesTrends | null;
    profitability: DashboardProfitability | null;
    aov: DashboardAov | null;
    cancellationRate: DashboardCancellationRate | null;
    returnRefund: DashboardReturnRefund | null;
    newCustomersToday: { count: number } | null;
    repeatCustomerRate: DashboardRepeatCustomerRate | null;
    offerPerformance: DashboardOfferPerformance | null;
    entitlementUsage: DashboardEntitlementUsage | null;
  };
}

/**
 * Status Funnel: Order progression through statuses with drop % calculation
 */
export interface DashboardStatusFunnel {
  stages: Array<{
    status: string;
    label: string;
    count: number;
    dropPercent: number;
  }>;
}

/**
 * Top Products: Variants ranked by NET_SALES within period
 */
export interface DashboardTopProduct {
  variantId: string;
  productName: string;
  quantitySold: number;
  netSalesAmount: number;
  currency: string;
}

export interface DashboardTopProducts {
  rankingBasis: string;
  entityLevel: string;
  items: DashboardTopProduct[];
}

/**
 * Slow Products: Variants with low/zero sales in lookback window
 */
export interface DashboardSlowProduct {
  variantId: string;
  productName: string;
  unitsSold: number;
  netSalesAmount: number;
  currency: string;
}

export interface DashboardSlowProducts {
  lookbackDays: number;
  slowThreshold: number;
  items: DashboardSlowProduct[];
}

/**
 * Sales Trends: Aggregated sales by period (daily/weekly/monthly) with comparison
 */
export interface SalesTrendPeriod {
  period: string;
  netSales: number;
  orderCount: number;
  currency: string;
}

export interface AnalyticsSalesTrends {
  granularity: string;
  compareMode: string;
  current: SalesTrendPeriod[];
  previous: SalesTrendPeriod[];
}

/**
 * Drill-down Response: Orders Needing Action
 */
export interface OrderNeedingAction {
  orderId: string;
  orderNo: string;
  status: string;
  payableAmount: number;
  currency: string;
  placedAt: string | null;
}

export interface DashboardOrdersNeedingActionResponse {
  success: boolean;
  data: {
    items: OrderNeedingAction[];
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Drill-down Response: Low Stock Items
 */
export interface LowStockItem {
  variantId: string;
  productName: string;
  currentStock: number;
  reorderThreshold: number;
  thresholdSource: string;
}

export interface DashboardLowStockResponse {
  success: boolean;
  data: {
    items: LowStockItem[];
    page: number;
    limit: number;
    total: number;
  };
}

export interface OutOfStockItem {
  variantId: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
}

export interface DashboardOutOfStockResponse {
  success: boolean;
  data: {
    items: OutOfStockItem[];
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Drill-down Response: Top Products (paginated)
 */
export interface DashboardTopProductsResponse {
  success: boolean;
  data: {
    rankingBasis: string;
    entityLevel: string;
    items: DashboardTopProduct[];
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Drill-down Response: Slow Products (paginated)
 */
export interface DashboardSlowProductsResponse {
  success: boolean;
  data: {
    lookbackDays: number;
    slowThreshold: number;
    items: DashboardSlowProduct[];
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Analytics Response: Sales Trends
 */
export interface AnalyticsSalesTrendsResponse {
  success: boolean;
  data: AnalyticsSalesTrends;
}

// ============================================================
// Sprint 3: Bottom-Row Dashboard Metrics
// ============================================================

export interface DashboardSalesTrends {
  periodNetSales: number;
  currency: string;
}

export interface DashboardProfitability {
  grossProfit: number;
  revenueNet: number;
  cogsTotal: number;
  grossMarginPct: number | null;
  orderCount: number;
  currency: string;
  isEstimated: boolean;
}

export interface DashboardAov {
  value: number;
  currency: string;
}

export interface DashboardCancellationRate {
  cancelledOrders: number;
  totalOrders: number;
  percentage: number;
}

export interface DashboardReturnRefund {
  refundedOrders: number;
  refundedAmount: number;
  currency: string;
}

export interface DashboardRepeatCustomerRate {
  repeatCustomers: number;
  purchasingCustomers: number;
  percentage: number;
}

export interface DashboardOfferPerformance {
  usedCount: number;
  discountAmount: number;
  attributableNetSales: number;
  discountToSalesRatio: number;
  currency: string;
}

export interface DashboardEntitlementItem {
  featureKey: string;
  used: number;
  limit: number;
  usagePercent: number;
  isNearLimit: boolean;
}

export interface DashboardEntitlementUsage {
  items: DashboardEntitlementItem[];
}

// ============================================================
// Sprint 3: Analytics Workspace Responses
// ============================================================

export interface ContributionCategory {
  categoryId: string;
  categoryName: string;
  netSales: number;
  contributionPercent: number;
  currency: string;
}

export interface ContributionVariant {
  variantId: string;
  variantName: string;
  netSales: number;
  contributionPercent: number;
  currency: string;
}

export interface AnalyticsContributionResponse {
  success: boolean;
  data: {
    totalNetSales: number;
    currency: string;
    categories: ContributionCategory[];
    topVariants: ContributionVariant[];
  };
}

export interface CustomerMixSeriesItem {
  period: string;
  newCustomers: number;
  repeatCustomers: number;
}

export interface AnalyticsCustomerMixResponse {
  success: boolean;
  data: {
    newCustomers: number;
    repeatCustomers: number;
    repeatSharePercent: number;
    series: CustomerMixSeriesItem[];
  };
}

export interface ReasonSplitItem {
  reason: string;
  count: number;
  percent: number;
}

export interface AnalyticsReasonSplitsResponse {
  success: boolean;
  data: {
    cancellations: ReasonSplitItem[];
    refunds: ReasonSplitItem[];
  };
}

export interface ChannelPaymentMethod {
  method: string;
  orderCount: number;
  netSales: number;
  currency: string;
}

export interface ChannelOrderSource {
  source: string;
  orderCount: number;
  netSales: number;
  currency: string;
}

export interface AnalyticsChannelSplitsResponse {
  success: boolean;
  data: {
    paymentMethods: ChannelPaymentMethod[];
    orderSources: ChannelOrderSource[];
  };
}

export interface HourlyBucket {
  hour: number;
  orderCount: number;
  netSales: number;
  currency: string;
}

export interface DayMatrixHour {
  hour: number;
  orderCount: number;
}

export interface DayMatrixRow {
  day: string;
  hours: DayMatrixHour[];
}

export interface AnalyticsDemandHeatmapResponse {
  success: boolean;
  data: {
    timezone: string;
    hourlyBuckets: HourlyBucket[];
    dayMatrix?: DayMatrixRow[];
  };
}

export interface AnalyticsPromotionResponse {
  success: boolean;
  data: {
    currency: string;
    offersUsed: number;
    discountAmount: number;
    attributableNetSales: number;
    discountToSalesRatio: number;
    compareOffersUsed: number;
    compareDiscountAmount: number;
    offersUsedTrendPct: number | null;
    discountAmountTrendPct: number | null;
  };
}
