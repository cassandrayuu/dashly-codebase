/**
 * Restaurant Availability Logic
 *
 * Determines if a restaurant can accept orders.
 *
 * Rules:
 * - Restaurant must be active
 * - Current time within opening hours
 * - Not marked closed for the day
 * - Delivery address within radius
 *
 * V1 Limitations:
 * - Immediate orders only (no scheduled delivery)
 * - No holiday hours support
 * - Straight-line distance (not driving distance)
 */

import { Restaurant, OpeningHours } from '@prisma/client'
import { RestaurantAvailability, DeliveryZoneCheck, Coordinates } from './types'

/**
 * Check if a restaurant is currently open for orders.
 */
export function checkRestaurantAvailability(
  restaurant: Restaurant,
  openingHours: OpeningHours[],
  currentTime: Date = new Date()
): RestaurantAvailability {
  // RULE: Inactive restaurants cannot accept orders under any circumstances
  if (!restaurant.isActive) {
    return {
      isOpen: false,
      opensAt: null,
      closesAt: null,
      reason: 'inactive',
    }
  }

  const dayOfWeek = currentTime.getDay() // 0 = Sunday, 6 = Saturday
  const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek)

  // RULE: If no hours defined for today OR explicitly closed, restaurant is closed
  if (!todayHours || todayHours.isClosed) {
    const nextOpenDay = findNextOpenDay(openingHours, dayOfWeek)
    return {
      isOpen: false,
      opensAt: nextOpenDay?.openTime ?? null,
      closesAt: null,
      reason: 'closed_today',
    }
  }

  // RULE: Current time must be >= openTime AND < closeTime
  // Note: closeTime is exclusive (restaurant closes AT that time)
  const currentTimeStr = formatTimeString(currentTime)
  const isWithinHours =
    currentTimeStr >= todayHours.openTime && currentTimeStr < todayHours.closeTime

  if (!isWithinHours) {
    const isBeforeOpening = currentTimeStr < todayHours.openTime

    return {
      isOpen: false,
      opensAt: isBeforeOpening
        ? todayHours.openTime
        : findNextOpenDay(openingHours, dayOfWeek)?.openTime ?? null,
      closesAt: null,
      reason: 'outside_hours',
    }
  }

  return {
    isOpen: true,
    opensAt: todayHours.openTime,
    closesAt: todayHours.closeTime,
    reason: 'open',
  }
}

/**
 * Check if a delivery address is within the restaurant's delivery zone.
 *
 * RULE: Delivery is allowed if:
 *   - Restaurant is active AND
 *   - Straight-line distance from restaurant to address <= deliveryRadiusMiles
 *
 * @param restaurant - The restaurant (provides location and radius)
 * @param deliveryLocation - Customer's delivery coordinates (latitude/longitude)
 * @returns Delivery zone check result with distance
 */
export function checkDeliveryZone(
  restaurant: Restaurant,
  deliveryLocation: Coordinates
): DeliveryZoneCheck {
  // RULE: Inactive restaurants have no delivery zone
  if (!restaurant.isActive) {
    return {
      isDeliverable: false,
      distanceMiles: 0,
      reason: 'restaurant_inactive',
    }
  }

  const distanceFromRestaurant = calculateDistanceMiles(
    { latitude: restaurant.latitude, longitude: restaurant.longitude },
    deliveryLocation
  )

  // RULE: Distance must be <= restaurant's configured delivery radius
  const isWithinDeliveryRadius = distanceFromRestaurant <= restaurant.deliveryRadiusMiles

  return {
    isDeliverable: isWithinDeliveryRadius,
    distanceMiles: Math.round(distanceFromRestaurant * 10) / 10, // Round to 1 decimal
    reason: isWithinDeliveryRadius ? 'in_zone' : 'out_of_zone',
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 *
 * Note: This calculates straight-line ("as the crow flies") distance.
 * Actual driving distance would be longer. This is a known simplification.
 *
 * @returns Distance in miles
 */
export function calculateDistanceMiles(
  from: Coordinates,
  to: Coordinates
): number {
  const EARTH_RADIUS_MILES = 3959

  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_MILES * c
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format a Date to "HH:MM" string for time comparison.
 */
function formatTimeString(date: Date): string {
  return date.toTimeString().slice(0, 5) // "HH:MM"
}

/**
 * Find the next day the restaurant is open after currentDay.
 * Looks up to 7 days ahead.
 */
function findNextOpenDay(
  openingHours: OpeningHours[],
  currentDay: number
): OpeningHours | null {
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const checkDay = (currentDay + daysAhead) % 7
    const hours = openingHours.find((h) => h.dayOfWeek === checkDay)
    if (hours && !hours.isClosed) {
      return hours
    }
  }
  return null
}
