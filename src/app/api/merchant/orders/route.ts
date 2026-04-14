/**
 * Merchant Orders API
 *
 * GET /api/merchant/orders - Get incoming orders
 * PUT /api/merchant/orders - Update order status
 */

import { NextRequest, NextResponse } from 'next/server'
import { merchantService } from '@/services/MerchantService'
import { requireRole } from '@/lib/auth'
import { UserRole } from '@/lib/enums'

/**
 * GET /api/merchant/orders
 * Get incoming orders for merchant's restaurants.
 *
 * Query: ?restaurantId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.MERCHANT)
    const restaurantId = request.nextUrl.searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 })
    }

    const orders = await merchantService.getIncomingOrders(restaurantId)

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        customer: order.customer,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          substitutionStatus: item.substitutionStatus,
        })),
        deliveryAddress: `${order.deliveryAddress.streetLine1}, ${order.deliveryAddress.city}`,
        total: order.total,
        placedAt: order.placedAt,
        estimatedDelivery: order.estimatedDelivery,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Merchant access required' }, { status: 403 })
  }
}

/**
 * PUT /api/merchant/orders
 * Update order status.
 *
 * Body: { orderId, action: 'confirm' | 'prepare' | 'ready' }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.MERCHANT)
    const body = await request.json()

    const { orderId, action } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: 'orderId and action required' }, { status: 400 })
    }

    let result: { success: boolean; error?: string; courierAssigned?: boolean }

    switch (action) {
      case 'confirm':
        result = await merchantService.confirmOrder(orderId, user.id)
        break
      case 'prepare':
        result = await merchantService.startPreparing(orderId, user.id)
        break
      case 'ready':
        result = await merchantService.markReady(orderId, user.id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      ...(action === 'ready' && { courierAssigned: result.courierAssigned }),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Merchant access required' }, { status: 403 })
  }
}
