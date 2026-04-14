/**
 * Courier Delivery API
 *
 * POST /api/courier/delivery - Accept a delivery
 * PUT /api/courier/delivery - Update delivery status
 */

import { NextRequest, NextResponse } from 'next/server'
import { courierService } from '@/services/CourierService'
import { requireRole } from '@/lib/auth'
import { UserRole } from '@/lib/enums'

/**
 * POST /api/courier/delivery
 * Accept a delivery assignment.
 *
 * Body: { orderId }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.COURIER)
    const body = await request.json()

    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }

    const result = await courierService.acceptDelivery(user.id, orderId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Courier access required' }, { status: 403 })
  }
}

/**
 * PUT /api/courier/delivery
 * Update delivery status.
 *
 * Body: { orderId, action: 'pickup' | 'deliver' }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.COURIER)
    const body = await request.json()

    const { orderId, action } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: 'orderId and action required' }, { status: 400 })
    }

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'pickup':
        result = await courierService.markPickedUp(user.id, orderId)
        break
      case 'deliver':
        result = await courierService.markDelivered(user.id, orderId)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Courier access required' }, { status: 403 })
  }
}
