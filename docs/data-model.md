# Data Models

## Category
- _id: string  
- name: string  
- description: string  
- status: ACTIVE | INACTIVE  
- createdAt: string  
- updatedAt: string  

---

## Field (Master)
- _id: string  
- name: string  
- key: string  
- type: NUMBER | PERCENTAGE  
- defaultValue: number  
- isRequired: boolean  
- status: ACTIVE | INACTIVE  
- createdAt: string  

---

## FieldGroup
- _id: string  
- name: string  
- fields: FieldGroupField[]  
- status: ACTIVE | INACTIVE  
- createdAt: string  

---

## FieldGroupField
- fieldId: string  
- order: number  

---

## Unit
- _id: string  
- name: string  
- symbol: string  
- baseUnit: string | null  
- conversionFactor: number  
- status: ACTIVE | INACTIVE  

---

## Group
- _id: string  
- name: string  
- categoryId: string  
- quantity: number  
- fieldGroupId: string  
- customFields: CustomField[]  
- formula: Formula  
- baseUnitId: string  
- allowedUnitIds: string[]  
- status: ACTIVE | INACTIVE  
- createdAt: string  

---

## CustomField
- fieldId: string  
- value: number  

---

## Formula
- sellingPrice: string  
- anchorPrice: string  

---

## Variant
- _id: string  
- groupId: string  
- name: string  
- quantity: number  
- unitId: string  
- convertedQuantity: number  
- price: Price  
- status: ACTIVE | INACTIVE  
- createdAt: string  

---

## Price
- sellingPrice: number  
- anchorPrice: number  

---

## GroupVersion (Optional)
- fieldGroupVersion: number  

---

## AuditLog (Optional)
- action: string  
- oldValue: object  
- newValue: object  
- timestamp: string  

---

# Summary

- Category → Top level  
- Group → Core product logic  
- FieldGroup → Reusable pricing config  
- Fields → Pricing inputs  
- Unit → Measurement handling  
- Variant → Final sellable product  