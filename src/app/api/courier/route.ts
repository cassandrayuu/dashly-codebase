/**
 * Courier API Routes
 *
 * GET /api/courier - Get courier status and active delivery
 * PUT /api/courier - Update availability or location
 */

import { NextRequest, NextResponse } from 'next/server'
import { courierService } from '@/services/CourierService'
import { requireRole } from '@/lib/auth'
import { UserRole } from '@/lib/enums'
import { prisma } from '@/lib/db'

/**
 * GET /api/courier
 * Get courier status, active delivery, and available orders.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.COURIER)

    const activeOrder = await courierService.getCourierActiveOrder(user.id)
    const availableOrders = activeOrder ? [] : await courierService.getAvailableOrders(user.id)

    return NextResponse.json({
      status: user.courierStatus,
      activeDelivery: activeOrder
        ? {
            id: activeOrder.id,
            status: activeOrder.status,
            restaurant: {
              name: activeOrder.restaurant.name,
              address: `${activeOrder.restaurant.streetAddress}, ${activeOrder.restaurant.city}`,
            },
            customer: activeOrder.customer,
            deliveryAddress: `${activeOrder.deliveryAddress.streetLine1}, ${activeOrder.deliveryAddress.city}`,
            items: activeOrder.items.map((i) => ({
              quantity: i.quantity,
              name: i.menuItem?.name,
            })),
          }
        : null,
      availableOrders: availableOrders.map((order) => ({
        id: order.id,
        restaurant: {
          name: order.restaurant.name,
          address: `${order.restaurant.streetAddress}, ${order.restaurant.city}`,
        },
        deliveryAddress: `${order.deliveryAddress.streetLine1}, ${order.deliveryAddress.city}`,
        itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
        total: order.total,
        readyAt: order.readyAt,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Courier access required' }, { status: 403 })
  }
}

/**
 * PUT /api/courier
 * Update courier availability or location.
 *
 * Body: { action: 'setAvailability' | 'updateLocation', ... }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.COURIER)
    const body = await request.json()

    switch (body.action) {
      case 'setAvailability':
        if (typeof body.isAvailable !== 'boolean') {
          return NextResponse.json({ error: 'isAvailable required' }, { status: 400 })
        }
        await courierService.setAvailability(user.id, body.isAvailable)
        return NextResponse.json({ success: true, status: body.isAvailable ? 'AVAILABLE' : 'OFFLINE' })

      case 'updateLocation':
        if (!body.latitude || !body.longitude) {
          return NextResponse.json({ error: 'latitude and longitude required' }, { status: 400 })
        }
        await courierService.updateLocation(user.id, body.latitude, body.longitude)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
