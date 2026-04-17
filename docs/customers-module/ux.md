CUSTOMERS MODULE UX

NAVIGATION
Main menu item: Customers

PAGE 1: CUSTOMER LIST
Sections:
- Header: title + quick filters.
- KPI strip (optional): total customers, active in 30 days, repeat rate.
- Table/grid:
  - Name
  - Phone
  - Pincode
  - Orders
  - Total Spend
  - AOV
  - Last Order
  - Groups (phase 2)
  - Actions: View Details

FILTERS
- Search (name/phone)
- Pincode
- Last order date range
- Order count range
- Group (phase 2)

PAGE 2: CUSTOMER DETAIL
Sections:
- Profile card (name, phone, location/pincode).
- Metrics card (orders, spend, AOV, recency).
- Top products and top categories.
- Order history table with quick open order details.

STATE HANDLING
- Empty state: "No customers with orders yet".
- No match state for filters.
- Loading skeleton for list and detail.
- Error toast and retry action.

ACTION READINESS (FUTURE)
- "Open in campaign audience" action placeholder.
- "Assign to group" action appears when groups module enabled.

MOBILE UX
- Use card layout for customer list rows.
- Keep key metrics visible without horizontal scroll.
