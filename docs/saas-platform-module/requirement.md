# SAAS PLATFORM REQUIREMENT

## OVERVIEW
This document defines the SaaS platform layer for Global Order Management.

The existing product already supports:
- Product and pricing configuration
- Tax profile management
- Customer and customer-group operations
- Delivery rider management
- Multi-source order lifecycle
- Inventory reservation and stock movement

This SaaS layer enables multiple businesses (tenants) to use the same platform with strict isolation and package-based access.

## OBJECTIVE
Build a multi-tenant SaaS system where each tenant can:
- Create and manage its SaaS account
- Use only purchased features
- Configure users, roles, and permissions
- Run online and offline order workflows
- Manage stock, customers, delivery, and tax
- Enable future integrations and automation

## KEY PRINCIPLES
- Strict tenant isolation for data, users, and settings
- Entitlement-first access (package/add-on/custom feature)
- Fine-grained role-based access control
- India-first defaults with global extensibility
- Full auditability for critical operations

## SAAS ACCOUNTS TAB
Add a dedicated Admin tab: SaaS Accounts.

### Purpose
Allow platform operators and authorized tenant admins to create and manage tenant accounts.

### SaaS Account Fields
Mandatory:
- accountName
- legalBusinessName
- tenantCode (unique)
- primaryContactName
- primaryContactPhone
- primaryContactEmail
- countryCode (default IN)
- currency (default INR)
- timezone (default Asia/Kolkata)
- planId

Optional:
- gstin
- businessAddress
- logoUrl
- website
- billingEmail
- supportPhone
- notes

System-managed:
- accountStatus (TRIAL, ACTIVE, SUSPENDED, CANCELLED)
- trialStartAt
- trialEndAt
- subscriptionStartAt
- subscriptionEndAt
- createdAt
- updatedAt
- createdBy
- updatedBy

### SaaS Account Actions
- Create account
- Edit account
- Activate or suspend account
- Extend trial
- Change package/plan
- Enable or disable add-ons
- View usage summary
- View audit log

### Validations
- tenantCode must be globally unique
- Phone and email must be valid formats
- Account activation requires at least one active tenant admin
- Downgrade blocked when active usage exceeds target plan limits (unless super admin override)

## TENANT ONBOARDING FLOW
1. Platform super admin creates SaaS account.
2. System creates tenant with defaults.
3. System applies purchased package entitlements.
4. System creates default saas_admin user and sends invite.
5. Tenant admin completes setup wizard:
   - business profile
   - tax defaults
   - order workflow settings
   - delivery settings
   - stock rules
6. Tenant starts trial or paid subscription.

## ACCESS MODEL

### Platform Roles
- platform_super_admin: full control across tenants
- platform_support: support operations with limited scope
- platform_billing_admin: plans, billing, subscriptions

### Tenant Roles
- saas_admin (default): full control over bought features in tenant
- org_admin (optional alias role)
- sales_agent
- warehouse_staff
- delivery_manager
- finance_user
- support_staff
- readonly_analyst

### Default SaaS Admin Rules
- Every tenant must have at least one active saas_admin
- saas_admin can manage tenant users, employees, roles, and permission mappings
- saas_admin can configure only entitled modules/features
- saas_admin cannot assign access for non-purchased features

### Platform Super Admin Responsibilities
platform_super_admin can:
- Create and manage packages/plans
- Define feature catalog and dependencies
- Manage add-ons and custom feature assignments
- Create, activate, suspend, and update SaaS accounts
- Manage global role/permission templates
- View cross-tenant usage and audit dashboards
- Perform tenant-admin equivalent actions for a specific tenant (company-side support mode)

platform_super_admin cannot:
- Bypass critical audit logging
- Perform cross-tenant actions without tenant-scoped context

### Company-Side Tenant Control
Platform super admin can perform saas_admin-like operations for a specific tenant when needed:
- Create/lock/unlock tenant users
- Create/edit tenant roles
- Map permissions
- Troubleshoot entitlement issues

Mandatory controls:
- Strict tenant scope per action
- Reason capture for each intervention
- Full immutable audit trail
- Optional dual approval for high-risk actions

## ROLE MANAGEMENT (FLEXIBLE)

### Flexible Role Builder
- Tenant admin can create unlimited custom roles (or plan-limited if configured)
- Role design is dynamic, not fixed-template only
- Role can be view-only, edit-only, or mixed
- Clone-role flow must be supported for faster setup

### Role Management Actions
- Create role
- Clone role
- Edit permissions
- Deactivate role
- Assign/unassign role to users
- Bulk reassign users

### Role Constraints
- At least one active saas_admin (or org_admin equivalent) must always exist
- Assigned roles cannot be deleted without reassignment
- System baseline roles are non-deletable
- Cross-tenant role assignment is blocked
- Tenant can assign permissions only from entitled features

### Approval and Audit
- High-risk permission changes require admin confirmation
- All role/permission changes must store actor, timestamp, before/after diff
- Optional 4-eyes approval for enterprise mode

## FEATURE-PERMISSION MODEL

### Granular Feature-to-Role Permissions
Permissions must be mapped at feature action level.

Minimum action set:
- view
- add
- edit
- delete
- approve
- cancel
- export

Examples:
- orders.view, orders.add, orders.edit, orders.cancel
- stock.view, stock.add, stock.edit, stock.adjust

Expected configurability:
- Role A: orders.view only
- Role B: orders.view + orders.edit
- Role C: orders.view + orders.add + orders.edit + orders.cancel

### Permission Evaluation Order
1. Account status check
2. Entitlement check (package/add-on/custom)
3. Role permission check
4. Scope check (self/team/tenant)

### Access Denial Behavior
- API must return reason code: feature_disabled, plan_limit_exceeded, permission_denied
- UI must hide/disable inaccessible actions and optionally show reason

## ENTITLEMENT MODEL (PACKAGE + CUSTOM)

### Entitlement Sources
- Base package entitlement
- Add-on entitlement
- Custom entitlement (contract specific)
- Trial entitlement (time-bound)

### Trial Model (Explicit)
- Platform must support trial accounts for a configurable number of days (example: 7, 14, or 30 days)
- Trial can be configured as:
   - FULL_APP_TRIAL: temporary access to all standard modules/features
   - PLAN_BASED_TRIAL: temporary access only to selected package features
- Default recommended mode: FULL_APP_TRIAL for faster product evaluation
- Trial metadata per tenant:
   - trialMode
   - trialStartAt
   - trialEndAt
   - trialGraceEndAt (optional)
   - trialConvertedAt (nullable)
   - trialConversionPlanId (nullable)

### Trial Conversion Rules
- Before trial expiry, system must show upgrade prompts and package comparison
- Tenant can convert to paid plan at any time during trial
- On conversion:
   - apply purchased plan entitlements immediately (or from billing effective date)
   - disable trial-only features not included in purchased plan
   - keep data readable; enforce edit/create rights based on new plan
   - preserve role mappings, but automatically inactivate permissions for non-entitled features
- If trial expires without conversion:
   - account enters grace period (if configured)
   - after grace, account becomes SUSPENDED as per policy

### Trial Safeguards
- Trial expiry reminders: T-7, T-3, T-1, and day of expiry
- Clear in-app banner showing remaining trial days
- No data loss on trial expiry or plan conversion
- Full audit history for trial creation, extension, conversion, and suspension

### Effective Access Formula
effectiveFeatures = basePackageFeatures + addOnFeatures + customFeatures - suspendedFeatures

### Package-Scoped Role Assignment
- Tenant role builder shows only purchased modules/features
- If tenant bought only order and stock modules, only those permissions are assignable
- Non-purchased permissions are blocked in UI and API
- If entitlement is removed, affected role permissions become inactive and auditable

### Custom Feature Assignment Rules
- Only platform_super_admin or platform_billing_admin can grant custom features
- Custom grant requires: featureKey, reason, validFrom, validTo(optional), actor
- Expired custom grants auto-disable
- Override history must be immutable

### Feature Catalog Governance
Central feature catalog should maintain:
- featureKey
- module
- dependencyKeys
- planAvailability
- isBeta
- uiVisibilityPolicy

### Tenant Login Behavior
On login:
1. Validate account status
2. Resolve effective features for tenant
3. Resolve user roles/permissions
4. Build session access profile
5. Grant access only to bought and permitted features

If feature not bought or not permitted:
- UI route/action blocked
- API request denied with reason code

## USER / EMPLOYEE MANAGEMENT

### Entity Model
User (identity) linked with Employee (business profile).

User fields:
- userId
- tenantId
- email (tenant-unique)
- phone (tenant-unique)
- authProvider/passwordHash
- status (INVITED, ACTIVE, LOCKED, DISABLED)
- lastLoginAt
- mfaEnabled

Employee fields:
- employeeId
- tenantId
- userId (nullable until activation)
- fullName
- employeeCode
- department
- designation
- managerId
- joiningDate
- workLocation
- status (ACTIVE, INACTIVE, ON_LEAVE)

### Lifecycle
1. Create employee
2. Invite user
3. Activate credentials
4. Assign role(s) and scope
5. Lock/unlock or disable when needed
6. Preserve history for audit

### Actions
- Create user/employee
- Link/unlink user and employee
- Assign one or multiple roles
- Reset password/resend invite
- Lock/unlock user
- Deactivate/reactivate employee

### Validation Rules
- Active user requires tenant + role
- Email/phone uniqueness within tenant
- Disabled user access blocked except reactivation flows
- Employee hard delete blocked when referenced by orders/audit

## PLAN AND FEATURE PACKAGING

### Starter
- Product management
- Basic stock operations
- Offline order capture
- Customer master
- Basic reports

### Growth
- Everything in Starter
- Online order channel support
- Delivery rider management
- Tax profile mapping
- Customer groups
- Advanced analytics

### Scale
- Everything in Growth
- Multi-store support
- API/webhook access
- Workflow automation
- Priority support

### Add-ons
- WhatsApp notifications
- Advanced report export
- Courier API connectors
- Accounting integration
- CRM integration

### Plan Limits
- maxUsers
- maxEmployees
- maxMonthlyOrders
- maxProducts
- maxWarehouses (future)
- maxApiCallsPerDay

When limit reached:
- Block new creates for capped resource
- Allow read/export of existing data
- Show upgrade prompt with usage vs limit

## ONLINE + OFFLINE ORDER SUPPORT
Supported channels under same tenant:
- Offline: walk-in, call orders, social DM entry
- Online: customer web/app checkout (future-ready)

Common requirements:
- Unified order entity
- orderSource tracking
- deliveryType tracking
- Payment method and payment status separation
- Order-time tax/pricing snapshot

## STOCK MANAGEMENT IN SAAS CONTEXT
- Tenant-scoped products and stock ledgers
- Reservation on order placement
- Issue on dispatch/delivery based on workflow
- Release/restock on cancellation/return paths
- Actor-based stock audit trail
- Tenant-specific low-stock thresholds

## AUTOMATION AND INTEGRATION ROADMAP

### Phase 1
- Internal tenant-safe APIs

### Phase 2
- Tenant API keys
- Webhooks: order.created, order.status.changed, stock.low, payment.updated

### Phase 3
- Courier, payment, accounting, CRM connectors

### Phase 4
- Rule engine (auto-assignment, workflow automation, retry/escalation)

## ADMIN PANEL UX REQUIREMENTS
- Role-permission matrix with search/filter
- Module-level bulk grant/revoke
- Quick actions (view all/manage all)
- Effective access preview before save
- Change summary and conflict warnings

## NON-FUNCTIONAL REQUIREMENTS
- Tenant isolation on every API/query
- Audit logs for sensitive actions
- PII-safe logging
- Idempotency for critical writes
- Backup/restore and retention policy

## SECURITY BASELINE
- JWT auth with refresh flow
- Optional SSO (enterprise)
- MFA rollout for admin users
- Rate limiting and strict input validation
- Session revocation on user lock/disable

## TRIAL LIFECYCLE (EXPLICIT)

### Trial Modes
- FULL_APP_TRIAL: temporary access to all standard modules/features
- PLAN_BASED_TRIAL: temporary access only to selected package features

### Trial Configuration
- trialMode
- trialStartAt
- trialEndAt
- trialGraceEndAt (optional)
- trialConvertedAt (nullable)
- trialConversionPlanId (nullable)

### Trial Conversion Flow
1. Tenant receives in-app upgrade reminders before trial end.
2. Tenant chooses package and optional add-ons.
3. System applies paid entitlements.
4. Non-entitled trial features become inactive automatically.
5. Existing data remains intact; access follows new entitlements.

### Trial Expiry Behavior
- If not converted, tenant enters grace period when configured.
- After grace, account moves to SUSPENDED policy state.
- No tenant data loss on expiry/suspension.

## MULTI-TENANT ARCHITECTURE GUARDRails

### Tenant Context Resolution (Mandatory)
Every request must resolve tenant context using approved sources only:
- subdomain or host mapping (recommended)
- trusted gateway header
- signed tenant claim in token

Rules:
- Reject request if token tenant and resolved tenant mismatch.
- Never trust raw client tenantId without verification.
- Attach tenant context to trace metadata for observability.

### Data Isolation Enforcement
- Every tenant business collection must include tenantId.
- Query layer must auto-apply tenant filter.
- Async jobs, webhooks, exports must run in explicit tenant scope.
- Support-mode actions must include reason and supportSessionId.

## CORE SAAS DOMAIN ENTITIES

Minimum entities to implement and maintain:
- TenantAccount
- PackagePlan
- FeatureCatalogItem
- TenantEntitlement
- Role
- Permission
- UserRoleAssignment
- UsageCounter
- BillingSubscription
- AuditEvent

Minimum entity rules:
- Soft delete for role and entitlement records used in history.
- Effective date support for package and entitlement changes.
- Immutable audit event stream for security-sensitive updates.

## MINIMUM API CONTRACTS (REQUIREMENT LEVEL)

### Platform APIs
- POST /api/v1/platform/packages
- PATCH /api/v1/platform/packages/:id
- GET /api/v1/platform/features
- POST /api/v1/platform/tenants
- PATCH /api/v1/platform/tenants/:id/status
- POST /api/v1/platform/tenants/:id/entitlements

### Tenant Admin APIs
- GET /api/v1/tenant/session/access-profile
- GET /api/v1/tenant/roles
- POST /api/v1/tenant/roles
- PATCH /api/v1/tenant/roles/:id
- POST /api/v1/tenant/users
- PATCH /api/v1/tenant/users/:id/status
- GET /api/v1/tenant/usage

### Access Failure Contract
Standard error payload must include:
- code
- reason
- tenantId
- traceId
- suggestedAction (optional)

## ENTITLEMENT CACHE AND CONSISTENCY
- Entitlements may be cached for performance, but cache must be tenant-aware
- On plan/feature/role changes, invalidate entitlement cache immediately
- Define maximum stale window (recommended <= 60 seconds)
- Critical operations (write/update/delete) must re-check source-of-truth if cache uncertainty exists

## RELIABILITY, DR, AND OPERATIONS READINESS

### SLO/SLA Baselines
- Define p95 and p99 latency targets per critical API group
- Define availability target for auth, order, and entitlement APIs
- Define error budget and alert thresholds

### Backup and Disaster Recovery
- Define RPO and RTO targets per environment
- Tenant restore procedure must support point-in-time recovery
- Run quarterly DR drills and document outcomes

### Job and Event Reliability
- Webhook and async jobs must use retry with backoff + dead-letter queue
- Idempotency keys required for entitlement/billing state transitions
- Duplicate event handling must be safe and auditable

## TEST, UAT, AND RELEASE GATES

## INTERIM GATE BEFORE TRIAL LIFECYCLE (EPIC 3.5)

Purpose:
Add a mandatory implementation and validation gate between EPIC 3 and EPIC 4 so that account, entitlement, and permission flows are proven in real screens before trial/conversion logic is introduced.

### Epic 3.5 Mandatory Capabilities
- Separate login entry points for platform admins and tenant admins
- Session bootstrap flow that resolves actor type, tenant context, effective entitlements, and role permissions
- Entitlement-aware left navigation for tenant users
- Route and action guards that block non-entitled and non-permitted access
- Standard user-facing handling for denied-access reason codes

### Epic 3.5 Validation Matrix (Minimum)
- Plans: Starter, Growth, Scale (or equivalent active plans)
- Role profiles: view-only, editor, saas_admin
- Account states: TRIAL, ACTIVE, SUSPENDED

### Epic 3.5 Exit Criteria
- Platform admin login can access SaaS account/package/feature/entitlement modules end-to-end
- Tenant admin login can access only subscribed and permitted modules
- Direct URL access to restricted screens is denied in UI and API
- Denied-access reasons are visible and actionable for user/admin
- EPIC 1, EPIC 2, and EPIC 3 journey checklist passes in UAT

### Mandatory Test Layers
- Unit tests for permission evaluator and entitlement resolver
- Integration tests for tenant isolation and role enforcement
- E2E tests for trial -> conversion -> downgrade -> suspension lifecycle
- Security tests for tenant spoofing and privilege escalation scenarios

### UAT Scenarios (Minimum)
- New tenant trial onboarding and first login
- saas_admin role creation and per-action permission mapping
- Package upgrade/downgrade with impact preview
- Company-side support override with full audit trace
- Expired trial with grace and suspension behavior

### Release Readiness Checklist
- Feature flags configured per environment
- Migration scripts validated on staging data
- Backward compatibility confirmed for existing tenants
- Rollback runbook approved

## COMPLETE SAAS IMPLEMENTATION FLOW

### Flow 1: Platform Setup (Company Side)
1. Define feature catalog with dependency rules.
2. Define packages (Starter/Growth/Scale) and add-ons.
3. Define plan limits (users, employees, orders, products, API usage).
4. Define global role templates and default permission keys.
5. Enable platform audit policies for all sensitive actions.

### Flow 2: SaaS Account Creation
1. platform_super_admin creates SaaS account from SaaS Accounts tab.
2. System validates tenantCode uniqueness and account details.
3. System creates tenant and applies package entitlements.
4. System creates default saas_admin user and sends invite.
5. Account moves to TRIAL or ACTIVE based on subscription setup.

### Flow 3: Tenant Bootstrap After First Login
1. saas_admin accepts invite and logs in.
2. System resolves effective features from package/add-ons/custom.
3. System shows only entitled modules in UI.
4. saas_admin configures business profile and operational settings.
5. saas_admin creates users/employees and assigns initial roles.

### Flow 4: Role and Permission Configuration
1. saas_admin opens role builder.
2. Creates custom roles as needed (view-only/edit-only/mixed).
3. Maps feature permissions at action level (view/add/edit/delete/approve/cancel/export).
4. Saves role and assigns users.
5. System writes full audit trail of permission changes.

### Flow 5: Runtime Access Check Per Request
For each API and route access:
1. Validate user authentication and token.
2. Validate account status (ACTIVE or valid TRIAL).
3. Validate tenant entitlement for requested feature.
4. Validate user role permission for requested action.
5. Validate scope restrictions (self/team/tenant/store/zone).
6. Allow or deny with standardized reason code.

### Flow 6: Daily Operations Under Tenant
1. Users operate only within purchased modules.
2. Orders, stock, customers, and delivery flows execute under tenantId.
3. Audit logs capture critical create/update/delete/status transitions.
4. Plan usage counters increment in near real time.
5. Limit breaches block further creates and show upgrade path.

### Flow 7: Company-Side Support Override
1. Tenant requests support or internal policy triggers intervention.
2. platform_super_admin enters tenant-scoped support mode.
3. Performs only required admin action (user/role/permission/entitlement fix).
4. System records reason, actor, affected tenant, and before/after diff.
5. Optional second approval for high-risk operations.

### Flow 8: Package Upgrade or Downgrade
1. platform_billing_admin or platform_super_admin initiates plan change.
2. System runs impact analysis (limits, disabled features, role impact).
3. Upgrade applies immediately or on billing cycle boundary.
4. Downgrade applies only after safety checks pass.
5. Role permissions for removed features become inactive automatically.

### Flow 9: Suspension and Reactivation
1. Account moves to SUSPENDED due to billing/compliance decision.
2. Write operations are blocked as per policy.
3. Read/export access follows configured suspension policy.
4. On reactivation, entitlements and role mappings are restored.
5. All events are audit logged and visible in admin timeline.

### Flow 10: Future Expansion
1. Enable API keys and webhook events for entitled tenants.
2. Enable connector modules (courier/payment/accounting/CRM) as add-ons.
3. Enable rule engine automation for assignment and workflow transitions.
4. Keep backward compatibility for existing tenants during rollout.

## ACCEPTANCE CHECKLIST
- Can create, activate, suspend, and update SaaS account
- New tenant gets default saas_admin access
- saas_admin has full control over bought features (users, roles, permissions)
- platform_super_admin can manage packages, feature catalog, and entitlements
- platform_super_admin can perform tenant-admin actions with audit trace
- Tenant role builder supports per-action granular permissions
- One role can be view-only and another can edit/manage same feature
- Only purchased module permissions are assignable
- Tenant login grants only bought and permitted feature access
- No cross-tenant data visibility
- Trial lifecycle and conversion behavior work as defined
- Tenant context spoofing is blocked by design
- API contracts and denied-access error payloads are standardized
- Entitlement cache invalidation works after access-model changes
- Reliability/DR and release gates are passed before go-live

## REQUIREMENT FREEZE GATE
Development starts only after approval of:
- SaaS account lifecycle
- Feature/role permission matrix
- User/employee lifecycle validations
- Plan limit and downgrade behavior
- Access denial API contract

## OUT OF SCOPE (CURRENT)
- Full billing gateway implementation
- Full customer app UI delivery
- Advanced AI forecasting
- Live GPS route optimization
