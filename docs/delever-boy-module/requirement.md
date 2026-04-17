DELIVERY BOY MODULE REQUIREMENT

REGION SCOPE (CURRENT)
India-first implementation.

OBJECTIVE
Manage in-house riders in the same application and replace free-text rider assignment with master-based assignment.

MODULE GOALS
- Maintain Rider master data.
- Assign and reassign riders from order workflow.
- Track rider performance metrics.
- Keep design ready for role-based access phase.

SCOPE (PHASE 1)
- Rider CRUD.
- Rider status management.
- Rider assignment and reassignment from orders.
- Rider metrics API and admin dashboard view.

OUT OF SCOPE (PHASE 1)
- Separate rider mobile application.
- Live GPS tracking.
- Route optimization automation.

ROLES (CURRENT + FUTURE)
- org_admin
- sales_agent
- warehouse
- delivery (future access scope)

BUSINESS RULES
- Only DELIVERY orders can be assigned to rider.
- PICKUP orders cannot be rider-assigned.
- Rider assignment required before SHIPPED.
- Reassignment must store reason and actor metadata.
- INACTIVE and ON_LEAVE riders cannot be newly assigned.

RIDER STATUS
- ACTIVE
- INACTIVE
- ON_LEAVE

RIDER DATA FIELDS
Minimum fields:
- name
- phone
- status

Optional fields:
- employeeCode
- whatsapp
- vehicleType
- vehicleNumber
- zoneTags
- notes

PERFORMANCE METRICS (MINIMUM)
- totalAssigned
- activeOrders
- deliveredCount
- attemptedCount
- returnRequestedCount
- returnedCount
- successRate

NON-FUNCTIONAL REQUIREMENTS
- Every query must filter by tenantId.
- Assignment and reassignment operations must be audited.
- PII-safe logging for rider phone and customer phone.
- List APIs must support pagination, search, and sort.
