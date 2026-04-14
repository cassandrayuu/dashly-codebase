/**
 * Promotion Eligibility Tests
 *
 * Comprehensive tests for promo code validation and discount calculation.
 *
 * Coverage:
 * - All 8 eligibility rules
 * - All 3 discount types
 * - Edge cases (caps, boundaries)
 * - Error messages
 */

import { describe, it, expect } from 'vitest'
import {
  checkPromotionEligibility,
  calculatePromotionDiscount,
  getIneligibilityMessage,
} from '../promotion/eligibility'
import { Promotion } from '@prisma/client'
import { DiscountType } from '@/lib/enums'
import { PromotionContext } from '../promotion/types'

// ============================================================================
// Test Fixtures
// ============================================================================

// Use dates relative to now for testing
const NOW = new Date()
const ONE_YEAR_AGO = new Date(NOW.getFullYear() - 1, 0, 1)
const ONE_YEAR_FROM_NOW = new Date(NOW.getFullYear() + 1, 11, 31)

function createMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    code: 'TEST10',
    description: '$10 off',
    discountType: DiscountType.FLAT_AMOUNT,
    discountValue: 10.00,
    minimumOrderAmount: 25.00,
    maximumDiscount: null,
    usageLimit: null,
    perUserLimit: 1,
    validFrom: ONE_YEAR_AGO,
    validUntil: ONE_YEAR_FROM_NOW,
    isActive: true,
    restaurantId: null,
    firstOrderOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createDefaultContext(overrides: Partial<PromotionContext> = {}): PromotionContext {
  return {
    customerId: 'cust-1',
    restaurantId: 'rest-1',
    subtotal: 50.00,
    deliveryFee: 3.99,
    isFirstOrder: false,
    existingUsageCount: 0,
    totalUsageCount: 0,
    ...overrides,
  }
}

// ============================================================================
// Eligibility Rule Tests
// ============================================================================

describe('checkPromotionEligibility - Rule Validation', () => {
  describe('RULE 1: Code must exist', () => {
    it('returns CODE_NOT_FOUND when promotion is null', () => {
      const result = checkPromotionEligibility(null, createDefaultContext())

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('CODE_NOT_FOUND')
      expect(result.promotion).toBe(null)
    })
  })

  describe('RULE 2: Code must be active', () => {
    it('returns CODE_INACTIVE when isActive is false', () => {
      const promo = createMockPromotion({ isActive: false })
      const result = checkPromotionEligibility(promo, createDefaultContext())

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('CODE_INACTIVE')
    })

    it('is eligible when isActive is true', () => {
      const promo = createMockPromotion({ isActive: true })
      const result = checkPromotionEligibility(promo, createDefaultContext())

      expect(result.isEligible).toBe(true)
    })
  })

  describe('RULE 3: Code must be within valid date range', () => {
    it('returns CODE_NOT_YET_VALID when validFrom is in future', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const promo = createMockPromotion({ validFrom: futureDate })
      const result = checkPromotionEligibility(promo, createDefaultContext())

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('CODE_NOT_YET_VALID')
    })

    it('returns CODE_EXPIRED when validUntil is in past', () => {
      const promo = createMockPromotion({
        validUntil: new Date('2020-01-01'),
      })
      const result = checkPromotionEligibility(promo, createDefaultContext())

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('CODE_EXPIRED')
    })

    it('is eligible when validUntil is null (no expiration)', () => {
      const promo = createMockPromotion({ validUntil: null })
      const result = checkPromotionEligibility(promo, createDefaultContext())

      expect(result.isEligible).toBe(true)
    })
  })

  describe('RULE 4: Subtotal must meet minimum order amount', () => {
    it('returns BELOW_MINIMUM_ORDER when subtotal < minimumOrderAmount', () => {
      const promo = createMockPromotion({ minimumOrderAmount: 100.00 })
      const context = createDefaultContext({ subtotal: 50.00 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('BELOW_MINIMUM_ORDER')
    })

    it('is eligible when subtotal equals minimumOrderAmount exactly', () => {
      const promo = createMockPromotion({ minimumOrderAmount: 50.00 })
      const context = createDefaultContext({ subtotal: 50.00 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })

    it('is eligible when minimumOrderAmount is 0', () => {
      const promo = createMockPromotion({ minimumOrderAmount: 0 })
      const context = createDefaultContext({ subtotal: 10.00 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })
  })

  describe('RULE 5: Restaurant restriction', () => {
    it('returns WRONG_RESTAURANT when restaurantId does not match', () => {
      const promo = createMockPromotion({ restaurantId: 'rest-specific' })
      const context = createDefaultContext({ restaurantId: 'rest-other' })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('WRONG_RESTAURANT')
    })

    it('is eligible when restaurantId matches', () => {
      const promo = createMockPromotion({ restaurantId: 'rest-1' })
      const context = createDefaultContext({ restaurantId: 'rest-1' })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })

    it('is eligible when restaurantId is null (applies to all)', () => {
      const promo = createMockPromotion({ restaurantId: null })
      const result = checkPromotionEligibility(promo, createDefaultContext())

      expect(result.isEligible).toBe(true)
    })
  })

  describe('RULE 6: Global usage limit', () => {
    it('returns USAGE_LIMIT_REACHED when totalUsageCount >= usageLimit', () => {
      const promo = createMockPromotion({ usageLimit: 100 })
      const context = createDefaultContext({ totalUsageCount: 100 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('USAGE_LIMIT_REACHED')
    })

    it('is eligible when totalUsageCount < usageLimit', () => {
      const promo = createMockPromotion({ usageLimit: 100 })
      const context = createDefaultContext({ totalUsageCount: 99 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })

    it('is eligible when usageLimit is null (unlimited)', () => {
      const promo = createMockPromotion({ usageLimit: null })
      const context = createDefaultContext({ totalUsageCount: 999999 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })
  })

  describe('RULE 7: Per-user usage limit', () => {
    it('returns USER_LIMIT_REACHED when existingUsageCount >= perUserLimit', () => {
      const promo = createMockPromotion({ perUserLimit: 1 })
      const context = createDefaultContext({ existingUsageCount: 1 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('USER_LIMIT_REACHED')
    })

    it('is eligible when existingUsageCount < perUserLimit', () => {
      const promo = createMockPromotion({ perUserLimit: 3 })
      const context = createDefaultContext({ existingUsageCount: 2 })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })
  })

  describe('RULE 8: First order only', () => {
    it('returns FIRST_ORDER_ONLY when firstOrderOnly=true and not first order', () => {
      const promo = createMockPromotion({ firstOrderOnly: true })
      const context = createDefaultContext({ isFirstOrder: false })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(false)
      expect(result.reason).toBe('FIRST_ORDER_ONLY')
    })

    it('is eligible when firstOrderOnly=true and is first order', () => {
      const promo = createMockPromotion({ firstOrderOnly: true })
      const context = createDefaultContext({ isFirstOrder: true })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })

    it('is eligible when firstOrderOnly=false regardless of order history', () => {
      const promo = createMockPromotion({ firstOrderOnly: false })
      const context = createDefaultContext({ isFirstOrder: false })
      const result = checkPromotionEligibility(promo, context)

      expect(result.isEligible).toBe(true)
    })
  })
})

// ============================================================================
// Discount Calculation Tests
// ============================================================================

describe('calculatePromotionDiscount - Discount Types', () => {
  describe('FLAT_AMOUNT discount', () => {
    it('applies exact discount value when subtotal is higher', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.FLAT_AMOUNT,
        discountValue: 10.00,
      })

      const result = calculatePromotionDiscount(promo, 50.00, 3.99)

      expect(result.discountAmount).toBe(10.00)
      expect(result.waivesDeliveryFee).toBe(false)
    })

    it('caps discount at subtotal (cannot go negative)', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.FLAT_AMOUNT,
        discountValue: 100.00,
      })

      const result = calculatePromotionDiscount(promo, 50.00, 3.99)

      expect(result.discountAmount).toBe(50.00)
    })

    it('handles edge case: discount equals subtotal exactly', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.FLAT_AMOUNT,
        discountValue: 50.00,
      })

      const result = calculatePromotionDiscount(promo, 50.00, 3.99)

      expect(result.discountAmount).toBe(50.00)
    })
  })

  describe('PERCENTAGE discount', () => {
    it('calculates correct percentage of subtotal', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0.20, // 20%
      })

      const result = calculatePromotionDiscount(promo, 50.00, 3.99)

      expect(result.discountAmount).toBe(10.00) // 20% of 50
    })

    it('caps at maximumDiscount when set', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0.50, // 50%
        maximumDiscount: 15.00,
      })

      const result = calculatePromotionDiscount(promo, 100.00, 3.99)

      expect(result.discountAmount).toBe(15.00) // Capped at max
    })

    it('does not cap when maximumDiscount is null', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0.50,
        maximumDiscount: null,
      })

      const result = calculatePromotionDiscount(promo, 100.00, 3.99)

      expect(result.discountAmount).toBe(50.00) // Full 50%
    })

    it('rounds to 2 decimal places', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0.15, // 15%
      })

      const result = calculatePromotionDiscount(promo, 33.33, 3.99)

      // 15% of 33.33 = 4.9995, should round to 5.00
      expect(result.discountAmount).toBe(5.00)
    })
  })

  describe('FREE_DELIVERY discount', () => {
    it('sets waivesDeliveryFee to true', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.FREE_DELIVERY,
      })

      const result = calculatePromotionDiscount(promo, 50.00, 3.99)

      expect(result.waivesDeliveryFee).toBe(true)
    })

    it('does not affect discountAmount (handled separately in pricing)', () => {
      const promo = createMockPromotion({
        discountType: DiscountType.FREE_DELIVERY,
      })

      const result = calculatePromotionDiscount(promo, 50.00, 3.99)

      expect(result.discountAmount).toBe(0)
    })
  })
})

// ============================================================================
// Error Message Tests
// ============================================================================

describe('getIneligibilityMessage', () => {
  it('returns appropriate message for each reason code', () => {
    expect(getIneligibilityMessage('CODE_NOT_FOUND')).toBe('Promo code not found')
    expect(getIneligibilityMessage('CODE_INACTIVE')).toContain('no longer active')
    expect(getIneligibilityMessage('CODE_EXPIRED')).toContain('expired')
    expect(getIneligibilityMessage('USER_LIMIT_REACHED')).toContain('already used')
    expect(getIneligibilityMessage('FIRST_ORDER_ONLY')).toContain('first orders only')
  })

  it('includes minimum amount in BELOW_MINIMUM_ORDER message', () => {
    const promo = createMockPromotion({ minimumOrderAmount: 30.00 })
    const message = getIneligibilityMessage('BELOW_MINIMUM_ORDER', promo)

    expect(message).toContain('$30.00')
  })
})
