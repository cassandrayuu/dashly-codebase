# Dashly Analytics Instrumentation Map

This document maps Amplitude events to codebase locations, enabling product reasoning across analytics data and technical implementation.

## Feature Key Overview

| Feature Key | Product Area | Primary Metric | Current State |
|-------------|--------------|----------------|---------------|
| `checkout_conversion` | Ordering | Cart abandonment rate | 42% abandonment, synchronous payment |
| `delivery_tracking_accuracy` | Delivery | ETA accuracy (minutes) | ±12 min error, static calculation |
| `dashly_plus_retention` | Membership | 3-month retention | 62% retention, basic boolean flag only |
| `merchant_menu_accuracy` | Merchant Ops | Order cancellation rate | 3% in Phoenix, 4-hour sync |
| `dasher_offer_quality` | Dasher Experience | Offer acceptance rate | 0.79 in Miami, nearest-only assignment |
| `support_resolution_speed` | Support | Resolution time | 4.2 hours avg, manual approval |
| `promo_redemption` | Promotions | Redemption rate | Single promo limit, no stacking |
| `search_relevance` | Discovery | Click-through rate | Name-only search, no ranking |

---

## Detailed Event Mapping

### checkout_conversion

**Product Area:** Ordering → Checkout Flow

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Ordering - Started - Checkout` | `src/services/OrderService.ts:createOrder()` | ⚠️ No instrumentation |
| `Ordering - Completed - Checkout` | `src/services/OrderService.ts:createOrder()` | ⚠️ No instrumentation |
| `Ordering - Abandoned - Checkout` | `src/app/api/orders/route.ts` | ⚠️ No tracking |

**User Journey:**
1. Customer adds items to cart → `CartService.addItem()`
2. Customer applies promo → `src/domain/promotion/eligibility.ts`
3. Customer enters payment → No saved payment, re-entry required
4. Payment processed synchronously → 30-sec timeout risk
5. Order created or timeout error

**Technical Limitation:** `ADR-001` - Synchronous payment blocks checkout completion. 4.2% payment failure rate from gateway timeouts.

**Related Code Comments:** Look for `// FEATURE: checkout_conversion` in:
- `src/services/OrderService.ts`
- `src/domain/cart/pricing.ts`
- `src/lib/constants.ts`

**Spark Demo Questions:**
- "Why is checkout abandonment high?"
- "What causes payment failures?"
- "How can we improve conversion?"

---

### delivery_tracking_accuracy

**Product Area:** Delivery → ETA & Tracking

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Delivery - Viewed - Tracking` | `src/app/orders/[id]/page.tsx` | ✓ Page exists |
| `Delivery - Received - ETA Update` | N/A | ❌ No dynamic ETA updates |
| `Delivery - Received - Order` | `src/services/CourierService.ts:completeDelivery()` | ⚠️ No instrumentation |

**User Journey:**
1. Order placed → static ETA calculated: `distance × 1.4 + prep_time`
2. Customer views tracking page → shows static ETA, no updates
3. Courier picks up → no ETA recalculation
4. Delivery completed → actual vs estimated not compared

**Technical Limitation:** `ADR-002` - ETA uses straight-line distance with fixed multiplier. No traffic data, no historical patterns, no GPS freshness consideration.

**Related Code Comments:** Look for `// FEATURE: delivery_tracking_accuracy` in:
- `src/domain/order/assignment.ts`
- `src/services/OrderService.ts`
- `src/services/CourierService.ts`

**Spark Demo Questions:**
- "Why are ETAs inaccurate?"
- "How does ETA calculation work?"
- "What would improve delivery predictions?"

---

### dashly_plus_retention

**Product Area:** Membership → Subscriptions

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Membership - Viewed - Plus Upsell` | N/A | ❌ No upsell UI |
| `Membership - Converted - Plus Subscription` | N/A | ❌ No subscription flow |
| `Membership - Canceled - Plus Subscription` | N/A | ❌ No cancellation flow |

**User Journey:**
1. Customer sees Plus benefits (not implemented)
2. Customer subscribes (not implemented)
3. Customer gets free delivery (entitlement not enforced)
4. Customer renews or churns (no lifecycle management)

**Technical Limitation:** `ADR-005` - Plus membership is only a boolean flag on User model. No Subscription model, no billing integration, no entitlement enforcement.

**Related Code Comments:** Look for `// FEATURE: dashly_plus_retention` in:
- `prisma/schema.prisma` (User model)
- `src/lib/constants.ts`
- `src/domain/cart/pricing.ts`

**Spark Demo Questions:**
- "Why is Plus retention low?"
- "How are Plus benefits enforced?"
- "What subscription infrastructure exists?"

---

### merchant_menu_accuracy

**Product Area:** Merchant Operations → Menu Management

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Merchant - Marked - Item Unavailable` | `src/services/MerchantService.ts:markItemUnavailable()` | ✓ Implemented |
| `Merchant - Canceled - Order` | `src/services/MerchantService.ts` | ⚠️ No instrumentation |
| `Merchant - Received - Order` | `src/services/OrderService.ts:createOrder()` | ⚠️ No instrumentation |

**User Journey:**
1. Customer orders item shown as available
2. Merchant receives order, item actually out of stock
3. Merchant marks item unavailable → triggers substitution flow
4. Customer accepts/rejects substitution or order cancelled

**Technical Limitation:** `ADR-003` - Menu sync is pull-based with 4-hour refresh. Phoenix market has 3% cancellation rate due to stale availability data.

**Related Code Comments:** Look for `// FEATURE: merchant_menu_accuracy` in:
- `src/services/MerchantService.ts`
- `src/domain/substitution/handling.ts`
- `prisma/schema.prisma` (MenuItem model)

**Spark Demo Questions:**
- "Why does Phoenix have high cancellations?"
- "How does menu sync work?"
- "What causes item unavailability?"

---

### dasher_offer_quality

**Product Area:** Dasher Experience → Offer Assignment

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Dasher - Received - Offer` | `src/services/CourierService.ts:autoAssignCourier()` | ⚠️ No instrumentation |
| `Dasher - Accepted - Offer` | `src/services/CourierService.ts` | ⚠️ No instrumentation |
| `Dasher - Declined - Offer` | N/A | ❌ No decline tracking |

**User Journey:**
1. Order ready for pickup
2. System finds nearest available courier within 5-mile radius
3. Courier receives offer (no preference matching)
4. Courier accepts or times out (no decline reasons captured)

**Technical Limitation:** `ADR-004` - Assignment uses straight-line distance only. No dasher preferences, no earnings optimization, no batch opportunity consideration.

**Related Code Comments:** Look for `// FEATURE: dasher_offer_quality` in:
- `src/domain/order/assignment.ts`
- `src/services/CourierService.ts`
- `src/lib/constants.ts`

**Spark Demo Questions:**
- "Why is Miami acceptance rate low?"
- "How are dashers assigned to orders?"
- "What would improve offer quality?"

---

### support_resolution_speed

**Product Area:** Support → Refunds & Issues

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Support - Opened - Chat` | N/A | ❌ No chat implementation |
| `Support - Requested - Refund` | `src/services/RefundService.ts:requestRefund()` | ✓ Implemented |

**User Journey:**
1. Customer has issue (late delivery, wrong items, etc.)
2. Customer requests refund within 24-hour window
3. Refund enters PENDING state
4. Admin manually reviews and approves/denies
5. Refund processed (avg 4.2 hours)

**Technical Limitation:** `ADR-006` - All refunds require manual admin approval. No auto-approval rules, no risk scoring, no self-service resolution.

**Related Code Comments:** Look for `// FEATURE: support_resolution_speed` in:
- `src/domain/refund/eligibility.ts`
- `src/services/RefundService.ts`
- `src/app/admin/refunds/page.tsx`

**Spark Demo Questions:**
- "Why is resolution time slow?"
- "What refund types could be auto-approved?"
- "How does the refund workflow work?"

---

### promo_redemption

**Product Area:** Promotions → Discounts

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Ordering - Viewed - Home` (has_promos) | `src/app/page.tsx` | ✓ Page exists |
| Promo applied at checkout | `src/domain/promotion/eligibility.ts` | ✓ Implemented |

**User Journey:**
1. Customer enters promo code at checkout
2. System validates eligibility (min order, first-order, dates, usage limits)
3. Discount applied (FLAT, PERCENTAGE, or FREE_DELIVERY)
4. Single promo per order enforced

**Technical Limitation:** `MAX_PROMOS_PER_ORDER = 1` - No promo stacking. No BOGO or bundle promotions.

**Related Code Comments:** Look for `// FEATURE: promo_redemption` in:
- `src/domain/promotion/eligibility.ts`
- `src/services/CartService.ts`
- `src/lib/constants.ts`

**Spark Demo Questions:**
- "How do promotions work?"
- "Why can't customers stack promos?"
- "What promo types are supported?"

---

### search_relevance

**Product Area:** Discovery → Restaurant Search

| Amplitude Event | Code Location | Implementation Status |
|-----------------|---------------|----------------------|
| `Ordering - Searched - Restaurants` | `src/app/restaurants/page.tsx` | ⚠️ Basic implementation |

**User Journey:**
1. Customer enters search query
2. System filters restaurants by name match
3. Results returned (no ranking, no relevance scoring)

**Technical Limitation:** Search is basic string matching on restaurant name only. No cuisine matching, no popularity ranking, no personalization.

**Related Code Comments:** Look for `// FEATURE: search_relevance` in:
- `src/app/restaurants/page.tsx`
- `src/app/api/restaurants/route.ts`

**Spark Demo Questions:**
- "How does restaurant search work?"
- "Why might search results feel irrelevant?"
- "What would improve search quality?"

---

## Quick Reference: Code → Feature Key

| Code Location | Feature Key(s) |
|---------------|----------------|
| `src/services/OrderService.ts` | checkout_conversion, delivery_tracking_accuracy |
| `src/services/CourierService.ts` | delivery_tracking_accuracy, dasher_offer_quality |
| `src/services/MerchantService.ts` | merchant_menu_accuracy |
| `src/services/RefundService.ts` | support_resolution_speed |
| `src/domain/order/assignment.ts` | dasher_offer_quality, delivery_tracking_accuracy |
| `src/domain/promotion/eligibility.ts` | promo_redemption, checkout_conversion |
| `src/domain/refund/eligibility.ts` | support_resolution_speed |
| `src/domain/substitution/handling.ts` | merchant_menu_accuracy |
| `src/domain/cart/pricing.ts` | checkout_conversion, dashly_plus_retention |
| `src/lib/constants.ts` | All feature keys (configuration) |
| `prisma/schema.prisma` | All feature keys (data models) |

---

## ADR Cross-Reference

| ADR | Feature Key | Core Constraint |
|-----|-------------|-----------------|
| ADR-001 | checkout_conversion | Synchronous payment with 30-sec timeout |
| ADR-002 | delivery_tracking_accuracy | Static ETA, no GPS freshness |
| ADR-003 | merchant_menu_accuracy | 4-hour pull-based menu sync |
| ADR-004 | dasher_offer_quality | Nearest-only assignment algorithm |
| ADR-005 | dashly_plus_retention | Boolean flag, no subscription infrastructure |
| ADR-006 | support_resolution_speed | Manual approval for all refunds |
