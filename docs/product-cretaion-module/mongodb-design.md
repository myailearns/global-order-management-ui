Products Module COLLECTION DESIGN (MongoDB)



By Venkatesh Bendi

1 min

See views

Add a reaction
COLLECTION DESIGN (MongoDB)
🟢 1. categories


{
  "_id": ObjectId,
  "name": "Grocery",
  "description": "All grocery items",
  "status": "ACTIVE",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
2. fields (MASTER)
👉 Atomic pricing elements



{
  "_id": ObjectId,
  "name": "Buy Price",
  "key": "buy_price",
  "type": "NUMBER", 
  "defaultValue": 0,
  "isRequired": true,
  "status": "ACTIVE",
  "createdAt": ISODate
}
Notes:
key → used in formula 

type → NUMBER / PERCENTAGE

3. field_groups
👉 Reusable set of fields



{
  "_id": ObjectId,
  "name": "Advanced Costing",
  "fields": [
    {
      "fieldId": ObjectId,
      "order": 1
    },
    {
      "fieldId": ObjectId,
      "order": 2
    }
  ],
  "status": "ACTIVE",
  "createdAt": ISODate
}
4. units (MASTER)


{
  "_id": ObjectId,
  "name": "Kilogram",
  "symbol": "kg",
  "baseUnit": null, 
  "conversionFactor": 1,
  "status": "ACTIVE"
}
Example (Gram):


{
  "name": "Gram",
  "symbol": "g",
  "baseUnit": ObjectId("kg_id"),
  "conversionFactor": 1000
}
5. groups (CORE ENGINE)


{
  "_id": ObjectId,
  "name": "Sugar",
  "categoryId": ObjectId,
  "quantity": 100, 
  "fieldGroupId": ObjectId,
  "customFields": [
    {
      "fieldId": ObjectId,
      "value": 50
    }
  ],
  "formula": {
    "sellingPrice": "buy_price + transport_cost + profit",
    "anchorPrice": "sellingPrice + (sellingPrice * 0.25)"
  },
  "baseUnitId": ObjectId,
  "allowedUnitIds": [ObjectId, ObjectId],
  "status": "ACTIVE",
  "createdAt": ISODate
}
Important Design Decisions
1. fieldGroupId
Links reusable config

2. customFields
Stores actual values per group

3. formula
Stored as string (safe parser required)

 

6. variants (SELLABLE PRODUCTS)


{
  "_id": ObjectId,
  "groupId": ObjectId,
  "name": "500g Sugar",
  "quantity": 500,
  "unitId": ObjectId,
  "convertedQuantity": 0.5, 
  "price": {
    "sellingPrice": 30,
    "anchorPrice": 38
  },
  "status": "ACTIVE",
  "createdAt": ISODate
}
🔁 RELATION FLOW


Category
   ↓
Group
   ↓ (uses)
FieldGroup → Fields
   ↓
Units
   ↓
Variants
⚙️ CALCULATION FLOW (BACKEND)
When Variant Created:
 Fetch Group 

 Fetch FieldGroup + Fields 

 Merge with customFields values 

 Evaluate: 

 sellingPrice formula 

 anchorPrice formula 

 Convert quantity to base unit 

 Store final values in variant 

⚠️ IMPORTANT BEST PRACTICES
❌ Don’t do this:
 Don’t calculate price on every API call 

 Don’t store raw formulas without validation 

✅ Do this:
 Pre-calculate and store price in variant 

 Use safe parser (like expression evaluator) 

 Add indexes: 



db.groups.createIndex({ categoryId: 1 })
db.variants.createIndex({ groupId: 1 })
🚀 OPTIONAL (ADVANCED)
Versioning (VERY IMPORTANT)
If FieldGroup changes:



"fieldGroupVersion": 2
👉 Prevents breaking old products

Audit Logs
Track:



{
  "action": "UPDATE_FIELD_GROUP",
  "oldValue": {},
  "newValue": {},
  "timestamp": ISODate
}
🏁 FINAL SUMMARY
Your System Now Supports:
✅ Dynamic pricing
 ✅ Reusable field groups
 ✅ Multi-unit handling
 ✅ Formula-based calculations
 ✅ Scalable MongoDB design

💬 FINAL ARCHITECTURE LINE
👉 “A configurable pricing engine built on reusable field groups, dynamic formulas, and unit-based computation.”