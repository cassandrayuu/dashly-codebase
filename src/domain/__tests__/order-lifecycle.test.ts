/**
 * Order Lifecycle Tests
 *
 * Tests for order status transitions and cancellation rules.
 */

import { describe, it, expect } from 'vitest'
import { canTransitionToStatus, checkOrderCancellation, getNextStatusInHappyPath } from '../order/lifecycle'
import { Order } from '@prisma/client'
import { OrderStatus } from '@/lib/enums'

// Mock order factory
function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'cust-1',
    restaurantId: 'rest-1',
    courierId: null,
    deliveryAddressId: 'addr-1',
    status: OrderStatus.PENDING,
    placedAt: new Date(),
    confirmedAt: null,
    preparingAt: null,
    readyAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    cancelledAt: null,
    subtotal: 50.00,
    deliveryFee: 3.99,
    serviceFee: 2.50,
    discount: 0,
    tip: 5.00,
    total: 61.49,
    appliedPromoCode: null,
    appliedPromoId: null,
    deliveryInstructions: null,
    estimatedDelivery: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('canTransitionToStatus', () => {
  it('allows PENDING to CONFIRMED', () => {
    const result = canTransitionToStatus(OrderStatus.PENDING, OrderStatus.CONFIRMED)
    expect(result.isAllowed).toBe(true)
  })

  it('allows PENDING to CANCELLED', () => {
    const result = canTransitionToStatus(OrderStatus.PENDING, OrderStatus.CANCELLED)
    expect(result.isAllowed).toBe(true)
  })

  it('allows CONFIRMED to PREPARING', () => {
    const result = canTransitionToStatus(OrderStatus.CONFIRMED, OrderStatus.PREPARING)
    expect(result.isAllowed).toBe(true)
  })

  it('allows PREPARING to READY_FOR_PICKUP', () => {
    const result = canTransitionToStatus(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP)
    expect(result.isAllowed).toBe(true)
  })

  it('allows PICKED_UP to DELIVERED', () => {
    const result = canTransitionToStatus(OrderStatus.PICKED_UP, OrderStatus.DELIVERED)
    expect(result.isAllowed).toBe(true)
  })

  it('disallows skipping statuses', () => {
    const result = canTransitionToStatus(OrderStatus.PENDING, OrderStatus.DELIVERED)
    expect(result.isAllowed).toBe(false)
  })

  it('disallows transition from DELIVERED', () => {
    const result = canTransitionToStatus(OrderStatus.DELIVERED, OrderStatus.CANCELLED)
    expect(result.isAllowed).toBe(false)
    expect(result.reason).toContain('delivered')
  })

  it('disallows transition from CANCELLED', () => {
    const result = canTransitionToStatus(OrderStatus.CANCELLED, OrderStatus.PENDING)
    expect(result.isAllowed).toBe(false)
    expect(result.reason).toContain('cancelled')
  })
})

describe('checkOrderCancellation', () => {
  it('allows cancellation of PENDING orders', () => {
    const order = createMockOrder({ status: OrderStatus.PENDING })
    const result = checkOrderCancellation(order)
    expect(result.canCancel).toBe(true)
  })

  it('allows cancellation of CONFIRMED orders', () => {
    const order = createMockOrder({ status: OrderStatus.CONFIRMED })
    const result = checkOrderCancellation(order)
    expect(result.canCancel).toBe(true)
  })

  it('allows cancellation of PREPARING orders', () => {
    const order = createMockOrder({ status: OrderStatus.PREPARING })
    const result = checkOrderCancellation(order)
    expect(result.canCancel).toBe(true)
  })

  it('disallows cancellation after PICKED_UP', () => {
    const order = createMockOrder({ status: OrderStatus.PICKED_UP })
    const result = checkOrderCancellation(order)
    expect(result.canCancel).toBe(false)
    expect(result.reason).toBe('ALREADY_PICKED_UP')
  })

  it('disallows cancellation of DELIVERED orders', () => {
    const order = createMockOrder({ status: OrderStatus.DELIVERED })
    const result = checkOrderCancellation(order)
    expect(result.canCancel).toBe(false)
    expect(result.reason).toBe('ALREADY_DELIVERED')
  })

  it('disallows cancellation of already CANCELLED orders', () => {
    const order = createMockOrder({ status: OrderStatus.CANCELLED })
    const result = checkOrderCancellation(order)
    expect(result.canCancel).toBe(false)
    expect(result.reason).toBe('ALREADY_CANCELLED')
  })

  it('has no fee within 5 minutes of placing', () => {
    const justPlaced = new Date()
    const order = createMockOrder({
      status: OrderStatus.CONFIRMED,
      placedAt: justPlaced,
    })

    const result = checkOrderCancellation(order, new Date(justPlaced.getTime() + 3 * 60 * 1000)) // 3 min later

    expect(result.canCancel).toBe(true)
    expect(result.willIncurFee).toBe(false)
    expect(result.cancellationFee).toBe(0)
  })

  it('has fee after 5 minutes for CONFIRMED orders', () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const order = createMockOrder({
      status: OrderStatus.CONFIRMED,
      placedAt: fifteenMinutesAgo,
    })

    const result = checkOrderCancellation(order)

    expect(result.canCancel).toBe(true)
    expect(result.willIncurFee).toBe(true)
    expect(result.cancellationFee).toBe(2.00) // Fixed fee for CONFIRMED
  })

  it('has higher fee for PREPARING orders', () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const order = createMockOrder({
      status: OrderStatus.PREPARING,
      placedAt: fifteenMinutesAgo,
    })

    const result = checkOrderCancellation(order)

    expect(result.canCancel).toBe(true)
    expect(result.willIncurFee).toBe(true)
    expect(result.cancellationFee).toBe(order.subtotal * 0.25) // 25% of subtotal
  })
})

describe('getNextStatusInHappyPath', () => {
  it('returns CONFIRMED after PENDING', () => {
    expect(getNextStatusInHappyPath(OrderStatus.PENDING)).toBe(OrderStatus.CONFIRMED)
  })

  it('returns PREPARING after CONFIRMED', () => {
    expect(getNextStatusInHappyPath(OrderStatus.CONFIRMED)).toBe(OrderStatus.PREPARING)
  })

  it('returns DELIVERED after PICKED_UP', () => {
    expect(getNextStatusInHappyPath(OrderStatus.PICKED_UP)).toBe(OrderStatus.DELIVERED)
  })

  it('returns null for DELIVERED (terminal state)', () => {
    expect(getNextStatusInHappyPath(OrderStatus.DELIVERED)).toBe(null)
  })

  it('returns null for CANCELLED (terminal state)', () => {
    expect(getNextStatusInHappyPath(OrderStatus.CANCELLED)).toBe(null)
  })
})
