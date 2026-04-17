UX PRINCIPLE (VERY IMPORTANT)
Guide user by order lifecycle.

Keep admin flow fast for offline business.

Keep customer flow simple for online conversion.

Show status and action eligibility clearly.

REGION SCOPE (CURRENT)
India-only UX assumptions for this module.

Use INR pricing display, Indian mobile validation, and India address structure.

GLOBAL-READY UX NOTE
Render currency/date/time/address using tenant locale settings.

For current rollout, tenant defaults should be India values.

FINAL UX STRUCTURE
Master Setup

Product Setup

Order Management (new parallel module)

Separate Customer App (online ordering, future integration)

PREREQUISITE BEFORE ORDER ROLLOUT
1. Complete Tax module setup from docs/tax-management-module.
2. Ensure Group to Tax Profile mappings are active.
3. Then start Order Management implementation.

NOTE
Current module scope includes admin portal UX only.

Customer app UX is documented for future planning and API compatibility.

CURRENT BUILD SCOPE (ADMIN UI)
Order Dashboard

Orders list and detail

Create order (offline/social/counter intake)

Rider assignment and fulfillment flow

Returns and refunds handling

--------------------------------------------------
1. ADMIN PORTAL UX (CURRENT APP)
SIDEBAR (NEW SECTION)
Order Dashboard

Orders

Returns

Payments

Fulfillment Queue

Customers

ORDER DASHBOARD
Cards:

Today Orders

Pending Confirmation

Pending Packing

Out for Delivery

Cancelled

Source Split (Admin vs Customer)

Charts:

Status funnel

Daily revenue

ORDER LIST SCREEN
Table columns:

Order No

Customer

Source

Assigned Rider

Items

Total

Payment Status

Order Status

Created At

Quick Actions (icon-only)

Filters:

Status

Source

Assigned rider

Date range

Payment status

Search by order/customer/phone

CREATE ORDER (ADMIN) - STEP FLOW
STEP 1: Customer

Existing customer search

Primary search key: mobile number

As user types mobile, show matching existing customers

If mobile match found, allow quick select of existing customer

If no match, show "Create New Customer" inline using entered mobile

Quick create customer

Select address

STEP 2: Items

Add variant rows (like pack table speed)

Qty input

Live line totals

Stock availability indicator

STEP 3: Pricing

Sub-total

Discount

Tax

Delivery charge

Grand total

Tax behavior in this step:

Tax is auto-derived from Group/Variant mapped tax profile.

User should see tax breakup but should not manually type tax in normal flow.

STEP 4: Payment + Place

Payment mode

Notes

Place order

Success screen with order number + print/invoice options

Order source options in admin form:

Shop Counter

Social DM (WhatsApp/Instagram)

Admin Web

Delivery toggle:

Pickup (no rider assignment)

Delivery (rider assignment required before ship)

ORDER DETAIL SCREEN
Sections:

Header (status chip, source, created by)

Customer block

Items + snapshots

Timeline (status history)

Payment history

Shipment details

Assigned rider details

Primary actions based on status:

Confirm

Pack

Assign Rider

Ship

Ship Partial

Deliver

Delivery Failed / Reattempt

Cancel

Return handling

RETURN FLOW (ADMIN)
Create return request

Inspect and approve/reject

Initiate refund

Update inventory automatically

PARTIAL OPERATION UX RULES
Allow partial item cancellation before shipment.

Allow partial shipment by selected items/quantities.

Show clear per-item status chips in order detail.

--------------------------------------------------
2. CUSTOMER APP UX (SEPARATE APP - FUTURE, NOT IN CURRENT MODULE DELIVERY)
HOME
Categories

Featured products

Recent orders

PRODUCT LIST
Variant-first view

Price, anchor (strike-through), availability

Simple add-to-cart

CART
Editable quantities

Coupon apply

Delivery estimate

CHECKOUT
Address

Payment

Review

Place order

Payment options (current): UPI, COD, Card, Net Banking.

ORDER TRACKING
Timeline:
Placed -> Confirmed -> Packed -> Shipped -> Delivered

Return request option after delivery (policy-based)

--------------------------------------------------
3. CROSS-CHANNEL UX RULES
Source badge visible in admin always.

Admin can place order for offline without customer login.

Customer cannot edit restricted statuses.

Same order detail format for both sources in backend.

--------------------------------------------------
4. UX ENHANCEMENTS
Smart suggestions in admin order entry:

Frequently ordered variants

Recent customer orders

Saved templates (future)

Bulk actions for warehouse queue:

Pack selected

Ship selected

Print labels

Error prevention:

Prevent invalid status transitions

Block place order when stock unavailable

Clear reason fields for cancel/reject/refund

FINAL ONE LINE
Use fast table-driven order entry for admin and clean checkout flow for customer, both powered by one shared order core.
