Order Management COLLECTION DESIGN (MongoDB)

Current rollout scope: India-only.

Default assumptions in schema design for now:

currency = INR

tax model = GST

timezone reference = Asia/Kolkata (store UTC timestamps, render/report in IST)

GLOBAL-READY NOTE:
Keep tenant-level setting fields available from day one:

countryCode

currency

timezone

taxMode

All transactional collections must include:

tenantId

createdAt

updatedAt

TAX MODULE DEPENDENCY
tax_profiles master schema is owned by docs/tax-management-module/db.md.

Order module stores tax snapshots resolved from tax module at transaction time.

--------------------------------------------------
1. customers
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "name": "Ravi Kumar",
  "phone": "9876543210",
  "email": "ravi@example.com",
  "status": "ACTIVE"
}

Indexes:

db.customers.createIndex({ tenantId: 1, phone: 1 }, { unique: true })

db.customers.createIndex({ tenantId: 1, name: 1 })

Note:

tenantId + phone unique index is required for mobile-based customer identification during admin order placement.

--------------------------------------------------
2. customer_addresses
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "customerId": ObjectId,
  "label": "Home",
  "line1": "12 Main Road",
  "line2": "Near Temple",
  "city": "Hyderabad",
  "state": "TS",
  "postalCode": "500001",
  "geo": { "lat": 17.385, "lng": 78.4867 },
  "isDefault": true
}

Index:

db.customer_addresses.createIndex({ tenantId: 1, customerId: 1 })

--------------------------------------------------
3. orders (CORE)
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderNo": "ORD-2026-000123",
  "orderSource": "SHOP_COUNTER",
  "countryCodeSnapshot": "IN",
  "currencySnapshot": "INR",
  "timezoneSnapshot": "Asia/Kolkata",
  "customerId": ObjectId,
  "addressSnapshot": {
    "name": "Ravi Kumar",
    "phone": "9876543210",
    "line1": "12 Main Road",
    "line2": "Near Temple",
    "city": "Hyderabad",
    "state": "TS",
    "postalCode": "500001"
  },
  "status": "PLACED",
  "deliveryType": "DELIVERY",
  "assignedRider": {
    "riderId": ObjectId,
    "name": "Suresh",
    "phone": "9000000000",
    "assignedAt": ISODate,
    "assignedBy": ObjectId
  },
  "paymentStatus": "PENDING",
  "currency": "INR",
  "pricing": {
    "subTotal": 220.00,
    "discount": 20.00,
    "tax": 12.00,
    "deliveryCharge": 10.00,
    "grandTotal": 222.00
  },
  "pricingSnapshot": {
    "subTotal": 220.00,
    "discount": 20.00,
    "tax": 12.00,
    "deliveryCharge": 10.00,
    "roundOff": 0.00,
    "grandTotal": 222.00
  },
  "taxSnapshot": {
    "model": "GST",
    "rateSummary": []
  },
  "notes": "Phone order",
  "createdBy": {
    "userId": ObjectId,
    "role": "sales_agent"
  }
}

Indexes:

db.orders.createIndex({ tenantId: 1, orderNo: 1 }, { unique: true })

db.orders.createIndex({ tenantId: 1, status: 1, createdAt: -1 })

db.orders.createIndex({ tenantId: 1, orderSource: 1, createdAt: -1 })

db.orders.createIndex({ tenantId: 1, "assignedRider.riderId": 1, status: 1 })

Validation notes:

deliveryType = PICKUP -> assignedRider should be null.

deliveryType = DELIVERY -> assignedRider required before SHIPPED.

--------------------------------------------------
4. order_items
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "variantId": ObjectId,
  "variantNameSnapshot": "1kg Sugar",
  "groupNameSnapshot": "Sugar",
  "categoryNameSnapshot": "Grocery",
  "quantity": 2,
  "unitSnapshot": "kg",
  "priceSnapshot": {
    "taxProfileId": ObjectId,
    "taxProfileName": "GST 5%",
    "sellingPrice": 100.00,
    "anchorPrice": 120.00,
    "discount": 5.00,
    "tax": 2.00
  },
  "lineTotal": 194.00,
  "status": "PLACED"
}

Indexes:

db.order_items.createIndex({ tenantId: 1, orderId: 1 })

db.order_items.createIndex({ tenantId: 1, variantId: 1 })

--------------------------------------------------
5. inventory_reservations
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "orderItemId": ObjectId,
  "groupId": ObjectId,
  "variantId": ObjectId,
  "reservedQtyInBase": 2,
  "status": "ACTIVE",
  "releasedAt": null,
  "releaseReason": null
}

Indexes:

db.inventory_reservations.createIndex({ tenantId: 1, orderId: 1 })

db.inventory_reservations.createIndex({ tenantId: 1, status: 1 })

--------------------------------------------------
6. payments
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "method": "UPI",
  "amount": 222.00,
  "status": "SUCCESS",
  "txnRef": "UPI123XYZ",
  "gateway": "razorpay",
  "gatewayPayload": {},
  "paidAt": ISODate
}

Indexes:

db.payments.createIndex({ tenantId: 1, orderId: 1 })

db.payments.createIndex({ tenantId: 1, txnRef: 1 })

--------------------------------------------------
7. shipments
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "status": "SHIPPED",
  "items": [
    {
      "orderItemId": ObjectId,
      "quantity": 1
    }
  ],
  "carrier": "Delhivery",
  "trackingNo": "DL12345",
  "shippedAt": ISODate,
  "deliveredAt": null
}

Index:

db.shipments.createIndex({ tenantId: 1, orderId: 1 })

--------------------------------------------------
8. returns
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "items": [
    {
      "orderItemId": ObjectId,
      "quantity": 1,
      "reason": "Damaged"
    }
  ],
  "status": "REQUESTED",
  "refundStatus": "PENDING",
  "approvedBy": null,
  "approvedAt": null,
  "notes": "Outer pack damaged"
}

Indexes:

db.returns.createIndex({ tenantId: 1, orderId: 1 })

db.returns.createIndex({ tenantId: 1, status: 1 })

--------------------------------------------------
9. order_status_history (AUDIT)
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "fromStatus": "PLACED",
  "toStatus": "CONFIRMED",
  "reason": "Stock validated",
  "changedBy": {
    "userId": ObjectId,
    "role": "sales_agent"
  },
  "changedAt": ISODate
}

Index:

db.order_status_history.createIndex({ tenantId: 1, orderId: 1, changedAt: -1 })

--------------------------------------------------
RELATION FLOW
Customer -> Address -> Order -> OrderItems

Order -> InventoryReservations

Order -> Payments

Order -> Shipment

Order -> Return -> Refund

Order -> StatusHistory

--------------------------------------------------
IMPORTANT DESIGN RULES
Store snapshots in order/order_items.

Never recompute old order totals from current variant data.

Always enforce tenant filter on every query.

Use transactions for:

place order (order + items + reservation)

cancel order (status + reservation release)

refund update (payment/return/order status sync)

partial shipment update (shipment items + reservation conversion)

partial cancel update (item cancel + reservation release)

FINAL ARCHITECTURE LINE
One tenant-safe transactional core that supports both admin-offline orders and customer-online orders with full traceability.
