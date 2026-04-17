COURIER MODULE REQUIREMENT

REGION SCOPE (CURRENT)
India-first implementation.

OBJECTIVE
Manage third-party courier partners in the same application and capture dispatch operations with audit-ready data.

MODULE GOALS
- Maintain Courier Partner master.
- Assign courier partner at dispatch stage.
- Capture tracking and consignment data.
- Track courier performance metrics.

SCOPE (PHASE 1)
- Courier partner CRUD.
- Courier assignment from orders.
- Dispatch metadata capture.
- Courier analytics dashboard.

OUT OF SCOPE (PHASE 1)
- Direct courier API integrations.
- Real-time webhook synchronization.

COURIER PARTNER FIELDS
Required fields:
- name
- status

Optional fields:
- contactPerson
- contactPhone
- supportPhone
- serviceAreas
- notes

ORDER RULES
- Courier flow is primary for CALL_COURIER orderType.
- DELIVERY orders may use courier by tenant policy.
- Courier selection required before DISPATCHED transition.

DISPATCH METADATA
- trackingNumber
- awbNumber
- consignmentNote
- estimatedDeliveryDate

PERFORMANCE METRICS (MINIMUM)
- totalDispatched
- inTransitCount
- deliveredCount
- failedOrReturnedCount
- successRate
- averageTransitHours

NON-FUNCTIONAL REQUIREMENTS
- Every query must filter by tenantId.
- Dispatch actions must be audited.
- Keep courier snapshots immutable on order.
