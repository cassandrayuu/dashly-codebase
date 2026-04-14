/**
 * Cart Validation Logic
 *
 * Validates cart contents before checkout to ensure the order can be fulfilled.
 *
 * Business Rules:
 * 1. Cart must contain at least one item
 * 2. All items must be currently available
 * 3. Item quantities must be positive integers
 * 4. Subtotal must meet restaurant's minimum order amount
 * 5. Restaurant must be open at checkout time
 * 6. Delivery address must be within restaurant's delivery zone
 *
 * V1 Limitations:
 * - Single restaurant per cart (switching restaurants clears cart)
 * - No per-item quantity caps
 * - No real-time inventory tracking
 */

import { OpeningHours } from '@prisma/client'
import { CartWithDetails, CartValidationResult, CartValidationError } from './types'
import { checkRestaurantAvailability } from '../restaurant/availability'
import { Coordinates } from '../restaurant/types'
import { checkDeliveryZone } from '../restaurant/availability'

/**
 * Validate a cart for checkout.
 *
 * Checks all rules and returns a list of violations. All rules are checked
 * even if some fail, so the customer sees all issues at once.
 */
export function validateCartForCheckout(
  cart: CartWithDetails,
  openingHours: OpeningHours[],
  deliveryLocation?: Coordinates
): CartValidationResult {
  const errors: CartValidationError[] = []

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 1: Cart must have at least one item
  // ─────────────────────────────────────────────────────────────────────────
  if (cart.items.length === 0) {
    errors.push({
      type: 'EMPTY_CART',
      message: 'Your cart is empty',
    })
    // Return early - no point checking other rules with empty cart
    return { isValid: false, errors }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 2: All items must be available
  // Items can become unavailable between adding to cart and checkout
  // ─────────────────────────────────────────────────────────────────────────
  for (const cartItem of cart.items) {
    if (!cartItem.menuItem.isAvailable) {
      errors.push({
        type: 'ITEM_UNAVAILABLE',
        message: `${cartItem.menuItem.name} is no longer available`,
        itemId: cartItem.id,
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 3: Item quantities must be positive integers
  // ─────────────────────────────────────────────────────────────────────────
  for (const cartItem of cart.items) {
    if (cartItem.quantity < 1 || !Number.isInteger(cartItem.quantity)) {
      errors.push({
        type: 'INVALID_QUANTITY',
        message: `Invalid quantity for ${cartItem.menuItem.name}`,
        itemId: cartItem.id,
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 4: Order subtotal must meet restaurant minimum
  // Delivery fee and service fee don't count toward minimum
  // ─────────────────────────────────────────────────────────────────────────
  const subtotal = calculateCartSubtotal(cart)
  const minimumOrderAmount = cart.restaurant.minimumOrderAmount

  if (subtotal < minimumOrderAmount) {
    const amountNeeded = minimumOrderAmount - subtotal
    errors.push({
      type: 'BELOW_MINIMUM',
      message: `Minimum order is $${minimumOrderAmount.toFixed(2)}. Add $${amountNeeded.toFixed(2)} more.`,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 5: Restaurant must be currently open
  // ─────────────────────────────────────────────────────────────────────────
  const availability = checkRestaurantAvailability(cart.restaurant, openingHours)
  if (!availability.isOpen) {
    errors.push({
      type: 'RESTAURANT_CLOSED',
      message: formatClosedMessage(availability.reason, availability.opensAt),
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 6: Delivery address must be within restaurant's delivery zone
  // Only checked if deliveryLocation is provided
  // ─────────────────────────────────────────────────────────────────────────
  if (deliveryLocation) {
    const zoneCheck = checkDeliveryZone(cart.restaurant, deliveryLocation)
    if (!zoneCheck.isDeliverable) {
      errors.push({
        type: 'OUT_OF_DELIVERY_ZONE',
        message: `Delivery address is ${zoneCheck.distanceMiles} miles away. ${cart.restaurant.name} only delivers within ${cart.restaurant.deliveryRadiusMiles} miles.`,
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Calculate cart subtotal (item prices × quantities).
 * Does not include delivery fee, service fee, or discounts.
 */
export function calculateCartSubtotal(cart: CartWithDetails): number {
  return cart.items.reduce((sum, cartItem) => {
    return sum + cartItem.menuItem.price * cartItem.quantity
  }, 0)
}

/**
 * Format a customer-friendly message explaining why the restaurant is closed.
 */
function formatClosedMessage(reason: string, opensAt: string | null): string {
  switch (reason) {
    case 'closed_today':
      return opensAt
        ? `Restaurant is closed today. Opens at ${opensAt}`
        : 'Restaurant is closed today'
    case 'outside_hours':
      return opensAt
        ? `Restaurant is currently closed. Opens at ${opensAt}`
        : 'Restaurant is currently closed'
    case 'inactive':
      return 'This restaurant is not accepting orders'
    default:
      return 'Restaurant is currently closed'
  }
}
