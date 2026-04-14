/**
 * Promo Code API Routes
 *
 * POST /api/cart/promo - Apply promo code
 * DELETE /api/cart/promo - Remove promo code
 */

import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/services/CartService'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/cart/promo
 * Apply a promo code to the current cart.
 *
 * Body: { code }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)
    const body = await request.json()

    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }

    // Get active cart
    const cart = await cartService.getActiveCart(user.id)
    if (!cart) {
      return NextResponse.json({ error: 'No active cart' }, { status: 400 })
    }

    const result = await cartService.applyPromoCode(user.id, cart.restaurantId, code)

    if (!result.isValid) {
      return NextResponse.json({
        success: false,
        error: result.message,
      })
    }

    const pricing = await cartService.getCartPricing(user.id, cart.restaurantId)

    return NextResponse.json({
      success: true,
      message: result.message,
      discount: result.discountAmount,
      waivesDeliveryFee: result.waivesDeliveryFee,
      pricing,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

/**
 * DELETE /api/cart/promo
 * Remove promo code from cart.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)

    const cart = await cartService.getActiveCart(user.id)
    if (!cart) {
      return NextResponse.json({ error: 'No active cart' }, { status: 400 })
    }

    await cartService.removePromoCode(user.id, cart.restaurantId)

    const pricing = await cartService.getCartPricing(user.id, cart.restaurantId)

    return NextResponse.json({
      success: true,
      pricing,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
