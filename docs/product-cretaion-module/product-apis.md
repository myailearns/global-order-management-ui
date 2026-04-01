Product creation module apis



By Venkatesh Bendi

1 min

See views

Add a reaction
1. FIELDS
GET /fields
👉 Query Params:



?search=price
&status=ACTIVE
&page=1
&limit=10
POST /fields
👉 Body:



{
  "name": "Buy Price",
  "key": "buy_price",
  "type": "NUMBER",
  "defaultValue": 0
}
PUT /fields/:id
👉 Body:



{
  "name": "Updated Name",
  "defaultValue": 10
}
🧩 2. FIELD GROUPS
GET /field-groups
👉 Query Params:



?search=cost
&status=ACTIVE
POST /field-groups
👉 Body:



{
  "name": "Advanced Costing",
  "fields": [
    { "fieldId": "id1", "order": 1 },
    { "fieldId": "id2", "order": 2 }
  ]
}
PUT /field-groups/:id
👉 Body:



{
  "name": "Updated Group",
  "fields": [...]
}
🔷 3. UNITS
GET /units
👉 Query Params:



?search=kg
POST /units
👉 Body:



{
  "name": "Kilogram",
  "symbol": "kg",
  "baseUnitId": null,
  "conversionFactor": 1
}
🟢 4. CATEGORIES
GET /categories
👉 Query Params:



?search=grocery
POST /categories
👉 Body:



{
  "name": "Grocery"
}
🔵 5. GROUPS (MOST IMPORTANT)
GET /groups
👉 Query Params:



?categoryId=123
&search=sugar
&page=1
&limit=10
POST /groups
👉 Body:



{
  "name": "Sugar",
  "categoryId": "catId",
  "quantity": 100,
  "fieldGroupId": "fgId",
  "customFields": [
    { "fieldId": "f1", "value": 50 },
    { "fieldId": "f2", "value": 10 }
  ],
  "formula": {
    "sellingPrice": "buy_price + transport_cost + profit",
    "anchorPrice": "sellingPrice + (sellingPrice * 0.25)"
  },
  "baseUnitId": "kgId",
  "allowedUnitIds": ["kgId", "gId"]
}
PUT /groups/:id
👉 Body:

Same as POST (partial allowed)

🟡 6. VARIANTS
GET /variants
👉 Query Params:



?groupId=123
&page=1
&limit=20
POST /variants
👉 Body:



{
  "groupId": "groupId",
  "variants": [
    {
      "quantity": 1,
      "unitId": "kgId"
    },
    {
      "quantity": 500,
      "unitId": "gId"
    }
  ]
}
PUT /variants/:id
👉 Body:



{
  "quantity": 2,
  "unitId": "kgId"
}
⚙️ HELPER APIs
POST /formulas/validate
👉 Body:



{
  "formula": "buy_price + profit"
}
POST /groups/preview-price
👉 Body:



{
  "groupId": "id",
  "quantity": 500,
  "unitId": "gId"
}
🚫 WHAT NOT TO DO
❌ Don’t pass complex data in query params
 ❌ Don’t send filters in body for GET
 ❌ Don’t mix both randomly

🔥 BEST PRACTICE ADD-ONS
Pagination Standard


?page=1&limit=10
Sorting


?sortBy=createdAt&order=desc
Search


?search=sugar