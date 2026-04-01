UX PRINCIPLE (VERY IMPORTANT)

👉 Don’t show everything at once
👉 Guide user step-by-step
👉 Reuse configs (Field Group, Units)
👉 Allow quick actions (no friction)

🧭 FINAL UX STRUCTURE

Master Setup → Product Setup → Variant Creation

🧩 1. MASTER SETUP (SEPARATE TAB)

👉 This is where user configures reusable things

📌 Sidebar Menu

 Categories 

 Fields 

 Field Groups 

 Units 

🔹 Fields Screen

UI:

 Table view 

 Button: ➕ Add Field 

Add Field Modal:

 Field Name 

 Type (Number / %) 

 Default Value 

🔹 Field Groups Screen

UI:

 List of groups 

 Button: ➕ Create Field Group 

Create Flow:

 Enter name 

 Select fields (multi-select) 

 Reorder (drag-drop) 

 Save 

🔹 Units Screen

UI:

 List of units 

 Button: ➕ Add Unit 

Add Unit:

 Name (kg, plate, piece) 

 Base Unit (optional) 

 Conversion value 

🔹 Categories Screen

Simple:

 Name 

 List view 

🔵 2. GROUP CREATION (CORE UX)

👉 This is the MOST IMPORTANT SCREEN

🧾 Step-Based UX (Recommended)

✅ STEP 1: Basic Info

 Group Name 

 Category (dropdown) 

 Quantity 

👉 CTA: Next

✅ STEP 2: Select Field Group

 Dropdown: Field Group 

 Preview selected fields 

👉 Optional:

 ➕ Add Extra Field 

👉 CTA: Next

✅ STEP 3: Enter Field Values

Dynamic form renders:

Example:

 Buy Price → input 

 Transport Cost → input 

 Profit → input 

👉 Clean grid layout (2 columns)

👉 CTA: Next

✅ STEP 4: Pricing Formula Builder

🔥 UX (IMPORTANT)

Section 1: Selling Price

 Label: Selling Price 

 Formula builder: 

 Buttons: 

 Fields (Buy Price, Profit…) 

 Operators (+ - * /) 

 Input preview 

Section 2: Anchor Price

 Label: Anchor Price 

 Same builder 

👉 Show live preview:

Selling Price = ₹120
Anchor Price = ₹150

👉 CTA: Next

✅ STEP 5: Units Setup

 Select Base Unit 

 Select Allowed Units 

👉 Show conversions if exist

👉 CTA: Save Group

🟡 3. VARIANT CREATION UX

📌 After Group Save → Redirect here

🧾 Layout

Top:

 Group Name 

 Base Unit info 

📊 Variant Table (BEST UX)

Qty

Unit

Price

Anchor Price

Action

➕ Add Variants

Option 1: Inline Row Add

User enters:

 Quantity 

 Unit 

👉 Price auto-calculates instantly

Option 2: Bulk Add (Better)

 Add multiple rows 

 Click “Calculate All” 

🔥 UX MAGIC (IMPORTANT)

👉 When user enters:

 Quantity = 500 

 Unit = g 

System instantly shows:

 Converted = 0.5 kg 

 Price = ₹XX 

CTA:

 Save All Variants 

⚡ QUICK FLOW (USER JOURNEY)

1. Setup Masters (Fields, Field Groups, Units)
2. Create Group (step-by-step)
3. Define formula
4. Save
5. Add variants (table)
6. Done

💡 UX ENHANCEMENTS (HIGH VALUE)

✅ 1. Templates (Future)

 Grocery Template 

 Restaurant Template 

✅ 2. Live Price Preview

Show calculation instantly

✅ 3. Error Prevention

 Highlight invalid formula 

 Disable invalid units 

✅ 4. Smart Defaults

 Auto-fill field values 

 Suggest formulas 

✅ 5. Empty States

Example:
 👉 “No Field Groups found → Create one”

⚠️ UX MISTAKES TO AVOID

❌ Don’t show fields + formula + units in one screen
 ❌ Don’t force user to scroll too much
 ❌ Don’t allow invalid formula save
 ❌ Don’t make unit conversion confusing

🏁 FINAL UX DECISION

👉 Best UX for your system is:

✅ Step-based Group creation
 ✅ Table-based Variant creation
 ✅ Separate Master Config screens

💬 FINAL ONE LINE

“Guide user step-by-step for setup, then give fast table-based experience for execution.”

…………………………………………..



🌿 STHALA Module UX Design (Final)

🧠 UX PRINCIPLE

Mobile-first design

Step-by-step user guidance

Reusable configurations (Fields, Field Groups, Units)

Fast execution (Variants)

🧭 OVERALL FLOW

Master Setup

Group Creation (Step-based)

Variant Creation (Fast entry)

🧩 1. MASTER SETUP

Sections

Categories

Fields

Field Groups

Units

UX Pattern

Table/List view

"Add" button opens modal

Fields

Name

Type (Number / %)

Default Value

Field Groups

Name

Select multiple fields

Drag & reorder

Units

Name (kg, g, piece)

Base Unit

Conversion Factor

Categories

Simple name-based list

🔵 2. GROUP CREATION (STEP BASED)

Step 1: Basic Info

Group Name

Category

Quantity

Step 2: Field Group Selection

Select Field Group

Preview fields

Optional: Add extra field

Step 3: Field Values

Dynamic form rendering

Clean 2-column layout (desktop)

Single column (mobile)

Step 4: Pricing Formula

Selling Price

Formula builder (fields + operators)

Anchor Price

Formula builder

Live Preview

Real-time price calculation

Step 5: Units

Base Unit

Allowed Units

CTA

Save Group

🟡 3. VARIANT CREATION

Desktop UX

Table View

Columns:

Quantity

Unit

Price

Anchor Price

Actions

Mobile UX (IMPORTANT)

❌ Avoid full table

✅ Use Card View

Each Variant:

Quantity + Unit

Price

Anchor Price

Actions (Edit/Delete)

Inline Editing (Mobile)

Editable quantity

Unit dropdown

Auto price calculation

Smart UX

Show summary first

Expand for details

⚡ RESPONSIVE STRATEGY

Mobile (<768px): Card layout

Tablet/Desktop: Table layout

🎨 DESIGN SYSTEM

Colors

Primary: #2E7D32

Background: #F9FAFB

Text: #111827

Typography

Font: Inter

Sizes:

Heading: 18px

Body: 14px

Spacing

4, 8, 12, 16, 20, 24 px

🧱 COMPONENT RULES

Buttons

Height: 40px

Radius: 8px

Inputs

Height: 40px

Focus: Green border

Cards

Padding: 16px

Radius: 12px

🧭 NAVIGATION

Mobile

Bottom navigation

Desktop

Sidebar navigation

✨ UX ENHANCEMENTS

Live price preview

Inline validation

Empty states

Toast messages

Skeleton loaders

⚠️ AVOID

Full tables on mobile

Too many fields in one screen

Invalid formula save

Horizontal scrolling

🏁 FINAL SUMMARY

Master setup is separate

Group creation is step-based

Variants are fast-entry (table + card hybrid)

Mobile uses card UX, desktop uses table UX

💬 FINAL LINE---

"Guide users step-by-step for setup, then give fast and simple tools for execution."

important : you shoudl our design stames whic are in shared 