/**
 * Cart API Routes
 *
 * GET /api/cart - Get current cart
 * POST /api/cart - Add item to cart
 * PUT /api/cart - Update cart item
 * DELETE /api/cart - Remove item from cart
 */

import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/services/CartService'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/cart
 * Get customer's current cart with pricing.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)

    const cart = await cartService.getActiveCart(user.id)
    if (!cart) {
      return NextResponse.json({ cart: null })
    }

    const pricing = await cartService.getCartPricing(user.id, cart.restaurantId)

    return NextResponse.json({
      cart: {
        id: cart.id,
        restaurant: {
          id: cart.restaurant.id,
          name: cart.restaurant.name,
          minimumOrder: cart.restaurant.minimumOrderAmount,
        },
        items: cart.items.map((item) => ({
          id: item.id,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            price: item.menuItem.price,
            isAvailable: item.menuItem.isAvailable,
          },
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          subtotal: item.menuItem.price * item.quantity,
        })),
        promoCode: cart.promoCode,
        pricing,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

/**
 * POST /api/cart
 * Add item to cart.
 *
 * Body: { menuItemId, quantity?, specialInstructions? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)
    const body = await request.json()

    const { menuItemId, quantity = 1, specialInstructions } = body

    if (!menuItemId) {
      return NextResponse.json({ error: 'menuItemId is required' }, { status: 400 })
    }

    const result = await cartService.addItem(user.id, menuItemId, quantity, specialInstructions)

    const pricing = await cartService.getCartPricing(user.id, result.cart.restaurantId)

    return NextResponse.json({
      cart: {
        id: result.cart.id,
        itemCount: result.cart.items.reduce((sum, i) => sum + i.quantity, 0),
        pricing,
      },
      warning: result.warning,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * PUT /api/cart
 * Update cart item quantity.
 *
 * Body: { cartItemId, quantity }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)
    const body = await request.json()

    const { cartItemId, quantity } = body

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json({ error: 'cartItemId and quantity are required' }, { status: 400 })
    }

    const cart = await cartService.updateItemQuantity(user.id, cartItemId, quantity)

    if (!cart) {
      return NextResponse.json({ cart: null })
    }

    const pricing = await cartService.getCartPricing(user.id, cart.restaurantId)

    return NextResponse.json({
      cart: {
        id: cart.id,
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
        pricing,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update cart'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * DELETE /api/cart
 * Remove item from cart.
 *
 * Query: ?cartItemId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers)
    const cartItemId = request.nextUrl.searchParams.get('cartItemId')

    if (!cartItemId) {
      return NextResponse.json({ error: 'cartItemId is required' }, { status: 400 })
    }

    const cart = await cartService.removeItem(user.id, cartItemId)

    if (!cart) {
      return NextResponse.json({ cart: null })
    }

    const pricing = await cartService.getCartPricing(user.id, cart.restaurantId)

    return NextResponse.json({
      cart: {
        id: cart.id,
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
        pricing,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove item'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
