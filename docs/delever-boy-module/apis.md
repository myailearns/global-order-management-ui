DELIVERY BOY MODULE APIS

BASE
/api/v1

AUTH
All APIs require authenticated tenant context.

COMMON QUERY STANDARD
?page=1&limit=20
?search=raju
?status=ACTIVE

--------------------------------------------------
1. RIDER MASTER
GET /riders
POST /riders
GET /riders/:id
PUT /riders/:id
PATCH /riders/:id/status

POST /riders body:
{
  "name": "Raju",
  "phone": "9876543210",
  "status": "ACTIVE",
  "employeeCode": "R-001",
  "vehicleType": "BIKE",
  "vehicleNumber": "TS09AB1234",
  "zoneTags": ["Miyapur"]
}

--------------------------------------------------
2. ORDER ASSIGNMENT APIs
POST /orders/:id/assign-rider
PATCH /orders/:id/reassign-rider

POST /orders/:id/assign-rider body:
{
  "riderId": "<riderId>",
  "notes": "Deliver before 7 PM"
}

PATCH /orders/:id/reassign-rider body:
{
  "riderId": "<newRiderId>",
  "reason": "Original rider unavailable"
}

--------------------------------------------------
3. RIDER ANALYTICS APIs
GET /analytics/delivery/riders

Supported query:
?from=YYYY-MM-DD&to=YYYY-MM-DD&riderId=

Response envelope:
{
  "success": true,
  "data": {
    "totalAssigned": 120,
    "activeOrders": 14,
    "deliveredCount": 88,
    "attemptedCount": 9,
    "returnedCount": 3,
    "successRate": 73.33
  }
}

--------------------------------------------------
4. FUTURE DELIVERY SELF APIs (RBAC PHASE)
GET /delivery/me/orders?status=ACTIVE
GET /delivery/me/orders?status=COMPLETED
PATCH /delivery/me/orders/:id/status
