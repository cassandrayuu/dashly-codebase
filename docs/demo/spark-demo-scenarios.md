# Spark Demo Scenarios

This document contains polished demo scenarios for Productboard Spark, demonstrating cross-system reasoning across:
- **Productboard** (customer feedback)
- **Amplitude** (product analytics)
- **GitHub** (Dashly codebase)

Each scenario follows the Spark workflow:
1. Feedback → What are customers saying?
2. Analytics → What does the data show?
3. Codebase → What technical constraints exist?
4. Spec → What should we build?

---

## Scenario 1: Checkout Abandonment

### Demo Question to Ask Spark

> "Our checkout abandonment rate is 42%. What's causing customers to drop off, and what should we build to improve conversion?"

### Expected Productboard Feedback Themes

| Theme | Sample Feedback |
|-------|-----------------|
| **Slow checkout** | "Checkout takes forever, I gave up and ordered from a competitor" |
| **Payment failures** | "My payment kept failing, had to try 3 times before it worked" |
| **Too many steps** | "Why do I need to re-enter my address every time?" |
| **Timeout errors** | "Got an error after waiting, lost my whole cart" |
| **No saved payments** | "Wish I could save my card like on Amazon" |

### Expected Amplitude Signals

| Metric | Value | Interpretation |
|--------|-------|----------------|
| `cart_abandonment_rate` | 42% | High—industry benchmark is ~25-30% |
| `checkout_completion_time_sec` | 135 sec | Slow—target is <60 sec |
| `payment_failure_rate` | 4.2% | Elevated—target is <2% |
| `abandonment_step` distribution | 45% at payment | Payment is the critical drop-off point |
| `error_occurred: true` rate | 12% of abandoned | Technical failures contribute to abandonment |

**Amplitude Events to Examine:**
- `Ordering - Started - Checkout`
- `Ordering - Completed - Checkout`
- `Ordering - Abandoned - Checkout` (with `abandonment_step` and `error_occurred`)

### Relevant Feature Key

`checkout_conversion`

### Relevant Code Files

| File | What to Find |
|------|--------------|
| `src/services/OrderService.ts` | `placeOrder()` method with synchronous payment flow |
| `src/domain/cart/pricing.ts` | Fee calculation logic |
| `src/lib/constants.ts` | `FEATURE_FLAGS.ORDER_EDITING` (disabled) |

**Search command:**
```bash
grep -r "FEATURE: checkout_conversion" src/
```

### Relevant ADRs

- **[ADR-001: Synchronous Payment Flow](../adr/001-synchronous-payment-flow.md)** — Primary constraint
  - Payment gateway has 30-second timeout
  - No async/optimistic order creation
  - No saved payment methods

### Technical Constraint Spark Should Discover

> **Synchronous Payment Blocking**
>
> The `OrderService.placeOrder()` method processes payment synchronously before creating the order. If the payment gateway times out (30 seconds), the customer sees a checkout failure and must restart.
>
> Current flow:
> ```
> Click "Place Order" → Validate → Process Payment (BLOCKING) → Create Order → Return
> ```
>
> The 4.2% payment failure rate and 135-second average checkout time stem from this synchronous design. Additionally, customers must re-enter payment info every order because there are no saved payment methods.

### Ideal Product Spec Spark Should Produce

```markdown
# PRD: Checkout Flow Optimization

## Problem Statement
42% of customers abandon checkout, with 45% of abandonments occurring at the payment step.
Root causes:
- Synchronous payment processing with 30-second timeout (4.2% failure rate)
- No saved payment methods (re-entry friction)
- Average checkout time of 135 seconds (target: <60 seconds)

## Proposed Solution

### Phase 1: Async Payment with Optimistic Order Creation
- Create order in `PAYMENT_PENDING` state immediately
- Process payment asynchronously in background
- Show customer confirmation with "Payment processing..." state
- Handle payment failures with retry UI, not full restart

### Phase 2: Saved Payment Methods
- Integrate Stripe Customer API for saved cards
- Allow customers to save payment methods during checkout
- Default to last used payment method

### Phase 3: Express Checkout
- One-tap reorder from order history
- Address + payment pre-filled from profile

## Technical Approach
- Add `PaymentIntent` model for async payment tracking
- Modify `OrderService.placeOrder()` to create order before payment
- Add background job processor for payment completion
- Integrate Stripe saved cards via Customer API

## Success Metrics
- Cart abandonment rate: 42% → <28%
- Payment failure rate: 4.2% → <2%
- Checkout completion time: 135s → <45s

## Dependencies
- Stripe Subscriptions/Customer API
- Background job infrastructure (e.g., BullMQ)
```

### Possible Claude Code Implementation Follow-up

After Spark generates the spec, Claude Code could:

1. **Add PaymentIntent model** to `prisma/schema.prisma`:
   ```prisma
   model PaymentIntent {
     id              String   @id @default(cuid())
     orderId         String   @unique
     order           Order    @relation(fields: [orderId], references: [id])
     stripePaymentId String?
     status          PaymentStatus
     amount          Float
     createdAt       DateTime @default(now())
     processedAt     DateTime?
   }
   ```

2. **Modify OrderService.placeOrder()** to create order first, then queue payment

3. **Create PaymentService** for async payment processing

4. **Add payment status polling endpoint** for frontend

---

## Scenario 2: Phoenix Merchant Menu Quality

### Demo Question to Ask Spark

> "Phoenix market has 3% order cancellation rate, much higher than SF's 2.3%. Why are Phoenix orders getting cancelled and how do we fix it?"

### Expected Productboard Feedback Themes

| Theme | Sample Feedback |
|-------|-----------------|
| **Stale menus** | "Ordered a burrito but they said they were out of beef" |
| **Cancellations** | "My order got cancelled after 20 minutes because items weren't available" |
| **Bad substitutions** | "They offered me something completely different, just cancelled instead" |
| **Phoenix-specific** | "This never happens when I order in San Francisco" |
| **Trust erosion** | "Third time this month an item was 'unavailable' after I ordered" |

### Expected Amplitude Signals

| Metric | SF | Phoenix | Gap |
|--------|----|---------|----|
| `order_cancellation_rate` | 2.3% | 3.0% | +0.7% |
| `menu_accuracy_score` | 94% | 87% | -7% |
| `substitution_rate` | 4% | 8% | +4% |
| `Merchant - Canceled - Order` events | Baseline | 1.3x higher | Concentrated |

**Amplitude Events to Examine:**
- `Merchant - Marked - Item Unavailable`
- `Merchant - Canceled - Order` (filter by `market: "phx"`)
- `cancel_reason` distribution (expect "item_unavailable" to dominate)

### Relevant Feature Key

`merchant_menu_accuracy`

### Relevant Code Files

| File | What to Find |
|------|--------------|
| `src/services/MerchantService.ts` | `markItemUnavailable()` — reactive flow after order placed |
| `src/domain/substitution/handling.ts` | Single-substitute limitation |
| `prisma/schema.prisma` | `MenuItem.isAvailable` — simple boolean, no confidence |

**Search command:**
```bash
grep -r "FEATURE: merchant_menu_accuracy" src/
```

### Relevant ADRs

- **[ADR-003: Pull-Based Menu Sync](../adr/003-pull-based-menu-sync.md)** — Primary constraint
  - Menu sync happens every 4 hours (batch pull)
  - No real-time POS integration
  - Phoenix merchants have older POS systems

### Technical Constraint Spark Should Discover

> **Pull-Based Menu Sync with 4-Hour Staleness**
>
> The current system syncs menu availability on a 4-hour batch cycle. Between syncs, items can sell out without Dashly knowing. When a customer orders, the merchant discovers the stockout and must either offer a substitute or cancel.
>
> Phoenix market is particularly affected because:
> - 60% of Phoenix merchants use legacy POS systems with no API
> - Higher item turnover leads to more stockouts between syncs
> - Average sync delay in Phoenix is 6+ hours (worse than 4-hour target)
>
> The `markItemUnavailable()` method in `MerchantService.ts` is purely reactive—it's called AFTER the order is placed, not before.

### Ideal Product Spec Spark Should Produce

```markdown
# PRD: Real-Time Menu Sync for Phoenix Market

## Problem Statement
Phoenix market has 3% order cancellation rate (vs 2.3% SF baseline), driven by stale menu availability data. The 4-hour pull-based sync cycle leaves a window where items can sell out without Dashly knowing.

## Proposed Solution

### Phase 1: Webhook-Based Real-Time Sync (Toast/Square Partners)
- Integrate webhooks from major POS providers (Toast, Square, Clover)
- When POS inventory changes, push update to Dashly immediately
- Reduce sync lag from 4 hours to <1 minute for integrated merchants

### Phase 2: Predictive Availability for Legacy POS
- For merchants without webhook-capable POS, use ML model
- Predict stockout probability based on: time of day, historical patterns, order velocity
- Show "Low Stock" indicator when confidence drops below 80%
- Proactively hide items predicted to be unavailable

### Phase 3: Smart Substitution
- Pre-define substitute mappings at menu creation time
- Let customers set substitution preferences (auto-accept, always ask, category restrictions)
- Offer ranked alternatives instead of single substitute

## Technical Approach
- Add `InventorySync` model to track sync status per merchant
- Create webhook endpoints: `POST /api/webhooks/toast`, etc.
- Add `availability_confidence` field to MenuItem (0-100%)
- Build predictive model using historical `Merchant - Marked - Item Unavailable` events

## Success Metrics
- Phoenix cancellation rate: 3.0% → <1.8%
- Menu accuracy score: 87% → 95%
- Substitution acceptance rate: 45% → 70%

## Phoenix Rollout Plan
1. Identify top 20 Phoenix merchants by order volume
2. Prioritize merchants already using Toast/Square (webhook-ready)
3. Offer POS upgrade incentive for legacy merchants
```

### Possible Claude Code Implementation Follow-up

After Spark generates the spec, Claude Code could:

1. **Add InventorySync model** to track per-merchant sync status

2. **Create webhook endpoint** `src/app/api/webhooks/toast/route.ts`:
   ```typescript
   export async function POST(request: Request) {
     const payload = await request.json()
     // Validate Toast webhook signature
     // Update MenuItem.isAvailable based on inventory change
     // Log sync event for monitoring
   }
   ```

3. **Add availability_confidence field** to MenuItem model

4. **Create sync status dashboard** for merchant operations team

---

## Scenario 3: Delivery ETA Accuracy

### Demo Question to Ask Spark

> "Customers are complaining about late deliveries and inaccurate ETAs. Our delivery tracking accuracy metric shows ±12 minute variance. What's causing this and how can we improve predictions?"

### Expected Productboard Feedback Themes

| Theme | Sample Feedback |
|-------|-----------------|
| **Late deliveries** | "Said 30 minutes, took over an hour" |
| **No updates** | "ETA never changed even though dasher was clearly delayed" |
| **Stale tracking** | "The map showed the dasher in the same spot for 20 minutes" |
| **Lost trust** | "I've stopped believing the ETA, just assume it's wrong" |
| **Support burden** | "Had to contact support to find out where my order was" |

### Expected Amplitude Signals

| Metric | Value | Target | Gap |
|--------|-------|--------|-----|
| `eta_accuracy_minutes` | ±12 min | ±6 min | 2x off target |
| `late_delivery_rate` | 23% | <15% | +8% |
| `support_contact_rate_eta` | 8% | <4% | +4% |
| `Delivery - Received - ETA Update` count | 0 | Expected updates | No dynamic ETAs |

**Amplitude Events to Examine:**
- `Delivery - Viewed - Tracking`
- `Delivery - Received - Order` (compare `actual_delivery_min` vs `estimated_delivery_min`)
- `was_on_time: false` rate
- `delay_minutes` distribution

### Relevant Feature Key

`delivery_tracking_accuracy`

### Relevant Code Files

| File | What to Find |
|------|--------------|
| `src/services/OrderService.ts:98-106` | Static ETA calculation (prep time + 15 min buffer) |
| `src/domain/order/assignment.ts` | Straight-line distance calculation, no traffic |
| `src/lib/constants.ts` | `FEATURE_FLAGS.LIVE_TRACKING` (disabled) |
| `prisma/schema.prisma` | `CourierLocation` model — updated only on status change |

**Search command:**
```bash
grep -r "FEATURE: delivery_tracking_accuracy" src/
```

### Relevant ADRs

- **[ADR-002: Static ETA Calculation](../adr/002-static-eta-calculation.md)** — Primary constraint
  - ETA calculated once at order placement
  - No dynamic updates during delivery
  - Straight-line distance, not road distance
  - No traffic or historical data

### Technical Constraint Spark Should Discover

> **Static ETA with No Real-Time Updates**
>
> The `OrderService.placeOrder()` method calculates ETA once using a simple formula:
> ```
> ETA = restaurant.estimatedPrepTime + 15 minutes
> ```
>
> This doesn't account for:
> - Actual courier distance from restaurant
> - Traffic conditions
> - Time of day patterns
> - Historical delivery times by zone
>
> Additionally, the `CourierLocation` model is only updated when the courier changes status (ASSIGNED → PICKED_UP → DELIVERED). There are no periodic GPS updates, so the system can't recalculate ETA mid-delivery.
>
> The `FEATURE_FLAGS.LIVE_TRACKING` flag is disabled, meaning no WebSocket infrastructure exists for real-time updates.

### Ideal Product Spec Spark Should Produce

```markdown
# PRD: Dynamic ETA with Live Tracking

## Problem Statement
ETA accuracy is ±12 minutes (target: ±6 minutes), with 23% of deliveries arriving late. ETAs are calculated once at order placement and never updated, leaving customers with stale predictions.

## Proposed Solution

### Phase 1: ML-Based Initial ETA
- Replace static formula with ML model trained on historical deliveries
- Inputs: restaurant prep history, courier distance, time of day, zone, traffic API
- Output: Initial ETA with confidence interval

### Phase 2: Real-Time Courier Tracking
- Update courier location every 30 seconds via mobile SDK
- Store in time-series database for route reconstruction
- Display live map in customer tracking view

### Phase 3: Dynamic ETA Updates
- Recalculate ETA every 2 minutes during delivery
- Push updates to customer via WebSocket
- Show ETA range (e.g., "15-20 min") not single number
- Explain delays when ETA increases (traffic, merchant delay)

## Technical Approach
- Integrate Google Maps Distance Matrix API for route-based ETA
- Add WebSocket infrastructure for real-time updates (Socket.io or Pusher)
- Modify mobile courier app to send GPS pings every 30 seconds
- Build ML pipeline for ETA prediction using historical `Delivery - Received - Order` events
- Add `eta_updates` array to Order model for tracking ETA changes

## Success Metrics
- ETA accuracy: ±12 min → ±6 min
- Late delivery rate: 23% → <15%
- Support contact rate (ETA-related): 8% → <4%
- Customer tracking page engagement: +40%

## Dependencies
- Google Maps API integration
- WebSocket infrastructure
- Mobile app update for GPS pings (requires App Store review)
- ML model training pipeline
```

### Possible Claude Code Implementation Follow-up

After Spark generates the spec, Claude Code could:

1. **Add ETA calculation module** `src/domain/order/eta.ts`:
   ```typescript
   export interface ETACalculation {
     estimatedMinutes: number
     confidenceRange: [number, number]
     factors: ETAFactor[]
   }

   export function calculateInitialETA(
     restaurant: Restaurant,
     courierLocation: Coordinates,
     deliveryAddress: Coordinates,
     trafficData?: TrafficInfo
   ): ETACalculation {
     // Route-based calculation with traffic
   }
   ```

2. **Create DeliveryService** for tracking management

3. **Add WebSocket endpoint** for real-time updates

4. **Modify CourierLocation** to store GPS history:
   ```prisma
   model CourierLocationHistory {
     id         String   @id @default(cuid())
     courierId  String
     latitude   Float
     longitude  Float
     timestamp  DateTime @default(now())
     orderId    String?  // Associated order if on delivery
   }
   ```

---

## Demo Execution Tips

### Before the Demo

1. **Load Amplitude** with dashly-amplitude-sandbox data
2. **Prepare Productboard** with sample feedback entries for each scenario
3. **Have GitHub codebase** accessible (this repo)
4. **Practice the flow**: Feedback → Analytics → Code → Spec

### During the Demo

1. **Start with the question** — Frame it as a PM would ask
2. **Let Spark explore** — Show it finding its way through the systems
3. **Highlight cross-references** — When Spark cites ADRs or code, show the actual files
4. **End with the spec** — Show the actionable output

### Key Talking Points

- Spark doesn't just analyze one system — it synthesizes across feedback, data, and code
- Technical constraints are discoverable, not hidden
- The spec is implementation-ready, not just high-level recommendations
- Claude Code could pick up where Spark leaves off

---

## Scenario Comparison Matrix

| Aspect | Checkout | Phoenix Menu | ETA Accuracy |
|--------|----------|--------------|--------------|
| **Feature Key** | `checkout_conversion` | `merchant_menu_accuracy` | `delivery_tracking_accuracy` |
| **Primary ADR** | ADR-001 | ADR-003 | ADR-002 |
| **Root Cause** | Sync payment timeout | 4-hour menu sync | Static ETA formula |
| **Key Metric** | 42% abandonment | 3% cancellation | ±12 min variance |
| **Solution Theme** | Async processing | Real-time webhooks | ML + live tracking |
| **Complexity** | Medium | Medium-High | High |
| **Dependencies** | Stripe, job queue | POS integrations | Maps API, WebSockets, ML |
