# Account Activation, Access, Deactivation, and Payment Workflow

This document explains the current implemented flow across backend and frontend for tenant account lifecycle.

## 1) End-to-End Graph

```mermaid
flowchart TD
  A[Create Tenant Account<br/>Platform API] --> B{Trial Mode?}
  B -->|FULL_APP_TRIAL or PLAN_BASED_TRIAL| C[Set accountStatus = TRIAL<br/>Set trialStartAt/trialEndAt<br/>Set subscriptionEndAt]
  B -->|NONE| D[Set accountStatus = ACTIVE<br/>Set subscriptionStartAt]

  C --> E[Tenant Login]
  D --> E

  E --> F[Auth Service resolves entitlement]
  F --> G{accountStatus}

  G -->|TRIAL + FULL_APP_TRIAL| H[Grant full active catalog features]
  G -->|TRIAL or ACTIVE| I[Resolve package/tier + entitlement overrides]
  G -->|TRIAL_ENDED or SUSPENDED| J[Grant read-only features only]
  G -->|INCOMPLETE or CANCELLED| K[reasonCode = account_not_active<br/>Login denied]

  H --> L[Session returned with featureKeys + effectivePermissionKeys]
  I --> L
  J --> L

  L --> M[UI route/nav/action gating]
  L --> N[API permissionGuard gating]

  O[Payment Verification<br/>/saas/payments/:paymentId/verify] --> P[Set accountStatus = ACTIVE]
  P --> Q[Set subscriptionStartAt = now<br/>Set subscriptionEndAt = nextBillingDate]
  Q --> R[Set subscription status ACTIVE]
  R --> E

  S[Background Expiry Sweep<br/>runs on server start + interval] --> T{Expired?}
  T -->|TRIAL and trialEndAt <= now| U[Apply postTrialAction]
  T -->|ACTIVE and subscriptionEndAt <= now| V[Apply postTrialAction]

  U -->|DOWNGRADE_TO_TIER| W[Downgrade tier, keep ACTIVE]
  U -->|CONVERT_TO_PAID| X[Convert to ACTIVE paid]
  U -->|fallback/default| Y[Set TRIAL_ENDED + subscription EXPIRED]

  V -->|DOWNGRADE_TO_TIER| W
  V -->|CONVERT_TO_PAID| X
  V -->|fallback/default| Z[Set SUSPENDED + subscription EXPIRED]

  W --> E
  X --> E
  Y --> E
  Z --> E
```

## 2) Step-by-Step Explanation

### Step A: Account provisioning
- Platform creates tenant account with package and tier selection.
- Trial policy is derived using tier-first, then package defaults.
- Depending on trial mode, account starts in TRIAL or ACTIVE.

### Step B: Login and entitlement resolution
- Tenant login authenticates account + user.
- Resolver computes effective features from:
  - account status
  - package/tier features
  - tenant entitlement overrides (add-ons, custom grants, suspended features)
  - dependency expansion
- If resolver returns reasonCode, login/session is denied.

### Step C: Access control in runtime
- Session carries:
  - featureKeys (subscription-level features)
  - effectivePermissionKeys (role-filtered permissions)
  - effectiveFeatureConfigs
- UI uses these keys for route, nav, and action gating.
- API enforces again through permissionGuard middleware.

### Step D: Payment activation flow
- Payment verification endpoint updates commercial state.
- On successful verify:
  - accountStatus becomes ACTIVE
  - subscriptionStartAt is set to now
  - subscriptionEndAt is set to next billing date
  - subscription row becomes ACTIVE

### Step E: Expiry and deactivation flow
- Background expiry sweep runs on startup and at intervals.
- For expired TRIAL (trialEndAt passed):
  - applies postTrialAction (DOWNGRADE_TO_TIER or CONVERT_TO_PAID)
  - if not applicable, sets TRIAL_ENDED
- For expired ACTIVE (subscriptionEndAt passed):
  - applies postTrialAction
  - if not applicable, sets SUSPENDED

### Step F: Post-expiry access behavior
- TRIAL_ENDED and SUSPENDED are currently resolved as read-only access, not complete denial.
- INCOMPLETE and CANCELLED are denied as account_not_active.

## 3) Important Current Behavior

The current system is not "only ACTIVE paid accounts can access".
Current behavior allows:
- TRIAL access
- TRIAL_ENDED and SUSPENDED read-only access
- only INCOMPLETE/CANCELLED fully blocked

If strict paid-only access is required, resolver and login policy must be tightened to deny non-ACTIVE states.
