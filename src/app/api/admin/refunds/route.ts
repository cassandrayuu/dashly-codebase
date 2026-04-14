/**
 * Admin Refunds API
 *
 * GET /api/admin/refunds - Get pending refunds
 * PUT /api/admin/refunds - Process refund (approve/deny)
 */

import { NextRequest, NextResponse } from 'next/server'
import { refundService } from '@/services/RefundService'
import { requireRole } from '@/lib/auth'
import { UserRole } from '@/lib/enums'

/**
 * GET /api/admin/refunds
 * Get pending refunds for review.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.ADMIN)

    const refunds = await refundService.getPendingRefunds()

    return NextResponse.json({
      refunds: refunds.map((refund) => ({
        id: refund.id,
        order: {
          id: refund.order.id,
          restaurant: refund.order.restaurant.name,
          total: refund.order.total,
          placedAt: refund.order.placedAt,
          items: refund.order.items.map((i) => ({
            name: i.menuItem.name,
            quantity: i.quantity,
            price: i.priceAtPurchase,
          })),
        },
        customer: refund.requester,
        reason: refund.reason,
        reasonDetail: refund.reasonDetail,
        refundType: refund.refundType,
        amount: refund.amount,
        itemIds: refund.itemIds,
        requestedAt: refund.requestedAt,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
}

/**
 * PUT /api/admin/refunds
 * Process a refund request.
 *
 * Body: { refundId, action: 'approve' | 'deny', adminNote? }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.ADMIN)
    const body = await request.json()

    const { refundId, action, adminNote } = body

    if (!refundId || !action) {
      return NextResponse.json({ error: 'refundId and action required' }, { status: 400 })
    }

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'approve':
        result = await refundService.approveRefund(refundId, user.id, adminNote)
        break
      case 'deny':
        if (!adminNote) {
          return NextResponse.json(
            { error: 'Admin note required when denying refund' },
            { status: 400 }
          )
        }
        result = await refundService.denyRefund(refundId, user.id, adminNote)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
}
