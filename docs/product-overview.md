# Dashly Product Overview

## What is Dashly?

Dashly is a food delivery marketplace that connects three parties:
- **Customers** who want to order food from local restaurants
- **Restaurants** (merchants) who prepare and sell food
- **Couriers** who deliver orders from restaurants to customers

The platform handles discovery, ordering, payment, fulfillment, and support.

## User Roles

### Customer
Customers browse restaurants, build carts, place orders, and track deliveries.

**Key capabilities:**
- Search and filter restaurants by cuisine, location, and availability
- View restaurant menus and item details
- Add items to cart with special instructions
- Apply promo codes for discounts
- Place orders with delivery address and tip
- Track order status in real-time
- Request refunds for order issues

### Merchant
Merchants manage their restaurant(s), menus, and incoming orders.

**Key capabilities:**
- View and update restaurant information
- Manage menu items (pricing, availability, descriptions)
- Receive and confirm incoming orders
- Update order status (preparing, ready)
- Mark items as unavailable and offer substitutes
- View daily order statistics

### Courier
Couriers accept delivery assignments and transport orders to customers.

**Key capabilities:**
- Set availability status (online/offline)
- View available orders in their area
- Accept delivery assignments
- Update delivery status (picked up, delivered)
- Track earnings and delivery history

### Admin (Support)
Admins handle platform-wide support operations.

**Key capabilities:**
- View and process refund requests
- Access order details across all users
- Monitor platform activity

## Core Workflows

### 1. Order Placement Flow
1. Customer browses restaurants
2. Customer views menu and adds items to cart
3. Customer optionally applies promo code
4. Customer proceeds to checkout with delivery address
5. System validates cart (items available, minimum order met, delivery zone OK)
6. Order is placed with status PENDING

### 2. Order Fulfillment Flow
1. Merchant receives new order notification
2. Merchant confirms order → status: CONFIRMED
3. Merchant begins preparation → status: PREPARING
4. If item unavailable, merchant offers substitute
5. Customer accepts/rejects substitute
6. Merchant marks order ready → status: READY_FOR_PICKUP
7. System assigns available courier → status: COURIER_ASSIGNED

### 3. Delivery Flow
1. Courier sees assigned order with pickup location
2. Courier navigates to restaurant
3. Courier picks up order → status: PICKED_UP
4. Courier navigates to customer
5. Courier delivers order → status: DELIVERED
6. Courier becomes available for next delivery

### 4. Support Flow
1. Customer reports issue with delivered order
2. System validates refund eligibility (within 24 hours, not already refunded)
3. Customer submits refund request with reason
4. Admin reviews request
5. Admin approves or denies with note
6. Customer notified of outcome

## Current Feature Set (v1)

### Discovery
- Restaurant listing with search by name
- Filter by cuisine type
- Open/closed status based on operating hours
- Delivery zone validation by distance

### Menu & Cart
- Menu organized by categories
- Item availability status
- Single-restaurant cart (switching restaurants clears cart)
- Special instructions per item
- Promo code application

### Checkout & Pricing
- Subtotal calculation
- Delivery fee (per restaurant)
- Service fee (5% of subtotal, $0.50-$10 range)
- Promo discount application
- Tip amount
- Delivery address selection

### Order Management
- Order status tracking with timestamps
- Estimated delivery time
- Order history
- Cancellation with graduated fees

### Merchant Tools
- Order queue with status filtering
- One-click status updates
- Item availability toggle
- Substitution offers

### Courier Tools
- Online/offline toggle
- Available orders list
- Active delivery view
- Pickup and delivery confirmation

### Support
- Refund request submission
- Multiple refund reasons
- Full, partial, or delivery-fee-only refunds
- Admin review queue

## Business Rules Summary

| Rule | Description |
|------|-------------|
| Minimum order | Each restaurant sets a minimum order amount |
| Delivery radius | Orders must be within restaurant's delivery zone |
| Opening hours | Orders only accepted during operating hours |
| Item availability | Unavailable items cannot be ordered |
| Cart single-restaurant | Adding item from different restaurant clears cart |
| Promo eligibility | Various rules: min order, restaurant-specific, usage limits, first-order-only |
| Cancellation window | Free cancellation within 5 minutes, fees after |
| Refund window | 24 hours after delivery |
| Courier assignment | Nearest available courier within search radius |

## Strategic Enhancement Areas

Three areas represent significant product opportunities with intentionally simplified v1 implementations. These are the highest-impact areas for product improvement.

### 1. Substitution Handling
**Current:** Merchant manually offers ONE substitute → customer accepts/rejects → no preferences stored.

**Key friction points:**
- No customer preference settings ("auto-accept similar")
- Single substitute option per item
- No push notification when action needed
- Asymmetric pricing (merchant absorbs upgrade cost)

**Code:** `LIMITATION_SUBSTITUTION_INTELLIGENCE` in `src/domain/substitution/handling.ts`

### 2. Post-Checkout Modifications
**Current:** Orders are immutable after placement. Any change requires cancel + reorder.

**Key friction points:**
- No item add/remove after checkout
- No address correction
- No tip adjustment
- Cancellation fees discourage legitimate corrections

**Code:** `LIMITATION_ORDER_EDITING` in `src/domain/order/lifecycle.ts`

### 3. Courier Assignment & ETA
**Current:** Closest available courier wins. ETA = prep time + 15 min buffer.

**Key friction points:**
- Straight-line distance (ignores roads, traffic)
- No multi-order batching
- No courier preferences or performance weighting
- Static ETA calculation

**Code:** `LIMITATION_COURIER_BATCHING` in `src/domain/order/assignment.ts`

**See `docs/known-limitations.md` for detailed behavior walkthroughs, gap analysis, and spec generation guidance.**

## Data Model

See `prisma/schema.prisma` for the complete data model. Key entities:

- **User**: All users with role-based access
- **Restaurant**: Food establishments with location and settings
- **MenuItem**: Products available for order
- **Cart/CartItem**: Customer's pending order
- **Order/OrderItem**: Placed orders with full history
- **Promotion**: Discount codes and rules
- **Refund**: Refund requests and processing

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API routes
- **Database**: SQLite via Prisma ORM
- **Language**: TypeScript throughout
- **Testing**: Vitest for unit tests

## Understanding the Codebase

### For AI Product Analysis

This codebase is structured for AI-assisted product thinking and spec generation:

1. **Business Rules**: Located in `src/domain/` as pure functions with detailed comment blocks explaining rules
2. **Limitation Markers**: Search for `LIMITATION_*` comments to find enhancement opportunities—each includes current behavior, gaps, and opportunities
3. **Feature Flags**: See `FEATURE_FLAGS` in `src/lib/constants.ts` for planned but unimplemented features
4. **Configuration**: All tunable values in `src/lib/constants.ts` with documentation
5. **State Machines**: Order status transitions documented in `ORDER_STATUS_TRANSITIONS`

### Key Questions This Codebase Can Answer

| Question | Where to Look |
|----------|---------------|
| "How does X work today?" | Domain logic in `src/domain/{feature}/` |
| "What are the limitations of X?" | `docs/known-limitations.md`, search for `LIMITATION_*` |
| "What are the business rules for Z?" | Comment blocks in domain files |
| "What features are not implemented?" | `docs/known-limitations.md`, `FEATURE_FLAGS` |
| "Where would I implement Y?" | Key files listed in limitation sections |

### Spec Generation Workflow

1. **Read limitation section** in `docs/known-limitations.md` for context
2. **Trace behavior** through the documented code paths
3. **Identify gaps** using the tables in each limitation section
4. **Draft spec** using the opportunities and file references
5. **Validate constraints** against business rules in domain files
