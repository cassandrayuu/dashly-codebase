# ADR-004: Nearest Courier Assignment

**Status:** Accepted
**Date:** 2024-02-10
**Feature Key:** `dasher_offer_quality`
**Related Amplitude Events:** `Dasher - Received - Offer`, `Dasher - Accepted - Offer`, `Dasher - Declined - Offer`

## Context

When an order is ready for pickup, the system must assign a courier (dasher) to deliver it. The assignment algorithm directly impacts dasher satisfaction, acceptance rates, and delivery efficiency.

## Current Implementation

```typescript
// src/domain/order/assignment.ts
// Find nearest available courier within search radius

const COURIER_SEARCH_RADIUS_MILES = 5;

function findNearestCourier(restaurantLocation, availableCouriers) {
  return availableCouriers
    .filter(c => distance(c.location, restaurantLocation) <= COURIER_SEARCH_RADIUS_MILES)
    .sort((a, b) => distance(a.location, restaurantLocation) - distance(b.location, restaurantLocation))
    [0]; // Return closest
}
```

**Code Location:**
- `src/domain/order/assignment.ts` - Assignment algorithm
- `src/services/CourierService.ts:autoAssignCourier()` - Assignment execution
- `src/lib/constants.ts` - `COURIER_SEARCH_RADIUS_MILES = 5`

## Current Limitation

1. **Distance only:** Doesn't consider dasher preferences, vehicle type, or history
2. **No earnings optimization:** Doesn't help dashers meet earnings goals
3. **No batching:** Single order per courier, no multi-pickup opportunities
4. **No decline learning:** Doesn't learn from declined offers to improve matching
5. **Static radius:** Same 5-mile radius regardless of demand/supply

## Impact on Product Metrics

| Metric | Current (Miami) | Current (SF) | Impact |
|--------|-----------------|--------------|--------|
| Offer acceptance rate | 0.79 | 0.85 | Low in Miami |
| Time to first accept | 4.2 min | 2.1 min | Slower in Miami |
| Dasher utilization | 62% | 78% | Underutilized in Miami |

## Related Amplitude Events

- `Dasher - Received - Offer` - Every offer sent
- `Dasher - Accepted - Offer` - Successful assignment
- `Dasher - Declined - Offer` with `decline_reason` - Why dashers reject
- Miami market shows concentrated low acceptance

## Miami Market Problem

**Why Miami acceptance is low:**
```
Miami dasher characteristics:
- Higher gas prices → dashers want shorter trips
- More part-time dashers → earnings goals not met
- Traffic congestion → straight-line distance misleading
- Offer doesn't show full route/earnings upfront
```

**Common decline reasons (from Amplitude):**
- "distance_too_far" - 35%
- "earnings_too_low" - 28%
- "wrong_direction" - 22%
- "already_has_order" - 15% (no batching option)

## Potential Future Solution

**ML-Based Smart Assignment:**

```
Order ready for pickup
    ↓
Rank all available couriers by:
  - Distance (current)
  - Historical acceptance for this route
  - Dasher's stated preferences (vehicle, distance, cuisine)
  - Current earnings vs daily goal
  - Batch opportunity (another order nearby)
  - Real route time (not straight-line)
    ↓
Send offer to highest-ranked courier
    ↓
If declined, learn and adjust ranking model
```

**Batching Addition:**
```typescript
// FEATURE_FLAG: COURIER_BATCHING
// If enabled, check for nearby orders that could be batched
// Show combined earnings and route to dasher
```

**Requirements:**
- Dasher preferences collection (onboarding + in-app)
- Earnings goal tracking per shift
- Route optimization API (not just distance)
- ML model for acceptance prediction
- Batching algorithm for multi-order assignment
- A/B testing infrastructure for algorithm changes

**Expected Improvement:**
- Acceptance rate: 0.79 → 0.88 in Miami
- Time to first accept: 4.2 min → 2.5 min
- Dasher utilization: 62% → 75%

## Spark Demo Angle

When Spark analyzes Miami dasher issues, it should discover:

1. **From Amplitude:** Miami acceptance at 0.79 vs 0.85 target
2. **From this ADR:** Nearest-only assignment ignores preferences/earnings
3. **From code:** `assignment.ts` sorts by distance only
4. **From decline data:** "distance_too_far" and "earnings_too_low" are top reasons
5. **Recommendation:** ML-based matching with batching per this ADR

**Demo Question:** "Why is Miami dasher acceptance low and what would improve offer quality?"

## Decision

Accept nearest-courier assignment for MVP. Plan ML-based matching as dasher experience improvement tied to `dasher_offer_quality` feature key, prioritizing Miami market.

## Consequences

- Simple, fast assignment for MVP
- Known 0.79 acceptance in Miami accepted for now
- No preference data collection needed
- Dasher satisfaction and earnings impacted
- Market-specific investment required for improvement
