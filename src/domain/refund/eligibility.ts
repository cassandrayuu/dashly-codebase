/**
 * Refund Eligibility Logic
 *
 * Determines refund eligibility and calculates amounts.
 *
 * Eligibility:
 * - Order must be DELIVERED (except NEVER_DELIVERED reason)
 * - Request within 24 hours of delivery
 * - Total refunds cannot exceed order total
 * - Cancelled orders not eligible
 *
 * Refund Types:
 * - FULL: Entire order total
 * - PARTIAL: Specific items
 * - DELIVERY_FEE: Delivery fee only
 *
 * V1 Limitations:
 * - Manual admin review required
 * - No photo evidence uploads
 * - No merchant input in process
 */

import { Order, OrderItem, Refund } from '@prisma/client'
import { OrderStatus, RefundStatus } from '@/lib/enums'
import { RefundEligibility, RefundIneligibilityReason, RefundReason } from './types'
import { REFUND_ELIGIBILITY_HOURS } from '@/lib/constants'

/**
 * LIMITATION_AUTO_REFUNDS
 *
 * Currently all refunds require manual admin approval. Even clear-cut cases
 * like NEVER_DELIVERED wait in PENDING status.
 *
 * To support automatic refund approval:
 * 1. Define auto-approval rules (e.g., NEVER_DELIVERED with courier GPS data)
 * 2. Add confidence scoring based on evidence
 * 3. Set dollar thresholds for auto-approval
 * 4. Track auto-approval success rate
 * 5. Allow merchant appeals for auto-approved refunds
 *
 * Suggested auto-approval candidates:
 * - NEVER_DELIVERED: Auto-approve if courier GPS shows no arrival
 * - EXCESSIVE_DELAY: Auto-approve delivery fee if >30 min past estimate
 * - Small amounts: Auto-approve refunds under $10 for good-standing customers
 */

export interface OrderWithRefunds extends Order {
  refunds: Refund[]
  items: OrderItem[]
}

/**
 * Check if an order is eligible for a refund.
 *
 * Validates all eligibility rules and returns the maximum refundable amount.
 *
 * @param order - Order with populated refunds array
 * @param reason - The reason for requesting the refund
 * @param currentTime - Current time (injectable for testing)
 * @returns Eligibility result with max refund amount if eligible
 */
export function checkRefundEligibility(
  order: OrderWithRefunds,
  reason: RefundReason,
  currentTime: Date = new Date()
): RefundEligibility {
  // ─────────────────────────────────────────────────────────────────────────
  // SPECIAL CASE: NEVER_DELIVERED reason
  // This can be requested BEFORE the order shows as delivered
  // ─────────────────────────────────────────────────────────────────────────
  if (reason === 'NEVER_DELIVERED') {
    // If order actually shows as delivered, customer needs different reason
    if (order.status === OrderStatus.DELIVERED) {
      return {
        isEligible: false,
        reason: null, // Not a standard ineligibility - order WAS delivered
        maxRefundAmount: order.total,
      }
    }

    // Cancelled orders don't need refunds (weren't charged)
    if (order.status === OrderStatus.CANCELLED) {
      return {
        isEligible: false,
        reason: 'ORDER_CANCELLED',
        maxRefundAmount: 0,
      }
    }

    // Order not delivered - eligible for full refund
    return {
      isEligible: true,
      reason: null,
      maxRefundAmount: order.total,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 1: For non-NEVER_DELIVERED reasons, order must be DELIVERED
  // ─────────────────────────────────────────────────────────────────────────
  if (order.status !== OrderStatus.DELIVERED) {
    return {
      isEligible: false,
      reason: 'ORDER_NOT_DELIVERED',
      maxRefundAmount: 0,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 2: Must be within refund eligibility window (24 hours)
  // Clock starts at delivery time
  // ─────────────────────────────────────────────────────────────────────────
  if (order.deliveredAt) {
    const millisecondsSinceDelivery = currentTime.getTime() - order.deliveredAt.getTime()
    const hoursSinceDelivery = millisecondsSinceDelivery / (1000 * 60 * 60)

    if (hoursSinceDelivery > REFUND_ELIGIBILITY_HOURS) {
      return {
        isEligible: false,
        reason: 'REFUND_WINDOW_EXPIRED',
        maxRefundAmount: 0,
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE 3: Cannot refund more than order total (sum of partial refunds)
  // ─────────────────────────────────────────────────────────────────────────
  const approvedOrProcessedRefunds = order.refunds.filter(
    (refund) =>
      refund.status === RefundStatus.APPROVED ||
      refund.status === RefundStatus.PROCESSED
  )
  const totalAlreadyRefunded = approvedOrProcessedRefunds.reduce(
    (sum, refund) => sum + refund.amount,
    0
  )

  if (totalAlreadyRefunded >= order.total) {
    return {
      isEligible: false,
      reason: 'ALREADY_REFUNDED',
      maxRefundAmount: 0,
    }
  }

  // Calculate remaining refundable amount
  const maxRefundAmount = order.total - totalAlreadyRefunded

  return {
    isEligible: true,
    reason: null,
    maxRefundAmount,
  }
}

/**
 * Calculate refund amount for a list of specific items.
 * Used for PARTIAL refunds where customer specifies which items had issues.
 */
export function calculateItemRefundAmount(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    return sum + item.priceAtPurchase * item.quantity
  }, 0)
}

// Legacy alias
export const calculateItemRefund = calculateItemRefundAmount

/**
 * Get suggested refund amount based on reason.
 *
 * These are guidelines for admins, not hard rules. Admins can adjust
 * the amount during review.
 */
export function getSuggestedRefundAmountByReason(
  order: Order,
  reason: RefundReason
): number {
  switch (reason) {
    case 'NEVER_DELIVERED':
      // Customer didn't receive anything - full refund
      return order.total

    case 'EXCESSIVE_DELAY':
      // Delivery was significantly late - refund delivery fee as compensation
      return order.deliveryFee

    case 'MISSING_ITEMS':
    case 'WRONG_ITEMS':
      // These require item-specific calculation
      // Return 0 to indicate admin needs to calculate based on affected items
      return 0

    case 'QUALITY_ISSUE':
      // Food quality problem - 50% of food cost as standard compensation
      return order.subtotal * 0.5

    case 'OTHER':
      // No standard suggestion - fully at admin discretion
      return 0

    default:
      return 0
  }
}

// Legacy alias
export const getSuggestedRefundAmount = getSuggestedRefundAmountByReason

/**
 * Get customer-friendly message explaining why refund is not available.
 */
export function getRefundIneligibilityMessage(reason: RefundIneligibilityReason): string {
  const messages: Record<RefundIneligibilityReason, string> = {
    ORDER_NOT_DELIVERED: 'Order has not been delivered yet',
    ORDER_CANCELLED: 'Order was cancelled and no charge was made',
    REFUND_WINDOW_EXPIRED: `Refund requests must be made within ${REFUND_ELIGIBILITY_HOURS} hours of delivery`,
    ALREADY_REFUNDED: 'This order has already been fully refunded',
    AMOUNT_EXCEEDS_ORDER: 'Refund amount cannot exceed the remaining order total',
  }
  return messages[reason] || 'Refund is not available for this order'
}

// Legacy alias
export const getIneligibilityMessage = getRefundIneligibilityMessage
