/**
 * Single Order API Routes
 *
 * GET /api/orders/[id] - Get order details
 * PUT /api/orders/[id] - Update order (cancel)
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/services/OrderService'
import { requireAuth, canAccessResource } from '@/lib/auth'
import { getStatusMessage } from '@/domain/order/lifecycle'
import { OrderStatus } from '@/lib/enums'

/**
 * GET /api/orders/[id]
 * Get full order details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request.headers)

    const order = await orderService.getOrder(params.id)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check authorization
    if (!canAccessResource(user, order.customerId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        statusMessage: getStatusMessage(order.status as OrderStatus),
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
          address: `${order.restaurant.streetAddress}, ${order.restaurant.city}`,
        },
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.priceAtPurchase,
          specialInstructions: item.specialInstructions,
          substitutionStatus: item.substitutionStatus,
          substitutionNote: item.substitutionNote,
        })),
        deliveryAddress: {
          label: order.deliveryAddress.label,
          address: `${order.deliveryAddress.streetLine1}, ${order.deliveryAddress.city}`,
        },
        courier: order.courier
          ? {
              name: order.courier.name,
              phone: order.courier.phone,
            }
          : null,
        pricing: {
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          serviceFee: order.serviceFee,
          discount: order.discount,
          tip: order.tip,
          total: order.total,
        },
        appliedPromoCode: order.appliedPromoCode,
        deliveryInstructions: order.deliveryInstructions,
        estimatedDelivery: order.estimatedDelivery,
        timestamps: {
          placedAt: order.placedAt,
          confirmedAt: order.confirmedAt,
          preparingAt: order.preparingAt,
          readyAt: order.readyAt,
          pickedUpAt: order.pickedUpAt,
          deliveredAt: order.deliveredAt,
          cancelledAt: order.cancelledAt,
        },
        cancellationReason: order.cancellationReason,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

/**
 * PUT /api/orders/[id]
 * Update order (currently only supports cancellation).
 *
 * Body: { action: 'cancel', reason?: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request.headers)
    const body = await request.json()

    const order = await orderService.getOrder(params.id)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!canAccessResource(user, order.customerId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (body.action === 'cancel') {
      const result = await orderService.cancelOrder(
        params.id,
        body.reason || 'Customer requested cancellation',
        user.id
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        cancellationFee: result.cancellationFee,
        message:
          result.cancellationFee > 0
            ? `Order cancelled. Cancellation fee: $${result.cancellationFee.toFixed(2)}`
            : 'Order cancelled successfully',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
