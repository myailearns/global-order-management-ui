Order management module APIs

BASE
/api/v1

REGION SCOPE (CURRENT)
India-only implementation.

Currency and tax behavior in current APIs should assume INR + GST.

GLOBAL-READY WITH INDIA DEFAULTS
Tenant settings should drive runtime defaults:

countryCode

currency

timezone

taxMode

Current rollout uses India defaults from tenant config.

AUTH
All admin APIs require authenticated tenant user context.

All customer APIs require customer auth/guest token as applicable.

COMMON QUERY STANDARD
?page=1&limit=20

?search=orderNo

?sortBy=createdAt&order=desc

?status=PLACED

TAX MODULE DEPENDENCY
Tax profile master and mapping APIs are documented in docs/tax-management-module/apis.md.

Order APIs consume tax resolution output and persist item/order snapshots.

--------------------------------------------------
1. CUSTOMERS (ADMIN SIDE)
GET /customers

Query:

?search=ram

?phone=9xxxx

Recommended for order entry:

GET /customers?phone=9876543210

Use this for instant mobile lookup while creating admin orders.

POST /customers

Body:
{
  "name": "Ravi Kumar",
  "phone": "9876543210",
  "email": "ravi@example.com"
}

Optional shortcut API (future):

POST /customers/resolve

Body:
{
  "phone": "9876543210",
  "name": "Ravi Kumar"
}

Behavior:

If customer exists by phone -> return existing.

If not exists -> create and return new.

GET /customers/:id

PUT /customers/:id

--------------------------------------------------
2. ADDRESSES
GET /customers/:id/addresses

POST /customers/:id/addresses

Body:
{
  "label": "Home",
  "line1": "12 Main Road",
  "line2": "Near Temple",
  "city": "Hyderabad",
  "state": "TS",
  "postalCode": "500001",
  "geo": { "lat": 17.385, "lng": 78.4867 }
}

PUT /customers/:id/addresses/:addressId

--------------------------------------------------
3. ORDER DRAFT + PLACE (ADMIN/CUSTOMER)
POST /orders/draft

Body:
{
  "orderSource": "SHOP_COUNTER",
  "deliveryType": "DELIVERY",
  "customerId": "custId",
  "addressId": "addrId",
  "items": [
    { "variantId": "var1", "quantity": 2 },
    { "variantId": "var2", "quantity": 1 }
  ],
  "notes": "Phone order"
}

Supported orderSource values:

ADMIN_WEB

SHOP_COUNTER

SOCIAL_DM

CUSTOMER_WEB

deliveryType values:

PICKUP

DELIVERY

Response:

Calculated totals

Availability check result

Price snapshot preview

POST /orders/place

Body:
{
  "draftId": "draftId",
  "paymentMode": "COD",
  "couponCode": "NEW10"
}

Current paymentMode recommendations (India-first):

COD

UPI

CARD

NET_BANKING

Result:

Creates order

Reserves inventory

Returns order number

Recommended response snapshot fields (for future global support):

currencySnapshot

timezoneSnapshot

taxSnapshot

--------------------------------------------------
4. ORDERS (ADMIN)
GET /orders

Query:

?status=PLACED

?orderSource=ADMIN_WEB

?customerId=...

?from=2026-04-01&to=2026-04-30

GET /orders/:id

PATCH /orders/:id/status

Body:
{
  "status": "CONFIRMED",
  "reason": "Stock validated"
}

Transition validation (current):

DRAFT -> PLACED

PLACED -> CONFIRMED/CANCELLED

CONFIRMED -> PACKED/CANCELLED

PACKED -> SHIPPED/CANCELLED

SHIPPED -> DELIVERED/RETURN_REQUESTED

DELIVERED -> RETURN_REQUESTED

RETURN_REQUESTED -> RETURNED/CANCELLED

RETURNED -> REFUNDED

PATCH /orders/:id/cancel

Body:
{
  "reason": "Customer requested cancellation"
}

Rules:

Only valid transition allowed.

Cancellation should release reservation if not shipped.

PATCH /orders/:id/items/:itemId/cancel

Body:
{
  "reason": "Item unavailable"
}

Use for partial cancellation and release reservation for that item only.

--------------------------------------------------
5. ORDER ITEMS (ADMIN)
PATCH /orders/:id/items/:itemId

Body:
{
  "quantity": 3
}

PATCH /orders/:id/items/:itemId/remove

Used only before final confirmation/packing based on policy.

--------------------------------------------------
6. PAYMENTS
POST /orders/:id/payments

Body:
{
  "method": "UPI",
  "amount": 250.0,
  "txnRef": "UPI123XYZ"
}

GET /orders/:id/payments

POST /payments/webhook

Gateway callback endpoint (idempotent required).

--------------------------------------------------
7. FULFILLMENT / SHIPMENT
POST /orders/:id/pack

POST /orders/:id/ship-partial

Body:
{
  "items": [
    { "itemId": "item1", "quantity": 1 }
  ]
}

Use for partial shipment flow.

POST /orders/:id/assign-rider

Body:
{
  "riderId": "riderUserId",
  "notes": "Handle before 6 PM"
}

PATCH /orders/:id/reassign-rider

Body:
{
  "riderId": "newRiderUserId",
  "reason": "Original rider unavailable"
}

POST /orders/:id/ship

Body:
{
  "carrier": "Delhivery",
  "trackingNo": "DL12345",
  "eta": "2026-04-10"
}

POST /orders/:id/deliver

POST /orders/:id/delivery-failed

Body:
{
  "reason": "Customer unavailable",
  "nextAttemptAt": "2026-04-10T10:30:00Z"
}

Use to track failed delivery and avoid duplicate stock deduction.

--------------------------------------------------
8. RETURNS / REFUNDS
POST /orders/:id/returns

Body:
{
  "items": [
    { "itemId": "item1", "quantity": 1, "reason": "Damaged" }
  ],
  "notes": "Package damaged"
}

PATCH /returns/:id/approve

PATCH /returns/:id/reject

POST /returns/:id/refund

Body:
{
  "amount": 120,
  "method": "BANK_TRANSFER"
}

--------------------------------------------------
9. INVENTORY RESERVATION HELPERS (ADMIN)
GET /orders/:id/reservations

GET /reservations?status=ACTIVE

Used for debugging and warehouse visibility.

--------------------------------------------------
10. CUSTOMER APP APIs (SEPARATE APP - FUTURE INTEGRATION)
GET /catalog/categories

GET /catalog/groups

GET /catalog/variants?groupId=...

POST /customer/cart

POST /customer/checkout

GET /customer/orders

GET /customer/orders/:id

Scope note:

These endpoints are defined now for backend compatibility, but customer app UI is out of scope for current module implementation.

NOTES
Use consistent response envelope:

{ success, data, message, meta }

Do not send filters in GET body.

Use snapshot fields in orders to protect historical data integrity.
