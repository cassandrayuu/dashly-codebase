/**
 * Refund Eligibility Tests
 *
 * Tests for refund request validation.
 */

import { describe, it, expect } from 'vitest'
import { checkRefundEligibility, getSuggestedRefundAmount } from '../refund/eligibility'
import { Order, Refund, OrderItem } from '@prisma/client'
import { OrderStatus, RefundStatus, RefundReason } from '@/lib/enums'
import { OrderWithRefunds } from '../refund/eligibility'

// Use relative dates for testing
const NOW = new Date()
const ONE_HOUR_AGO = new Date(NOW.getTime() - 1 * 60 * 60 * 1000)

// Mock order factory
function createMockOrderWithRefunds(overrides: Partial<Order> = {}, refunds: Refund[] = []): OrderWithRefunds {
  return {
    id: 'order-1',
    customerId: 'cust-1',
    restaurantId: 'rest-1',
    courierId: 'courier-1',
    deliveryAddressId: 'addr-1',
    status: OrderStatus.DELIVERED,
    placedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    confirmedAt: new Date(NOW.getTime() - 115 * 60 * 1000), // 1h55m ago
    preparingAt: new Date(NOW.getTime() - 110 * 60 * 1000), // 1h50m ago
    readyAt: new Date(NOW.getTime() - 90 * 60 * 1000), // 1h30m ago
    pickedUpAt: new Date(NOW.getTime() - 85 * 60 * 1000), // 1h25m ago
    deliveredAt: ONE_HOUR_AGO, // Default: within 24 hour window
    cancelledAt: null,
    subtotal: 45.00,
    deliveryFee: 3.99,
    serviceFee: 2.25,
    discount: 0,
    tip: 5.00,
    total: 56.24,
    appliedPromoCode: null,
    appliedPromoId: null,
    deliveryInstructions: null,
    estimatedDelivery: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    refunds,
    items: [],
    ...overrides,
  }
}

describe('checkRefundEligibility', () => {
  it('returns eligible for delivered order within 24 hours', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    const order = createMockOrderWithRefunds({
      status: OrderStatus.DELIVERED,
      deliveredAt: twoHoursAgo,
    })

    const result = checkRefundEligibility(order, RefundReason.WRONG_ITEMS, now)

    expect(result.isEligible).toBe(true)
    expect(result.maxRefundAmount).toBe(order.total)
  })

  it('returns ineligible for non-delivered order', () => {
    const order = createMockOrderWithRefunds({
      status: OrderStatus.PREPARING,
      deliveredAt: null,
    })

    const result = checkRefundEligibility(order, RefundReason.WRONG_ITEMS)

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('ORDER_NOT_DELIVERED')
  })

  it('returns ineligible after 24-hour window', () => {
    const now = new Date()
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000)

    const order = createMockOrderWithRefunds({
      status: OrderStatus.DELIVERED,
      deliveredAt: thirtyHoursAgo,
    })

    const result = checkRefundEligibility(order, RefundReason.WRONG_ITEMS, now)

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('REFUND_WINDOW_EXPIRED')
  })

  it('returns ineligible when already fully refunded', () => {
    const existingRefund: Refund = {
      id: 'ref-1',
      orderId: 'order-1',
      requesterId: 'cust-1',
      processedById: 'admin-1',
      reason: RefundReason.WRONG_ITEMS,
      reasonDetail: null,
      refundType: 'FULL',
      amount: 56.24, // Full amount
      itemIds: null,
      status: RefundStatus.APPROVED,
      adminNote: null,
      requestedAt: new Date(),
      resolvedAt: new Date(),
    }

    const order = createMockOrderWithRefunds({}, [existingRefund])

    const result = checkRefundEligibility(order, RefundReason.MISSING_ITEMS)

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('ALREADY_REFUNDED')
  })

  it('allows partial refund when some amount remains', () => {
    const existingRefund: Refund = {
      id: 'ref-1',
      orderId: 'order-1',
      requesterId: 'cust-1',
      processedById: 'admin-1',
      reason: RefundReason.MISSING_ITEMS,
      reasonDetail: null,
      refundType: 'PARTIAL',
      amount: 20.00, // Partial refund
      itemIds: null,
      status: RefundStatus.APPROVED,
      adminNote: null,
      requestedAt: new Date(),
      resolvedAt: new Date(),
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000)

    const order = createMockOrderWithRefunds(
      { deliveredAt: oneHourAgo },
      [existingRefund]
    )

    const result = checkRefundEligibility(order, RefundReason.QUALITY_ISSUE, now)

    expect(result.isEligible).toBe(true)
    expect(result.maxRefundAmount).toBe(36.24) // 56.24 - 20.00
  })

  it('handles NEVER_DELIVERED for undelivered orders', () => {
    const order = createMockOrderWithRefunds({
      status: OrderStatus.PICKED_UP,
      deliveredAt: null,
    })

    const result = checkRefundEligibility(order, RefundReason.NEVER_DELIVERED)

    expect(result.isEligible).toBe(true)
    expect(result.maxRefundAmount).toBe(order.total)
  })

  it('returns ineligible for NEVER_DELIVERED on delivered order', () => {
    const order = createMockOrderWithRefunds({
      status: OrderStatus.DELIVERED,
    })

    const result = checkRefundEligibility(order, RefundReason.NEVER_DELIVERED)

    expect(result.isEligible).toBe(false)
    // When actually delivered, reason is null (different refund reason needed)
  })

  it('returns ineligible for cancelled orders', () => {
    const order = createMockOrderWithRefunds({
      status: OrderStatus.CANCELLED,
    })

    const result = checkRefundEligibility(order, RefundReason.NEVER_DELIVERED)

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('ORDER_CANCELLED')
  })
})

describe('getSuggestedRefundAmount', () => {
  const mockOrder: Order = {
    id: 'order-1',
    customerId: 'cust-1',
    restaurantId: 'rest-1',
    courierId: 'courier-1',
    deliveryAddressId: 'addr-1',
    status: OrderStatus.DELIVERED,
    placedAt: new Date(),
    confirmedAt: new Date(),
    preparingAt: new Date(),
    readyAt: new Date(),
    pickedUpAt: new Date(),
    deliveredAt: new Date(),
    cancelledAt: null,
    subtotal: 45.00,
    deliveryFee: 3.99,
    serviceFee: 2.25,
    discount: 0,
    tip: 5.00,
    total: 56.24,
    appliedPromoCode: null,
    appliedPromoId: null,
    deliveryInstructions: null,
    estimatedDelivery: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('suggests full refund for NEVER_DELIVERED', () => {
    const amount = getSuggestedRefundAmount(mockOrder, RefundReason.NEVER_DELIVERED)
    expect(amount).toBe(mockOrder.total)
  })

  it('suggests delivery fee refund for EXCESSIVE_DELAY', () => {
    const amount = getSuggestedRefundAmount(mockOrder, RefundReason.EXCESSIVE_DELAY)
    expect(amount).toBe(mockOrder.deliveryFee)
  })

  it('suggests 50% of subtotal for QUALITY_ISSUE', () => {
    const amount = getSuggestedRefundAmount(mockOrder, RefundReason.QUALITY_ISSUE)
    expect(amount).toBe(mockOrder.subtotal * 0.5)
  })

  it('returns 0 for item-specific issues (needs manual calculation)', () => {
    const amount = getSuggestedRefundAmount(mockOrder, RefundReason.MISSING_ITEMS)
    expect(amount).toBe(0)
  })
})
