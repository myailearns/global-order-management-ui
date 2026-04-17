COURIER ROUTE FLOW

FLOW SUMMARY
Third-party courier dispatch lifecycle.

--------------------------------------------------
1. ORDER PREPARATION
- Order reaches PACKED.
- Order type generally CALL_COURIER.

--------------------------------------------------
2. COURIER ASSIGNMENT
- Select ACTIVE courier partner.
- Capture tracking, AWB, consignment, ETA.
- Order moves to DISPATCHED.

--------------------------------------------------
3. IN-TRANSIT MONITORING
- Monitor via tracking number and courier updates.
- Update order status from admin workflow.

--------------------------------------------------
4. LAST-MILE OUTCOME
- DISPATCHED to DELIVERED
- DISPATCHED to RETURN_REQUESTED (as applicable)

--------------------------------------------------
5. VALIDATION RULES
- Courier selection required before DISPATCHED transition.
- INACTIVE courier partner cannot be newly selected.
- Tracking fields can be partially captured and updated later.
