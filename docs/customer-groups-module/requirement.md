CUSTOMER GROUPS MODULE REQUIREMENT

REGION SCOPE (CURRENT)
India-first implementation.

OBJECTIVE
Enable manual customer segmentation (for example by pincode, loyalty, campaign intent) to support targeted outreach in future WhatsApp and notification workflows.

MODULE GOALS
- Create and manage customer groups.
- Manually assign/unassign customers to groups.
- Filter customers by group in customer list views.
- Keep group data campaign-ready for future messaging engine.

SCOPE (PHASE 1)
- Group CRUD.
- Member add/remove (single and bulk).
- Group member list with search/pagination.
- Group metadata for campaign use.

OUT OF SCOPE (PHASE 1)
- Actual campaign send engine.
- Automated/AI group assignment.
- Rule-based dynamic segments.

PRIMARY USERS
- org_admin
- sales_agent (based on tenant role policy)

GROUP TYPE EXAMPLES
- Manual business tags: VIP, high-value, inactive, festival buyers.
- Location tags: pincode-based clusters.
- Promotional tags: coupon target cohort.

BUSINESS RULES
- Group names must be unique per tenant.
- A customer can belong to multiple groups.
- Assignment should be idempotent (no duplicate memberships).
- Inactive groups are hidden from default selection but retained historically.

NON-FUNCTIONAL REQUIREMENTS
- Tenant isolation on groups and memberships.
- Assignment and removal audit metadata (actor and timestamp).
- Bulk operations should support partial success reporting.

PHASE PLAN
PHASE 1
- Manual groups + assignment APIs + admin UI.

PHASE 2
- Group filters in Customers module and audience preview.

PHASE 3
- Campaign integration hooks (WhatsApp/notification).

PHASE 4
- AI-assisted segmentation suggestions.
