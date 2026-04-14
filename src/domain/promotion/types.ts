/**
 * Promotion domain types
 */

import { Promotion } from '@prisma/client'
import { DiscountType } from '@/lib/enums'

export interface PromotionEligibilityCheck {
  isEligible: boolean
  reason: PromotionIneligibilityReason | null
  promotion: Promotion | null
}

export type PromotionIneligibilityReason =
  | 'CODE_NOT_FOUND'
  | 'CODE_INACTIVE'
  | 'CODE_EXPIRED'
  | 'CODE_NOT_YET_VALID'
  | 'BELOW_MINIMUM_ORDER'
  | 'WRONG_RESTAURANT'
  | 'USAGE_LIMIT_REACHED'
  | 'USER_LIMIT_REACHED'
  | 'FIRST_ORDER_ONLY'

export interface PromotionApplication {
  isValid: boolean
  discountAmount: number
  waivesDeliveryFee: boolean
  appliedPromoCode: string | null
  appliedPromoId: string | null
  message: string
}

export interface PromotionContext {
  customerId: string
  restaurantId: string
  subtotal: number
  deliveryFee: number
  isFirstOrder: boolean
  existingUsageCount: number // How many times this user has used this promo
  totalUsageCount: number // Total uses across all users
}

export { DiscountType }
