# SAAS PLATFORM WIREFRAME SCREEN LIST

## PURPOSE
This document specifies component-level layout and behavior for every screen in the SaaS platform (S1–S11).
Use this as the handoff reference for UI developers and designers.

Each screen entry includes:
- Layout zones
- Component inventory
- States (loading, empty, error, etc.)
- Interaction notes
- Accessibility notes

## REFERENCES
- docs/saas-platform-module/ux-spec.md (screen definitions and flows)
- docs/saas-platform-module/requirement.md (business rules)

---

## GLOBAL SHELL

### Top Navigation Bar
```
[ Logo ]  [ Active Tenant: {name} ({code}) ] [ Status Badge: TRIAL/ACTIVE/SUSPENDED ]
          [ Plan: {planName} ]  [ Trial: {X} days left ]           [ Notifications ] [ Avatar Menu ]
```

Components:
- Logo: 40px height, links to root dashboard
- Tenant Context Chip: shows accountName + tenantCode, clickable to switch (platform admin only)
- Status Badge: pill badge, color-coded (TRIAL=yellow, ACTIVE=green, SUSPENDED=red, CANCELLED=grey)
- Plan Label: plain text
- Trial Countdown: visible only in TRIAL status; turns red when ≤ 7 days remaining
- Notification Bell: icon button, badge count
- Avatar Menu: user name + role, links to Profile, Settings, Logout

### Sidebar Navigation
```
[ Dashboard ]
[ SaaS Accounts ]          ← platform_super_admin, platform_support only
[ Packages ]               ← platform_super_admin only
[ Add-ons ]                ← platform_super_admin only
[ Feature Catalog ]        ← platform_super_admin only
[ Tenant Entitlements ]    ← platform_super_admin, platform_support
[ Usage & Limits ]         ← all platform roles
[ Audit & Support Mode ]   ← platform_super_admin, platform_support
--- separator ---
[ My Subscription ]        ← saas_admin
[ Users ]                  ← saas_admin, org_admin
[ Employees ]              ← saas_admin, org_admin
[ Roles & Permissions ]    ← saas_admin
[ Business Modules ]       ← all tenant roles (filtered by entitlement)
[ Settings ]               ← saas_admin
```

Components:
- Nav items: icon + label, active state highlight, disabled state for non-entitled items with lock icon
- Collapsible groups (Business Modules expands to entitled sub-items)
- Bottom: App version + environment label

---

## S1: SaaS Accounts List (Platform)

### Layout
```
[ Page Title: SaaS Accounts ]                  [ + Create Account ]
[ Search bar ]  [ Status filter ]  [ Plan filter ]  [ Sort: Updated At ]

[ Table ]
  Account Name | Tenant Code | Plan    | Status  | Trial End  | Last Updated | Actions
  ---------------------------------------------------------------------------
  Acme Ltd     | acme_001    | Growth  | TRIAL   | 2026-05-01 | 2 hrs ago    | [ ... ]
  Beta Corp    | beta_002    | Starter | ACTIVE  | –          | 1 day ago    | [ ... ]

[ Pagination: Previous | 1 2 3 | Next ]  [ Showing 1-20 of 47 ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Page Title | H1 | "SaaS Accounts" |
| Create Account Button | Primary CTA | Top right, navigates to S2 |
| Search Bar | Text input | Searches accountName, tenantCode |
| Status Filter | Dropdown multi-select | ALL / TRIAL / ACTIVE / SUSPENDED / CANCELLED |
| Plan Filter | Dropdown multi-select | All plan names from catalog |
| Sort Control | Dropdown | Updated At (default), Created At, Name |
| Data Table | Table | Sortable columns with up/down arrow indicators |
| Status Badge | Inline pill | Color-coded same as global header |
| Row Action Menu | Icon button (…) | Options: View, Edit, Activate, Suspend, Extend Trial, Change Plan |
| Pagination | Paginator | Shows current range and total |

### Row Action Rules
- Activate: only shown when status is SUSPENDED
- Suspend: only shown when status is ACTIVE or TRIAL
- Extend Trial: only shown when status is TRIAL
- Change Plan: shown for all non-CANCELLED accounts

### States
- Loading: table rows replaced with 5 skeleton rows (shimmer)
- Empty (no records): illustration + "No SaaS accounts found" + Create Account CTA
- Empty (filtered): "No results for current filters" + Clear filters link
- Error: inline alert "Failed to load accounts" + Retry button

---

## S2: Create / Edit SaaS Account

### Layout
```
[ Page Title: Create SaaS Account / Edit: {accountName} ]

[ Breadcrumb: SaaS Accounts > Create ]

[ Stepper: 1. Account Details  2. Contact  3. Region & Defaults  4. Subscription ]

-- Section 1: Account Details --
[ Account Name * ]         [ Legal Business Name * ]
[ Tenant Code * ]          [ GSTIN (optional) ]
[ Business Address (optional) ]
[ Logo URL (optional) ]    [ Website (optional) ]
[ Notes (optional) ]

-- Section 2: Contact --
[ Primary Contact Name * ] [ Primary Contact Email * ]
[ Primary Contact Phone * ][ Billing Email (optional) ]
[ Support Phone (optional) ]

-- Section 3: Region & Defaults --
[ Country Code * ]  [ Currency * ]  [ Timezone * ]

-- Section 4: Subscription --
[ Plan * (select) ]  [ Trial Mode: Full App Trial / Plan Based Trial / None ]
[ Trial Duration (days) ]  [ Trial Start Date ]

[ Save Draft ]  [ Create Account / Save Changes ]  [ Cancel ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Stepper | Step indicator | Click-to-jump only in Edit mode; linear in Create mode |
| Account Name | Text input | Required, max 100 chars |
| Legal Business Name | Text input | Required |
| Tenant Code | Text input | Required, unique async validation, lowercase+underscore only |
| GSTIN | Text input | Optional, regex-validated if provided |
| Business Address | Textarea | Optional |
| Logo URL | URL input | Optional, shows preview thumbnail on valid URL |
| Primary Contact Name | Text input | Required |
| Primary Contact Email | Email input | Required, format validated |
| Primary Contact Phone | Phone input | Required, E.164 format |
| Billing Email | Email input | Optional |
| Country Code | Dropdown | Filtered search, default IN |
| Currency | Dropdown | Filtered search, default INR |
| Timezone | Dropdown | Filtered search, default Asia/Kolkata |
| Plan | Dropdown | Loads from Package catalog |
| Trial Mode | Radio group | Full App Trial / Plan Based Trial / None |
| Trial Duration | Number input | Shown only when trial mode selected |
| Save Draft | Secondary button | Saves without validation; only in Create mode |
| Primary Submit | Primary button | Runs full validation before submit |
| Cancel | Text/ghost button | Confirms exit if unsaved changes |

### Validation Rules
- tenantCode: required, unique (async check), lowercase letters/numbers/underscore only, max 30 chars
- email: RFC 5322 format
- phone: required, valid phone number
- Plan: required before submission
- Trial Duration: required when trial mode is selected, 1–365 days

### States
- Saving: primary button shows spinner and "Saving…" label, form disabled
- Save success (Edit): toast "Account updated" + redirect to S1
- Save success (Create): modal "Account created. Invite sent to {email}." with View Account and Back to List CTAs
- Error: top-of-form banner listing failed fields + inline field errors
- Async validation in-progress: spinner icon inside tenantCode field

---

## S3: Package & Add-on Management

### Layout
```
[ Page Title: Packages & Add-ons ]             [ + Create Package ]

[ Packages Section ]
  [ Card: Starter ]   [ Card: Growth ]   [ Card: Scale ]

[ Selected Card Detail Panel ]
  Plan Name | Description | Limits (table) | Included Features (chips)
  [ Edit Plan ]  [ Manage Limits ]

[ Add-ons Section ]
  [ Table ]
  Add-on Name | Assigned Tenants | Status | Actions
  -------------------------------------------------
  WhatsApp    | 12              | Active | [ Edit ] [ Deactivate ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Package Cards | Clickable card | Highlighted when selected; shows plan tier, price hint, feature count |
| Plan Detail Panel | Side panel / expanded section | Shows full limits table and feature chips |
| Feature Chips | Chip list | Read-only tags for included features |
| Edit Plan Button | Secondary button | Opens inline edit form |
| Manage Limits Button | Secondary button | Opens limits drawer |
| Add-on Table | Table | Columns: Name, Assigned Tenant Count, Status, Actions |
| Deactivate | Inline action | Confirmation modal required |
| Create Package | Primary CTA | Opens create package form |

### Dependency Warning
- When editing a plan's features: if a feature being removed has dependents assigned to any tenant, show warning: "Removing {featureKey} will affect {N} tenants with active assignments."

### States
- Loading: card and table shimmer
- Empty add-ons: "No add-ons configured" + Create Add-on CTA

---

## S4: Feature Catalog

### Layout
```
[ Page Title: Feature Catalog ]            [ + Add Feature ]

[ Search by key or module ]  [ Module filter ]  [ Beta toggle ]

[ Table ]
  Feature Key       | Module    | Dependencies | Plans        | Beta | Actions
  ------------------------------------------------------------------------
  orders.view       | Orders    | –            | All          | No   | [ Edit ]
  stock.adjust      | Stock     | stock.view   | Growth+      | No   | [ Edit ]
  api.webhooks      | Platform  | –            | Scale        | No   | [ Edit ]

```

### Components
| Component | Type | Notes |
|---|---|---|
| Add Feature Button | Primary CTA | Opens create drawer |
| Search | Text input | Searches featureKey and module |
| Module Filter | Dropdown | Lists all distinct modules |
| Beta Toggle | Toggle | Filters to show/hide beta features |
| Feature Table | Table | Sortable |
| Edit Action | Inline button | Opens Edit drawer |

### Add/Edit Feature Drawer
Fields:
- featureKey (slug format, read-only on edit)
- displayName
- module (dropdown)
- dependencyKeys (multi-select from existing keys)
- planAvailability (multi-select: Starter, Growth, Scale, Custom)
- isBeta (toggle)
- uiVisibilityPolicy (dropdown: always / entitled-only / hidden)

Validation:
- featureKey: unique, slug format (lowercase-hyphen)
- Cannot self-reference as dependency
- If planAvailability is narrowed on edit: show warning about tenant impact

### States
- Loading: shimmer rows
- Empty: "Feature catalog is empty" + Add Feature CTA
- Drawer saving: fields disabled, spinner on Save button

---

## S5: Tenant Entitlements

### Layout
```
[ Page Title: Entitlements — {accountName} ]
[ Breadcrumb: SaaS Accounts > Acme Ltd > Entitlements ]

[ Current Entitlement Summary Card ]
  Base Package: Growth
  Add-ons: WhatsApp, Report Export
  Custom: Accounting Integration (until 2026-12-31)
  Effective Features: [ View Full List ]

[ Entitlement Timeline ]
  [ 2026-04-01 ] Package upgraded from Starter to Growth by admin@platform.com
  [ 2026-03-01 ] WhatsApp add-on enabled by admin@platform.com
  [ 2026-02-15 ] Account created – Starter trial applied

[ Custom Feature Grant/Revoke ]
  [ + Grant Custom Feature ]

  [ Table ]
  Feature Key | Reason | Valid From | Valid To   | Granted By | Actions
  ----------------------------------------------------------------------
  accounting  | pilot  | 2026-01-01 | 2026-12-31 | super_admin | [ Revoke ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Summary Card | Info card | Non-editable overview, View Full List link opens feature chip panel |
| Full Feature List Panel | Slide-out / collapsible | Shows all effectiveFeatures as chips grouped by module |
| Entitlement Timeline | Vertical timeline | Each event shows action, actor, timestamp |
| Grant Custom Feature Button | Primary CTA | Opens modal |
| Custom Feature Table | Table | Columns: Feature Key, Reason, Valid From, Valid To, Granted By, Actions |
| Revoke Action | Inline button | Confirmation modal, requires reason |

### Grant Custom Feature Modal
Fields:
- featureKey (searchable dropdown, only features not already active)
- reason (textarea, required)
- validFrom (date picker, defaults to today)
- validTo (date picker, optional — leave blank = indefinite)
- Confirm button runs read-back: "You are granting {featureKey} to {tenantName} from {date}."

### States
- Loading: shimmer for summary and timeline
- No custom grants: helpful empty state inside table with Grant CTA

---

## S6: Tenant Dashboard

### Layout
```
[ Welcome, {userName} ]   [ Active Tenant: {tenantName} ]

[ Trial / Subscription Alert Banner ]
  "Your trial ends in 5 days. Upgrade now to keep access."  [ Upgrade Plan ]

[ Usage Cards Row ]
  [ Users: 8 / 20 ]  [ Employees: 24 / 50 ]  [ Monthly Orders: 1,204 / 5,000 ]  [ Products: 412 / 1,000 ]

[ Pending Admin Actions ]
  [ X pending user invites ]  [ Y unassigned employees ]  [ Z permission warnings ]

[ Quick Actions ]
  [ + Invite User ]  [ + Create Employee ]  [ + Create Role ]  [ View Usage ]

[ Recent Activity Feed ]
  "Order #1042 created by sales1@acme.com — 2 min ago"
  "Role 'Warehouse Lead' updated by admin@acme.com — 1 hr ago"
```

### Components
| Component | Type | Notes |
|---|---|---|
| Alert Banner | Contextual alert | Shows only in TRIAL (near-expiry), SUSPENDED, or limit-exceeded states; dismissible per session |
| Usage Cards | Stat cards with progress bar | Progress bar turns orange at 80%, red at 95% |
| Pending Admin Actions | Numbered badges linking to relevant screens | Only shown when count > 0 |
| Quick Actions | Button row | Primary actions for common tasks |
| Activity Feed | Scrollable list | Last 10 events with relative time; "View all" link goes to Audit screen |

### Alert Banner Variants
| Trigger | Message | CTA |
|---|---|---|
| Trial ≤ 7 days left | "Trial ends in {N} days." | Upgrade Plan |
| Trial expired / grace | "Trial has ended. Service paused." | Contact Support |
| SUSPENDED | "Account suspended. Contact support." | Contact Support |
| Usage ≥ 95% on any limit | "Approaching {resource} limit." | Upgrade Plan |

---

## S7: Users Management

### Layout
```
[ Page Title: Users ]                  [ + Invite User ]

[ Search ]  [ Status filter: ALL / INVITED / ACTIVE / LOCKED / DISABLED ]  [ Role filter ]

[ Table ]
  Name       | Email               | Role(s)  | Status   | Last Login   | Actions
  -------------------------------------------------------------------------------
  Ravi Kumar | ravi@acme.com       | Sales    | ACTIVE   | 2 hrs ago    | [ ... ]
  Priya S    | priya@acme.com      | saas_admin | ACTIVE | 1 day ago    | [ ... ]

[ Pagination ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Invite User Button | Primary CTA | Opens invite modal |
| Search | Text input | Searches name and email |
| Status Filter | Dropdown multi-select | INVITED / ACTIVE / LOCKED / DISABLED |
| Role Filter | Dropdown multi-select | All roles in tenant |
| Table | Data table | Sortable by Name, Last Login |
| Role Chips | Inline chip list | Up to 2 shown; "+N more" on overflow |
| Row Action Menu | Icon menu (…) | Actions depend on current status (see below) |

### Row Action Rules
| User Status | Available Actions |
|---|---|
| INVITED | Resend Invite, Cancel Invite |
| ACTIVE | Edit Roles, Lock, Disable |
| LOCKED | Unlock, Disable |
| DISABLED | Reactivate |

### Invite User Modal
Fields:
- Full Name (required)
- Email (required, unique in tenant)
- Phone (optional)
- Assign Role(s) (multi-select, only active roles shown)

On submit: sends invitation email, row appears with INVITED status.

### States
- Loading: skeleton rows
- Empty: "No users yet. Invite your first user." + Invite CTA
- Last saas_admin guard: disabling the last active saas_admin shows a blocking modal — "Cannot disable the last active saas_admin. Assign another saas_admin first."

---

## S8: Employees Management

### Layout
```
[ Page Title: Employees ]                      [ + Add Employee ]

[ Search ]  [ Status filter ]  [ Department filter ]

[ Table ]
  Name        | Code    | Department | Designation      | Status  | Linked User | Actions
  --------------------------------------------------------------------------------------
  Ravi Kumar  | EMP001  | Sales      | Sales Executive  | ACTIVE  | ravi@acme.com | [ ... ]
  Priya Sinha | EMP002  | Warehouse  | Stock Incharge   | ACTIVE  | –           | [ Link User ]

[ Pagination ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Add Employee Button | Primary CTA | Opens create employee form (drawer or page) |
| Search | Text input | Searches name, employeeCode |
| Status Filter | Dropdown | ACTIVE / INACTIVE / ON_LEAVE |
| Department Filter | Dropdown | Distinct values from existing employees |
| Linked User Column | Inline link or "— " | Shows email if linked; shows "Link User" button if not |
| Row Action Menu | Icon menu (…) | View, Edit, Link/Unlink User, Status change |

### Add / Edit Employee Form
Sections:
- Personal: Full Name (required), Employee Code (required, unique in tenant), Department, Designation
- Work: Manager (dropdown from active employees), Joining Date, Work Location
- Status: ACTIVE / INACTIVE / ON_LEAVE
- User: Link existing user account (optional — searchable user dropdown)

Validation:
- employeeCode must be unique within tenant
- Hard delete blocked if employee is referenced in order records — show "Cannot delete: employee has associated records. Deactivate instead."

### States
- Loading: shimmer
- Empty: "No employees added." + Add Employee CTA
- Link User flow: inline dropdown to pick an ACTIVE uninvited user; confirmation on save

---

## S9: Roles & Permissions

### Layout
```
[ Page Title: Roles & Permissions ]            [ + Create Role ]

[ Roles Sidebar ]         [ Permission Matrix Panel ]
  Sales Agent    ←         [ Role: Sales Agent ]   [ Clone Role ] [ Deactivate ]
  Warehouse Lead            Assigned Users: 5  [ View Users ]
  Finance User
  Support Staff             Module Filter: [ All ] [ Orders ] [ Stock ] [ Customers ] ...
  + Create Role
                            [ Bulk: View All | Manage All | Clear All ]

                            Module: Orders
                            Feature          | View | Add | Edit | Delete | Approve | Cancel | Export
                            orders.view      |  ✓   |  –  |  –   |  –     |  –      |  –     |  –
                            orders.add       |  ✓   |  ✓  |  –   |  –     |  –      |  –     |  –
                            orders.edit      |  ✓   |  –  |  ✓   |  –     |  –      |  –     |  –
                            orders.cancel    |  ✓   |  –  |  –   |  –     |  –      |  ✓     |  –

                            Module: Stock
                            ...

                            [ Save Changes ]   [ Discard ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Role Sidebar | Nav list | All tenant roles; selected role is highlighted |
| Create Role Button | Primary or secondary CTA | Opens create role modal |
| Clone Role Button | Secondary button | Pre-fills matrix from selected role |
| Deactivate Role Button | Danger/ghost button | Disabled if role has assigned users (shows count) |
| Assigned Users Badge | Chip or count | Click opens user list drawer |
| Module Filter Tabs | Tab row | Filters permission matrix to one module; "All" shows all |
| Bulk Controls | Button row | "View All" = turn on all view actions; "Manage All" = turn on all actions; "Clear All" = clear all |
| Permission Matrix | Checkbox grid | Rows = feature permissions; Columns = actions |
| Non-entitled rows | Greyed + lock icon | Non-purchased features shown as disabled rows |
| Save / Discard | Sticky footer bar | Appears when unsaved changes exist |

### Permission Matrix Rules
- view must be checked before any other action can be enabled (dependency enforcement)
- Non-entitled features are visually greyed and checkboxes are disabled
- Checking "Manage All" for a module auto-checks view first
- On Save: shows diff summary modal — "You are granting N new permissions and revoking M permissions for {roleName}. This affects {X} users. Confirm?"

### Create Role Modal
Fields:
- Role Name (required, unique in tenant)
- Description (optional)
- Clone from (optional dropdown — starts with existing role's permissions)

### States
- Loading: sidebar shimmer + matrix shimmer
- No roles: empty state with Create Role CTA
- Deactivate blocked: tooltip/modal explaining assigned users must be reassigned first
- Unsaved changes indicator: asterisk on role name in sidebar + sticky footer

---

## S10: Subscription & Usage

### Layout
```
[ Page Title: My Subscription ]

[ Current Plan Card ]
  Plan: Growth
  Status: ACTIVE
  Renewal: 2026-05-01
  [ Change Plan ]   [ Manage Add-ons ]

[ Usage Overview ]
  Resource         | Used | Limit | Status
  ------------------------------------------
  Users            |  8   |  20   | ████░░░░ 40%
  Employees        | 24   |  50   | █████░░░ 48%
  Monthly Orders   | 1204 | 5000  | ████░░░░ 24%
  Products         | 412  | 1000  | ████░░░░ 41%

[ Add-ons Section ]
  [ Card: WhatsApp ]         Active   [ Deactivate ]
  [ Card: Report Export ]    Active   [ Deactivate ]
  [ Card: Accounting ]       Inactive [ Activate ]

[ Plan Comparison CTA ]
  [ View All Plans and Upgrade ]
```

### Components
| Component | Type | Notes |
|---|---|---|
| Current Plan Card | Info card | Plan name, status, renewal date; Change Plan and Manage Add-ons CTAs |
| Change Plan Button | Secondary button | Opens plan comparison modal |
| Usage Table | Table with progress bar cells | Color: green < 80%, orange 80–94%, red ≥ 95% |
| Add-on Cards | Card list | Shows name, price hint, active toggle |
| Activate Add-on | Secondary button | Confirmation modal: "Activate {name}? This will be billed from next cycle." |
| Deactivate Add-on | Ghost/danger button | Confirmation modal with data impact warning |
| View All Plans CTA | Primary link | Opens plan comparison modal |

### Plan Change Modal
- Side-by-side plan comparison: current vs selected
- Limit changes (Users: 20 → 10 on downgrade shown in red)
- Features differences highlighted
- "Affected Permissions" section: lists role permissions that become inactive
- Confirm/Cancel
- On confirm: refreshes entitlements, redirects to S6

### States
- Loading: card and table shimmer
- Trial state: plan card shows "TRIAL — {N} days remaining" with Upgrade CTA

---

## S11: Access Denied

### Layout
```
[ Icon: Lock / Shield ]

[ Heading: {Reason-Specific Title} ]

[ Body: Explanation of why access is blocked ]

[ CTA Buttons ]

[ Reference Code (optional) ]
```

### Variants by Reason Code

| Reason Code | Icon | Heading | Body | Primary CTA |
|---|---|---|---|---|
| `feature_disabled` | Lock | "Feature Not Available" | "This feature is not part of your current plan." | Upgrade Plan |
| `plan_limit_exceeded` | Usage gauge | "Limit Reached" | "You've reached the {resource} limit on your {plan} plan." | Upgrade Plan |
| `permission_denied` | Shield | "Access Denied" | "You don't have permission to perform this action. Contact your admin." | Contact Admin |
| `account_suspended` | Warning | "Account Suspended" | "Your account is temporarily suspended. Contact support." | Contact Support |
| `trial_expired` | Clock | "Trial Ended" | "Your trial has ended. Upgrade to restore access." | Upgrade Now |

### Components
| Component | Type | Notes |
|---|---|---|
| Icon | Large SVG icon | Contextual per reason code |
| Heading | H2 | Short and direct |
| Body | Paragraph | Explains the block with actionable context |
| Primary CTA | Primary button | Leads to resolution: upgrade, contact admin, or support |
| Secondary CTA | Text link | Go back / Return to Dashboard |
| Reference Code | Small text | Shows request/error ID for support escalation; only when applicable |

### Inline Access Denied (within screens)
For UI actions (buttons, menu items) that require a missing permission:
- Buttons shown as disabled (greyed)
- Tooltip on hover: "You don't have permission to {action}."
- For missing entitlement: badge "Upgrade Required" instead of disabled button

---

## COMMON COMPONENTS USED ACROSS SCREENS

| Component | Screens Used | Notes |
|---|---|---|
| Confirmation Modal | S1, S3, S5, S7, S9, S10 | Destructive or high-risk action gate; shows summary and confirms actor intent |
| Audit Toast | All create/edit/delete | Bottom-right toast: "{Action} saved. Audit log updated." |
| Skeleton Loader | All list/table screens | Match layout of real content |
| Empty State Block | All list/table screens | Illustration + message + primary CTA |
| Error Banner | All form screens | Top-of-form; lists all field errors on submit |
| Drawer/Side Panel | S4, S5, S8 | 400–500px wide, overlays main content, focus-trapped |
| Pagination Row | S1, S7, S8 | Items per page: 20 default; 10/20/50 options |
| Role Chip | S7 | Inline pill; max 2 visible; "+N more" tooltip |
| Status Badge | S1, S7, S8 | Colour-coded pill; always announced to screen readers |

---

## INTERACTION PATTERNS

### Confirmation Modal Template
```
[ Modal Title ]
[ Body: summary of the action and its impact ]
[ Affected items count / downstream effects ]
[ Reason input (required for high-risk actions) ]
[ Cancel ]   [ Confirm ]
```

### Toast Notification Template
```
[ ✓ / ! / ✗  Message text ]    [ Dismiss × ]
```
- Success: green, auto-dismiss 4 seconds
- Warning: yellow, auto-dismiss 6 seconds
- Error: red, manual dismiss only

### Inline Validation Pattern
- Validate on blur for most fields
- Validate on-change only for async checks (tenantCode uniqueness)
- Error shown below field in red text, role="alert"
- On form submit: scroll to first error, focus it

---

## ACCESSIBILITY NOTES (SCREEN-LEVEL)

| Screen | Key Accessibility Requirements |
|---|---|
| S1 | Table with `<caption>`, sortable column headers with `aria-sort` |
| S2 | Stepper with `aria-current="step"`, required fields with `aria-required` |
| S3 | Package cards keyboard-navigable; selected card has `aria-selected="true"` |
| S4 | Drawer uses role="dialog", focus trapped, returns focus on close |
| S5 | Timeline items as `<ol>` with readable date-time labels |
| S6 | Usage cards progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| S7 | Row actions menu uses `role="menu"` and `aria-label="{userName} actions"` |
| S8 | Link/Unlink inline action announces result to screen reader |
| S9 | Permission matrix checkboxes: `aria-label="{featureKey} {action}"` |
| S10 | Plan comparison modal: accessible table with headers, not div grid |
| S11 | Heading structure clear; CTA buttons not icon-only |

---

## COMPONENT INVENTORY SUMMARY

| Component Name | Count of Screens | Priority |
|---|---|---|
| Data Table | 6 | Critical |
| Confirmation Modal | 8 | Critical |
| Form (multi-field) | 3 | Critical |
| Drawer / Side Panel | 3 | High |
| Status Badge | 4 | High |
| Skeleton Loader | 8 | High |
| Empty State Block | 8 | High |
| Progress Bar (usage) | 2 | High |
| Toast Notification | All | High |
| Permission Matrix | 1 | High |
| Step Indicator | 1 | Medium |
| Vertical Timeline | 1 | Medium |
| Plan Comparison Modal | 1 | Medium |
| Role Chip | 2 | Medium |
| Alert Banner | 2 | Medium |
