/**
 * EPIC 3 UI Models for Tenant Access & User/Role Management
 * Mirrors backend schemas: UserAccount, EmployeeProfile, Role, UserRoleAssignment
 */

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  DISABLED = 'DISABLED',
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
  phone?: string;
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
  phone?: string;
}

export interface UpdateUserRequest {
  phone?: string;
  status?: UserStatus;
  mfaEnabled?: boolean;
}

export interface CreateEmployeeRequest {
  employeeCode: string;
  fullName: string;
  department?: string;
  designation?: string;
  userId?: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  department?: string;
  designation?: string;
  userId?: string | null;
  status?: EmployeeStatus;
}

export interface CreateRoleRequest {
  roleKey: string;
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
