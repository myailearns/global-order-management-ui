DELIVERY BOY MODULE UX

UX PRINCIPLE
Keep rider operations fast inside the same admin application.

NAVIGATION (SAME APP)
- Deliveries
- Riders
- Delivery Analytics

--------------------------------------------------
1. RIDERS LIST SCREEN
Columns:
- Name
- Phone
- Employee Code
- Vehicle
- Zones
- Status
- Active Orders
- Delivered (range)
- Attempted (range)

Actions:
- Add Rider
- Edit Rider
- Activate or Deactivate
- View Performance

--------------------------------------------------
2. ASSIGN RIDER UX (IN ORDERS)
- Replace free-text rider name and phone with rider selector.
- Show rider status chip and active load hint.
- Reassignment requires reason.

--------------------------------------------------
3. RIDER ANALYTICS UX
Cards:
- Assigned today
- Active now
- Delivered today
- Attempted today

Filters:
- Date range
- Rider
- Status

--------------------------------------------------
4. EMPTY STATE
- No riders configured.
- CTA: Add first rider.

--------------------------------------------------
5. FUTURE RBAC UX
Delivery role can see only delivery pages and assigned order views.
