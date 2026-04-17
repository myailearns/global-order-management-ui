COURIER MODULE APIS

BASE
/api/v1

AUTH
All APIs require authenticated tenant context.

COMMON QUERY STANDARD
?page=1&limit=20
?search=icarry
?status=ACTIVE

--------------------------------------------------
1. COURIER PARTNER MASTER
GET /courier-partners
POST /courier-partners
GET /courier-partners/:id
PUT /courier-partners/:id
PATCH /courier-partners/:id/status

POST /courier-partners body:
{
  "name": "iCarry",
  "status": "ACTIVE",
  "contactPerson": "Arun",
  "contactPhone": "9000000000",
  "serviceAreas": ["Hyderabad"]
}

--------------------------------------------------
2. ORDER COURIER ASSIGNMENT APIs
POST /orders/:id/assign-courier
PATCH /orders/:id/reassign-courier

POST /orders/:id/assign-courier body:
{
  "courierPartnerId": "<partnerId>",
  "trackingNumber": "TRK-001",
  "awbNumber": "AWB-001",
  "consignmentNote": "CN-001",
  "estimatedDeliveryDate": "2026-04-20"
}

PATCH /orders/:id/reassign-courier body:
{
  "courierPartnerId": "<newPartnerId>",
  "reason": "Serviceability issue"
}

--------------------------------------------------
3. COURIER ANALYTICS APIs
GET /analytics/delivery/couriers

Supported query:
?from=YYYY-MM-DD&to=YYYY-MM-DD&courierPartnerId=

Response envelope:
{
  "success": true,
  "data": {
    "totalDispatched": 240,
    "inTransitCount": 32,
    "deliveredCount": 180,
    "failedOrReturnedCount": 14,
    "successRate": 75,
    "averageTransitHours": 38.4
  }
}
