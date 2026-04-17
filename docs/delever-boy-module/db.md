DELIVERY BOY MODULE DB DESIGN

All collections include:
- tenantId
- createdAt
- updatedAt

--------------------------------------------------
1. riders
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "name": "Raju",
  "phone": "9876543210",
  "whatsapp": "9876543210",
  "employeeCode": "R-001",
  "status": "ACTIVE",
  "vehicleType": "BIKE",
  "vehicleNumber": "TS09AB1234",
  "zoneTags": ["Miyapur"],
  "notes": "",
  "createdBy": ObjectId,
  "updatedBy": ObjectId,
  "createdAt": ISODate,
  "updatedAt": ISODate
}

Indexes:
- db.riders.createIndex({ tenantId: 1, phone: 1 }, { unique: true })
- db.riders.createIndex({ tenantId: 1, status: 1, name: 1 })
- db.riders.createIndex({ tenantId: 1, zoneTags: 1 })

--------------------------------------------------
2. ORDER EXTENSION (assignment snapshot)
{
  "assignedRider": {
    "riderId": ObjectId,
    "name": "Raju",
    "phone": "9876543210",
    "assignedAt": ISODate,
    "assignedBy": ObjectId
  }
}

--------------------------------------------------
3. delivery_events (recommended)
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "orderId": ObjectId,
  "type": "ASSIGNED_RIDER|REASSIGNED_RIDER|DELIVERY_STATUS_UPDATE",
  "actorId": ObjectId,
  "actorRole": "org_admin|sales_agent|delivery",
  "reason": "",
  "fromValue": {},
  "toValue": {},
  "createdAt": ISODate
}

Indexes:
- db.delivery_events.createIndex({ tenantId: 1, orderId: 1, createdAt: -1 })
- db.delivery_events.createIndex({ tenantId: 1, type: 1, createdAt: -1 })
