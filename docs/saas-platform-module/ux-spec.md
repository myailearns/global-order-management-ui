# SAAS PLATFORM UX SPEC

## PURPOSE
This document defines implementation-ready UX for the SaaS platform.

It translates requirements into:
- information architecture
- screen-level behavior
- user journeys
- validation and error states
- entitlement and permission-aware UI rules
- responsive and accessibility expectations

## REFERENCES
- docs/saas-platform-module/requirement.md
- docs/saas-platform-module/epic-implementation-playbook.md

## PRIMARY USER ROLES
- platform_super_admin
- platform_billing_admin
- platform_support
- saas_admin
- tenant staff users (sales, warehouse, finance, support, readonly)

## UX PRINCIPLES
- Tenant-safe by default: always display active tenant context.
- Entitlement-first rendering: hide or disable non-purchased features.
- Explain blocked actions clearly with next steps.
- Optimize admin productivity with bulk actions and filters.
- Keep forms explicit, validated, and recoverable.

## INFORMATION ARCHITECTURE

### Platform Console
- Dashboard
- SaaS Accounts
- Packages
- Add-ons
- Feature Catalog
- Tenant Entitlements
- Usage & Limits
- Audit & Support Mode

### Tenant Console
- Dashboard
- My Subscription
- Users
- Employees
- Roles & Permissions
- Settings
- Business Modules (Orders, Stock, Customers, Delivery, Tax)

### Global Header Context
Always show:
- active tenant name and code
- account status (TRIAL/ACTIVE/SUSPENDED)
- plan name and trial remaining

## CORE USER FLOWS

### Flow 1: Create SaaS Account (Platform)
1. Open SaaS Accounts list.
2. Click Create Account.
3. Fill account + contact + region defaults.
4. Select plan and trial mode.
5. Submit with confirmation.
6. Show success summary and invite status for first saas_admin.

### Flow 2: Tenant First Login (saas_admin)
1. Accept invite.
2. Complete setup wizard (business profile, defaults, policies).
3. Land on tenant dashboard with entitlement-scoped modules.

### Flow 3: Create Role and Permissions
1. Open Roles & Permissions.
2. Create or clone role.
3. Configure matrix (module -> feature -> action).
4. Save and assign users.
5. Show permission change summary and audit confirmation.

### Flow 4: Plan Upgrade/Downgrade
1. Open My Subscription.
2. Compare plans and add-ons.
3. View impact preview (features/limits/affected permissions).
4. Confirm plan change.
5. Refresh entitlements and show result state.

### Flow 5: Platform Support Mode
1. Super admin opens Support Mode.
2. Select tenant and provide reason.
3. Perform scoped action.
4. Exit mode.
5. Persist full support audit trace.

## SCREEN INVENTORY

### S1: SaaS Accounts List (Platform)
- Table with search/sort/filter
- Columns: Account, Tenant Code, Plan, Status, Trial End, Updated At
- Row actions: View, Edit, Activate/Suspend, Extend Trial, Change Plan

### S2: Create/Edit SaaS Account
- Sections: Account details, Contact, Region defaults, Subscription setup
- Validations: tenantCode unique, email and phone format, required defaults
- Actions: Save draft, Create/Update, Cancel

### S3: Package & Add-on Management
- Package cards and limits
- Add-on list and assignment controls
- Dependency warnings

### S4: Feature Catalog
- Feature registry table
- Create/Edit feature drawer
- Dependency validation

### S5: Tenant Entitlements
- Current package/add-ons/custom features
- Timeline of entitlement changes
- Custom feature grant/revoke modal with date validity

### S6: Tenant Dashboard
- Trial/plan status
- Usage meter cards
- Pending invites and admin alerts
- Quick actions

### S7: Users Management
- User list with role/status/last login
- Invite user modal
- Lock/Unlock, Reset password actions

### S8: Employees Management
- Employee list and form
- Link/unlink user account
- Employment status transitions

### S9: Roles & Permissions
- Role list with clone/deactivate
- Permission matrix
- Bulk controls: View all, Manage all, Module-level grant/revoke
- Assigned users count and impact preview

### S10: Subscription & Usage
- Current plan and add-ons
- Usage vs limits
- Upgrade CTA and downgrade impact preview

### S11: Access Denied UX
- Clear reason-based message:
  - feature_disabled
  - plan_limit_exceeded
  - permission_denied
- CTA options: Request access, Contact admin, Upgrade plan

## ENTITLEMENT AND PERMISSION UX RULES
- Non-entitled modules are hidden from navigation.
- Entitled but no action permission: show read-only view with disabled actions.
- API denial must map to user-friendly error with reason and next action.
- Role matrix must not show non-entitled features for assignment.

## FORM VALIDATION RULES
- Inline field errors + top-level summary on submit failure.
- Primary action disabled when form invalid or saving.
- Async validation for unique keys (tenantCode, role name where applicable).
- Confirmation modal for destructive/high-risk changes.

## STATE MODEL (ALL CRITICAL SCREENS)
- Loading: skeleton or shimmer
- Empty: clear explanation + primary CTA
- Success: toast and/or inline confirmation
- Error: retry action + support reference id
- Partial success (bulk): success/failure counts with export option

## RESPONSIVE BEHAVIOR
- Desktop-first grid and table views
- Mobile: table-to-card transformation
- Sticky primary CTA in long forms
- Role matrix uses accordion grouping on small screens

## ACCESSIBILITY BASELINE
- Keyboard navigation for all controls and matrix cells
- Focus trapping in modals and proper focus return
- ARIA labels for icon-only controls
- WCAG AA contrast compliance
- Screen-reader friendly status and alert announcements

## UX ACCEPTANCE CHECKLIST
- Platform admin can create a SaaS account in <= 3 minutes.
- saas_admin can create role and assign permissions without external help.
- Blocked actions always show reason and recovery CTA.
- Trial expiry and upgrade prompts are visible and actionable.
- Plan change impact preview is understandable and accurate.
- Mobile and accessibility checks pass for S1-S11.

## HANDOFF ARTIFACTS TO PRODUCE NEXT
- Low-fidelity wireframes for S1-S11
- Click-flow prototype for top 5 user journeys
- Copy sheet for validation and denied-access messages
- Component behavior notes for role permission matrix
