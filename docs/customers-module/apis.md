CUSTOMERS MODULE APIS

BASE PATH
/api/customers-insights

1) LIST CUSTOMERS WITH METRICS
GET /api/customers-insights

QUERY PARAMS
- page
- limit
- search (name/phone)
- sortBy (lastOrderAt|totalOrders|totalSpend|averageOrderValue)
- sortOrder (asc|desc)
- pincode
- minOrders
- maxOrders
- lastOrderFrom
- lastOrderTo
- groupId (optional integration with customer-groups)

RESPONSE ITEM
- customerId
- name
- phone
- primaryPincode
- totalOrders
- deliveredOrders
- cancelledOrders
- totalSpend
- averageOrderValue
- lastOrderAt
- groupIds[] (optional in phase 2)

2) CUSTOMER SUMMARY
GET /api/customers-insights/:customerId/summary

RESPONSE
- customer profile basics
- aggregate metrics
- recentOrders[]
- topItems[]
- topCategories[]

3) CUSTOMER ORDER HISTORY
GET /api/customers-insights/:customerId/orders

QUERY PARAMS
- page
- limit
- status
- fromDate
- toDate

RESPONSE
- paginated orders with orderNo, status, grandTotal, createdAt, orderType, orderSource

4) CUSTOMER TOP ITEMS
GET /api/customers-insights/:customerId/top-items

QUERY PARAMS
- limit (default 10)
- fromDate
- toDate

RESPONSE
- itemName
- quantity
- amount
- orderCount

ERROR CODES
- 400 invalid query filters
- 404 customer not found in tenant
- 500 server error

SECURITY
- tenantId required from request context/header.
- role-based access aligned with admin/sales privileges.
