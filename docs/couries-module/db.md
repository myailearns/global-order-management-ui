COURIER MODULE DB DESIGN

All collections include:
- tenantId
- createdAt
- updatedAt

--------------------------------------------------
1. courier_partners
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "name": "iCarry",
  "status": "ACTIVE",
  "contactPerson": "Arun",
  "contactPhone": "9000000000",
  "supportPhone": "9000000001",
  "serviceAreas": ["Hyderabad"],
  "notes": "",
  "createdBy": ObjectId,
  "updatedBy": ObjectId,
  "createdAt": ISODate,
  "updatedAt": ISODate
}

Indexes:
- db.courier_partners.createIndex({ tenantId: 1, name: 1 }, { unique: true })
- db.courier_partners.createIndex({ tenantId: 1, status: 1 })

--------------------------------------------------
2. ORDER EXTENSION (courier snapshot)
{
  "courierDetails": {
    "courierPartnerId": ObjectId,
    "courierPartnerName": "iCarry",
    "trackingNumber": "TRK-001",
    "awbNumber": "AWB-001",
    "consignmentNote": "CN-001",
    "estimatedDeliveryDate": "2026-04-20",
    "dispatchedAt": ISODate
  }
}

Indexes on orders:
- db.orders.createIndex({ tenantId: 1, "courierDetails.courierPartnerId": 1, status: 1, createdAt: -1 })
- db.orders.createIndex({ tenantId: 1, "courierDetails.trackingNumber": 1 })

--------------------------------------------------
3. delivery_events (recommended)
Type values for courier flow:
- ASSIGNED_COURIER
- REASSIGNED_COURIER
- UPDATED_TRACKING
- DELIVERY_STATUS_UPDATE
