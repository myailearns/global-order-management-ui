 OVERVIEW
The Product Creation Module allows businesses to:

Organize products

Define custom pricing logic

Configure units

Automatically generate sellable products (variants)

This module is flexible and works for multiple business types like grocery, food, services, and tailoring.

👥 USERS
Shop Owner

Store Manager

Order Staff

🎯 OBJECTIVE
Define pricing once and generate multiple products automatically with accurate pricing.

🧩 STRUCTURE
Category → Group → Variant

🟢 CATEGORY
Used to organize products

Example: Grocery, Food, Beauty

No pricing logic

🔵 GROUP (CORE ENGINE)
Group represents the main product (e.g., Sugar, Idly).

Basic Fields:
Name

Available Quantity

Dynamic Fields:
User can add custom fields like:

Buy Price

Transport Cost

Labour Cost

Profit

Damage Cost

Each field has:

Label

Type (Number or Percentage)

♻️ Reusable Field Configuration (Enhanced Architecture)
Instead of selecting individual fields every time, introduce Field Groups (Field Sets).

🧩 FIELD GROUP (NEW CONCEPT)
A Field Group is a predefined set of fields that can be reused across multiple groups.

Example Field Groups:

Basic Costing → Buy Price + Profit

Advanced Costing → Buy Price + Transport + Labour + Wastage + Profit

Restaurant Pricing → Raw Material + Preparation Cost + Margin

🏗️ STRUCTURE
Field (Atomic unit)

Field Group (Collection of fields)

Group (uses Field Group)

📌 FIELD GROUP MANAGEMENT TAB
User can:

Create Field Group

Add/remove fields inside group

Reorder fields

Edit field values (optional defaults)

📌 GROUP SCREEN (UPDATED UX)
Instead of selecting fields one by one:

Select Field Group

System auto-loads all fields

User can:

Override values

Add extra fields (optional)

💡 FLEXIBILITY (IMPORTANT)
👉 Allow combination approach:

Select Field Group

 

Add extra fields if needed

Benefits:
👉 Faster setup (no repetitive selection)
👉 Standardization across products
👉 Reduces user errors
👉 Easy scaling for large catalogs
👉 Supports template-like behavior

⚠️ SYSTEM RULES
Field Group cannot be deleted if used (or soft delete)

Changes in Field Group can:

Reflect to linked groups OR

Stay versioned (recommended for safety)

🧠 FINAL DECISION (UPDATED)
👉 BEST APPROACH:

✔ Field → Master Entity
✔ Field Group → Reusable Set
✔ Group → Uses Field Group

This is enterprise-grade design and highly scalable.

🔥 PRICING FORMULA
User defines how price is calculated.

Example: Final Price = Buy Price + Transport Cost + Profit

Anchor price = Final Price + 25 % of Final Price

System stores and evaluates this formula safely.

🔷 UNIT CONFIGURATION
Purpose:
Allow users to define units based on their specific product or business needs (fully configurable).

♻️ Unit as Separate Entity (Recommended)
Units should be managed as a separate master entity (like Category, Group):

Unit Entity:

Unit Name (kg, gram, piece, plate, box)

Base Unit Mapping (optional)

Conversion Value (e.g., 1 kg = 1000 g)

Features:
User can create custom units (no restriction to predefined units)

Examples: kg, gram, box, packet, plate, piece, liter, bundle

Select a Base Unit (mandatory)

This is the reference unit for all calculations

Example: kg / piece / liter

Add Multiple Allowed Units (from Unit Master)

Users select from already created units

Example (Grocery): kg, g

Example (Food): plate, half-plate

Example (Wholesale): bag, ton

Define Unit Conversion

Example: 1 kg = 1000 g

Example: 1 plate = 2 half-plate

Behavior:
All pricing calculations are based on the base unit

When a variant is created, system converts the selected unit into base unit

Only configured units are available for selection in variants

Key Flexibility:
👉 Units are reusable across multiple groups
👉 No duplication of unit definitions
👉 Supports both standard and custom unit systems
👉 Enables consistent calculations across products

🟡 VARIANT (SELLABLE PRODUCT)
Variant is what customer buys.

Examples:

1kg sugar

500g sugar

User inputs:

Quantity

Unit

System:

Converts to base unit

Applies formula

Calculates price

📊 VARIANT MANAGEMENT
Add multiple variants

Edit / delete

View in table

🔁 FLOW
Create Category

Create Field (if not exists)

Create Field Group (set of fields)

Create Group

Select Field Group

Override values if needed

Define Pricing Formula

Configure Units

Save Group

Create Variants

Review & Save

⚙️ SYSTEM LOGIC
Read fields

Apply formula

Convert unit

Calculate final price

⚠️ VALIDATIONS
Group:

Must have fields

Valid formula

Variant:

Quantity > 0

Valid unit

🔐 TECH NOTES
No eval() usage

Use safe parser

Store final price in variant

🎯 BENEFITS
Flexible pricing

Works for any business

Easy to use

Reduces manual errors

🏁 SUMMARY
Category → Group → Variant

Core strength: Custom fields + formula-based pricing.

💬 ONE LINE
This module allows businesses to define pricing logic and automatically generate products with accurate pricing.