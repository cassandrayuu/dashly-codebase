/**
 * Application Constants
 *
 * Configurable business rule values. Changing these affects platform behavior.
 */

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

/**
 * Service fee percentage applied to order subtotal.
 * This is Dashly's platform fee on each transaction.
 *
 * Current: 5% (0.05)
 * Applied to: subtotal only (not delivery fee or tip)
 */
export const SERVICE_FEE_PERCENTAGE = 0.05

/**
 * Minimum service fee in dollars.
 * Even very small orders pay at least this amount.
 *
 * Current: $0.50
 * Applies when: SERVICE_FEE_PERCENTAGE * subtotal < MINIMUM_SERVICE_FEE
 */
export const MINIMUM_SERVICE_FEE = 0.50

/**
 * Maximum service fee cap in dollars.
 * Large orders won't pay more than this regardless of subtotal.
 *
 * Current: $10.00
 * Applies when: SERVICE_FEE_PERCENTAGE * subtotal > MAXIMUM_SERVICE_FEE
 */
export const MAXIMUM_SERVICE_FEE = 10.00

// ============================================================================
// DELIVERY CONFIGURATION
// ============================================================================

/**
 * Global maximum delivery distance in miles.
 * Even if a restaurant sets a higher radius, this is the hard cap.
 *
 * Current: 10 miles
 * Note: Individual restaurants set their own deliveryRadiusMiles (default 5)
 */
export const MAX_DELIVERY_DISTANCE_MILES = 10

/**
 * Radius in miles to search for available couriers around a restaurant.
 * Couriers outside this radius won't be offered the delivery.
 *
 * Current: 5 miles
 * Used by: findBestAvailableCourier() in domain/order/assignment.ts
 */
export const COURIER_SEARCH_RADIUS_MILES = 5

// ============================================================================
// ORDER TIMING CONFIGURATION
// ============================================================================

/**
 * Time window (in hours) after delivery during which customers can request refunds.
 *
 * Current: 24 hours
 * Used by: checkRefundEligibility() in domain/refund/eligibility.ts
 */
export const REFUND_ELIGIBILITY_HOURS = 24

/**
 * Maximum time (in minutes) after order placement for free cancellation.
 * Cancellations within this window incur no fee regardless of order status.
 *
 * Current: 5 minutes
 * Used by: checkOrderCancellation() in domain/order/lifecycle.ts
 */
export const FREE_CANCELLATION_MINUTES = 5

// ============================================================================
// PROMOTIONS CONFIGURATION
// ============================================================================

/**
 * Maximum number of promo codes that can be applied to a single order.
 *
 * Current: 1 (no promo stacking)
 *
 * CURRENT LIMITATION: Promo stacking not supported.
 * See LIMITATION_PROMO_STACKING in domain/promotion/eligibility.ts
 */
export const MAX_PROMOS_PER_ORDER = 1

// ============================================================================
// ORDER STATUS STATE MACHINE
// ============================================================================

/**
 * Valid status transitions for orders.
 *
 * Key: Current status
 * Value: Array of statuses that can be transitioned to
 *
 * Visual representation:
 *
 *   PENDING ──────► CONFIRMED ──────► PREPARING ──────► READY_FOR_PICKUP
 *      │                │                 │                    │
 *      ▼                ▼                 ▼                    ▼
 *   CANCELLED       CANCELLED         CANCELLED            CANCELLED
 *                                                               │
 *                                                               ▼
 *                                                      COURIER_ASSIGNED ──► PICKED_UP ──► DELIVERED
 *                                                               │
 *                                                               ▼
 *                                                           CANCELLED
 *
 * Terminal states: DELIVERED, CANCELLED (no further transitions allowed)
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  // Merchant can confirm or cancel
  PENDING: ['CONFIRMED', 'CANCELLED'],

  // Merchant starts prep or cancels
  CONFIRMED: ['PREPARING', 'CANCELLED'],

  // Merchant marks ready or cancels
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],

  // System assigns courier or order is cancelled
  READY_FOR_PICKUP: ['COURIER_ASSIGNED', 'CANCELLED'],

  // Courier picks up or order is cancelled (last chance to cancel)
  COURIER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],

  // Once picked up, can only be delivered (no more cancellation)
  PICKED_UP: ['DELIVERED'],

  // Terminal states - no further transitions
  DELIVERED: [],
  CANCELLED: [],
}

// ============================================================================
// FEATURE FLAGS (for documenting unimplemented features)
// ============================================================================

/**
 * Feature flags for v2+ enhancements.
 */
export const FEATURE_FLAGS = {
  SCHEDULED_DELIVERY: false,
  COURIER_BATCHING: false,
  PROMO_STACKING: false,
  ORDER_EDITING: false,
  CATEGORY_PAUSE: false,
  AUTO_REFUNDS: false,
  LIVE_TRACKING: false,
  RATINGS_REVIEWS: false,
}
