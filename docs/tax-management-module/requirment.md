OVERVIEW
Tax Management Module defines centralized tax configuration for product pricing and order calculation.

CURRENT SCOPE (INDIA FIRST)
GST-only model for India.

OBJECTIVE
Provide one tax source of truth for:

Group-level mapping

Variant-level inheritance

Order-time tax resolution and snapshot

CORE ENTITIES
TaxProfile

TaxRuleVersion (optional future)

TaxOverrideAudit

TAX PROFILE MODEL (BASE)
name

countryCode

taxMode

rate

inclusive

hsnCode

status

effectiveFrom

effectiveTo

MAPPING RULES
Group maps to one active taxProfileId.

Variant inherits Group tax profile by default.

Override is optional and controlled by role + reason.

ORDER INTEGRATION RULE
Order calculation must read tax from mapped tax profile.

Order item must store tax profile snapshot (id, name, rate, mode).

NON-FUNCTIONAL
Tenant-safe isolation by tenantId.

Audit trail for profile changes and manual overrides.

No historical drift after order placement.

PHASE PLAN
PHASE 1
Tax profile master CRUD.

PHASE 2
Group mapping API + UI.

PHASE 3
Order engine integration + snapshots.

PHASE 4
Versioning/effective dates + reports.
