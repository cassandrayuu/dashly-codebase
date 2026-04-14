/**
 * GET /api/restaurants
 *
 * List restaurants with optional filtering.
 * Used by customers to browse available restaurants.
 *
 * Query params:
 * - cuisine: Filter by cuisine type
 * - lat, lng: Customer location for distance/open status
 * - search: Search by name
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRestaurantAvailability, checkDeliveryZone } from '@/domain/restaurant/availability'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cuisine = searchParams.get('cuisine')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const search = searchParams.get('search')

  // Build query
  const where: Record<string, unknown> = { isActive: true }

  if (cuisine) {
    where.cuisine = cuisine
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  const restaurants = await prisma.restaurant.findMany({
    where,
    include: {
      openingHours: true,
      _count: {
        select: { menuItems: { where: { isAvailable: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Enrich with availability info if location provided
  const customerLocation = lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null

  const enrichedRestaurants = restaurants.map((restaurant) => {
    const availability = checkRestaurantAvailability(restaurant, restaurant.openingHours)

    let deliveryInfo = null
    if (customerLocation) {
      deliveryInfo = checkDeliveryZone(restaurant, customerLocation)
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      address: `${restaurant.streetAddress}, ${restaurant.city}`,
      deliveryFee: restaurant.deliveryFee,
      minimumOrder: restaurant.minimumOrderAmount,
      estimatedPrepTime: restaurant.estimatedPrepTime,
      menuItemCount: restaurant._count.menuItems,
      isOpen: availability.isOpen,
      opensAt: availability.opensAt,
      closesAt: availability.closesAt,
      ...(deliveryInfo && {
        isDeliverable: deliveryInfo.isDeliverable,
        distanceMiles: deliveryInfo.distanceMiles,
      }),
    }
  })

  return NextResponse.json({ restaurants: enrichedRestaurants })
}
