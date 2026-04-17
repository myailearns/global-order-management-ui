# Dev Rules

## Core Standards

- Use Angular 20+ patterns only.
- Use Angular 20 control flow syntax in templates (`@if`, `@for`, `@switch`); do not use legacy `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use standalone components and shared barrels for imports.
- Use Reactive Forms only.
- Use `FormArray` for repeatable item groups.
- Keep module business logic in services; components should focus on view state and orchestration.
- Prefer strict typing everywhere; avoid `any` and avoid unsafe casts.
- Keep code lint/format clean and consistent with project style.
- For feature modules, keep each non-root component in its own folder (example: `list/`, `form/`, `view/`) with colocated `.ts`, `.html`, `.scss` files.
- Keep feature root focused on container + service + constants + index barrel.

## Shared UI Usage

- Reuse shared form controls and shared table components; do not create duplicate local controls unless approved.
- Reuse shared modal, confirmation modal, card, alert/toast, and action button policy.
- Shared component selector naming convention:
  - Prefer `gom-lib-*` prefix for shared components in templates.
  - Legacy `gom-*` selectors are allowed temporarily for backward compatibility.
  - New screens/modules should use `gom-lib-*` to make shared-vs-feature components obvious.
- In shared grid action columns, use icon-only action buttons with tooltip and aria-label.
- Use theme tokens from shared theming only (no hardcoded UI colors/sizes in components unless justified).
- Use SCSS standards and keep styles scoped per component.

## Modal And Action Rules

- For confirmation modals: keep cancel as dismiss action, confirm can be icon-only, and delete must use danger variant.
- For create/update/save actions in forms and wizards: disable the primary submit button until required inputs are valid; also keep it disabled while submit/save is in progress.
- Danger/delete buttons must stay danger on hover/focus/active (never switch to primary/blue).
- In detail/view modals, use shared footer layout classes:
  - `gom-modal__action-layout`
  - `gom-modal__action-layout-start`
  - `gom-modal__action-layout-end`
- Keep all modal footer buttons right-aligned on desktop and mobile.
- Keep dismiss/navigation actions (`Cancel`, `Close`, `Back`) first, followed by positive/destructive actions (`Save`, `Edit`, `Delete`, `Confirm`).
- Do not rely on DOM order hacks or auto-wrap order for action alignment.
- In mobile card/list UI, keep quick actions icon-only in one non-wrapping row and open full details on card tap.

## Global Action Button Policy

- Multi-button content mode is controlled from one place: `src/app/shared/components/config/gom-action-button-policy.ts`.
- Supported roles: `primary-action`, `danger-action`, `secondary-action`, `dismiss`.
- Supported modes: `icon-only`, `text-only`, `icon-text`.
- If UX direction changes, update policy once and keep module implementations role-based.

## i18n And Static Text

- Do not hardcode new user-facing static text in templates/components.
- Keep feature copy in feature constants and use translation keys.
- Resolve copy with translate pipe/service.
- Translation files:
  - `src/assets/i18n/en.json`
  - `src/assets/i18n/te.json`
  - `src/assets/i18n/hi.json`
- If a key is added/changed in one language, update all supported language files in the same change.

## Dynamic Form Config Pattern

- Prefer a hybrid form architecture:
  - Keep page/service orchestration in component TypeScript.
  - Keep field rendering metadata in JSON config.
- Use shared dynamic form renderer component for config-based forms:
  - `gom-lib-dynamic-form`
  - Shared package path: `src/app/shared/components/dynamic-form/`
- Store form config JSON under `src/assets/form-config/<domain>/`.
- Define a typed config model (`*.model.ts`) near the feature form and use it when reading JSON.
- Use shared loader service for config loading and form group creation:
  - `GomDynamicFormLoaderService`
  - Supports `asset` source now and `api` source when backend-delivered config is enabled.
- Allow JSON to define only declarative concerns:
  - field control type, label key, placeholder key
  - default value and basic validators
  - validation message keys
  - select options or options source key
- Do not put business workflows in JSON:
  - API orchestration, branching flows, complex rules, side effects remain in code.

## Data, API, And Error Handling

- Keep API calls in feature services; components should not build raw HTTP logic.
- Use typed API request/response models and keep mapping logic explicit.
- Validate critical IDs/data before destructive actions.
- Show user-friendly error states and toast feedback for create/update/delete failures.
- Show success toast/alert for completed CRUD actions.

## SaaS Entitlements And Feature Governance

- Treat feature keys as a shared contract between UI and API. Backend authorization is source of truth; UI visibility and actions must mirror that same contract.
- Feature key format must be lowercase dot notation with action suffix: `<domain>.<action>`.
- Preferred action suffixes: `list`, `create`, `edit`, `delete`, `approve`, `export`. Add others only when business flow genuinely requires them.
- Normalize feature keys to lowercase before persistence, comparison, payload mapping, or form submission to avoid silent mismatches.
- Keep feature naming stable across backend guards, session payloads, SaaS feature catalog, package plans, UI route metadata, and module docs.
- Route and action protection must be feature-specific. Prefer `category.edit` over broad checks like `masters.write`.
- Entitlement handling must fail safe by default:
  - If `*.list` is missing, do not call list APIs for that module.
  - If `*.create|*.edit|*.delete` is missing, block UI actions and related API calls.
  - If route feature requirements are not satisfied, redirect to access-denied flow.
- Every new tenant-facing functionality must include entitlement work in the same change:
  - Add/update key metadata in `src/assets/data/features.json`.
  - Add/update SaaS Platform Feature Catalog entry with feature key, display name, module, and dependency keys where required.
  - Add/update package or entitlement mapping so the new key can be granted as intended.
  - Add/update backend guard or middleware enforcement for each protected route.
  - Add/update login/session payload mapping so effective `featureKeys` are returned to UI.
- UI-specific implementation requirements:
  - Add/update route-level gating using `featureKeys` route data.
  - Add/update sidebar or menu gating so unavailable features are not navigable.
  - Add/update component-level guards for create, edit, delete, and row actions.
  - Use `can*` naming for derived capability flags (`canEditCategory`, `canDeleteUnit`) and do not mix `allow*` and `can*` for the same purpose.
  - When introducing a new feature domain, document expected keys in module docs and keep naming consistent with SaaS entitlement screens.

## Accessibility And UX Baseline

- Provide meaningful aria-label/title text for icon-only controls.
- Ensure keyboard interaction works for actionable elements.
- Keep focus-visible behavior intact for interactive elements.
- Keep empty/loading/error states explicit on tables and lists.

## Performance And Maintainability

- Use `track`/`trackBy` for list rendering in `@for` loops.
- Avoid repeated transformation logic; extract helpers for row-to-model mapping.
- Remove unused code/styles during feature updates.
- Keep component styles under budget; if budget changes are required, document the reason in PR notes.