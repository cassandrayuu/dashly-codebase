/**
 * Refunds API
 *
 * GET /api/refunds - Get customer's refund history
 * POST /api/refunds - Request a refund
 */

import { NextRequest, NextResponse } from 'next/server'
import { refundService } from '@/services/RefundService'
import { requireAuth } from '@/lib/auth'
import { RefundReason, RefundType } from '@/lib/enums'

/**
 * GET /api/refunds
 * Get customer's refund history.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)

    const refunds = await refundService.getCustomerRefunds(user.id)

    return NextResponse.json({
      refunds: refunds.map((refund) => ({
        id: refund.id,
        orderId: refund.orderId,
        restaurant: refund.order.restaurant.name,
        reason: refund.reason,
        amount: refund.amount,
        status: refund.status,
        requestedAt: refund.requestedAt,
        resolvedAt: refund.resolvedAt,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

/**
 * POST /api/refunds
 * Request a refund.
 *
 * Body: { orderId, reason, reasonDetail?, refundType, amount?, itemIds? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)
    const body = await request.json()

    const { orderId, reason, reasonDetail, refundType, amount, itemIds } = body

    if (!orderId || !reason || !refundType) {
      return NextResponse.json(
        { error: 'orderId, reason, and refundType are required' },
        { status: 400 }
      )
    }

    // Validate reason enum
    if (!Object.values(RefundReason).includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    // Validate refund type enum
    if (!Object.values(RefundType).includes(refundType)) {
      return NextResponse.json({ error: 'Invalid refundType' }, { status: 400 })
    }

    const result = await refundService.requestRefund({
      orderId,
      requesterId: user.id,
      reason,
      reasonDetail,
      refundType,
      amount,
      itemIds,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      message: 'Refund request submitted. We will review it shortly.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit refund'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
