DELIVERY BOY ROUTE FLOW

FLOW SUMMARY
In-house rider lifecycle for DELIVERY orders.

--------------------------------------------------
1. ORDER PREPARATION
- Order reaches PACKED.
- deliveryType must be DELIVERY.

--------------------------------------------------
2. RIDER ASSIGNMENT
- Select ACTIVE rider from Rider master.
- Store assignment snapshot on order.
- Order moves to ASSIGNED.

--------------------------------------------------
3. DISPATCH HANDOVER
- ASSIGNED moves to SHIPPED.
- Rider receives parcel handover.

--------------------------------------------------
4. LAST-MILE OUTCOME
- SHIPPED to DELIVERED
- SHIPPED to ATTEMPTED_DELIVERY
- ATTEMPTED_DELIVERY to SHIPPED (reattempt)
- ATTEMPTED_DELIVERY to DELIVERED

--------------------------------------------------
5. VALIDATION RULES
- PICKUP cannot use rider flow.
- INACTIVE and ON_LEAVE rider cannot be assigned.
- Reassignment requires reason.
