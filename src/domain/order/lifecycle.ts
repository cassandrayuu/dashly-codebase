/**
 * Order Lifecycle Logic
 *
 * Manages order state transitions, cancellation rules, and status messages.
 *
 * Status Flow:
 *   PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → COURIER_ASSIGNED → PICKED_UP → DELIVERED
 *   (any status except PICKED_UP/DELIVERED can transition to CANCELLED)
 *
 * Cancellation Fee Schedule (after 5-minute free window):
 *   PENDING: $0 | CONFIRMED: $2 flat | PREPARING: 25% | READY: 50% | COURIER_ASSIGNED: 50% + delivery fee
 *
 * LIMITATION_ORDER_EDITING
 *
 * Post-checkout order modifications are not supported. Once placed, an order
 * is immutable—corrections require cancellation (with fees) and reorder.
 *
 * Current rigidity:
 * - No item additions or removals after PENDING
 * - No delivery address changes after order placement
 * - No tip adjustments after checkout
 * - No special instructions updates
 * - All-or-nothing cancellation (no partial item cancellation)
 * - Corrections push customers to manual support handling
 *
 * Enhancement opportunities:
 * - Time-window for modifications (e.g., first 2 minutes, or before CONFIRMED)
 * - Item-level changes with automatic price recalculation
 * - Address correction with delivery zone revalidation
 * - Post-delivery tip adjustment
 * - Partial cancellation (remove one item vs. cancel entire order)
 * - In-app messaging between customer, merchant, courier
 */

import { Order } from '@prisma/client'
import { OrderStatus } from '@/lib/enums'
import { OrderStatusTransition, OrderCancellation } from './types'
import { ORDER_STATUS_TRANSITIONS, FREE_CANCELLATION_MINUTES } from '@/lib/constants'

/**
 * Check if a status transition is allowed per ORDER_STATUS_TRANSITIONS.
 */
export function canTransitionToStatus(
  currentStatus: OrderStatus | string,
  newStatus: OrderStatus | string
): OrderStatusTransition {
  const current = currentStatus as OrderStatus
  const next = newStatus as OrderStatus
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[current] || []

  if (allowedTransitions.includes(next)) {
    return { isAllowed: true, reason: null }
  }

  // Provide specific error messages for common invalid transitions
  if (current === OrderStatus.DELIVERED) {
    return {
      isAllowed: false,
      reason: 'Order has already been delivered',
    }
  }

  if (current === OrderStatus.CANCELLED) {
    return {
      isAllowed: false,
      reason: 'Order has been cancelled',
    }
  }

  return {
    isAllowed: false,
    reason: `Cannot transition from ${formatStatusForDisplay(current)} to ${formatStatusForDisplay(next)}`,
  }
}

/**
 * Check if an order can be cancelled and calculate the applicable fee.
 */
export function checkOrderCancellation(
  order: Order,
  currentTime: Date = new Date()
): OrderCancellation {
  // ─────────────────────────────────────────────────────────────────────────
  // RULE: Cannot cancel already-delivered orders
  // ─────────────────────────────────────────────────────────────────────────
  if (order.status === OrderStatus.DELIVERED) {
    return {
      canCancel: false,
      reason: 'ALREADY_DELIVERED',
      willIncurFee: false,
      cancellationFee: 0,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE: Cannot cancel already-cancelled orders
  // ─────────────────────────────────────────────────────────────────────────
  if (order.status === OrderStatus.CANCELLED) {
    return {
      canCancel: false,
      reason: 'ALREADY_CANCELLED',
      willIncurFee: false,
      cancellationFee: 0,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE: Cannot cancel after courier has picked up the order
  // At this point, courier has possession and is en route to customer
  // ─────────────────────────────────────────────────────────────────────────
  if (order.status === OrderStatus.PICKED_UP) {
    return {
      canCancel: false,
      reason: 'ALREADY_PICKED_UP',
      willIncurFee: false,
      cancellationFee: 0,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE: Free cancellation within 5 minutes of placing
  // ─────────────────────────────────────────────────────────────────────────
  const millisecondsSinceOrder = currentTime.getTime() - order.placedAt.getTime()
  const minutesSinceOrder = millisecondsSinceOrder / (1000 * 60)
  const isWithinFreeCancellationWindow = minutesSinceOrder <= FREE_CANCELLATION_MINUTES

  // ─────────────────────────────────────────────────────────────────────────
  // RULE: After free window, fee depends on order status
  // ─────────────────────────────────────────────────────────────────────────
  let cancellationFee = 0
  if (!isWithinFreeCancellationWindow) {
    cancellationFee = calculateCancellationFee(order)
  }

  return {
    canCancel: true,
    reason: null,
    willIncurFee: cancellationFee > 0,
    cancellationFee,
  }
}

/**
 * Calculate cancellation fee based on order status.
 */
function calculateCancellationFee(order: Order): number {
  switch (order.status) {
    case OrderStatus.PENDING:
      // No work done yet - no fee
      return 0

    case OrderStatus.CONFIRMED:
      // Merchant accepted, may have started mental prep - small flat fee
      return 2.00

    case OrderStatus.PREPARING:
      // Food is being made, ingredients used - 25% of food cost
      return order.subtotal * 0.25

    case OrderStatus.READY_FOR_PICKUP:
      // Food is fully prepared and waiting - 50% of food cost
      return order.subtotal * 0.50

    case OrderStatus.COURIER_ASSIGNED:
      // Courier dispatched - 50% of food cost + delivery fee
      return order.subtotal * 0.50 + order.deliveryFee

    default:
      return 0
  }
}

/**
 * Get the next status in the happy path (no cancellation).
 * Returns null for terminal states.
 */
export function getNextStatusInHappyPath(currentStatus: OrderStatus): OrderStatus | null {
  const happyPathFlow: Record<OrderStatus, OrderStatus | null> = {
    [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
    [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
    [OrderStatus.PREPARING]: OrderStatus.READY_FOR_PICKUP,
    [OrderStatus.READY_FOR_PICKUP]: OrderStatus.COURIER_ASSIGNED,
    [OrderStatus.COURIER_ASSIGNED]: OrderStatus.PICKED_UP,
    [OrderStatus.PICKED_UP]: OrderStatus.DELIVERED,
    [OrderStatus.DELIVERED]: null, // Terminal state
    [OrderStatus.CANCELLED]: null, // Terminal state
  }
  return happyPathFlow[currentStatus]
}

/**
 * Get customer-facing status message.
 */
export function getStatusMessage(status: OrderStatus): string {
  const messages: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Waiting for restaurant to confirm',
    [OrderStatus.CONFIRMED]: 'Restaurant confirmed your order',
    [OrderStatus.PREPARING]: 'Your food is being prepared',
    [OrderStatus.READY_FOR_PICKUP]: 'Your order is ready for pickup',
    [OrderStatus.COURIER_ASSIGNED]: 'A courier is on the way to pick up your order',
    [OrderStatus.PICKED_UP]: 'Your order is on its way!',
    [OrderStatus.DELIVERED]: 'Order delivered',
    [OrderStatus.CANCELLED]: 'Order cancelled',
  }
  return messages[status]
}

/**
 * Get the database field name that stores the timestamp for a status.
 */
export function getTimestampFieldForStatus(status: OrderStatus): string | null {
  const timestampFields: Record<OrderStatus, string | null> = {
    [OrderStatus.PENDING]: 'placedAt',
    [OrderStatus.CONFIRMED]: 'confirmedAt',
    [OrderStatus.PREPARING]: 'preparingAt',
    [OrderStatus.READY_FOR_PICKUP]: 'readyAt',
    [OrderStatus.COURIER_ASSIGNED]: null, // Timestamp inferred from courier assignment
    [OrderStatus.PICKED_UP]: 'pickedUpAt',
    [OrderStatus.DELIVERED]: 'deliveredAt',
    [OrderStatus.CANCELLED]: 'cancelledAt',
  }
  return timestampFields[status]
}

/**
 * Format status enum for display.
 */
function formatStatusForDisplay(status: OrderStatus): string {
  return status.replace(/_/g, ' ')
}
