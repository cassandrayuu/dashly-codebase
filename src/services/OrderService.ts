/**
 * Order Service
 *
 * Orchestrates order operations including:
 * - Placing orders (checkout)
 * - Status updates
 * - Cancellation
 * - Order history
 *
 * This service coordinates between cart, promotion, and order domain logic.
 *
 * LIMITATION_ORDER_EDITING: Orders are currently immutable after placement.
 * This service has no edit/modify methods—only cancel. See
 * docs/known-limitations.md for enhancement opportunities including:
 * - Time-windowed modifications (before CONFIRMED)
 * - Item add/remove with price recalculation
 * - Address correction with zone revalidation
 * - Post-delivery tip adjustment
 */

import { prisma } from '@/lib/db'
import { Order, Prisma } from '@prisma/client'
import { OrderStatus } from '@/lib/enums'
import { cartService } from './CartService'
import { calculateCartPricing } from '@/domain/cart/pricing'
import { canTransitionToStatus, checkOrderCancellation, getTimestampFieldForStatus } from '@/domain/order/lifecycle'
import { PromotionApplication } from '@/domain/promotion/types'

export interface PlaceOrderInput {
  customerId: string
  restaurantId: string
  deliveryAddressId: string
  tip?: number
  deliveryInstructions?: string
}

export interface PlaceOrderResult {
  success: boolean
  order?: Order
  error?: string
}

export class OrderService {
  /**
   * Place a new order from cart contents.
   *
   * This is the main checkout operation that:
   * 1. Validates the cart
   * 2. Applies and locks in any promo code
   * 3. Creates the order with all items
   * 4. Records promo usage
   * 5. Clears the cart
   */
  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const { customerId, restaurantId, deliveryAddressId, tip = 0, deliveryInstructions } = input

    // Validate cart
    const validation = await cartService.validateForCheckout(
      customerId,
      restaurantId,
      deliveryAddressId
    )

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors[0]?.message || 'Cart validation failed',
      }
    }

    // Get cart with all details
    const cart = await cartService.getCart(customerId, restaurantId)
    if (!cart) {
      return { success: false, error: 'Cart not found' }
    }

    // Calculate pricing with promo
    let promoApplication: PromotionApplication | undefined
    if (cart.promoCode) {
      promoApplication = await cartService.applyPromoCode(
        customerId,
        restaurantId,
        cart.promoCode
      )
    }

    const pricing = calculateCartPricing(cart, promoApplication)

    // Get restaurant for prep time estimate
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    // Calculate estimated delivery time
    // LIMITATION_COURIER_BATCHING: ETA is currently static (prep time + 15 min buffer).
    // Does not account for: courier distance, traffic, historical delivery times.
    // See docs/known-limitations.md for ETA enhancement opportunities.
    const estimatedDelivery = new Date()
    estimatedDelivery.setMinutes(
      estimatedDelivery.getMinutes() + (restaurant?.estimatedPrepTime ?? 30) + 15 // +15 for delivery
    )

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          customerId,
          restaurantId,
          deliveryAddressId,
          status: OrderStatus.PENDING,
          subtotal: pricing.subtotal,
          deliveryFee: pricing.deliveryFee,
          serviceFee: pricing.serviceFee,
          discount: pricing.discount,
          tip,
          total: pricing.total + tip,
          appliedPromoCode: promoApplication?.appliedPromoCode,
          appliedPromoId: promoApplication?.appliedPromoId,
          deliveryInstructions,
          estimatedDelivery,
          items: {
            create: cart.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              priceAtPurchase: item.menuItem.price,
              specialInstructions: item.specialInstructions,
            })),
          },
        },
      })

      // Record promo usage if applicable
      if (promoApplication?.isValid && promoApplication.appliedPromoId) {
        await tx.promotionUsage.create({
          data: {
            promotionId: promoApplication.appliedPromoId,
            customerId,
            orderId: newOrder.id,
          },
        })
      }

      // Clear the cart
      await tx.cart.delete({ where: { id: cart.id } })

      return newOrder
    })

    return { success: true, order }
  }

  /**
   * Update order status with validation.
   */
  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    const transition = canTransitionToStatus(order.status, newStatus)
    if (!transition.isAllowed) {
      return { success: false, error: transition.reason ?? 'Invalid transition' }
    }

    // Build update data with timestamp
    const updateData: Prisma.OrderUpdateInput = { status: newStatus }
    const timestampField = getTimestampFieldForStatus(newStatus)
    if (timestampField) {
      (updateData as Record<string, unknown>)[timestampField] = new Date()
    }

    await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    })

    return { success: true }
  }

  /**
   * Cancel an order.
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy: string
  ): Promise<{ success: boolean; cancellationFee: number; error?: string }> {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return { success: false, cancellationFee: 0, error: 'Order not found' }
    }

    const cancellation = checkOrderCancellation(order)
    if (!cancellation.canCancel) {
      return {
        success: false,
        cancellationFee: 0,
        error: getCancellationBlockMessage(cancellation.reason),
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    })

    // If courier was assigned, mark them as available again
    if (order.courierId) {
      await prisma.user.update({
        where: { id: order.courierId },
        data: { courierStatus: 'AVAILABLE' },
      })
    }

    return { success: true, cancellationFee: cancellation.cancellationFee }
  }

  /**
   * Get order by ID with all related data.
   */
  async getOrder(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        courier: {
          select: { id: true, name: true, phone: true },
        },
        deliveryAddress: true,
        refunds: true,
      },
    })
  }

  /**
   * Get orders for a customer.
   */
  async getCustomerOrders(customerId: string, limit: number = 10) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: true,
      },
      orderBy: { placedAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Get orders for a restaurant (merchant view).
   */
  async getRestaurantOrders(restaurantId: string, status?: OrderStatus) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        ...(status && { status }),
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        deliveryAddress: true,
      },
      orderBy: { placedAt: 'desc' },
    })
  }

  /**
   * Get active orders for a courier.
   */
  async getCourierActiveOrder(courierId: string) {
    return prisma.order.findFirst({
      where: {
        courierId,
        status: {
          in: [OrderStatus.COURIER_ASSIGNED, OrderStatus.PICKED_UP],
        },
      },
      include: {
        items: true,
        restaurant: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        deliveryAddress: true,
      },
    })
  }
}

function getCancellationBlockMessage(reason: string | null): string {
  switch (reason) {
    case 'ALREADY_PICKED_UP':
      return 'Order cannot be cancelled after courier pickup'
    case 'ALREADY_DELIVERED':
      return 'Order has already been delivered'
    case 'ALREADY_CANCELLED':
      return 'Order is already cancelled'
    default:
      return 'Order cannot be cancelled'
  }
}

export const orderService = new OrderService()
