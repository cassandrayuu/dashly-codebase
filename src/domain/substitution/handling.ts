/**
 * Substitution Handling Logic
 *
 * Manages item substitutions when menu items become unavailable.
 *
 * Substitution Flow:
 * 1. Merchant marks item as UNAVAILABLE
 * 2. Merchant optionally offers a SUBSTITUTE_OFFERED
 * 3. Customer can ACCEPT, REJECT, or request REFUND
 * 4. If rejected, item is removed and order total adjusted
 * 5. If accepted, substitute item is used at original price (or adjusted)
 *
 * Business Rules:
 * 1. Substitution only allowed before order is READY_FOR_PICKUP
 * 2. Price adjustments are calculated at time of acceptance
 * 3. If substitute costs more, customer is not charged extra (v1)
 * 4. If substitute costs less, difference is refunded
 *
 * LIMITATION_SUBSTITUTION_INTELLIGENCE
 *
 * Current implementation is rule-based with no intelligence:
 * - Single substitute option per item (no ranked alternatives)
 * - No customer preference settings ("always accept similar", "always ask me")
 * - Merchant manually selects substitute for each unavailable item
 * - No category-based auto-substitution (Coke → Pepsi)
 * - No similarity scoring or price-tier matching
 *
 * Enhancement opportunities:
 * - Customer substitution preferences in user profile
 * - Merchant-defined substitute mappings per menu item
 * - Category-based fallback suggestions
 * - Multiple ranked substitute options
 * - Push notification when customer decision is needed
 */

import { OrderItem } from '@prisma/client'
import { SubstitutionStatus, OrderStatus } from '@/lib/enums'
import { SubstitutionOffer, SubstitutionDecision, SubstitutionResult } from './types'

/**
 * Check if substitution is allowed for an order's current status.
 */
export function canOfferSubstitution(orderStatus: OrderStatus | string): boolean {
  const allowedStatuses: string[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
  ]
  return allowedStatuses.includes(orderStatus as string)
}

/**
 * Process a customer's decision on a substitution offer.
 *
 * @param item - The order item with substitution offer
 * @param decision - Customer's decision
 * @param substitutePrice - Price of substitute item (if accepting)
 * @returns Result with new status and price adjustment
 */
export function processSubstitutionDecision(
  item: OrderItem,
  decision: SubstitutionDecision,
  substitutePrice?: number
): SubstitutionResult {
  switch (decision.action) {
    case 'ACCEPT':
      // Customer accepts the substitute
      const originalPrice = item.priceAtPurchase * item.quantity
      const newPrice = (substitutePrice ?? item.priceAtPurchase) * item.quantity

      // In v1, we don't charge extra for more expensive substitutes
      // But we do refund if substitute is cheaper
      const priceAdjustment = Math.min(0, newPrice - originalPrice)

      return {
        success: true,
        newStatus: SubstitutionStatus.SUBSTITUTE_ACCEPTED,
        priceAdjustment,
        message:
          priceAdjustment < 0
            ? `Substitute accepted. $${Math.abs(priceAdjustment).toFixed(2)} will be refunded.`
            : 'Substitute accepted.',
      }

    case 'REJECT':
      // Customer rejects, item removed from order
      const refundAmount = -(item.priceAtPurchase * item.quantity)

      return {
        success: true,
        newStatus: SubstitutionStatus.SUBSTITUTE_REJECTED,
        priceAdjustment: refundAmount,
        message: `Item removed. $${Math.abs(refundAmount).toFixed(2)} will be refunded.`,
      }

    case 'REFUND':
      // Customer wants refund instead of substitute or removal
      const itemRefund = -(item.priceAtPurchase * item.quantity)

      return {
        success: true,
        newStatus: SubstitutionStatus.REFUND_REQUESTED,
        priceAdjustment: itemRefund,
        message: `Refund requested for item. $${Math.abs(itemRefund).toFixed(2)} will be refunded.`,
      }

    default:
      return {
        success: false,
        newStatus: item.substitutionStatus as SubstitutionStatus,
        priceAdjustment: 0,
        message: 'Invalid substitution decision',
      }
  }
}

/**
 * Calculate the total price adjustment for all substitutions in an order.
 */
export function calculateTotalSubstitutionAdjustment(
  items: OrderItem[],
  decisions: SubstitutionDecision[],
  substitutePrices: Record<string, number>
): number {
  let totalAdjustment = 0

  for (const decision of decisions) {
    const item = items.find((i) => i.id === decision.itemId)
    if (!item) continue

    const result = processSubstitutionDecision(
      item,
      decision,
      substitutePrices[decision.itemId]
    )
    totalAdjustment += result.priceAdjustment
  }

  return totalAdjustment
}

/**
 * Get customer-friendly message for substitution status.
 */
export function getSubstitutionStatusMessage(status: SubstitutionStatus): string {
  switch (status) {
    case SubstitutionStatus.NONE:
      return ''
    case SubstitutionStatus.UNAVAILABLE:
      return 'This item is unavailable'
    case SubstitutionStatus.SUBSTITUTE_OFFERED:
      return 'A substitute has been offered'
    case SubstitutionStatus.SUBSTITUTE_ACCEPTED:
      return 'Substitute accepted'
    case SubstitutionStatus.SUBSTITUTE_REJECTED:
      return 'Item removed from order'
    case SubstitutionStatus.REFUND_REQUESTED:
      return 'Refund requested'
    default:
      return ''
  }
}
