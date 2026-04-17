# Order Management Flow (Customer Presentation)

## What This Module Solves
This module helps a business handle orders from multiple channels in one system:

- Shop counter orders
- Social channel orders (WhatsApp/Instagram)
- Admin web-assisted orders
- Future customer app orders (API-ready, UI out of current scope)

Current rollout is India-first (INR, GST, IST).

## Channels And Entry Flow
```mermaid
flowchart LR
    A[Shop Counter] --> E[Admin Creates Order]
    B[WhatsApp/Instagram] --> E
    C[Admin Web Assisted] --> E
    D[Customer App - Future] --> F[Customer APIs]
    F --> E

    E --> G[Customer Identification by Mobile]
    G -->|Mobile Exists| H[Select Existing Customer]
    G -->|Mobile Not Found| I[Create Customer Inline]

    H --> J[Add Items]
    I --> J
    J --> K[Price + TaxProfile Tax + Delivery Calculation]
    K --> L[Place Order]
```

## Master End-To-End Flow (Simple)
```mermaid
flowchart TD
    A[Order Source\nShop Counter / Social / Admin] --> B[Create Order Draft]
    B --> C[Customer by Mobile]
    C -->|Found| D[Select Existing Customer]
    C -->|Not Found| E[Create Customer]

    D --> F[Add Items + Qty]
    E --> F

    F --> G[Pricing Snapshot\nSubtotal + Discount + GST(TaxProfile) + Delivery]
    G --> H[Place Order]

    H --> I[Reserve Inventory]
    I --> J[CONFIRMED]
    J --> K[PACKED]

    K --> L{Delivery Type}
    L -->|PICKUP| M[Ready for Pickup]
    L -->|DELIVERY| N[Assign Rider]

    N --> O[SHIPPED]
    O --> P[DELIVERED]

    J --> Q[CANCELLED]
    K --> Q

    P --> R{Return Requested?}
    R -->|No| S[Order Completed]
    R -->|Yes| T[RETURN_REQUESTED]
    T --> U[RETURNED]
    U --> V[REFUNDED]
```

## End-To-End Order Lifecycle
```mermaid
flowchart TD
    O1[DRAFT] --> O2[PLACED]
    O2 --> O3[CONFIRMED]
    O2 --> O8[CANCELLED]

    O3 --> O4[PACKED]
    O3 --> O8

    O4 --> O5[SHIPPED]
    O4 --> O8

    O5 --> O6[DELIVERED]
    O5 --> O9[RETURN_REQUESTED]

    O6 --> O9
    O9 --> O10[RETURNED]
    O9 --> O8
    O10 --> O11[REFUNDED]
```

## Inventory, Delivery, And Payment Integration
```mermaid
flowchart LR
    P1[Place Order] --> P2[Reserve Inventory]
    P2 --> P3[Confirm + Pack]

    P3 --> P4{Delivery Type}
    P4 -->|PICKUP| P7[Ready for Pickup]
    P4 -->|DELIVERY| P5[Assign Rider]

    P5 --> P6[Ship Order]
    P6 --> P8[Deliver]

    P8 --> P9[Payment Finalization]
    P9 --> P10[Order Closed]

    C1[Cancel Before Ship] --> C2[Release Reservation]
    R1[Return Approved] --> R2[Add Stock Back]
    R1 --> R3[Refund]
```

## Operational Swimlane Flow (Team View)
```mermaid
flowchart LR
        subgraph Sales Team
            S1[Capture Order\nCounter / Social / Admin]
            S2[Customer Lookup\nby Mobile]
            S3[Place Order]
        end

        subgraph Warehouse Team
            W1[Inventory Reserve]
            W2[Confirm + Pack]
        end

        subgraph Delivery Team
            D1[Assign Rider]
            D2[Ship]
            D3[Deliver]
            D4[Delivery Failed / Reattempt]
        end

        subgraph Finance Team
            F1[Payment Capture]
            F2[Refund Processing]
        end

        subgraph Support Team
            C1[Return Request]
            C2[Approve / Reject Return]
        end

        S1 --> S2 --> S3 --> W1 --> W2 --> D1 --> D2 --> D3
        D4 --> D2
        D3 --> F1
        D3 --> C1 --> C2 --> F2
```

## Admin Screen Flow (How Team Uses It)
1. Open Order Management.
2. Create order from source: Shop Counter, Social DM, or Admin Assisted.
3. Enter mobile number:
- If customer exists, select profile.
- If not, create customer quickly.
4. Add variants and quantities.
5. Review pricing snapshot (subtotal, discount, tax, delivery charge, grand total).
6. Place order.
7. Move order through status: Confirm -> Pack -> Ship -> Deliver.
8. If delivery order, assign rider before shipping.
9. Handle cancellations/returns/refunds when needed.

## Key Business Controls
- Tenant-safe data isolation for SaaS.
- Price snapshots prevent historical order drift.
- Centralized Tax Profile mapping ensures consistent GST calculation.
- Inventory reservation prevents over-selling.
- Audit trail for status/payment/refund/rider actions.
- Source tracking (counter/social/admin/customer) for analytics.

## Scope Note
- This module delivers admin-side order operations now.
- Customer app UI is a separate future project.
- APIs are designed so customer app can plug in later without redesign.
