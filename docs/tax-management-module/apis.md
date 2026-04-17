Tax management module APIs

BASE
/api/v1

AUTH
Admin APIs require authenticated tenant user context.

1. TAX PROFILES
GET /tax-profiles

POST /tax-profiles
Body:
{
  "name": "GST 5%",
  "countryCode": "IN",
  "taxMode": "GST",
  "rate": 5,
  "inclusive": false,
  "hsnCode": "1701",
  "status": "ACTIVE",
  "effectiveFrom": "2026-04-01T00:00:00.000Z"
}

PUT /tax-profiles/:id

PATCH /tax-profiles/:id/status
Body:
{
  "status": "INACTIVE"
}

2. GROUP TAX MAPPING
PATCH /groups/:id/tax-profile
Body:
{
  "taxProfileId": "taxProfileId"
}

GET /groups/:id/tax-profile

3. TAX RESOLUTION (INTERNAL/ORDER)
POST /tax/resolve
Body:
{
  "groupId": "groupId",
  "variantId": "variantId",
  "countryCode": "IN",
  "amount": 100
}

Response:
{
  "taxProfileId": "taxProfileId",
  "taxProfileName": "GST 5%",
  "rate": 5,
  "taxAmount": 5,
  "inclusive": false
}
