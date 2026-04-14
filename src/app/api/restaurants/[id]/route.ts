/**
 * GET /api/restaurants/[id]
 *
 * Get restaurant details including menu.
 * Used by customers viewing a restaurant page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRestaurantAvailability } from '@/domain/restaurant/availability'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.id },
    include: {
      openingHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
      menuCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          menuItems: {
            where: { isAvailable: true },
            orderBy: { name: 'asc' },
          },
        },
      },
    },
  })

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  const availability = checkRestaurantAvailability(restaurant, restaurant.openingHours)

  // Format opening hours for display
  const formattedHours = restaurant.openingHours.map((h) => ({
    day: getDayName(h.dayOfWeek),
    open: h.isClosed ? 'Closed' : h.openTime,
    close: h.isClosed ? null : h.closeTime,
    isClosed: h.isClosed,
  }))

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      address: `${restaurant.streetAddress}, ${restaurant.city}, ${restaurant.state} ${restaurant.zipCode}`,
      deliveryFee: restaurant.deliveryFee,
      minimumOrder: restaurant.minimumOrderAmount,
      estimatedPrepTime: restaurant.estimatedPrepTime,
      deliveryRadius: restaurant.deliveryRadiusMiles,
      isOpen: availability.isOpen,
      opensAt: availability.opensAt,
      closesAt: availability.closesAt,
      hours: formattedHours,
      menu: restaurant.menuCategories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        items: category.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          isPopular: item.isPopular,
        })),
      })),
    },
  })
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}
