CUSTOMERS MODULE REQUIREMENT

REGION SCOPE (CURRENT)
India-first implementation.

OBJECTIVE
Provide a customer intelligence view for repeat business, support operations, and future campaign targeting.

MODULE GOALS
- List all customers who have placed at least one order.
- Show customer-level business metrics (order count, spend, recency).
- Show each customer's order history and item preferences.
- Enable quick drill-down from customer to order details.
- Keep foundation ready for WhatsApp/notification campaigns.

SCOPE (PHASE 1)
- Customer listing with pagination, search, sort.
- Customer summary metrics:
  - totalOrders
  - deliveredOrders
  - cancelledOrders
  - totalSpend
  - averageOrderValue
  - lastOrderAt
- Customer profile detail view.
- Customer order timeline/history view.
- Top purchased items/categories summary.
- Basic filters: pincode, order count range, last order date range.

OUT OF SCOPE (PHASE 1)
- Direct message send from this module.
- Predictive AI segmentation.
- Auto lifecycle journeys.

PRIMARY USERS
- org_admin
- sales_agent
- support_staff (future role mapping)

BUSINESS RULES
- Only customers with at least one order should appear in default list.
- Metrics must be tenant-isolated.
- Monetary metrics must use order pricingSnapshot.grandTotal.
- Recency is based on latest non-draft order timestamp.
- Order history should keep original snapshots, not live product data.

DEPENDENCIES
- Order module for order history and status.
- Customer master for identity and address.
- Customer Groups module for manual tagging and targeting.

NON-FUNCTIONAL REQUIREMENTS
- Tenant-safe isolation by tenantId on all queries.
- Pagination and server-side filtering for list endpoints.
- PII-safe logs (phone masking in logs where needed).
- Query response target: p95 under 400ms for list page under normal load.

PHASE PLAN
PHASE 1
- List, metrics, detail, order history.

PHASE 2
- Group assignment visibility and group-based filtering integration.

PHASE 3
- Campaign readiness exports and audience preview.

PHASE 4
- AI-assisted customer insights (future).
