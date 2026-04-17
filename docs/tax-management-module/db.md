Tax management DB design

1. tax_profiles
{
  "_id": ObjectId,
  "tenantId": ObjectId,
  "name": "GST 5%",
  "countryCode": "IN",
  "taxMode": "GST",
  "rate": 5,
  "inclusive": false,
  "hsnCode": "1701",
  "status": "ACTIVE",
  "effectiveFrom": ISODate,
  "effectiveTo": null,
  "createdBy": ObjectId,
  "updatedBy": ObjectId,
  "createdAt": ISODate,
  "updatedAt": ISODate
}

Indexes:

db.tax_profiles.createIndex({ tenantId: 1, status: 1 })

db.tax_profiles.createIndex({ tenantId: 1, countryCode: 1, taxMode: 1 })

2. group tax mapping (in groups collection)
{
  "taxProfileId": ObjectId
}

3. order_items snapshot dependency
Order module stores snapshot from tax resolution:

priceSnapshot.taxProfileId

priceSnapshot.taxProfileName

priceSnapshot.taxRateSnapshot

priceSnapshot.taxSnapshot

4. audit (optional separate collection)
Tax profile update/override audit should include:

tenantId, actorId, action, oldValue, newValue, reason, timestamp
