# SAAS PLATFORM EPIC IMPLEMENTATION PLAYBOOK

## PURPOSE
This document is the execution playbook for implementing the SaaS platform based on the approved requirement.

Use this as the single implementation tracker for:
- EPIC planning
- Build sequence
- API and UI rollout order
- Definition of done
- Final feature inventory

## REFERENCE DOCUMENT
Primary requirement source:
- docs/saas-platform-module/requirement.md

## IMPLEMENTATION APPROACH
- Follow incremental delivery by EPIC.
- Keep backend enforcement first, then UI.
- Keep tenant isolation and entitlement checks mandatory from day 1.
- Ship in controlled phases with UAT gates per EPIC.

## EPIC ROADMAP

### EPIC 1: Multi-Tenant Foundation
Goal:
Establish tenant-safe architecture and account primitives.

Scope:
- TenantAccount model
- tenantId propagation strategy
- tenant context resolver middleware
- tenant isolation query guard
- SaaS Account CRUD (platform side)

Deliverables:
- Platform API for tenant creation and status management
- DB indexes with tenant scope
- Audit event for account lifecycle actions

Definition of Done:
- No cross-tenant data reads in integration tests
- Tenant context mismatch requests rejected
- SaaS account create/update/suspend flows working

### EPIC 2: Package, Add-on, and Entitlement Core
Goal:
Enable package-based feature access.

Scope:
- PackagePlan model
- FeatureCatalogItem model
- TenantEntitlement model
- Add-on assignment
- Entitlement resolver service

Deliverables:
- Platform APIs for packages/features/tenant entitlements
- Effective feature computation for tenant session
- Entitlement audit timeline

Definition of Done:
- Tenant sees only entitled modules
- Non-entitled API access is blocked with reason code
- Entitlement updates reflect in UI after cache invalidation

### EPIC 3: User, Employee, Role, and Permission Management
Goal:
Deliver complete access administration for tenant admins.

Scope:
- User + Employee models and lifecycle
- Role builder
- Per-feature per-action permission matrix
- User-role assignment
- Last-active-saas-admin safety rule

Backend Implementation Status:
✅ FULLY COMPLETED:
- UserAccount, EmployeeProfile, Role, UserRoleAssignment models with proper indexes
- Tenant APIs for users, employees, roles, role assignments all implemented
- Permission dependency validator: blocks add/edit/delete/approve/cancel/export without view
- Permission evaluator service with entitlement-aware checks
- Permission evaluator middleware (requireTenantPermission) protecting all tenant-access routes
- Strict last-saas-admin guard on user lock/disable AND role assignment changes
- Full audit trail for all user/employee/role/assignment mutations
- API test documentation with 30+ test case specifications

Deliverables:
✅ Tenant APIs: GET/POST/PATCH users, employees, roles, role assignments all secured with permission guards
✅ Permission evaluator API endpoint at GET /tenant-access/permissions/evaluate/:userId/:permissionKey
✅ Permission evaluator middleware integrated into all protected routes
✅ Permission dependency enforcement active (view prerequisite enforced)
✅ Admin panel UI screens documentation (awaiting UI implementation phase)
✅ Test specification document ready for Jest implementation

Definition of Done:
✅ Multiple roles per user with varied permissions (view-only vs edit vs mixed) fully working
✅ Permission dependencies enforced (view prerequisite required before action permissions)
✅ Last active saas_admin cannot be disabled or have role removed (full protection)

### EPIC 3.5: Access Experience Validation (Interim Gate)
Goal:
Validate the end-to-end real-screen flow for EPIC 1, EPIC 2, and EPIC 3 before trial and conversion work.

Scope:
- Separate login journeys for platform admin and tenant admin
- Post-login landing flow by actor type
- Tenant session access-profile resolution at login
- Entitlement-driven menu and route visibility for tenant admins
- Unified denied-access UX for permission and entitlement failures
- Real-screen verification across multiple plans and role profiles

Deliverables:
- Platform Admin Login screen and route shell
- Tenant Admin Login screen and route shell
- Session bootstrap flow that resolves tenant, entitlements, and role permissions
- UI guard layer for non-entitled and non-permitted routes/actions
- End-to-end validation checklist for EPIC 1 to EPIC 3 coverage

Definition of Done:
- Platform admin can complete login and access platform SaaS modules
- Tenant admin can complete login and view only subscribed modules/features
- Direct URL access to non-entitled screens is blocked
- API-denied reason codes map to user-visible messages in UI
- UAT matrix passes for at least 3 plan tiers and 3 role profiles

Implementation Backlog (Ready to Start):

S3.5-1: Dual Login Entry (Platform and Tenant)
- Build separate login routes and UI for platform admins and tenant admins.
- Add actor type in auth session payload (`platform` or `tenant`).
- Acceptance:
	- Platform login redirects to platform SaaS modules.
	- Tenant login redirects to tenant dashboard.
	- Invalid actor-type login is rejected with clear error.

S3.5-2: Session Access-Profile Bootstrap
- On login, call access-profile bootstrap API to resolve tenant context, account status, effective features, and role permissions.
- Store access profile in centralized frontend auth/session state.
- Acceptance:
	- Access profile is available before protected screen render.
	- Suspended tenant/user cannot complete bootstrap.
	- Missing tenant context blocks session startup.

S3.5-3: Entitlement-Aware Navigation
- Render tenant sidebar from effective features list.
- Hide non-entitled modules and actions from navigation.
- Acceptance:
	- Starter, Growth, and Scale plans show different module visibility.
	- Navigation updates correctly after entitlement change and refresh.

S3.5-4: Route Guards (Entitlement + Permission)
- Add route guards enforcing account status, entitlement, and role permissions.
- Block direct URL access to unauthorized routes.
- Acceptance:
	- Unauthorized route access redirects to denied page/state.
	- Reason code is available in navigation error state.

S3.5-5: Action Guards on Real Screens
- Enforce action-level controls on create/edit/delete/approve/cancel/export buttons for users/employees/roles and selected domain modules.
- Acceptance:
	- Button visibility/disabled state matches permission keys.
	- API 403 fallback handling is in place for stale client state.

S3.5-6: Denied-Access UX Mapping
- Map backend reason codes (`feature_disabled`, `permission_denied`, `plan_limit_exceeded`, `account_suspended`) to user-facing messages.
- Add consistent banner/toast/empty-state patterns.
- Acceptance:
	- All denied flows show deterministic, translatable messages.
	- Suggested next action is shown when backend provides it.

S3.5-7: Platform Support-Mode Entry (Readiness Hook)
- Add a minimal support-mode entry point for platform admin to enter tenant-scoped view (without EPIC 6 full feature set).
- Capture reason and target tenant in audit context headers.
- Acceptance:
	- Platform user can enter tenant context in a controlled path.
	- Tenant-scoped actions include support reason metadata.

S3.5-8: End-to-End Validation Matrix and UAT Signoff
- Execute matrix across plan tiers, role profiles, and account states using real screens.
- Produce pass/fail report and blocker list.
- Acceptance:
	- Matrix includes at minimum:
		- Plans: Starter, Growth, Scale
		- Roles: view-only, editor, saas_admin
		- Account states: TRIAL, ACTIVE, SUSPENDED
	- EPIC 4 starts only after all P0/P1 blockers are cleared.

Execution Sequence (Recommended):
1. S3.5-1 and S3.5-2
2. S3.5-3 and S3.5-4
3. S3.5-5 and S3.5-6
4. S3.5-7
5. S3.5-8

Engineering Notes:
- Reuse existing permission evaluator APIs; avoid parallel access logic in UI.
- Keep all new UI strings in i18n files from day 1.
- Add telemetry tags for denied access events by reason code.
- Add feature flag guard (`epic3_5_access_validation`) for controlled rollout.

### EPIC 4: Trial and Conversion Lifecycle
Goal:
Support full trial and paid conversion without data loss.

Scope:
- FULL_APP_TRIAL and PLAN_BASED_TRIAL handling
- Trial counters and reminders
- Trial expiry and grace rules
- Trial to paid conversion logic

Deliverables:
- Trial lifecycle APIs and scheduler jobs
- Upgrade UI prompts and plan comparison
- Conversion audit events

Definition of Done:
- Trial start/extend/expire/convert flows tested
- Non-purchased features auto-disable after conversion
- Data stays intact and readable based on policy

### EPIC 5: Quota, Usage Metering, and Plan Limit Enforcement
Goal:
Protect plan boundaries and support monetization.

Scope:
- UsageCounter service
- Plan limits (users, employees, orders, products, API calls)
- Hard/soft limit behavior
- Overage response messages

Deliverables:
- Usage APIs for tenant and platform views
- Quota checks at write operations
- Upgrade prompts on limit breach

Definition of Done:
- Create actions are blocked when hard limits reached
- Usage is accurate under concurrent requests
- Limit enforcement is idempotent

### EPIC 6: Platform Super Admin Support Mode
Goal:
Allow company-side intervention with strict controls.

Scope:
- Super admin delegated tenant mode
- supportSessionId and reason capture
- scoped super-admin action enforcement
- elevated action audit rules

Deliverables:
- Support-mode API and UI entry flow
- Immutable log for each delegated action

Definition of Done:
- Super admin actions always tied to tenant scope + reason
- Audit trace is complete and queryable
- Unauthorized scope escalation is blocked

### EPIC 7: Reliability, Security, and Operations Hardening
Goal:
Prepare SaaS platform for production.

Scope:
- Session revocation on lock/disable
- rate limiting by tenant/plan
- retry + dead-letter for async jobs/webhooks
- backup and restore runbooks
- SLO/alert instrumentation

Deliverables:
- Security and operational dashboards
- DR and rollback procedures
- webhook delivery observability

Definition of Done:
- Security tests pass (tenant spoofing, privilege escalation)
- RPO/RTO runbook validated
- p95/p99 targets measured in staging

### EPIC 8: UAT, Pilot, and Go-Live
Goal:
Release safely with tenant confidence.

Scope:
- UAT scenarios from requirement
- pilot tenant onboarding
- migration checks for existing data
- go-live checklist and rollback plan

Deliverables:
- UAT sign-off report
- Pilot performance report
- Production release approval

Definition of Done:
- UAT pass on critical journeys
- No P0/P1 unresolved blockers
- Rollback tested and approved

## EXECUTION ORDER (RECOMMENDED)
1. EPIC 1
2. EPIC 2
3. EPIC 3
4. EPIC 3.5
5. EPIC 4
6. EPIC 5
7. EPIC 6
8. EPIC 7
9. EPIC 8

## SPRINT SUGGESTION (11-WEEK MODEL)
- Weeks 1-2: EPIC 1
- Weeks 2-3: EPIC 2
- Weeks 3-5: EPIC 3
- Week 5-6: EPIC 3.5
- Week 6-7: EPIC 4
- Week 7-8: EPIC 5
- Week 8-9: EPIC 6
- Week 9-10: EPIC 7
- Week 10-11: EPIC 8

## FINAL FEATURE INVENTORY (WHAT THIS APP WILL HAVE)

### Platform-Level Features
- SaaS account creation and lifecycle
- Package and add-on management
- Feature catalog and dependency management
- Tenant entitlement assignment
- Platform-wide usage and audit visibility
- Company-side tenant support mode

### Tenant Admin Features
- Tenant profile and operational settings
- User and employee management
- Flexible role creation (unlimited or plan-limited)
- Per-action permission mapping by feature
- Role assignment and bulk reassignment
- Trial and subscription visibility
- Plan usage dashboard

### Access and Security Features
- Tenant-isolated data access
- Entitlement-first feature gating
- API denial reason codes
- Session revocation on user lock/disable
- Rate limiting and abuse controls
- Full audit logging for sensitive changes

### Commercial Features
- Trial mode (full app or plan-based)
- Trial reminders and grace behavior
- Package upgrade/downgrade flow
- Plan limit enforcement
- Add-on activation/deactivation

### Domain Features Enabled Through SaaS Layer
- Offline and online order channels
- Stock management with reservation/issue/release flow
- Customer and customer group operations
- Delivery and assignment workflows
- Tax and pricing compatibility by tenant settings

### Reliability and Operations Features
- Entitlement cache invalidation
- Async retry and dead-letter handling
- Backup and restore procedures
- SLO-based monitoring and alerts
- UAT and release gate process

## EPIC ENTRY CHECKLIST
Before starting any EPIC:
- Requirement sections mapped to stories
- API contract draft reviewed
- data model and migration impact reviewed
- test cases prepared
- rollback criteria defined

## EPIC EXIT CHECKLIST
Before closing any EPIC:
- Functional acceptance criteria passed
- Security checks passed
- audit events verified
- tenant isolation regression passed
- documentation updated

## CHANGE CONTROL
- Any scope change must update requirement.md first.
- Any production-impacting behavior change must add migration notes.
- Any access-control change must include security test updates.
