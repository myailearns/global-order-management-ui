OVERVIEW
The Order Management Module allows businesses to run both offline and online order channels from one platform.

The same pricing + product setup is reused for:

Admin/Web order placement (offline walk-in, phone, WhatsApp)

Customer app order placement (online)

This module is designed for SaaS multi-tenant usage.

REGION SCOPE (CURRENT)
India-only rollout for current phase.

Future global/multi-country support remains possible but is out of scope for now.

GLOBAL-READY APPROACH (WITH INDIA DEFAULTS)
Keep implementation India-first now, but design data model/config to be globally extensible.

Default settings for current rollout:

countryCode = IN

currency = INR

timezone = Asia/Kolkata

taxMode = GST

All order calculations/validations should use tenant defaults unless explicitly overridden in future phases.

USERS
Org Admin

Sales Staff

Warehouse Staff

Delivery Staff

Customer (from separate customer app)

OBJECTIVE
Manage complete order lifecycle from cart to delivery/refund while keeping inventory and pricing consistent.

BUSINESS CHANNELS
ADMIN_WEB
Order created by internal staff for offline business.

CUSTOMER_WEB
Order created by customer from separate online app (future channel source tagging in current module).

SOCIAL_DM
Order captured by staff from channels like WhatsApp/Instagram.

SHOP_COUNTER
Order placed directly at store counter.

SYSTEM MUST store orderSource for every order.

SCOPE
Order creation

Customer/address mapping

Customer identification by mobile number

Auto-select existing customer by mobile (if already registered)

Quick customer creation when mobile does not exist

Price snapshot at order time

Payment tracking

Inventory reservation and release

Fulfillment workflow

Delivery assignment workflow (delivery boy/rider)

Return/refund basics

Reporting by source and status

OUT OF SCOPE (CURRENT MODULE)
Customer app UI development is not part of this module delivery.

This module will provide admin order management features and backend APIs that can later be consumed by a separate customer app.

CORE ENTITIES
Customer

Address

Order

OrderItem

Payment

Shipment

InventoryReservation

ReturnRequest

TAX DEPENDENCY
Tax master ownership is in docs/tax-management-module.

Order module consumes resolved tax from mapped profile and stores tax snapshots in order items.

CUSTOMER CAPTURE RULE (ADMIN ORDER ENTRY)
Minimum required customer inputs:

Mobile number

Customer name

Behavior:

When mobile is entered, system should search existing customers for current tenant.

If mobile exists, user selects existing customer record.

If mobile does not exist, user can create customer inline and continue order placement.

DELIVERY ASSIGNMENT RULE
For all delivery-type orders (SHOP_COUNTER delivery, SOCIAL_DM, CUSTOMER_WEB), system should support assigning a delivery boy/rider.

Assignment can happen at CONFIRMED or PACKED stage based on business policy.

Order should store assigned rider details and assignment timestamps.

Exception:
- CALL_COURIER orders do not use internal rider assignment.
- Courier partner details are captured at dispatch instead.

DELIVERY TYPE RULE
Every order must explicitly store deliveryType:

PICKUP

DELIVERY

Validation:

PICKUP orders must not require rider assignment.

DELIVERY orders must have rider assigned before SHIPPED transition.

DELIVERY flow should support failed doorstep attempts:

SHIPPED -> ATTEMPTED_DELIVERY when customer is unavailable.

ATTEMPTED_DELIVERY -> SHIPPED (re-attempt) or DELIVERED (success).

ORDER TYPE PROFILES (CURRENT BUSINESS)
System must support the following operational order types:

1) WALK_IN_INSTANT (shop counter immediate handover)
- Customer comes to shop and collects immediately.
- Payment collection can be CASH or UPI (manual verification by staff).
- In current phase, UPI is outside app gateway flow (customer pays to shared UPI number/QR and staff verifies receipt).
- Order can be completed immediately at submit based on configured policy.

2) CALL_PICKUP (phone order, customer collects later)
- Staff creates order from phone call.
- Customer comes later and collects order at shop.
- Payment can be CASH or UPI (manual verification).
- Order should remain in active lifecycle until pickup completion.

3) CALL_DELIVERY (phone order with home delivery)
- Staff creates order from phone call and dispatches for delivery.
- Payment can be CASH or UPI.
- Payment timing may be at ordering time or at delivery time based on business operation.
- Must follow delivery lifecycle (assignment/dispatch/attempted/delivered).

4) CALL_COURIER (phone order shipped via courier or transport service)
- Staff creates order from phone call, WhatsApp, or Instagram.
- Order is physically shipped through a third-party courier or transport company (e.g. Bluedart, DTDC, Delhivery).
- No internal rider assignment — fulfillment is handed off to the courier company.
- Staff captures courier details at dispatch time: courier company name, tracking number, AWB number, consignment note, estimated delivery date.
- Must follow courier lifecycle: PLACED → CONFIRMED → PACKED → DISPATCHED → DELIVERED.
- Payment can be CASH or UPI (manual verification).
- Payment timing may be at ordering time or at delivery time.

FUTURE ORDER TYPE PROFILE (PHASE 3+)
5) CUSTOMER_WEB_CHECKOUT (self-service customer app checkout)
- Customer places the order directly from the customer app/web checkout.
- deliveryType remains PICKUP or DELIVERY (same core model).
- orderSource should be CUSTOMER_WEB.
- Uses the same Order Core backend and entity model.
- Additional customer-app concerns (cart, auth/session, coupon UX, notifications) are handled in customer app layer.

PAYMENT COLLECTION MODEL (CURRENT PHASE)
- No in-app UPI gateway integration in current release.
- UPI is treated as MANUAL_CONFIRMED payment by staff.
- System should store payment method and payment status separately.
- Payment proof/reference text can be captured as optional note for audit/reconciliation.

PAYMENT METHODS (CURRENT PHASE)
- CASH
- UPI_MANUAL

PAYMENT STATUS (CURRENT PHASE)
- PENDING
- SUCCESS
- FAILED
- REFUNDED

ORDER STATUS FLOW
DRAFT

PLACED

CONFIRMED

PACKED

ASSIGNED

SHIPPED

DISPATCHED

ATTEMPTED_DELIVERY

DELIVERED

CANCELLED

RETURN_REQUESTED

RETURN_IN_TRANSIT

RETURNED

REFUNDED

Status transition rules should be enforced in backend (no invalid jumps).

STATUS TRANSITION MATRIX (CURRENT)
Allowed transitions:

DRAFT -> PLACED

PLACED -> CONFIRMED or CANCELLED

CONFIRMED -> PACKED or CANCELLED

PACKED -> DELIVERED (WALK_IN_INSTANT — immediate completion at submit)

PACKED -> DELIVERED or CANCELLED (PICKUP)

PACKED -> ASSIGNED or CANCELLED (CALL_DELIVERY)

PACKED -> DISPATCHED or CANCELLED (CALL_COURIER)

ASSIGNED -> SHIPPED or ATTEMPTED_DELIVERY or CANCELLED

SHIPPED -> DELIVERED or ATTEMPTED_DELIVERY or RETURN_REQUESTED

DISPATCHED -> DELIVERED or CANCELLED

ATTEMPTED_DELIVERY -> SHIPPED or DELIVERED or CANCELLED

DELIVERED -> RETURN_REQUESTED

RETURN_REQUESTED -> RETURNED or CANCELLED (request rejected) (PICKUP)

RETURN_REQUESTED -> RETURN_IN_TRANSIT or CANCELLED (request rejected) (CALL_DELIVERY/CALL_COURIER)

RETURN_IN_TRANSIT -> RETURNED or CANCELLED

RETURNED -> REFUNDED

REFUNDED means money returned to customer (final payment-refund state).

ORDER EDITABILITY POLICY (CURRENT)
Goal: allow operational corrections without breaking inventory/payment/audit integrity.

1) DRAFT
- Editable: customer name, customer phone, delivery address, pincode, map location, delivery contact name/phone, preferred delivery time, notes, items, quantities.

2) PLACED
- Editable: customer name, customer phone, delivery address, pincode, map location, delivery contact name/phone, preferred delivery time, notes, items, quantities.

3) CONFIRMED
- Editable: customer name, customer phone, delivery contact name/phone, preferred delivery time, notes.
- Items/quantities editable only when paymentStatus = PENDING.
- Address/pincode/map editable only when shipment/route assignment has not started.

4) PACKED
- Editable: delivery contact name/phone and delivery notes/instructions only.
- Not editable: items, quantities, address, pincode, map location.

5) ASSIGNED
- Editable: delivery contact name/phone and notes only.
- Not editable: items, quantities, address, pincode, map location.

6) SHIPPED / DISPATCHED / ATTEMPTED_DELIVERY
- Editable: delivery contact name/phone and notes only (emergency coordination changes).
- Not editable: items, quantities, address, pincode, map location, payment structure.

7) DELIVERED
- Order header/customer/address/items are locked.
- Only return/refund workflow actions are allowed.

8) CANCELLED / RETURN_REQUESTED / RETURN_IN_TRANSIT / RETURNED / REFUNDED
- Core order edit is locked.
- Only status workflow actions relevant to cancellation/return/refund are allowed.

PAYMENT OVERLAY RULE
- If paymentStatus = SUCCESS: block item/quantity/address/pincode edits from PLACED onward.
- If customer needs additional items after payment success: create a new order instead of editing the existing one.

COURIER DISPATCH DETAILS (CALL_COURIER)
When transitioning PACKED → DISPATCHED, staff must capture:

Courier company name (e.g. Bluedart, DTDC, Delhivery)

Tracking number / AWB number

Consignment note number

Estimated delivery date

All fields are optional at dispatch time to allow partial information entry.

Courier details are stored on the order and visible in order detail view.

Rider assignment is not applicable for CALL_COURIER orders.

PRICING RULES
Price should not be recalculated from product formula after order is placed.

Store item-level price snapshot in order item:

sellingPriceSnapshot

anchorPriceSnapshot

discountSnapshot

taxSnapshot

lineTotal

Also store order-level pricing snapshot components:

subTotalSnapshot

discountSnapshot

taxSnapshot

deliveryChargeSnapshot

roundOffSnapshot

grandTotalSnapshot

INVENTORY RULES
On order place: reserve stock.

On cancel before shipment: release stock.

On ship: convert reserved to issued.

On return: add back stock based on return policy.

INVENTORY EDGE CASES (MUST HANDLE)
Partial shipment: deduct only shipped item quantities.

Partial cancellation: release only cancelled item reservations.

Failed delivery: re-attempt flow without duplicate deduction.

Return after delivery: add stock back based on return disposition policy.

MULTI-TENANT RULES (SaaS)
Every transactional entity must include tenantId.

All list/get APIs must filter by tenantId.

Role-based access:

org_admin

sales_agent

warehouse

delivery

customer

NON-FUNCTIONAL REQUIREMENTS
Audit log for status changes.

Idempotent payment callback handling.

Pagination/search/sort on all list APIs.

Export-ready reporting fields.

Clear error messages for stock/payment/order transition failures.

PII and audit baseline:

Mask customer mobile/address in logs.

Track who changed order status, rider assignment, and refund actions.

INDIA-FIRST OPERATING RULES (CURRENT)
Currency: INR only.

Timezone: IST (Asia/Kolkata) for business operations and reporting.

Tax: GST model only in current implementation.

Contact format: Indian mobile number validation.

Address format: India address fields (state, district/city, pincode).

GLOBAL EXTENSION READINESS (MUST KEEP IN DESIGN)
Store currency/tax/timezone snapshots at order level.

Keep contact/address validator strategy pluggable by tenant country.

Avoid hardcoding India rules in core domain services; use tenant config defaults.

PHASE PLAN
PHASE 0 (PREREQUISITE)
Implement Tax module from docs/tax-management-module first.

Ensure order module can consume mapped tax profile for automatic GST calculation.

PHASE 1
Admin order placement + order listing + order detail.

PHASE 2
Inventory reservation + status workflow + cancel flow.

PHASE 3
Customer-facing API hardening for catalog/cart/checkout/order tracking.

Introduce CUSTOMER_WEB_CHECKOUT orderType for self-service customer app orders.

Customer app UI implementation remains a separate project.

PHASE 4
Payments, shipment updates, return/refund.

PHASE 5
SaaS analytics and tenant-level configuration.

FINAL DECISION
One shared Order Core backend.

Two frontends:

Admin portal (current app)

Customer app (separate app)

This supports offline and online business together as a SaaS platform.
