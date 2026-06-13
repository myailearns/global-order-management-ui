## Adding New Features To The System

- All feature definitions are embedded in `src/app/features/saas-platform/entitlements/feature-catalog.component.ts` as the `FEATURE_TEMPLATES` constant.
- Each new feature must have entry in `FEATURE_TEMPLATES` with:
  - `featureKey`: lowercase dot notation with action suffix (e.g., `rider.list`, `rider.create`)
  - `displayName`: user-friendly label (e.g., "View Riders", "Create Rider")
  - `module`: feature's domain/module (e.g., `delivery`, `masters`)
  - `dependencies`: array of prerequisite feature keys (e.g., `['rider.list']` for edit action)
- After updating `FEATURE_TEMPLATES`, rebuild the admin UI: `cd gom-ui && npm run build`
- Feature templates will auto-populate in Platform Admin → SaaS Features → Add Feature dropdown on next browser load.

## Dropdowns With Many Options

- Use `[searchable]="true"` on `gom-lib-select` when options count exceeds ~10.
- Add `[searchPlaceholder]` for user-friendly search field placeholder (key: e.g., `'saas.platform.features.ph_search'`).
- Search filters both `label` and `value` by default in `GomSelectComponent`.
- Applies to: feature templates, dependencies, modules, and other large option lists.

## Accessibility And UX Baseline

- Provide meaningful aria-label/title text for icon-only controls.
- Ensure keyboard interaction works for actionable elements.
- Keep focus-visible behavior intact for interactive elements.
# Dev Rules

## Core Standards

- Use Angular 20+ patterns only.
- Use Angular 20 control flow syntax in templates (`@if`, `@for`, `@switch`); do not use legacy `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use standalone components and shared barrels for imports.
- Use Reactive Forms only.
- Use `FormArray` for repeatable item groups.
- Keep code lint/format clean and consistent with project style.
- For feature modules, keep each non-root component in its own folder (example: `list/`, `form/`, `view/`) with colocated `.ts`, `.html`, `.scss` files.
- Keep feature root focused on container + service + constants + index barrel.

- Reuse shared form controls and shared table components; do not create duplicate local controls unless approved.
- Reuse shared modal, confirmation modal, card, alert/toast, and action button policy.
- Shared component selector naming convention:
- Use theme tokens from shared theming only (no hardcoded UI colors/sizes in components unless justified).
- Use SCSS standards and keep styles scoped per component.

- For create/update/save actions in forms and wizards: disable the primary submit button until required inputs are valid; also keep it disabled while submit/save is in progress.
- Danger/delete buttons must stay danger on hover/focus/active (never switch to primary/blue).
- In detail/view modals, use shared footer layout classes:
- Multi-button content mode is controlled from one place: `src/app/shared/components/config/gom-action-button-policy.ts`.
- Supported roles: `primary-action`, `danger-action`, `secondary-action`, `dismiss`.
## i18n And Static Text

- Do not hardcode new user-facing static text in templates/components.
  - `src/assets/i18n/en.json`
  - `src/assets/i18n/te.json`
  - `src/assets/i18n/hi.json`

## Dynamic Form Config Pattern

- Prefer a hybrid form architecture:
  - Keep page/service orchestration in component TypeScript.
- Use shared dynamic form renderer component for config-based forms:
  - `gom-lib-dynamic-form`
  - Shared package path: `src/app/shared/components/dynamic-form/`
- Store form config JSON under `src/assets/form-config/<domain>/`.
- Define a typed config model (`*.model.ts`) near the feature form and use it when reading JSON.
  - `GomDynamicFormLoaderService`
  - Supports `asset` source now and `api` source when backend-delivered config is enabled.
- Allow JSON to define only declarative concerns:
  - field control type, label key, placeholder key
  - default value and basic validators
  - validation message keys
## Data, API, And Error Handling

- Keep API calls in feature services; components should not build raw HTTP logic.
## Adding New Features To The System

- All feature definitions are embedded in `src/app/features/saas-platform/entitlements/feature-catalog.component.ts` as the `FEATURE_TEMPLATES` constant.
- Each new feature must have entry in `FEATURE_TEMPLATES` with:
  - `featureKey`: lowercase dot notation with action suffix (e.g., `rider.list`, `rider.create`)
  - `displayName`: user-friendly label (e.g., "View Riders", "Create Rider")
  - `module`: feature's domain/module (e.g., `delivery`, `masters`)
  - `dependencies`: array of prerequisite feature keys (e.g., `['rider.list']` for edit action)
- After updating `FEATURE_TEMPLATES`, rebuild the admin UI: `cd gom-ui && npm run build`
- Feature templates will auto-populate in Platform Admin → SaaS Features → Add Feature dropdown on next browser load.

## Dropdowns With Many Options

- Use `[searchable]="true"` on `gom-lib-select` when options count exceeds ~10.
- Add `[searchPlaceholder]` for user-friendly search field placeholder (key: e.g., `'saas.platform.features.ph_search'`).
- Search filters both `label` and `value` by default in `GomSelectComponent`.
- Applies to: feature templates, dependencies, modules, and other large option lists.

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