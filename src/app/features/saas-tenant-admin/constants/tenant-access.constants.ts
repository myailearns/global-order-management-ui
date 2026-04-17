/**
 * EPIC 3 UI Constants
 * Features, Modules, Permissions, and default configurations
 */

/**
 * Feature Modules
 */
export enum FeatureModule {
  USERS = 'users',
  EMPLOYEES = 'employees',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
}

/**
 * Permission Keys by Module
 */
export const PERMISSION_KEYS = {
  // Users module
  USERS_VIEW: 'users.view',
  USERS_ADD: 'users.add',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_APPROVE: 'users.approve',
  USERS_CANCEL: 'users.cancel',
  USERS_EXPORT: 'users.export',

  // Employees module
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_ADD: 'employees.add',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_EXPORT: 'employees.export',

  // Roles module
  ROLES_VIEW: 'roles.view',
  ROLES_ADD: 'roles.add',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',

  // Permissions module (meta)
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_EXPORT: 'permissions.export',
} as const;

/**
 * Permission matrix by module:
 * Defines which actions require view permission as prerequisite
 */
export const PERMISSION_STRUCTURE = {
  [FeatureModule.USERS]: {
    actionPermissions: [
      PERMISSION_KEYS.USERS_VIEW,
      PERMISSION_KEYS.USERS_ADD,
      PERMISSION_KEYS.USERS_EDIT,
      PERMISSION_KEYS.USERS_DELETE,
      PERMISSION_KEYS.USERS_APPROVE,
      PERMISSION_KEYS.USERS_CANCEL,
      PERMISSION_KEYS.USERS_EXPORT,
    ],
    prereqFor: {
      [PERMISSION_KEYS.USERS_ADD]: PERMISSION_KEYS.USERS_VIEW,
      [PERMISSION_KEYS.USERS_EDIT]: PERMISSION_KEYS.USERS_VIEW,
      [PERMISSION_KEYS.USERS_DELETE]: PERMISSION_KEYS.USERS_VIEW,
      [PERMISSION_KEYS.USERS_APPROVE]: PERMISSION_KEYS.USERS_VIEW,
      [PERMISSION_KEYS.USERS_CANCEL]: PERMISSION_KEYS.USERS_VIEW,
      [PERMISSION_KEYS.USERS_EXPORT]: PERMISSION_KEYS.USERS_VIEW,
    },
  },
  [FeatureModule.EMPLOYEES]: {
    actionPermissions: [
      PERMISSION_KEYS.EMPLOYEES_VIEW,
      PERMISSION_KEYS.EMPLOYEES_ADD,
      PERMISSION_KEYS.EMPLOYEES_EDIT,
      PERMISSION_KEYS.EMPLOYEES_DELETE,
      PERMISSION_KEYS.EMPLOYEES_EXPORT,
    ],
    prereqFor: {
      [PERMISSION_KEYS.EMPLOYEES_ADD]: PERMISSION_KEYS.EMPLOYEES_VIEW,
      [PERMISSION_KEYS.EMPLOYEES_EDIT]: PERMISSION_KEYS.EMPLOYEES_VIEW,
      [PERMISSION_KEYS.EMPLOYEES_DELETE]: PERMISSION_KEYS.EMPLOYEES_VIEW,
      [PERMISSION_KEYS.EMPLOYEES_EXPORT]: PERMISSION_KEYS.EMPLOYEES_VIEW,
    },
  },
  [FeatureModule.ROLES]: {
    actionPermissions: [
      PERMISSION_KEYS.ROLES_VIEW,
      PERMISSION_KEYS.ROLES_ADD,
      PERMISSION_KEYS.ROLES_EDIT,
      PERMISSION_KEYS.ROLES_DELETE,
    ],
    prereqFor: {
      [PERMISSION_KEYS.ROLES_ADD]: PERMISSION_KEYS.ROLES_VIEW,
      [PERMISSION_KEYS.ROLES_EDIT]: PERMISSION_KEYS.ROLES_VIEW,
      [PERMISSION_KEYS.ROLES_DELETE]: PERMISSION_KEYS.ROLES_VIEW,
    },
  },
  [FeatureModule.PERMISSIONS]: {
    actionPermissions: [
      PERMISSION_KEYS.PERMISSIONS_VIEW,
      PERMISSION_KEYS.PERMISSIONS_EXPORT,
    ],
    prereqFor: {
      [PERMISSION_KEYS.PERMISSIONS_EXPORT]: PERMISSION_KEYS.PERMISSIONS_VIEW,
    },
  },
} as const;

/**
 * i18n Translation keys for UI text
 */
export const TRANSLATION_KEYS = {
  // Titles
  TITLE_TENANT_ADMIN: 'saas.admin.title',
  TITLE_USERS: 'saas.admin.users.title',
  TITLE_EMPLOYEES: 'saas.admin.employees.title',
  TITLE_ROLES: 'saas.admin.roles.title',
  TITLE_DASHBOARD: 'saas.admin.dashboard.title',

  // Buttons
  BTN_INVITE_USER: 'saas.admin.users.btn_invite',
  BTN_CREATE_EMPLOYEE: 'saas.admin.employees.btn_create',
  BTN_CREATE_ROLE: 'saas.admin.roles.btn_create',
  BTN_EDIT: 'common.btn_edit',
  BTN_DELETE: 'common.btn_delete',
  BTN_SAVE: 'common.btn_save',
  BTN_CANCEL: 'common.btn_cancel',
  BTN_CONFIRM: 'common.btn_confirm',
  BTN_LOCK: 'saas.admin.users.btn_lock',
  BTN_UNLOCK: 'saas.admin.users.btn_unlock',
  BTN_ASSIGN_ROLES: 'saas.admin.users.btn_assign_roles',
  BTN_CLONE_ROLE: 'saas.admin.roles.btn_clone',
  BTN_LINK_USER: 'saas.admin.employees.btn_link_user',

  // Labels
  LBL_EMAIL: 'common.email',
  LBL_PHONE: 'common.phone',
  LBL_STATUS: 'common.status',
  LBL_ROLES: 'saas.admin.users.lbl_roles',
  LBL_PERMISSIONS: 'saas.admin.roles.lbl_permissions',
  LBL_FIRST_NAME: 'common.first_name',
  LBL_LAST_NAME: 'common.last_name',
  LBL_EMPLOYEE_CODE: 'saas.admin.employees.lbl_employee_code',
  LBL_DEPARTMENT: 'common.department',
  LBL_DESIGNATION: 'common.designation',
  LBL_ROLE_NAME: 'saas.admin.roles.lbl_role_name',
  LBL_ROLE_KEY: 'saas.admin.roles.lbl_role_key',
  LBL_DESCRIPTION: 'common.description',

  // Messages
  MSG_INVITE_SUCCESS: 'saas.admin.users.msg_invite_success',
  MSG_CREATE_EMPLOYEE_SUCCESS: 'saas.admin.employees.msg_create_success',
  MSG_CREATE_ROLE_SUCCESS: 'saas.admin.roles.msg_create_success',
  MSG_UPDATE_SUCCESS: 'common.msg_update_success',
  MSG_DELETE_SUCCESS: 'common.msg_delete_success',
  MSG_LOCK_SUCCESS: 'saas.admin.users.msg_lock_success',
  MSG_UNLOCK_SUCCESS: 'saas.admin.users.msg_unlock_success',
  MSG_ASSIGN_ROLES_SUCCESS: 'saas.admin.users.msg_assign_roles_success',

  // Errors
  ERR_INVITE_FAILED: 'saas.admin.users.err_invite_failed',
  ERR_PERMISSION_DENIED: 'saas.admin.err_permission_denied',
  ERR_LAST_SAAS_ADMIN: 'saas.admin.err_last_saas_admin',
  ERR_INVALID_EMAIL: 'common.err_invalid_email',
  ERR_EMPLOYEE_CODE_EXISTS: 'saas.admin.employees.err_code_exists',
  ERR_ROLE_KEY_EXISTS: 'saas.admin.roles.err_key_exists',

  // Placeholders
  PH_SEARCH_USERS: 'saas.admin.users.ph_search',
  PH_SEARCH_EMPLOYEES: 'saas.admin.employees.ph_search',
  PH_SEARCH_ROLES: 'saas.admin.roles.ph_search',

  // Table headers
  TBL_USER_EMAIL: 'saas.admin.users.tbl_email',
  TBL_USER_PHONE: 'saas.admin.users.tbl_phone',
  TBL_USER_STATUS: 'saas.admin.users.tbl_status',
  TBL_USER_ROLES: 'saas.admin.users.tbl_roles',
  TBL_USER_LAST_LOGIN: 'saas.admin.users.tbl_last_login',
  TBL_EMPLOYEE_CODE: 'saas.admin.employees.tbl_code',
  TBL_EMPLOYEE_NAME: 'saas.admin.employees.tbl_name',
  TBL_EMPLOYEE_DEPT: 'saas.admin.employees.tbl_dept',
  TBL_ROLE_NAME: 'saas.admin.roles.tbl_name',
  TBL_ROLE_KEY: 'saas.admin.roles.tbl_key',
  TBL_ROLE_PERMS: 'saas.admin.roles.tbl_perms',
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  USERS_PAGE_SIZE: 20,
  EMPLOYEES_PAGE_SIZE: 20,
  ROLES_PAGE_SIZE: 20,
  DEBOUNCE_SEARCH_MS: 300,
  TOAST_DURATION_MS: 3000,
  MAX_ROLE_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
};

/**
 * Default locale translations (en)
 * Actual translations will be in i18n JSON files
 */
export const DEFAULT_TRANSLATIONS = {
  'saas.admin.title': 'Tenant Administration',
  'saas.admin.users.title': 'Users',
  'saas.admin.employees.title': 'Employees',
  'saas.admin.roles.title': 'Roles & Permissions',
  'saas.admin.users.btn_invite': 'Invite User',
  'saas.admin.employees.btn_create': 'Create Employee',
  'saas.admin.roles.btn_create': 'Create Role',
  'saas.admin.err_permission_denied': 'You do not have permission to perform this action',
  'saas.admin.err_last_saas_admin': 'Cannot remove the last SaaS admin from the tenant',
} as const;
