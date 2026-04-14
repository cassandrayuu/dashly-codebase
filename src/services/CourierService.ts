/**
 * Courier Service
 *
 * Handles courier-specific operations:
 * - Going online/offline
 * - Finding available orders
 * - Accepting deliveries
 * - Updating delivery status
 * - Location updates
 */

import { prisma } from '@/lib/db'
import { CourierStatus, OrderStatus } from '@/lib/enums'
import { findBestCourier, getCourierStatusAfterAssignment, getCourierStatusAfterDelivery } from '@/domain/order/assignment'
import { canTransitionToStatus } from '@/domain/order/lifecycle'

export class CourierService {
  /**
   * Set courier availability status.
   */
  async setAvailability(courierId: string, isAvailable: boolean): Promise<void> {
    // Check if courier has active delivery
    const activeOrder = await prisma.order.findFirst({
      where: {
        courierId,
        status: {
          in: [OrderStatus.COURIER_ASSIGNED, OrderStatus.PICKED_UP],
        },
      },
    })

    if (activeOrder && !isAvailable) {
      throw new Error('Cannot go offline while on an active delivery')
    }

    await prisma.user.update({
      where: { id: courierId },
      data: {
        courierStatus: isAvailable ? CourierStatus.AVAILABLE : CourierStatus.OFFLINE,
      },
    })
  }

  /**
   * Update courier location.
   */
  async updateLocation(
    courierId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    await prisma.courierLocation.upsert({
      where: { courierId },
      create: { courierId, latitude, longitude },
      update: { latitude, longitude },
    })
  }

  /**
   * Get courier's active delivery (if any).
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
        restaurant: true,
        deliveryAddress: true,
        customer: {
          select: { name: true, phone: true },
        },
        items: {
          include: { menuItem: true },
        },
      },
    })
  }

  /**
   * Get orders available for pickup in courier's area.
   */
  async getAvailableOrders(courierId: string) {
    // Get courier's location
    const courierLocation = await prisma.courierLocation.findUnique({
      where: { courierId },
    })

    if (!courierLocation) {
      return []
    }

    // Get orders ready for pickup
    return prisma.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        courierId: null, // Not yet assigned
      },
      include: {
        restaurant: true,
        deliveryAddress: true,
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { readyAt: 'asc' },
    })
  }

  /**
   * Accept a delivery assignment.
   */
  async acceptDelivery(
    courierId: string,
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Check courier status
    const courier = await prisma.user.findUnique({
      where: { id: courierId },
    })

    if (!courier || courier.courierStatus !== CourierStatus.AVAILABLE) {
      return { success: false, error: 'Courier is not available' }
    }

    // Check order status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      return { success: false, error: 'Order is not ready for pickup' }
    }

    if (order.courierId) {
      return { success: false, error: 'Order already assigned to another courier' }
    }

    // Assign courier to order
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          courierId,
          status: OrderStatus.COURIER_ASSIGNED,
        },
      }),
      prisma.user.update({
        where: { id: courierId },
        data: {
          courierStatus: getCourierStatusAfterAssignment(),
        },
      }),
    ])

    return { success: true }
  }

  /**
   * Mark order as picked up from restaurant.
   */
  async markPickedUp(
    courierId: string,
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.courierId !== courierId) {
      return { success: false, error: 'Order not assigned to this courier' }
    }

    const transition = canTransitionToStatus(order.status, OrderStatus.PICKED_UP)
    if (!transition.isAllowed) {
      return { success: false, error: transition.reason ?? 'Cannot mark as picked up' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PICKED_UP,
        pickedUpAt: new Date(),
      },
    })

    return { success: true }
  }

  /**
   * Mark order as delivered.
   */
  async markDelivered(
    courierId: string,
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.courierId !== courierId) {
      return { success: false, error: 'Order not assigned to this courier' }
    }

    const transition = canTransitionToStatus(order.status, OrderStatus.DELIVERED)
    if (!transition.isAllowed) {
      return { success: false, error: transition.reason ?? 'Cannot mark as delivered' }
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: courierId },
        data: {
          courierStatus: getCourierStatusAfterDelivery(),
        },
      }),
    ])

    return { success: true }
  }

  /**
   * Get courier's delivery history.
   */
  async getDeliveryHistory(courierId: string, limit: number = 20) {
    return prisma.order.findMany({
      where: {
        courierId,
        status: OrderStatus.DELIVERED,
      },
      include: {
        restaurant: true,
        deliveryAddress: true,
      },
      orderBy: { deliveredAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Auto-assign courier to an order (called when order is ready).
   *
   * LIMITATION_COURIER_BATCHING: Assignment uses simple closest-courier logic.
   * See docs/known-limitations.md for enhancement opportunities including:
   * - Real routing API (road distance, traffic)
   * - Multi-order batching for same-restaurant pickups
   * - Courier preferences and performance weighting
   * - Automatic reassignment on decline/delay
   */
  async autoAssignCourier(orderId: string): Promise<{ assigned: boolean; courierId?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    })

    if (!order || order.status !== OrderStatus.READY_FOR_PICKUP) {
      return { assigned: false }
    }

    // Get available couriers with location
    const availableCouriers = await prisma.user.findMany({
      where: {
        role: 'COURIER',
        courierStatus: CourierStatus.AVAILABLE,
      },
      include: {
        courierLocation: true,
      },
    })

    const assignment = findBestCourier(
      {
        latitude: order.restaurant.latitude,
        longitude: order.restaurant.longitude,
      },
      availableCouriers
    )

    if (!assignment.success || !assignment.courierId) {
      return { assigned: false }
    }

    // Assign the courier
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          courierId: assignment.courierId,
          status: OrderStatus.COURIER_ASSIGNED,
        },
      }),
      prisma.user.update({
        where: { id: assignment.courierId },
        data: {
          courierStatus: CourierStatus.ON_DELIVERY,
        },
      }),
    ])

    return { assigned: true, courierId: assignment.courierId }
  }
}

export const courierService = new CourierService()
