CUSTOMER GROUPS MODULE DB DESIGN

NEW COLLECTION: customerGroups
Fields:
- tenantId (string, required, index)
- name (string, required)
- code (string, optional, unique per tenant if provided)
- description (string, optional)
- status (ACTIVE|INACTIVE)
- tags (string[] optional)
- createdBy { userId, role }
- updatedBy { userId, role }
- createdAt
- updatedAt

Indexes:
- { tenantId: 1, name: 1 } unique
- { tenantId: 1, status: 1 }

NEW COLLECTION: customerGroupMembers
Fields:
- tenantId (string, required, index)
- groupId (ObjectId, ref customerGroups, required, index)
- customerId (ObjectId, ref customers, required, index)
- assignedBy { userId, role }
- assignedAt
- removedAt (nullable)
- isActive (boolean, default true)

Indexes:
- { tenantId: 1, groupId: 1, customerId: 1 } unique
- { tenantId: 1, customerId: 1, isActive: 1 }
- { tenantId: 1, groupId: 1, isActive: 1 }

OPTIONAL AUDIT COLLECTION (PHASE 2+)
customerGroupAudit
- tenantId
- groupId
- customerId
- action (ASSIGNED|REMOVED|BULK_ASSIGNED|BULK_REMOVED)
- actorId
- actorRole
- reason
- createdAt

TENANCY RULE
All reads/writes must always include tenantId.
