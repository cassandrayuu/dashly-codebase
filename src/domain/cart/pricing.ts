/**
 * Cart Pricing Logic
 *
 * Calculates order totals including fees and discounts.
 *
 * Pricing Structure:
 * 1. Subtotal = sum of (item price × quantity)
 * 2. Delivery Fee = restaurant's delivery fee (may be waived by promo)
 * 3. Service Fee = 5% of subtotal, min $0.50, max $10.00
 * 4. Discount = calculated from applied promo code
 * 5. Total = subtotal + delivery fee + service fee - discount
 */

import { CartWithDetails, CartPricing } from './types'
import {
  SERVICE_FEE_PERCENTAGE,
  MINIMUM_SERVICE_FEE,
  MAXIMUM_SERVICE_FEE,
} from '@/lib/constants'
import { PromotionApplication } from '../promotion/types'

/**
 * Calculate full pricing breakdown for a cart.
 *
 * @param cart - Cart with items and restaurant
 * @param promoApplication - Optional applied promotion
 * @returns Full pricing breakdown
 */
export function calculateCartPricing(
  cart: CartWithDetails,
  promoApplication?: PromotionApplication
): CartPricing {
  // Calculate subtotal
  const subtotal = cart.items.reduce((sum, item) => {
    return sum + item.menuItem.price * item.quantity
  }, 0)

  // Calculate delivery fee
  let deliveryFee = cart.restaurant.deliveryFee

  // Calculate service fee (percentage with min/max)
  let serviceFee = subtotal * SERVICE_FEE_PERCENTAGE
  serviceFee = Math.max(MINIMUM_SERVICE_FEE, serviceFee)
  serviceFee = Math.min(MAXIMUM_SERVICE_FEE, serviceFee)

  // Apply discount
  let discount = 0
  if (promoApplication && promoApplication.isValid) {
    discount = promoApplication.discountAmount

    // Handle free delivery promo
    if (promoApplication.waivesDeliveryFee) {
      deliveryFee = 0
    }
  }

  // Calculate total
  const total = subtotal + deliveryFee + serviceFee - discount

  // Count items
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    subtotal: roundCurrency(subtotal),
    deliveryFee: roundCurrency(deliveryFee),
    serviceFee: roundCurrency(serviceFee),
    discount: roundCurrency(discount),
    total: roundCurrency(Math.max(0, total)), // Never negative
    itemCount,
  }
}

/**
 * Round to 2 decimal places for currency.
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}
