# ADR-002: Static ETA Calculation

**Status:** Accepted
**Date:** 2024-01-20
**Feature Key:** `delivery_tracking_accuracy`
**Related Amplitude Events:** `Delivery - Received - ETA Update`, `Delivery - Received - Order`, `Delivery - Viewed - Tracking`

## Context

Customers expect accurate delivery time estimates. The current system calculates ETA once at order placement and does not update it during the delivery process.

## Current Implementation

```typescript
// src/domain/order/assignment.ts
// ETA = (straight_line_distance × 1.4) + restaurant_prep_time

const DISTANCE_TIME_MULTIPLIER = 1.4; // Assumes 1.4x straight-line for road distance
const estimatedDeliveryMinutes =
  (distanceMiles * DISTANCE_TIME_MULTIPLIER * 3) + // ~3 min per mile
  restaurant.avgPrepTimeMin;
```

**Code Location:**
- `src/domain/order/assignment.ts` - Distance calculation
- `src/services/OrderService.ts` - ETA assignment at order creation

## Current Limitation

1. **Static calculation:** ETA set once at order placement, never updated
2. **No real-time factors:** Ignores traffic, weather, courier delays
3. **Straight-line distance:** Uses Haversine formula, not actual route
4. **No GPS freshness:** Courier location only updated on status change
5. **No historical learning:** Doesn't use past delivery times for predictions

## Impact on Product Metrics

| Metric | Current | Impact |
|--------|---------|--------|
| ETA accuracy | ±12 minutes | High - customers frustrated by inaccurate estimates |
| Late delivery rate | 23% | High - orders arriving after promised time |
| Support contact rate (ETA) | 8% | Medium - customers asking "where's my order?" |

## Related Amplitude Events

- `Delivery - Received - ETA Update` - Currently not triggered (no updates)
- `Delivery - Received - Order` with `was_on_time: false` indicates late deliveries
- `eta_accuracy_minutes` derived metric shows ±12 min average error
- `delay_minutes` in delivery events shows magnitude of delays

## GPS Freshness Problem

**Current state:**
```
Courier location updated only on status change:
- COURIER_ASSIGNED → location captured
- PICKED_UP → location captured
- DELIVERED → location captured

Time between updates: 15-45 minutes (no live tracking)
```

**Impact:** Cannot recalculate ETA mid-delivery because courier position is stale.

## Potential Future Solution

**ML-Based Dynamic ETA (eta_ml_v2):**

```
Order placed
    ↓
Initial ETA from ML model (historical patterns + current conditions)
    ↓
Courier assigned → Recalculate with courier location
    ↓
Every 2 minutes → Update ETA based on:
  - Live courier GPS (30-sec updates)
  - Traffic API data
  - Restaurant actual prep time
  - Historical zone delivery times
    ↓
Push ETA update to customer
```

**Requirements:**
- Live courier GPS tracking (30-second intervals)
- Traffic API integration (Google Maps or similar)
- Historical delivery time aggregation by zone/time
- WebSocket infrastructure for real-time updates
- ML model training pipeline

**Expected Improvement:**
- ETA accuracy: ±12 min → ±6 min
- Late delivery rate: 23% → 14%
- Support contact rate: 8% → 4.5%

## Spark Demo Angle

When Spark analyzes delivery accuracy issues, it should discover:

1. **From Amplitude:** High `eta_accuracy_minutes`, late deliveries, support contacts
2. **From this ADR:** Static ETA with no updates, no GPS freshness
3. **From code:** `assignment.ts` uses simple distance × multiplier formula
4. **Recommendation:** Implement ML ETA with live tracking per this ADR

**Demo Question:** "Why are delivery ETAs inaccurate and what would improve predictions?"

## Decision

Accept static ETA for MVP. Plan ML-based ETA as accuracy improvement initiative tied to `delivery_tracking_accuracy` feature key.

## Consequences

- Simple, predictable calculation for MVP
- Known ±12 minute accuracy accepted for now
- No infrastructure cost for real-time tracking
- Customer trust impacted by inaccurate estimates
- Future investment required for live tracking
