/**
 * Dashly Plus Benefits Calculation
 *
 * Pure functions for calculating Plus membership benefits.
 * These functions determine pricing adjustments for Plus members.
 *
 * AMPLITUDE FEATURE KEYS:
 * - dashly_plus_retention: benefit usage drives retention
 * - checkout_conversion: Plus benefits affect checkout pricing
 *
 * KEY CONSTRAINTS (for Spark to discover):
 * - ADR-005: Benefits are all-or-nothing (no tiers)
 * - Free delivery requires $15 minimum order
 * - Service fee reduction is percentage-based (5% vs 15%)
 *
 * SEE: docs/adr/005-boolean-plus-membership.md
 *
 * LIMITATION_PLUS_TIERS: Single tier only. Cannot offer:
 * - Premium tier with unlimited delivery
 * - Family plan with shared benefits
 * - Student/military discounts
 * - Corporate accounts with expense tracking
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Plus benefit configuration.
 *
 * LIMITATION: Hardcoded values. Would need config service for:
 * - A/B testing different thresholds
 * - Market-specific benefits
 * - Dynamic pricing
 */
export const PLUS_CONFIG = {
  // Delivery fee waiver
  freeDeliveryMinimum: 15.00,    // Must spend $15+ for free delivery
  standardDeliveryFee: 4.99,     // Normal delivery fee

  // Service fee reduction
  plusServiceFeeRate: 0.05,      // 5% for Plus members
  standardServiceFeeRate: 0.15, // 15% for non-Plus

  // Future: not implemented
  prioritySupportEnabled: true,  // Faster support queue (not enforced in code)
  exclusiveOffersEnabled: true,  // Plus-only promos (partially implemented)
} as const

// ============================================================================
// TYPES
// ============================================================================

export interface PlusBenefitCalculation {
  isPlusMember: boolean
  originalDeliveryFee: number
  adjustedDeliveryFee: number
  deliveryFeeSavings: number
  originalServiceFee: number
  adjustedServiceFee: number
  serviceFeeSavings: number
  totalSavings: number
  qualifiesForFreeDelivery: boolean
  freeDeliveryThreshold: number
  amountToFreeDelivery: number
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Calculate Plus benefits for an order.
 *
 * FEATURE: dashly_plus_retention, checkout_conversion
 *
 * @param subtotal - Order subtotal before fees
 * @param isPlusMember - Whether customer has active Plus
 * @returns Detailed benefit calculation
 */
export function calculatePlusBenefits(
  subtotal: number,
  isPlusMember: boolean
): PlusBenefitCalculation {
  const { freeDeliveryMinimum, standardDeliveryFee, plusServiceFeeRate, standardServiceFeeRate } = PLUS_CONFIG

  // Calculate delivery fee
  const originalDeliveryFee = standardDeliveryFee
  const qualifiesForFreeDelivery = isPlusMember && subtotal >= freeDeliveryMinimum
  const adjustedDeliveryFee = qualifiesForFreeDelivery ? 0 : standardDeliveryFee
  const deliveryFeeSavings = isPlusMember && qualifiesForFreeDelivery ? standardDeliveryFee : 0

  // Calculate service fee
  const originalServiceFee = subtotal * standardServiceFeeRate
  const adjustedServiceFee = isPlusMember
    ? subtotal * plusServiceFeeRate
    : originalServiceFee
  const serviceFeeSavings = isPlusMember
    ? originalServiceFee - adjustedServiceFee
    : 0

  // Amount needed for free delivery (for upsell messaging)
  const amountToFreeDelivery = isPlusMember
    ? Math.max(0, freeDeliveryMinimum - subtotal)
    : 0 // Non-Plus can't get free delivery

  return {
    isPlusMember,
    originalDeliveryFee,
    adjustedDeliveryFee,
    deliveryFeeSavings,
    originalServiceFee: Math.round(originalServiceFee * 100) / 100,
    adjustedServiceFee: Math.round(adjustedServiceFee * 100) / 100,
    serviceFeeSavings: Math.round(serviceFeeSavings * 100) / 100,
    totalSavings: Math.round((deliveryFeeSavings + serviceFeeSavings) * 100) / 100,
    qualifiesForFreeDelivery,
    freeDeliveryThreshold: freeDeliveryMinimum,
    amountToFreeDelivery: Math.round(amountToFreeDelivery * 100) / 100,
  }
}

/**
 * Calculate potential savings to show in Plus upsell.
 *
 * Used in checkout to show "You could save $X with Plus!"
 *
 * @param subtotal - Order subtotal
 * @returns Potential savings if user had Plus
 */
export function calculatePotentialSavings(subtotal: number): number {
  const withoutPlus = calculatePlusBenefits(subtotal, false)
  const withPlus = calculatePlusBenefits(subtotal, true)

  const deliverySavings = withoutPlus.adjustedDeliveryFee - withPlus.adjustedDeliveryFee
  const serviceSavings = withoutPlus.adjustedServiceFee - withPlus.adjustedServiceFee

  return Math.round((deliverySavings + serviceSavings) * 100) / 100
}

/**
 * Check if an order qualifies for Plus free delivery.
 *
 * Simple utility for display logic.
 */
export function qualifiesForFreeDelivery(subtotal: number): boolean {
  return subtotal >= PLUS_CONFIG.freeDeliveryMinimum
}

/**
 * Get the amount needed to reach free delivery threshold.
 *
 * Used for "Add $X more for free delivery" messaging.
 */
export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, PLUS_CONFIG.freeDeliveryMinimum - subtotal)
}

/**
 * Calculate annual savings estimate for Plus upsell.
 *
 * Based on user's order frequency and average order value.
 *
 * @param avgOrderValue - User's average order value
 * @param ordersPerMonth - Estimated orders per month
 * @returns Estimated annual savings
 */
export function estimateAnnualSavings(
  avgOrderValue: number,
  ordersPerMonth: number
): number {
  const perOrderSavings = calculatePotentialSavings(avgOrderValue)
  const annualSavings = perOrderSavings * ordersPerMonth * 12

  return Math.round(annualSavings * 100) / 100
}
