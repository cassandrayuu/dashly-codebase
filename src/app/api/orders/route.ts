/**
 * Orders API Routes
 *
 * GET /api/orders - Get customer's order history
 * POST /api/orders - Place a new order (checkout)
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/services/OrderService'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/orders
 * Get customer's order history.
 *
 * Query: ?limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')
    const orders = await orderService.getCustomerOrders(user.id, limit)

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
        },
        status: order.status,
        total: order.total,
        itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
        placedAt: order.placedAt,
        deliveredAt: order.deliveredAt,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

/**
 * POST /api/orders
 * Place a new order from cart.
 *
 * Body: { deliveryAddressId, tip?, deliveryInstructions? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)
    const body = await request.json()

    const { deliveryAddressId, tip, deliveryInstructions } = body

    if (!deliveryAddressId) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 })
    }

    // Get active cart to determine restaurant
    const { cartService } = await import('@/services/CartService')
    const cart = await cartService.getActiveCart(user.id)

    if (!cart) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const result = await orderService.placeOrder({
      customerId: user.id,
      restaurantId: cart.restaurantId,
      deliveryAddressId,
      tip,
      deliveryInstructions,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: result.order!.id,
        status: result.order!.status,
        total: result.order!.total,
        estimatedDelivery: result.order!.estimatedDelivery,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
