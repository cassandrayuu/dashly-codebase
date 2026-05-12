# ADR-003: Pull-Based Menu Sync

**Status:** Accepted
**Date:** 2024-02-01
**Feature Key:** `merchant_menu_accuracy`
**Related Amplitude Events:** `Merchant - Marked - Item Unavailable`, `Merchant - Canceled - Order`

## Context

Restaurant menus and item availability must be kept in sync between the merchant's actual inventory and what customers see on Dashly. Currently, this sync happens on a scheduled pull basis.

## Current Implementation

```
Every 4 hours:
    ↓
Dashly pulls menu data from merchant dashboard
    ↓
Updates MenuItem.available flags
    ↓
Next sync in 4 hours...
```

**Code Location:**
- `prisma/schema.prisma` - `MenuItem.available` boolean field
- `src/services/MerchantService.ts:markItemUnavailable()` - Manual override

```typescript
// MenuItem availability is a simple boolean
// Updated via:
// 1. Scheduled 4-hour sync (batch job, not in this codebase)
// 2. Manual merchant action when order comes in
```

## Current Limitation

1. **4-hour stale window:** Items can be out of stock for hours before Dashly knows
2. **No real-time inventory:** No POS integration for live stock levels
3. **Reactive only:** Merchants mark items unavailable after order placed
4. **No confidence scoring:** Binary available/unavailable, no "low stock" warning
5. **Market variance:** Phoenix merchants have older POS systems, worse sync

## Impact on Product Metrics

| Metric | Current (Phoenix) | Current (SF) | Impact |
|--------|-------------------|--------------|--------|
| Order cancellation rate | 3.0% | 2.3% | High in Phoenix |
| Menu accuracy score | 87% | 94% | Phoenix significantly worse |
| Substitution rate | 8% | 4% | More unavailable items in Phoenix |

## Related Amplitude Events

- `Merchant - Marked - Item Unavailable` - Triggered when merchant discovers stockout
- `Merchant - Canceled - Order` with `cancel_reason: "item_unavailable"` - Order lost
- Market segmentation shows Phoenix concentrated issues

## Phoenix Market Problem

**Why Phoenix is worse:**
```
Phoenix merchant characteristics:
- 60% use legacy POS systems (no API)
- 25% rely on manual menu updates
- Average sync delay: 6+ hours (vs 4-hour target)
- Higher item turnover (popular items sell out faster)
```

## Potential Future Solution

**Real-Time Webhook-Based Sync:**

```
Merchant POS detects inventory change
    ↓
POS sends webhook to Dashly
    ↓
Dashly updates MenuItem.available in real-time
    ↓
Optional: Add availability_confidence score
    ↓
Customer sees accurate availability
```

**Multi-Tier Approach:**
1. **Tier 1 (Toast, Square, Clover):** Native webhook integration
2. **Tier 2 (Legacy POS):** 1-hour polling + predictive stockout
3. **Tier 3 (No POS):** ML-based availability prediction from order history

**Requirements:**
- Webhook endpoints for major POS providers
- `InventorySync` model to track sync status per merchant
- `availability_confidence` field (0-100%) on MenuItem
- Predictive model for stockout likelihood
- Phoenix merchant POS upgrade incentive program

**Expected Improvement:**
- Order cancellation rate: 3% → <1.5% in Phoenix
- Menu accuracy: 87% → 95% in Phoenix
- Substitution rate: 8% → 3% in Phoenix

## Spark Demo Angle

When Spark analyzes Phoenix cancellation issues, it should discover:

1. **From Amplitude:** Phoenix has 3% cancellation vs 2.3% baseline
2. **From this ADR:** 4-hour pull-based sync causes stale availability
3. **From code:** `MenuItem.available` is simple boolean, no confidence
4. **From market data:** Phoenix merchants have legacy POS systems
5. **Recommendation:** Real-time webhook sync + predictive availability

**Demo Question:** "Why does Phoenix have high order cancellations and what would fix menu accuracy?"

## Decision

Accept 4-hour pull-based sync for MVP. Plan real-time webhook integration as accuracy improvement initiative tied to `merchant_menu_accuracy` feature key, prioritizing Phoenix market.

## Consequences

- Simple sync mechanism for MVP
- Known 3% cancellation rate in Phoenix accepted for now
- No POS integration complexity
- Customer and merchant trust impacted
- Market-specific investment required for improvement
