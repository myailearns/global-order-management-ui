# GOM UI — Dev Rules

---

## 1. Angular 20 Standards (Required)

These are non-negotiable. All code must follow Angular 20+ patterns.

- **Use Angular 20+ APIs and patterns only.** Do not use patterns from older Angular versions.
- **Control flow syntax**: Use `@if`, `@for`, `@switch` in all templates. Never use legacy `*ngIf`, `*ngFor`, `*ngSwitch` directives.
- **Standalone components**: All components must be standalone. Use shared barrels (`index.ts`) for imports.
- **Reactive Forms only**: Use `FormGroup`, `FormControl`, `FormArray`. Do not use template-driven forms.
- **Signals**: Prefer Angular signals (`signal()`, `computed()`, `effect()`) for local component state over class properties with manual change detection.
- **`inject()`**: Use the `inject()` function for dependency injection in standalone components. Do not use constructor injection unless required by a base class.
- **`@for` with `track`**: Always provide a `track` expression in `@for` loops for performance.
- **Defer blocks**: Use `@defer` for lazy-loading heavy components that are not visible on initial render.
- **Input/Output**: Use the new `input()` and `output()` signal-based APIs for component inputs and outputs in new components.
- **File structure**: Each non-root component lives in its own folder (`list/`, `form/`, `view/`) with colocated `.ts`, `.html`, `.scss` files.
- Keep feature root focused on: container component, feature service, constants, and `index.ts` barrel.

---

## 2. Gomblips Component Library (Required)

**Gomblips** is the shared UI component library (`@gom/ui`, sourced from `gom-libs/projects/gom-ui`). All UI elements must come from Gomblips. Do not create local duplicates of components that already exist in the library.

### Available Gomblips Components

| Component | Selector | Use For |
|-----------|----------|---------|
| Button | `gom-lib-button` | All buttons and icon-only actions |
| Input | `gom-lib-input` | Text, number, search inputs |
| Select / Dropdown | `gom-lib-select` | Single and multi-select dropdowns |
| Checkbox | `gom-lib-checkbox` | Checkbox inputs |
| Switch | `gom-lib-switch` | Toggle on/off switches |
| Textarea | `gom-lib-textarea` | Multi-line text areas |
| Table | `gom-lib-table` | Data tables with sorting and pagination |
| Modal | `gom-lib-modal` | Dialog overlays and confirmation modals |
| Alert / Toast | `gom-lib-alert` | Inline alerts; use `toast.success()` / `toast.error()` for toasts |
| Card | `gom-lib-card` | Card containers and panels |
| Chip | `gom-lib-chip` | Tags, filter chips, status badges |
| Tabs | `gom-lib-tabs` | Tab navigation within a page |
| Dynamic Form | `gom-lib-dynamic-form` | Config-driven form rendering |

### Rules

- **Never build a local button, input, select, checkbox, switch, modal, table, or alert.** Always use the Gomblips equivalent.
- For dropdowns with more than ~10 options: add `[searchable]="true"` and `[searchPlaceholder]` on `gom-lib-select`.
- Danger/delete buttons must use the `danger` variant and must stay danger on hover/focus/active — never switch to primary/blue.
- Disable the primary submit button until required inputs are valid, and also while a submit is in progress.
- Multi-button modal footers are controlled from one place: `src/app/shared/components/config/gom-action-button-policy.ts`.
- Supported button roles: `primary-action`, `danger-action`, `secondary-action`, `dismiss`.

### Generic Component Contribution Rule

> **If a component or utility is needed by both GOM UI and GOM Customer Web, it must be built in Gomblips (`gom-libs`) first, then consumed in both applications.**

- Do not duplicate generic UI logic across apps. Examples: loaders, empty states, pagination, badge, rating, pin input.
- When adding a component to Gomblips: export it from `public-api.ts`, add a selector with the `gom-lib-` prefix, and document its inputs/outputs in the component file.
- After adding to Gomblips, rebuild the library: `cd gom-libs && npm run build`.

---

## 3. Theming — Gomblips SCSS Token Functions (Required)

All visual styling must use Gomblips SCSS token functions. **Never hardcode color values, font sizes, spacing, or border radii** in component styles.

### Color Token Functions

```scss
// Text colors
color: get-text(primary);         // Brand primary text / links
color: get-text(default);         // Default body text
color: get-text(default-light);   // Secondary / subdued text
color: get-text(hint);            // Hint / placeholder text
color: get-text(disabled);        // Disabled text
color: get-text(danger);          // Error / destructive text
color: get-text(success);         // Success text
color: get-text(warning);         // Warning text
color: get-text(on-primary);      // Text on primary-colored backgrounds

// Background colors
background: get-background(standard);       // Default page / card background
background: get-background(secondary);      // Alt surfaces
background: get-background(primary);        // Brand primary fill
background: get-background(primary-light);  // Light primary tint
background: get-background(success);        // Success fill
background: get-background(success-light);  // Light success tint
background: get-background(warning);        // Warning fill
background: get-background(danger);         // Danger fill
background: get-background(danger-light);   // Light danger tint
background: get-background(info);           // Info fill

// Border colors
border-color: get-border(standard);         // Default borders
border-color: get-border(light);            // Subtle/faint borders
border-color: get-border(primary);          // Active/focused borders
border-color: get-border(danger);           // Error borders
border-color: get-border(disabled);         // Disabled borders
```

### Typography Token Functions

```scss
// Font sizes
font-size: get-font-size(xs);           // 12px
font-size: get-font-size(sm);           // 14px
font-size: get-font-size(body);         // 16px  ← use for "medium"
font-size: get-font-size(body-lg);      // 18px  ← use for "large"
font-size: get-font-size(heading-sm);
font-size: get-font-size(heading-md);
font-size: get-font-size(heading-lg);

// Typography mixins
@include typography-body();             // Standard body text styles
@include typography-heading(lg);        // Heading styles (sm, md, lg, xl, xxl, 3xl)
```

### Spacing, Radius, Sizing

```scss
padding: get-spacing(sm);     // 16px
margin: get-spacing(md);      // 24px
gap: get-gap(sm);
border-radius: get-radius(sm); // 8px
border-radius: get-radius(md); // 12px
width: get-size(lg);
```

### Breakpoints

```scss
@include breakpoint-up(md)  { ... }   // min-width: 840px
@include breakpoint-down(sm) { ... }  // max-width: 428px
```

### What NOT to do

```scss
/* ❌ Never */
color: #0a5d8b;
font-size: 14px;
padding: 16px;
border-radius: 8px;
color: red;

/* ✅ Always */
color: get-text(primary);
font-size: get-font-size(sm);
padding: get-spacing(sm);
border-radius: get-radius(sm);
color: get-text(danger);
```

---

## 4. i18n And Static Text

- Do not hardcode user-facing static text in templates or components.
- Add all strings to all three locale files:
  - `src/assets/i18n/en.json`
  - `src/assets/i18n/te.json`
  - `src/assets/i18n/hi.json`

---

## 5. Dynamic Form Config Pattern

- Use `gom-lib-dynamic-form` for config-driven forms.
- Store form config JSON under `src/assets/form-config/<domain>/`.
- Define a typed config model (`*.model.ts`) near the feature form.
- Use `GomDynamicFormLoaderService` to load config (supports `asset` and `api` sources).
- JSON defines only declarative concerns: control type, label key, placeholder key, default value, validators, validation message keys.
- Keep orchestration logic (submit, patch, side-effects) in the component TypeScript, not in JSON config.

---

## 6. Data, API, And Error Handling

- Keep all API calls in feature services. Components must not build raw HTTP logic.
- Use typed response models for all API calls.
- Handle loading, error, and empty states explicitly in every list/table view.

---

## 7. Forms And Actions

- **Reactive Forms only**: `FormGroup`, `FormControl`, `FormArray`.
- Disable the primary submit button until the form is valid and while a submit is in progress.
- Danger/delete actions must always use the `danger` variant. Never revert to primary/blue on hover or focus.
- Use `src/app/shared/components/config/gom-action-button-policy.ts` for multi-button footer layouts in modals.

---

## 8. SaaS Entitlements And Feature Governance

- Feature keys are a shared contract between UI and API. Backend is source of truth; UI must mirror it.
- Feature key format: lowercase dot notation with action suffix — `<domain>.<action>`.
- Preferred actions: `list`, `create`, `edit`, `delete`, `approve`, `export`.
- Normalize feature keys to lowercase before persistence, comparison, or payload mapping.
- Keep feature naming stable across backend guards, session payloads, SaaS catalog, plans, route metadata, and module docs.
- Prefer `category.edit` over broad guards like `masters.write`.
- Entitlement handling must **fail safe**:
  - No `*.list` → do not call list APIs.
  - No `*.create|*.edit|*.delete` → block UI actions and API calls.
  - Route requirements not met → redirect to access-denied.
- Every new tenant-facing functionality requires entitlement work in the same PR:
  - Add/update key in `src/assets/data/features.json`.
  - Add/update SaaS Platform Feature Catalog entry (key, display name, module, dependencies).
  - Add/update package/entitlement mapping.
  - Add/update backend guard or middleware.
  - Add/update session payload mapping so `featureKeys` are returned to UI on login.
- UI implementation:
  - Add/update route-level gating via `featureKeys` route data.
  - Add/update sidebar/menu gating.
  - Add/update component-level guards for create, edit, delete, and row actions.
  - Use `can*` naming for capability flags (`canEditCategory`, `canDeleteUnit`). Do not mix `allow*` and `can*` for the same purpose.

---

## 9. Adding New Features To The System

- All feature definitions live in `src/app/features/saas-platform/entitlements/feature-catalog.component.ts` as the `FEATURE_TEMPLATES` constant.
- Each entry requires: `featureKey`, `displayName`, `module`, `dependencies`.
- After updating `FEATURE_TEMPLATES`, rebuild: `cd gom-ui && npm run build`.
- Feature templates auto-populate in Platform Admin → SaaS Features → Add Feature on next browser load.

---

## 10. Accessibility And UX Baseline

- Provide meaningful `aria-label`/`title` for icon-only controls.
- Keyboard interaction must work for all actionable elements.
- Keep `focus-visible` styles intact.
- Every list and table must have explicit empty, loading, and error states.

---

## 11. Performance And Maintainability

- Use `track` in all `@for` loops.
- Extract repeated row-to-model mapping logic into helpers.
- Remove unused code and styles during feature updates.
- Keep component style budgets; if a budget change is required, document the reason in the PR.
