/**
 * Promotion Eligibility Logic
 *
 * Determines if a promo code can be applied and calculates the discount.
 *
 * Eligibility requires:
 * - Code exists and isActive
 * - Current date within validFrom/validUntil
 * - Subtotal >= minimumOrderAmount
 * - Restaurant match (if restaurant-specific)
 * - Usage limits not exceeded
 * - First order (if firstOrderOnly)
 *
 * Discount Types:
 * - FLAT_AMOUNT: Fixed dollar amount off (capped at subtotal)
 * - PERCENTAGE: Percent off subtotal (capped by maximumDiscount)
 * - FREE_DELIVERY: Waives delivery fee
 *
 * V1 Limitations:
 * - One promo per order (no stacking)
 * - No BOGO or tiered discounts
 * - No item/category restrictions
 */

import { Promotion } from '@prisma/client'
import {
  PromotionEligibilityCheck,
  PromotionApplication,
  PromotionContext,
  PromotionIneligibilityReason,
  DiscountType,
} from './types'

/**
 * LIMITATION_PROMO_STACKING
 *
 * Currently only one promo code can be applied per order. The cart stores
 * a single promoCode field, and pricing calculates a single discount.
 *
 * To support promo stacking:
 * 1. Change Cart.promoCode to Cart.promoCodes (array or separate table)
 * 2. Define stacking rules (e.g., only one percentage + one flat allowed)
 * 3. Add stackingGroup field to Promotion to control what can combine
 * 4. Update pricing to sum multiple discounts with order of operations
 * 5. Update UI to allow multiple code entry
 *
 * Affected code paths:
 * - CartService.applyPromoCode() - currently replaces existing code
 * - calculateCartPricing() - assumes single discount
 * - Order model - stores single appliedPromoCode/appliedPromoId
 */

/**
 * LIMITATION_ADVANCED_PROMOS
 *
 * Current discount types are simple: flat amount, percentage, or free delivery.
 * No support for:
 * - BOGO (buy one get one)
 * - Tiered discounts (spend $50 get 10%, spend $100 get 20%)
 * - Item-specific discounts (free appetizer with entree)
 * - Category discounts (20% off all pizzas)
 *
 * To support advanced promos:
 * 1. Add new DiscountType enum values
 * 2. Add promo targeting fields (categoryIds, itemIds)
 * 3. Implement complex discount calculation per type
 * 4. Update cart item structure to track which promo applies to which item
 */

/**
 * Check if a promotion code is eligible for the given order context.
 *
 * Validates all business rules in sequence, returning the first failure reason.
 *
 * @param promotion - The promotion to validate (null if code not found in DB)
 * @param context - Current order context including subtotal, customer info
 * @returns Eligibility result with reason code if ineligible
 */
export function checkPromotionEligibility(
  promotion: Promotion | null,
  context: PromotionContext
): PromotionEligibilityCheck {
  // ─────────────────────────────────────────────────────────────────────────
  // RULE 1: Promotion code must exist
  // ─────────────────────────────────────────────────────────────────────────
  if (!promotion) {
    return {
      isEligible: false,
      reason: 'CODE_NOT_FOUND',
      promotion: null,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 2: Promotion must be active
  // Admins can deactivate promos without deleting them
  // ─────────────────────────────────────────────────────────────────────────
  if (!promotion.isActive) {
    return {
      isEligible: false,
      reason: 'CODE_INACTIVE',
      promotion,
    }
  }

  const now = new Date()

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 3a: Promotion must have started (validFrom <= now)
  // ─────────────────────────────────────────────────────────────────────────
  if (promotion.validFrom > now) {
    return {
      isEligible: false,
      reason: 'CODE_NOT_YET_VALID',
      promotion,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 3b: Promotion must not be expired (validUntil > now, if set)
  // ─────────────────────────────────────────────────────────────────────────
  if (promotion.validUntil && promotion.validUntil < now) {
    return {
      isEligible: false,
      reason: 'CODE_EXPIRED',
      promotion,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 4: Order subtotal must meet minimum order amount
  // Note: minimumOrderAmount is checked against subtotal, not total
  // ─────────────────────────────────────────────────────────────────────────
  if (context.subtotal < promotion.minimumOrderAmount) {
    return {
      isEligible: false,
      reason: 'BELOW_MINIMUM_ORDER',
      promotion,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 5: Restaurant restriction (if applicable)
  // Some promos only work at specific restaurants
  // ─────────────────────────────────────────────────────────────────────────
  if (promotion.restaurantId && promotion.restaurantId !== context.restaurantId) {
    return {
      isEligible: false,
      reason: 'WRONG_RESTAURANT',
      promotion,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 6: Global usage limit (if applicable)
  // Prevents promo from being used more than X times total
  // ─────────────────────────────────────────────────────────────────────────
  if (promotion.usageLimit !== null && context.totalUsageCount >= promotion.usageLimit) {
    return {
      isEligible: false,
      reason: 'USAGE_LIMIT_REACHED',
      promotion,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 7: Per-user usage limit
  // Prevents single customer from reusing same promo
  // ─────────────────────────────────────────────────────────────────────────
  if (context.existingUsageCount >= promotion.perUserLimit) {
    return {
      isEligible: false,
      reason: 'USER_LIMIT_REACHED',
      promotion,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 8: First-order-only restriction
  // Some promos only for customers with no previous orders
  // ─────────────────────────────────────────────────────────────────────────
  if (promotion.firstOrderOnly && !context.isFirstOrder) {
    return {
      isEligible: false,
      reason: 'FIRST_ORDER_ONLY',
      promotion,
    }
  }

  // All rules passed
  return {
    isEligible: true,
    reason: null,
    promotion,
  }
}

/**
 * Calculate the discount amount for an eligible promotion.
 *
 * IMPORTANT: This should only be called after checkPromotionEligibility returns isEligible=true
 *
 * @param promotion - The validated promotion
 * @param subtotal - Order subtotal (sum of item prices)
 * @param deliveryFee - Current delivery fee (used for FREE_DELIVERY message)
 * @returns Application result with discount amount and success message
 */
export function calculatePromotionDiscount(
  promotion: Promotion,
  subtotal: number,
  deliveryFee: number
): PromotionApplication {
  let discountAmount = 0
  let waivesDeliveryFee = false

  switch (promotion.discountType) {
    case DiscountType.FLAT_AMOUNT:
      // RULE: Flat discount cannot exceed subtotal
      // (Customer shouldn't get paid to order)
      discountAmount = Math.min(promotion.discountValue, subtotal)
      break

    case DiscountType.PERCENTAGE:
      // RULE: Percentage applies to subtotal only (not fees)
      discountAmount = subtotal * promotion.discountValue

      // RULE: If maximumDiscount is set, cap the discount
      if (promotion.maximumDiscount !== null) {
        discountAmount = Math.min(discountAmount, promotion.maximumDiscount)
      }
      break

    case DiscountType.FREE_DELIVERY:
      // RULE: Free delivery sets delivery fee to $0
      // This doesn't reduce subtotal - handled in pricing calculation
      waivesDeliveryFee = true
      discountAmount = 0
      break
  }

  // Round to cents
  discountAmount = Math.round(discountAmount * 100) / 100

  return {
    isValid: true,
    discountAmount,
    waivesDeliveryFee,
    appliedPromoCode: promotion.code,
    appliedPromoId: promotion.id,
    message: formatPromotionSuccessMessage(promotion, discountAmount, waivesDeliveryFee, deliveryFee),
  }
}

// Legacy alias for backward compatibility
export const applyPromotion = calculatePromotionDiscount

/**
 * Get human-readable error message for why a promo is ineligible.
 */
export function getIneligibilityMessage(
  reason: PromotionIneligibilityReason,
  promotion?: Promotion
): string {
  const messages: Record<PromotionIneligibilityReason, string> = {
    CODE_NOT_FOUND: 'Promo code not found',
    CODE_INACTIVE: 'This promo code is no longer active',
    CODE_EXPIRED: 'This promo code has expired',
    CODE_NOT_YET_VALID: 'This promo code is not yet valid',
    BELOW_MINIMUM_ORDER: promotion
      ? `Minimum order of $${promotion.minimumOrderAmount.toFixed(2)} required`
      : 'Order does not meet minimum amount',
    WRONG_RESTAURANT: 'This promo code is not valid for this restaurant',
    USAGE_LIMIT_REACHED: 'This promo code has reached its usage limit',
    USER_LIMIT_REACHED: 'You have already used this promo code',
    FIRST_ORDER_ONLY: 'This promo code is for first orders only',
  }
  return messages[reason] || 'Promo code cannot be applied'
}

/**
 * Format success message shown when promo is applied.
 */
function formatPromotionSuccessMessage(
  promotion: Promotion,
  discountAmount: number,
  waivesDeliveryFee: boolean,
  deliveryFee: number
): string {
  if (waivesDeliveryFee) {
    return `Free delivery applied! You save $${deliveryFee.toFixed(2)}`
  }
  return `${promotion.code} applied! You save $${discountAmount.toFixed(2)}`
}
