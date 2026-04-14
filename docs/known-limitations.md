# Known Limitations

This document lists features and capabilities that are not implemented in v1 of Dashly. Each limitation represents a potential enhancement opportunity.

> **For AI Product Assistants**: This document is structured for spec generation and roadmap planning. The three **Strategic Enhancement Areas** below are the highest-value product opportunities—use them as the foundation for feature specs, PRDs, or enhancement proposals. Each includes current behavior, user impact, and concrete opportunities.

> **For Developers**: Each limitation has a corresponding `LIMITATION_*` marker in the source code. Search for the marker name to find the exact location where changes would be needed.

---

## Strategic Enhancement Areas

The following three areas represent significant product opportunities where the current implementation is intentionally simplified. These are high-value enhancements that would meaningfully improve the customer and operational experience.

**Why these three?** Each represents a core friction point in the food delivery experience:
1. **Substitutions** — what happens when items aren't available (frequent, frustrating)
2. **Order modifications** — what happens when customers need to make changes (common, currently blocked)
3. **Delivery quality** — how couriers are assigned and ETAs calculated (directly impacts satisfaction)

### 1. Substitution and Unavailable-Item Handling

**Current state:** Basic rule-based flow. Merchant marks item unavailable, optionally offers one substitute, customer accepts/rejects/requests refund. No intelligent matching, no customer preferences, no partial substitutions.

**Behavior walkthrough:**
1. Merchant sees item is out of stock during order prep
2. Merchant clicks "Mark Unavailable" on the order item
3. Merchant optionally selects ONE substitute from the menu
4. System sets `substitutionStatus: SUBSTITUTE_OFFERED` on the order item
5. Customer sees offer on order detail page (no push notification)
6. Customer clicks Accept, Reject, or Refund
7. Price adjustment: cheaper substitute → refund difference; more expensive → merchant absorbs loss

**Why this matters:**
- Unavailable items are a leading cause of order friction and customer churn
- Current flow requires manual merchant intervention for each item
- Customers cannot express preferences ahead of time (e.g., "substitute similar item" or "never substitute")
- No support for multiple substitute options or tiered alternatives
- Price handling is asymmetric: cheaper substitutes refund the difference, but more expensive substitutes absorb the loss
- No notification when customer action is required—they must check the app

**Concrete gaps:**
| Current Behavior | Gap | Impact |
|-----------------|-----|--------|
| Single substitute option | Customer cannot choose from alternatives | Reduced acceptance rate |
| Manual merchant selection | Time-consuming during rush | Delays order fulfillment |
| No customer preferences stored | Every substitution requires decision | Friction for repeat customers |
| No push notification | Customer may not see offer in time | Timeouts, order delays |
| Asymmetric pricing | Merchants absorb cost of upgrades | Margin pressure |

**Product opportunities:**
- Customer preference settings: "auto-accept similar items," "always ask," "never substitute"
- Multiple substitute suggestions ranked by similarity
- Category-based auto-substitution (e.g., Coke → Pepsi)
- Partial substitution for items with modifiers
- Merchant-defined substitute mappings per menu item
- Push notification when substitution decision is needed
- Price-tier matching (suggest items in same price range)

**Code marker:** `LIMITATION_SUBSTITUTION_INTELLIGENCE` in `src/domain/substitution/handling.ts`

**Key files:**
- `src/domain/substitution/handling.ts:19` - Core substitution logic and limitation marker
- `src/domain/substitution/types.ts` - Substitution data types
- `src/services/MerchantService.ts:205` - markItemUnavailable() method
- `src/app/orders/[id]/page.tsx` - Customer substitution UI
- Customer preference storage (new)

---

### 2. Post-Checkout Order Modifications

**Current state:** Once an order is placed, it cannot be modified. Customers must cancel (with potential fees) and reorder. Address changes, item additions, tip adjustments—all require contacting support.

**Behavior walkthrough:**
1. Customer completes checkout → order status = PENDING
2. Customer realizes they forgot to add fries
3. **No edit option available in the UI**
4. Customer's only paths:
   - Cancel order (may incur fee if >5 min) and reorder
   - Contact support out-of-band (not in app)
5. Same applies to: wrong address, tip changes, special instructions

**Why this matters:**
- Real-world ordering often involves corrections: "I forgot to add fries," "wrong delivery address," "I want to increase the tip"
- Current flow pushes these to manual support handling, increasing operational cost
- Cancellation fees discourage legitimate corrections, creating customer friction
- Merchants and couriers have no in-app way to communicate changes

**What's rigid today:**
| Action | Current Behavior | User Impact |
|--------|-----------------|-------------|
| Add item | Not supported | Must cancel + reorder |
| Remove item | Not supported | Must cancel entire order |
| Change address | Not supported | Support contact or reorder |
| Update tip | Not supported | Cannot increase tip post-delivery |
| Update instructions | Not supported | Cannot clarify for courier |
| Partial cancel | Not supported | All-or-nothing cancellation |

**Cancellation fee schedule (after 5-minute free window):**
- PENDING: $0
- CONFIRMED: $2 flat
- PREPARING: 25% of subtotal
- READY_FOR_PICKUP: 50% of subtotal
- COURIER_ASSIGNED: 50% + delivery fee

**Product opportunities:**
- Time-window for modifications (e.g., first 2 minutes, or before CONFIRMED)
- Item-level changes with price recalculation
- Address correction flow with delivery zone revalidation
- Post-delivery tip adjustment
- In-app messaging between customer, merchant, courier
- Graceful partial cancellation (remove one item vs. cancel entire order)
- Order "pause" to allow modifications before merchant confirms

**Code marker:** `LIMITATION_ORDER_EDITING` in `src/domain/order/lifecycle.ts`

**Key files:**
- `src/domain/order/lifecycle.ts:13` - Order state machine and limitation marker
- `src/services/OrderService.ts:178` - cancelOrder() (only modification path today)
- `src/domain/cart/validation.ts` - Validation logic (would need to support edit context)
- `src/app/orders/[id]/page.tsx` - Order detail UI (no edit controls)

---

### 3. Courier Assignment and Delivery Timing

**Current state:** Simple distance-based assignment. System finds closest available courier within search radius using straight-line distance. No traffic, no batching, no courier preferences, no performance weighting.

**Behavior walkthrough:**
1. Merchant marks order READY_FOR_PICKUP
2. System queries couriers where `courierStatus = AVAILABLE`
3. Filter to couriers within `COURIER_SEARCH_RADIUS_MILES` (default: 5mi)
4. Calculate straight-line (Haversine) distance from restaurant to each courier
5. Sort by distance ascending, pick closest
6. Assign courier → status = COURIER_ASSIGNED, courier status = ON_DELIVERY
7. If no courier available, order stays at READY_FOR_PICKUP (no retry logic)

**Why this matters:**
- Delivery time is the primary customer satisfaction driver
- Distance alone is a poor proxy for actual arrival time
- No consideration for courier experience, vehicle type, or current workload
- Single-order assignment is operationally inefficient
- No mechanism to predict or communicate accurate ETAs

**What's simplistic today:**
| Current Behavior | Gap | Impact |
|-----------------|-----|--------|
| Straight-line distance | Ignores roads, traffic | Poor ETA accuracy |
| Binary status (AVAILABLE/ON_DELIVERY) | Cannot batch orders | Inefficient courier utilization |
| No traffic data | Same assignment at 9am vs 6pm | Unpredictable delivery times |
| No decline handling | Courier must explicitly accept | Order can sit unclaimed |
| No courier preferences | All couriers treated equally | Bad matches (e.g., long distance to vehicle type) |
| No performance data | Slow couriers assigned same as fast | Inconsistent customer experience |
| No retry/reassignment | If courier never picks up, order stuck | Manual intervention required |

**ETA calculation today:**
```
estimatedDelivery = now + restaurant.estimatedPrepTime + 15 minutes (hardcoded delivery buffer)
```
No consideration of actual courier distance, traffic, or historical delivery times.

**Product opportunities:**
- Real routing API integration (Google Maps, Mapbox)
- Multi-order batching for same-restaurant pickups
- Courier capacity and preference matching
- Performance-weighted assignment (reliability score)
- Predictive ETA based on historical data
- Dynamic reassignment when courier declines or delays
- Surge pricing and courier incentives
- Prep-time accuracy tracking (merchant-level)

**Code marker:** `LIMITATION_COURIER_BATCHING` in `src/domain/order/assignment.ts`

**Key files:**
- `src/domain/order/assignment.ts:22` - Courier selection algorithm and limitation marker
- `src/domain/order/assignment.ts:52` - Batching limitation details
- `src/services/CourierService.ts:265` - autoAssignCourier() method
- `src/services/OrderService.ts:87` - ETA calculation (hardcoded buffer)
- `src/lib/constants.ts` - COURIER_SEARCH_RADIUS_MILES
- Routing integration (new)
- ETA calculation service (new)

---

## Ordering & Checkout

### No Scheduled Delivery
**Current behavior:** Orders are placed for immediate delivery only.

**Impact:** Customers cannot order ahead for a specific time.

**Code marker:** `LIMITATION_SCHEDULED_DELIVERY` in `src/domain/restaurant/availability.ts`

**Enhancement opportunity:** Add `scheduledFor` field to orders, modify restaurant availability logic to check future time slots, add scheduling UI in checkout.

**Files to modify:**
- `prisma/schema.prisma` - Add scheduledFor to Order
- `src/domain/restaurant/availability.ts` - Check future availability (see LIMITATION marker)
- `src/domain/cart/validation.ts` - Validate scheduled time
- `src/app/api/orders/route.ts` - Accept scheduled time
- Checkout UI components

---

### No Group Ordering
**Current behavior:** Each customer has their own cart; orders are placed individually.

**Impact:** Groups cannot collaborate on a single order and split payment.

**Enhancement opportunity:** Add shared cart concept, invite system, per-person item tagging, split payment calculation.

**Files to modify:**
- `prisma/schema.prisma` - Add CartMember model, link items to members
- `src/services/CartService.ts` - Multi-user cart operations
- New invite/join flow
- Payment splitting logic

---

### No Saved Payment Methods
**Current behavior:** Payment is simulated; no actual payment processing.

**Impact:** Customers cannot save cards or use stored payment methods.

**Enhancement opportunity:** Integrate Stripe, add PaymentMethod model, secure tokenization, saved card selection.

**Files to modify:**
- `prisma/schema.prisma` - Add PaymentMethod model
- New `src/services/PaymentService.ts`
- Stripe integration module
- Checkout flow updates

---

### No Order Editing After Placement
**Current behavior:** Once an order is placed, customers cannot modify items.

**Impact:** Customers must cancel and reorder to make changes.

**Code marker:** `LIMITATION_ORDER_EDITING` in `src/domain/cart/validation.ts` and `src/domain/order/lifecycle.ts`

**Enhancement opportunity:** Allow item modifications before PREPARING status, with price recalculation.

**Files to modify:**
- `src/domain/order/lifecycle.ts` - Add editable window rules (see LIMITATION marker)
- `src/domain/cart/validation.ts` - Validate edit requests
- `src/services/OrderService.ts` - Edit order method
- Order detail UI with edit capability

---

### No Order Reordering
**Current behavior:** Customers must manually rebuild previous orders.

**Impact:** Repeat customers cannot quickly reorder favorites.

**Enhancement opportunity:** "Reorder" button on order history, smart cart population handling unavailable items.

**Files to modify:**
- `src/services/CartService.ts` - Add reorderFromOrder method
- Order history UI
- Handle unavailable items gracefully

---

## Promotions

### No Promo Code Stacking
**Current behavior:** Only one promo code per order.

**Impact:** Customers cannot combine multiple discounts.

**Code marker:** `LIMITATION_PROMO_STACKING` in `src/domain/promotion/eligibility.ts`

**Enhancement opportunity:** Allow multiple promos with stacking rules (e.g., one percentage + one flat, exclude certain combos).

**Files to modify:**
- `prisma/schema.prisma` - Add stackingGroup to Promotion
- `src/domain/promotion/eligibility.ts` - Multi-promo validation (see LIMITATION marker)
- `src/domain/cart/pricing.ts` - Multiple discount calculation
- `src/lib/constants.ts` - MAX_PROMOS_PER_ORDER > 1

---

### No Automatic Promo Suggestions
**Current behavior:** Customers must manually enter promo codes.

**Impact:** Customers may miss available discounts.

**Enhancement opportunity:** Show applicable promos at checkout, auto-apply best available discount.

**Files to modify:**
- New promo suggestion logic
- `src/services/CartService.ts` - Find eligible promos
- Checkout UI updates

---

### No Loyalty/Rewards Program
**Current behavior:** No points or rewards system.

**Impact:** No built-in incentive for repeat orders.

**Enhancement opportunity:** Points accrual, tier system, points redemption, loyalty dashboard.

**Files to modify:**
- `prisma/schema.prisma` - Add LoyaltyAccount, PointsTransaction models
- New `src/services/LoyaltyService.ts`
- Order completion hooks
- Customer profile UI

---

## Delivery

### Basic Courier Assignment Only
**Current behavior:** Assigns nearest available courier by straight-line distance.

**Impact:** Doesn't account for traffic, courier load, or optimal routing.

**Code marker:** `LIMITATION_COURIER_BATCHING` in `src/domain/order/assignment.ts`

**Enhancement opportunity:**
- Real-time traffic data integration
- Multi-order batching
- Courier capacity/preference matching
- Earnings-based assignment

**Files to modify:**
- `src/domain/order/assignment.ts` - Advanced matching algorithm (see LIMITATION marker)
- `src/services/CourierService.ts` - Batch assignment logic
- Possibly external routing API integration

---

### No Live Order Tracking
**Current behavior:** Status updates via page refresh; no map view.

**Impact:** Customers can't see courier location in real-time.

**Enhancement opportunity:** WebSocket updates, map integration, ETA calculation, courier location streaming.

**Files to modify:**
- New real-time infrastructure (WebSocket or SSE)
- Map integration (Mapbox/Google Maps)
- Courier location update frequency
- Order tracking UI overhaul

---

### No Delivery Time Estimation
**Current behavior:** Shows restaurant prep time only.

**Impact:** Customers don't know accurate delivery time.

**Enhancement opportunity:** Factor in distance, traffic, courier travel time, historical data.

**Files to modify:**
- `src/domain/delivery/` - New estimation logic
- Restaurant settings for prep time accuracy
- Order creation to calculate realistic ETA

---

### No Contactless Delivery Options
**Current behavior:** Single delivery method assumed.

**Impact:** Customers can't specify leave-at-door, etc.

**Enhancement opportunity:** Delivery preference options, photo confirmation, special instructions types.

**Files to modify:**
- `prisma/schema.prisma` - Add deliveryPreference to Order
- Order placement flow
- Courier delivery confirmation flow

---

## Menu & Restaurant

### No Menu Item Modifiers
**Current behavior:** Items are fixed; special instructions only via text.

**Impact:** Can't handle structured options (size, toppings, etc.).

**Enhancement opportunity:** Add Modifier/ModifierGroup models, pricing for modifiers, modifier validation.

**Files to modify:**
- `prisma/schema.prisma` - Add MenuItemModifier, ModifierGroup
- Menu display with modifier selection
- Cart item structure with selected modifiers
- Pricing with modifier costs

---

### No Restaurant Ratings/Reviews
**Current behavior:** No customer feedback system.

**Impact:** No social proof for restaurant quality.

**Enhancement opportunity:** Post-delivery rating prompt, review submission, restaurant rating aggregation.

**Files to modify:**
- `prisma/schema.prisma` - Add Review model
- Post-delivery flow
- Restaurant display with ratings
- Merchant review dashboard

---

### No Restaurant Search by Distance
**Current behavior:** All restaurants shown regardless of distance.

**Impact:** Far restaurants appear alongside near ones.

**Enhancement opportunity:** Sort by distance, filter by max distance, show distance on cards.

**Files to modify:**
- `src/app/api/restaurants/route.ts` - Distance sorting
- Restaurant list UI filtering
- Geolocation permission handling

---

## Substitutions

### Limited Substitution Support
**Current behavior:** Merchant can offer one substitute; customer accepts or rejects.

**Impact:** No partial substitutions, no auto-suggestions.

**Enhancement opportunity:**
- Multiple substitute options
- Customer preference for auto-accept similar items
- Price tier matching
- Substitute item search

**Files to modify:**
- `src/domain/substitution/handling.ts` - Enhanced logic
- Order item structure for multiple options
- Customer preference settings

---

## Support & Refunds

### No In-App Chat Support
**Current behavior:** Refund requests only; no real-time support.

**Impact:** Complex issues require external communication.

**Enhancement opportunity:** Live chat, chatbot for common issues, support ticket system.

**Files to modify:**
- New messaging infrastructure
- `prisma/schema.prisma` - Add SupportTicket, Message models
- New `src/services/SupportService.ts`
- Support UI in customer and admin apps

---

### No Automated Refund Rules
**Current behavior:** All refunds require manual admin review.

**Impact:** Delays for clear-cut refund cases.

**Code marker:** `LIMITATION_AUTO_REFUNDS` in `src/domain/refund/eligibility.ts`

**Enhancement opportunity:** Auto-approve rules (e.g., confirmed never-delivered), threshold-based auto-approval.

**Files to modify:**
- `src/domain/refund/eligibility.ts` - Auto-approval rules (see LIMITATION marker)
- `src/services/RefundService.ts` - Auto-processing
- Admin override capability

---

### No Photo Evidence for Issues
**Current behavior:** Refund requests are text-only.

**Impact:** Harder to verify quality/wrong item claims.

**Enhancement opportunity:** Photo upload on refund request, admin photo review.

**Files to modify:**
- File upload infrastructure
- `prisma/schema.prisma` - Add photos to Refund
- Refund request UI
- Admin review UI

---

## Platform

### No Multi-Language Support
**Current behavior:** English only.

**Impact:** Non-English speakers excluded.

**Enhancement opportunity:** i18n framework, translated content, language preference.

---

### No Push Notifications
**Current behavior:** Status updates visible only when app is open.

**Impact:** Users must manually check for updates.

**Enhancement opportunity:** Push notification infrastructure, notification preferences, order event triggers.

---

### No Analytics Dashboard
**Current behavior:** Basic today's-stats only for merchants.

**Impact:** Limited business intelligence.

**Enhancement opportunity:** Historical trends, order analysis, customer insights, revenue reports.

---

## Technical Debt

### No Real Authentication
**Current behavior:** Header-based user ID (demo only).

**Upgrade path:** NextAuth.js integration, session management, OAuth providers.

### No Client-Side Interactivity
**Current behavior:** Server Components only; forms don't submit.

**Upgrade path:** Add client components, form handling, optimistic updates.

### No API Rate Limiting
**Current behavior:** All endpoints open.

**Upgrade path:** Rate limiting middleware, abuse prevention.

### No Caching Layer
**Current behavior:** Every request hits database.

**Upgrade path:** Redis caching, response caching, invalidation strategy.

---

## Quick Reference: Code Markers

The following `LIMITATION_*` markers exist in the codebase for easy discovery:

### Strategic Enhancement Areas (High Priority)

| Marker | Location | Feature |
|--------|----------|---------|
| `LIMITATION_SUBSTITUTION_INTELLIGENCE` | `src/domain/substitution/handling.ts` | Smart substitution matching, customer preferences |
| `LIMITATION_ORDER_EDITING` | `src/domain/order/lifecycle.ts` | Modify orders after placement |
| `LIMITATION_COURIER_BATCHING` | `src/domain/order/assignment.ts` | Multi-order batching, smart assignment |

### Other Limitations

| Marker | Location | Feature |
|--------|----------|---------|
| `LIMITATION_SCHEDULED_DELIVERY` | `src/domain/restaurant/availability.ts` | Order scheduling for future times |
| `LIMITATION_MULTI_RESTAURANT_CART` | `src/domain/cart/validation.ts` | Items from multiple restaurants |
| `LIMITATION_PROMO_STACKING` | `src/domain/promotion/eligibility.ts` | Combine multiple promo codes |
| `LIMITATION_ADVANCED_PROMOS` | `src/domain/promotion/eligibility.ts` | Buy-one-get-one, bundles, etc. |
| `LIMITATION_AUTO_REFUNDS` | `src/domain/refund/eligibility.ts` | Automatic refund approval |

Additionally, `src/lib/constants.ts` contains a `FEATURE_FLAGS` object documenting all planned features.

---

## For AI Product Assistants: Spec Generation Guide

When generating product specs or PRDs for Dashly enhancements, use this structure:

### Recommended Spec Sections

1. **Problem Statement** — Reference the "Why this matters" and "Concrete gaps" sections above
2. **Current Behavior** — Use the "Behavior walkthrough" to describe what happens today
3. **Proposed Solution** — Draw from "Product opportunities"
4. **User Stories** — Derive from the user impact descriptions
5. **Technical Scope** — Reference the "Key files" for implementation planning
6. **Success Metrics** — Tie to the gap analysis (e.g., substitution acceptance rate, ETA accuracy)

### Example Prompts for Spec Generation

**Substitution improvements:**
> "Generate a PRD for intelligent substitution handling. The system should allow customers to set preferences, merchants to define substitute mappings, and provide multiple ranked alternatives when items are unavailable."

**Order modification window:**
> "Write a product spec for post-checkout order modifications. Include a 5-minute edit window for item changes and a longer window for tip adjustments."

**Smart courier assignment:**
> "Create a technical design doc for courier assignment that factors in real-time traffic data, supports multi-order batching, and provides accurate ETAs."

### Cross-Referencing

- See `docs/product-overview.md` for feature context and business rules
- See `docs/user-flows.md` for detailed flow diagrams
- See `docs/architecture.md` for technical implementation patterns
- Search for `LIMITATION_*` markers in source code for implementation details
