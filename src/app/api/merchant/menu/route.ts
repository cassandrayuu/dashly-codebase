/**
 * Merchant Menu API
 *
 * GET /api/merchant/menu - Get menu for editing
 * PUT /api/merchant/menu - Update menu item
 */

import { NextRequest, NextResponse } from 'next/server'
import { merchantService } from '@/services/MerchantService'
import { requireRole } from '@/lib/auth'
import { UserRole } from '@/lib/enums'

/**
 * GET /api/merchant/menu
 * Get restaurant menu for editing.
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

    const menu = await merchantService.getMenu(restaurantId)

    return NextResponse.json({
      menu: menu.map((category) => ({
        id: category.id,
        name: category.name,
        items: category.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          isAvailable: item.isAvailable,
          isPopular: item.isPopular,
        })),
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Merchant access required' }, { status: 403 })
  }
}

/**
 * PUT /api/merchant/menu
 * Update a menu item.
 *
 * Body: { menuItemId, name?, description?, price?, isAvailable?, isPopular? }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request.headers, UserRole.MERCHANT)
    const body = await request.json()

    const { menuItemId, ...updates } = body

    if (!menuItemId) {
      return NextResponse.json({ error: 'menuItemId required' }, { status: 400 })
    }

    const result = await merchantService.updateMenuItem(menuItemId, user.id, updates)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Merchant access required' }, { status: 403 })
  }
}
