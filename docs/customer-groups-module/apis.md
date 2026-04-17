CUSTOMER GROUPS MODULE APIS

BASE PATH
/api/customer-groups

1) LIST GROUPS
GET /api/customer-groups

QUERY PARAMS
- page
- limit
- search
- status
- sortBy (name|createdAt|memberCount)
- sortOrder (asc|desc)

RESPONSE ITEM
- groupId
- name
- description
- status
- memberCount
- createdAt
- updatedAt

2) CREATE GROUP
POST /api/customer-groups

BODY
- name (required)
- description (optional)
- code (optional)
- tags (optional)

3) UPDATE GROUP
PATCH /api/customer-groups/:groupId

BODY
- name (optional)
- description (optional)
- status (optional)
- tags (optional)

4) DELETE GROUP (SOFT DELETE PREFERRED)
DELETE /api/customer-groups/:groupId

Behavior:
- Mark status INACTIVE or archive.
- Keep membership history for audit.

5) LIST GROUP MEMBERS
GET /api/customer-groups/:groupId/members

QUERY PARAMS
- page
- limit
- search
- isActive (default true)

6) ADD MEMBERS (BULK)
POST /api/customer-groups/:groupId/members

BODY
- customerIds: string[] (required, non-empty)

RESPONSE
- addedCount
- skippedCount
- failed[]

7) REMOVE MEMBER
DELETE /api/customer-groups/:groupId/members/:customerId

8) BULK REMOVE MEMBERS
POST /api/customer-groups/:groupId/members/remove

BODY
- customerIds: string[]

ERROR CODES
- 400 validation error
- 404 group or customer not found
- 409 duplicate group name/code

SECURITY
- tenantId from request context/header.
- role-based guard for create/update/delete operations.
