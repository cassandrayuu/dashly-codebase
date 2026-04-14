/**
 * Merchant Service
 *
 * Handles merchant-specific operations:
 * - Order management (accept, prepare, ready)
 * - Menu management
 * - Item availability
 * - Substitution offers
 */

import { prisma } from '@/lib/db'
import { OrderStatus, SubstitutionStatus } from '@/lib/enums'
import { canTransitionToStatus } from '@/domain/order/lifecycle'
import { canOfferSubstitution } from '@/domain/substitution/handling'
import { courierService } from './CourierService'

export class MerchantService {
  /**
   * Get all restaurants owned by a merchant.
   */
  async getRestaurants(merchantId: string) {
    return prisma.restaurant.findMany({
      where: { merchantId },
      include: {
        openingHours: true,
        _count: {
          select: { menuItems: true },
        },
      },
    })
  }

  /**
   * Get incoming orders for a restaurant.
   */
  async getIncomingOrders(restaurantId: string) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
          ],
        },
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
   * Confirm an order (accept it for preparation).
   */
  async confirmOrder(
    orderId: string,
    merchantId: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.restaurant.merchantId !== merchantId) {
      return { success: false, error: 'Not authorized' }
    }

    const transition = canTransitionToStatus(order.status, OrderStatus.CONFIRMED)
    if (!transition.isAllowed) {
      return { success: false, error: transition.reason ?? 'Cannot confirm order' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    })

    return { success: true }
  }

  /**
   * Start preparing an order.
   */
  async startPreparing(
    orderId: string,
    merchantId: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.restaurant.merchantId !== merchantId) {
      return { success: false, error: 'Not authorized' }
    }

    const transition = canTransitionToStatus(order.status, OrderStatus.PREPARING)
    if (!transition.isAllowed) {
      return { success: false, error: transition.reason ?? 'Cannot start preparing' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PREPARING,
        preparingAt: new Date(),
      },
    })

    return { success: true }
  }

  /**
   * Mark order as ready for pickup.
   */
  async markReady(
    orderId: string,
    merchantId: string
  ): Promise<{ success: boolean; courierAssigned: boolean; error?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    })

    if (!order) {
      return { success: false, courierAssigned: false, error: 'Order not found' }
    }

    if (order.restaurant.merchantId !== merchantId) {
      return { success: false, courierAssigned: false, error: 'Not authorized' }
    }

    const transition = canTransitionToStatus(order.status, OrderStatus.READY_FOR_PICKUP)
    if (!transition.isAllowed) {
      return { success: false, courierAssigned: false, error: transition.reason ?? 'Cannot mark ready' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
        readyAt: new Date(),
      },
    })

    // Try to auto-assign a courier
    const assignment = await courierService.autoAssignCourier(orderId)

    return { success: true, courierAssigned: assignment.assigned }
  }

  /**
   * Mark a menu item as unavailable.
   */
  async setItemAvailability(
    menuItemId: string,
    merchantId: string,
    isAvailable: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { restaurant: true },
    })

    if (!menuItem) {
      return { success: false, error: 'Item not found' }
    }

    if (menuItem.restaurant.merchantId !== merchantId) {
      return { success: false, error: 'Not authorized' }
    }

    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isAvailable },
    })

    return { success: true }
  }

  /**
   * Mark an order item as unavailable and optionally offer substitute.
   *
   * LIMITATION_SUBSTITUTION_INTELLIGENCE: Current implementation only supports
   * a single substitute option chosen manually by the merchant. See
   * docs/known-limitations.md for enhancement opportunities including:
   * - Multiple ranked substitute suggestions
   * - Customer preference settings (auto-accept, always ask)
   * - Category-based auto-substitution
   * - Merchant-defined substitute mappings
   */
  async markItemUnavailable(
    orderItemId: string,
    merchantId: string,
    substituteItemId?: string,
    note?: string
  ): Promise<{ success: boolean; error?: string }> {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: { restaurant: true },
        },
      },
    })

    if (!orderItem) {
      return { success: false, error: 'Order item not found' }
    }

    if (orderItem.order.restaurant.merchantId !== merchantId) {
      return { success: false, error: 'Not authorized' }
    }

    if (!canOfferSubstitution(orderItem.order.status)) {
      return { success: false, error: 'Cannot modify items at this stage' }
    }

    const newStatus = substituteItemId
      ? SubstitutionStatus.SUBSTITUTE_OFFERED
      : SubstitutionStatus.UNAVAILABLE

    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        substitutionStatus: newStatus,
        substituteItemId,
        substitutionNote: note,
      },
    })

    return { success: true }
  }

  /**
   * Get menu for a restaurant.
   */
  async getMenu(restaurantId: string) {
    return prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        menuItems: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })
  }

  /**
   * Update menu item details.
   */
  async updateMenuItem(
    menuItemId: string,
    merchantId: string,
    data: {
      name?: string
      description?: string
      price?: number
      isAvailable?: boolean
      isPopular?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { restaurant: true },
    })

    if (!menuItem) {
      return { success: false, error: 'Item not found' }
    }

    if (menuItem.restaurant.merchantId !== merchantId) {
      return { success: false, error: 'Not authorized' }
    }

    await prisma.menuItem.update({
      where: { id: menuItemId },
      data,
    })

    return { success: true }
  }

  /**
   * Get order statistics for today.
   */
  async getTodayStats(restaurantId: string) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        placedAt: { gte: startOfDay },
      },
      select: {
        status: true,
        total: true,
      },
    })

    return {
      totalOrders: orders.length,
      completedOrders: orders.filter((o) => o.status === OrderStatus.DELIVERED).length,
      cancelledOrders: orders.filter((o) => o.status === OrderStatus.CANCELLED).length,
      pendingOrders: orders.filter((o) =>
        ([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING] as string[]).includes(o.status)
      ).length,
      totalRevenue: orders
        .filter((o) => o.status === OrderStatus.DELIVERED)
        .reduce((sum, o) => sum + o.total, 0),
    }
  }
}

export const merchantService = new MerchantService()
