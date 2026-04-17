CUSTOMERS MODULE DB DESIGN

COLLECTIONS USED
- customers (existing)
- orders (existing)
- orderItems (existing)
- customerGroups (new, from customer-groups module)
- customerGroupMembers (new, from customer-groups module)

NO NEW CORE CUSTOMER TABLE REQUIRED
Phase 1 should compute metrics from existing collections.
Optional denormalized customer stats can be introduced later for performance.

DERIVED CUSTOMER METRICS (LOGICAL VIEW)
- customerId
- tenantId
- customerName
- phone
- primaryPincode
- totalOrders
- deliveredOrders
- cancelledOrders
- totalSpend
- averageOrderValue
- firstOrderAt
- lastOrderAt
- topItems[]
- topCategories[]

RECOMMENDED INDEXES (EXISTING/TO VERIFY)
orders
- { tenantId: 1, customerId: 1, createdAt: -1 }
- { tenantId: 1, status: 1, createdAt: -1 }

orderItems
- { tenantId: 1, orderId: 1 }
- { tenantId: 1, variantId: 1 }

customers
- { tenantId: 1, phone: 1 }
- { tenantId: 1, createdAt: -1 }

OPTIONAL FUTURE TABLE (PHASE 3+)
customerStatsSnapshot
- tenantId
- customerId
- totalOrders
- totalSpend
- averageOrderValue
- lastOrderAt
- topItems
- refreshedAt

PURPOSE
- Avoid heavy aggregation on high-volume tenants.
- Can be updated by scheduled job or event-driven pipeline.

TENANCY
Every query and any future snapshot write must include tenantId.
