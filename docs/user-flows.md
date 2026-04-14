# User Flows

This document describes the step-by-step flows for each major user journey in Dashly.

---

## Customer Flows

### Browse Restaurants

**Entry points:** Home page, "Restaurants" link

**Steps:**
1. Customer lands on `/restaurants`
2. System fetches all active restaurants
3. For each restaurant, system checks:
   - Opening hours for current time → open/closed badge
   - If customer location provided, delivery zone eligibility
4. Customer can search by name or filter by cuisine
5. Customer clicks a restaurant to view menu

**Key files:**
- `src/app/restaurants/page.tsx` - Restaurant list UI
- `src/app/api/restaurants/route.ts` - Restaurant list API
- `src/domain/restaurant/availability.ts` - Open/closed logic

**Business rules applied:**
- Only active restaurants shown (`isActive = true`)
- Closed restaurants still visible but marked as "Closed"
- Out-of-zone restaurants still visible but marked as "Out of delivery area"

---

### Add to Cart

**Entry points:** Restaurant menu page

**Steps:**
1. Customer views menu at `/restaurants/[id]`
2. Customer clicks "Add to Cart" on an available item
3. System checks if customer has existing cart from different restaurant
   - If yes: warn and clear old cart
   - If no: proceed
4. System creates/updates cart with item
5. Cart icon updates with item count

**Key files:**
- `src/app/restaurants/[id]/page.tsx` - Menu UI
- `src/app/api/cart/route.ts` - Cart API
- `src/services/CartService.ts` - Cart operations
- `src/domain/cart/validation.ts` - Cart rules

**Business rules applied:**
- Only available items can be added
- One restaurant per cart
- Quantity must be positive integer
- Special instructions captured per item

---

### Checkout

**Entry points:** Cart page, checkout button

**Steps:**
1. Customer views cart with all items and pricing
2. Customer optionally enters promo code
   - System validates code eligibility
   - If valid: discount applied to pricing preview
   - If invalid: error message shown
3. Customer selects delivery address
4. Customer optionally adds tip
5. Customer clicks "Place Order"
6. System validates entire cart:
   - Items still available?
   - Restaurant open?
   - Delivery address in zone?
   - Minimum order met?
7. If valid: order created, cart cleared
8. Customer redirected to order tracking

**Key files:**
- `src/app/api/cart/promo/route.ts` - Promo code API
- `src/app/api/orders/route.ts` - Order placement API
- `src/services/OrderService.ts` - Order creation
- `src/domain/cart/pricing.ts` - Price calculation
- `src/domain/promotion/eligibility.ts` - Promo validation

**Business rules applied:**
- All cart validation rules
- Promo code rules (min order, restaurant match, usage limits, first-order)
- Service fee: 5% of subtotal, min $0.50, max $10
- Prices locked at order time

---

### Order Tracking

**Entry points:** Order confirmation, order history

**Steps:**
1. Customer views order at `/orders/[id]`
2. System displays:
   - Current status with message
   - Status timeline with timestamps
   - Order items and pricing
   - Delivery address
   - Courier info (when assigned)
3. If active substitution offer:
   - Customer sees offer details
   - Customer can accept, reject, or request refund
4. If cancellable:
   - Cancel button shown with fee warning
5. Page auto-refreshes or uses polling for updates

**Key files:**
- `src/app/orders/[id]/page.tsx` - Order detail UI
- `src/app/api/orders/[id]/route.ts` - Order detail API
- `src/domain/order/lifecycle.ts` - Status rules

**Order status progression:**
```
PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → COURIER_ASSIGNED → PICKED_UP → DELIVERED
    ↓         ↓           ↓              ↓                  ↓
CANCELLED  CANCELLED  CANCELLED      CANCELLED          CANCELLED
```

**Current limitations (post-checkout modifications):**
- No item additions/removals after order placement
- No delivery address changes
- No tip adjustments after checkout
- No special instructions updates
- Corrections require cancellation (with potential fees) and reorder
- See `LIMITATION_ORDER_EDITING` in `src/domain/order/lifecycle.ts`

---

## Merchant Flows

### Receive and Fulfill Order

**Entry points:** Merchant dashboard, order notification

**Steps:**
1. Merchant views dashboard at `/merchant`
2. Merchant sees order count badge on restaurant
3. Merchant clicks "View Orders"
4. Merchant sees pending orders at top
5. For each order, merchant can:
   - **Confirm**: Accept the order (PENDING → CONFIRMED)
   - **Start Preparing**: Begin cooking (CONFIRMED → PREPARING)
   - **Mark Ready**: Food is ready (PREPARING → READY_FOR_PICKUP)
6. When marked ready, system attempts courier assignment

**Key files:**
- `src/app/merchant/page.tsx` - Dashboard UI
- `src/app/merchant/orders/page.tsx` - Order queue UI
- `src/app/api/merchant/orders/route.ts` - Order update API
- `src/services/MerchantService.ts` - Merchant operations

**Business rules applied:**
- Only valid status transitions allowed
- Merchant can only manage their own restaurants
- System auto-assigns courier when order ready

---

### Handle Item Unavailability

**Entry points:** Order detail view

**Steps:**
1. Merchant reviews incoming order items
2. Merchant discovers item is unavailable
3. Merchant clicks "Mark Unavailable" on item
4. Merchant optionally selects substitute item
5. Customer notified of substitution offer
6. Customer responds:
   - Accept: substitute used at original price
   - Reject: item removed, order total adjusted
   - Refund: item refunded

**Key files:**
- `src/app/api/merchant/orders/route.ts` - Item status API
- `src/services/MerchantService.ts` - Substitution handling
- `src/domain/substitution/handling.ts` - Substitution logic

**Business rules applied:**
- Substitutions only allowed before READY_FOR_PICKUP
- If substitute costs less, difference refunded
- If substitute costs more, customer not charged extra (v1)

**Current limitations:**
- Single substitute option only (no ranked alternatives)
- No customer preference settings ("always substitute similar," "always ask")
- Manual merchant selection required for each unavailable item
- No category-based auto-substitution logic
- See `LIMITATION_SUBSTITUTION_INTELLIGENCE` in `src/domain/substitution/handling.ts`

---

## Courier Flows

### Accept and Complete Delivery

**Entry points:** Courier dashboard

**Steps:**
1. Courier opens `/courier`
2. Courier sets status to "Available"
3. System shows orders ready for pickup in courier's area
4. Courier clicks "Accept Delivery" on an order
5. Courier navigates to restaurant (address shown)
6. Courier picks up order, clicks "Confirm Pickup"
   - Status: COURIER_ASSIGNED → PICKED_UP
7. Courier navigates to customer (address shown)
8. Courier delivers order, clicks "Mark Delivered"
   - Status: PICKED_UP → DELIVERED
9. Courier automatically returns to "Available" status

**Key files:**
- `src/app/courier/page.tsx` - Courier dashboard UI
- `src/app/api/courier/route.ts` - Status API
- `src/app/api/courier/delivery/route.ts` - Delivery actions API
- `src/services/CourierService.ts` - Courier operations

**Business rules applied:**
- Courier must be AVAILABLE to accept orders
- One active delivery at a time
- Cannot go offline while on delivery
- Closest available courier assigned first

**Current limitations (courier assignment):**
- Straight-line distance only (no traffic, no road routing)
- Single-order assignment (no multi-order batching)
- No courier preferences (max distance, vehicle type, order size)
- No performance weighting (reliability, speed)
- No automatic reassignment if courier declines
- See `LIMITATION_COURIER_BATCHING` in `src/domain/order/assignment.ts`

---

## Support Flows

### Request Refund

**Entry points:** Order detail page (after delivery)

**Steps:**
1. Customer views delivered order
2. Customer clicks "Request Refund"
3. Customer selects reason:
   - Wrong items
   - Missing items
   - Quality issue
   - Never delivered
   - Excessive delay
   - Other
4. Customer selects refund type:
   - Full refund
   - Partial refund (select items)
   - Delivery fee only
5. Customer optionally adds details
6. System validates eligibility:
   - Within 24 hours of delivery?
   - Not already fully refunded?
7. Refund request created with PENDING status

**Key files:**
- `src/app/api/refunds/route.ts` - Refund request API
- `src/services/RefundService.ts` - Refund operations
- `src/domain/refund/eligibility.ts` - Eligibility rules

**Business rules applied:**
- 24-hour refund window
- Cannot exceed order total minus existing refunds
- Certain reasons (NEVER_DELIVERED) don't require delivered status

---

### Process Refund (Admin)

**Entry points:** Admin dashboard

**Steps:**
1. Admin views `/admin`
2. Admin sees pending refund requests
3. For each request, admin reviews:
   - Customer info
   - Order details
   - Reason and details
   - Requested amount
4. Admin clicks "Approve" or "Deny"
5. If denying, admin must provide note
6. Customer notified of outcome

**Key files:**
- `src/app/admin/page.tsx` - Admin dashboard UI
- `src/app/api/admin/refunds/route.ts` - Refund processing API
- `src/services/RefundService.ts` - Refund operations

**Business rules applied:**
- Only admins can process refunds
- Denial requires explanation
- Multiple partial refunds possible until total reached
