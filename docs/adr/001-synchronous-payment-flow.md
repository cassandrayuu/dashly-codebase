# ADR-001: Synchronous Payment Flow

**Status:** Accepted
**Date:** 2024-01-15
**Feature Key:** `checkout_conversion`
**Related Amplitude Events:** `Ordering - Started - Checkout`, `Ordering - Completed - Checkout`, `Ordering - Abandoned - Checkout`

## Context

When a customer completes checkout, the order creation process waits for payment authorization before creating the order record. This is a synchronous, blocking operation.

## Current Implementation

```
Customer clicks "Place Order"
    ↓
Validate cart & pricing (50ms)
    ↓
Process payment synchronously (2-30 seconds) ← BLOCKING
    ↓
Create order record
    ↓
Return success to customer
```

**Code Location:** `src/services/OrderService.ts:createOrder()`

```typescript
// Payment processing is synchronous
// If payment gateway times out (30 sec), customer sees checkout failure
// No order is created, customer must retry
```

## Current Limitation

1. **Payment gateway timeout:** 30-second hard timeout causes 4.2% of checkouts to fail
2. **No retry mechanism:** Failed payments require customer to restart checkout
3. **No saved payment methods:** Customers re-enter payment info every order
4. **Long perceived wait time:** Average 135 seconds in checkout flow

## Impact on Product Metrics

| Metric | Current | Impact |
|--------|---------|--------|
| Cart abandonment rate | 42% | High - customers abandon during payment wait |
| Payment failure rate | 4.2% | Medium - gateway timeouts |
| Checkout completion time | 135 sec | High - perceived as slow |

## Related Amplitude Events

- `Ordering - Abandoned - Checkout` with `abandonment_step: "payment"` indicates timeout-related abandonment
- `checkout_completion_time_sec` metric shows long checkout duration
- `error_occurred: true` in abandoned events correlates with payment failures

## Potential Future Solution

**Async Payment with Optimistic Order Creation:**

```
Customer clicks "Place Order"
    ↓
Validate cart & pricing (50ms)
    ↓
Create order in PAYMENT_PENDING state ← ORDER CREATED IMMEDIATELY
    ↓
Return success to customer
    ↓
Process payment asynchronously
    ↓
Update order to CONFIRMED or PAYMENT_FAILED
```

**Benefits:**
- Perceived checkout time drops to <5 seconds
- Payment failures become recoverable (retry without re-entering cart)
- Enables saved payment methods via payment intents

**Requirements:**
- New `PaymentIntent` model in database
- Background job processor for async payment
- Order status for `PAYMENT_PENDING`
- Webhook handling for payment status updates

## Spark Demo Angle

When Spark analyzes checkout conversion issues, it should discover:

1. **From Amplitude:** High abandonment at payment step, 4.2% payment errors
2. **From this ADR:** Root cause is synchronous payment with timeout risk
3. **From code:** `OrderService.createOrder()` blocks on payment
4. **Recommendation:** Implement async payment flow per this ADR

**Demo Question:** "Why is checkout abandonment high and what technical changes would improve conversion?"

## Decision

Accept synchronous payment for MVP. Plan async migration as conversion optimization initiative tied to `checkout_conversion` feature key.

## Consequences

- Simple implementation for MVP
- Known 4.2% failure rate accepted for now
- Checkout perceived as slow
- Future migration required for scale
