/**
 * Courier Assignment Logic
 *
 * Handles matching ready orders with available couriers for delivery.
 *
 * Business Rules:
 * 1. Only couriers with status AVAILABLE can be assigned
 * 2. Courier must be within COURIER_SEARCH_RADIUS_MILES of restaurant
 * 3. When multiple couriers qualify, assign to the closest one
 * 4. Assigned courier status changes from AVAILABLE to ON_DELIVERY
 * 5. If no courier available, order remains at READY_FOR_PICKUP
 * 6. After delivery, courier status returns to AVAILABLE
 *
 * Assignment Algorithm:
 * 1. Filter to couriers who are AVAILABLE
 * 2. Filter to couriers with known location
 * 3. Calculate straight-line distance from restaurant to each courier
 * 4. Filter to couriers within search radius
 * 5. Sort by distance ascending
 * 6. Return the closest courier
 *
 * LIMITATION_COURIER_BATCHING
 *
 * Current assignment is simplistic—distance-only with single-order delivery.
 * Delivery time is the primary customer satisfaction driver, and this
 * implementation does not optimize for it.
 *
 * Current simplifications:
 * - Straight-line distance, not road distance or actual travel time
 * - Binary courier status (AVAILABLE/ON_DELIVERY) prevents batching
 * - No traffic or time-of-day adjustments
 * - No courier decline handling or automatic reassignment
 * - Courier preferences (max distance, vehicle type) not captured
 * - No performance metrics influence assignment (reliability, speed)
 * - No fairness or load balancing across couriers
 *
 * Enhancement opportunities:
 * - Real routing API integration (Google Maps, Mapbox)
 * - Multi-order batching for same-restaurant pickups
 * - Courier capacity and preference matching
 * - Performance-weighted assignment (reliability score)
 * - Predictive ETA based on historical delivery data
 * - Dynamic reassignment when courier declines or delays
 */

import { User } from '@prisma/client'
import { CourierStatus } from '@/lib/enums'
import { Coordinates } from '../restaurant/types'
import { calculateDistanceMiles } from '../restaurant/availability'
import { COURIER_SEARCH_RADIUS_MILES } from '@/lib/constants'

/**
 * LIMITATION_COURIER_BATCHING
 *
 * Currently, each courier can only handle one order at a time.
 * The courier status is binary: AVAILABLE or ON_DELIVERY.
 *
 * To support batching (courier picks up multiple orders from same restaurant):
 * 1. Track courier capacity (e.g., can carry up to 3 orders)
 * 2. Allow ON_DELIVERY status with available capacity
 * 3. Group orders from same restaurant going to nearby addresses
 * 4. Calculate optimal route for multi-stop delivery
 * 5. Update courier location estimates during multi-stop route
 * 6. Handle partial delivery failures
 *
 * Affected code paths:
 * - findBestAvailableCourier() - check capacity, not just AVAILABLE status
 * - CourierService - track current order count
 * - Order tracking - show position in delivery queue
 * - CourierStatus enum - add AVAILABLE_WITH_ORDER or similar
 */

export interface CourierWithLocation extends User {
  courierLocation: {
    latitude: number
    longitude: number
  } | null
}

export interface CourierAssignmentResult {
  success: boolean
  courierId: string | null
  reason: CourierAssignmentFailure | null
}

export type CourierAssignmentFailure =
  | 'NO_AVAILABLE_COURIERS'
  | 'NO_COURIERS_IN_RANGE'
  | 'ORDER_NOT_READY'

/**
 * Find the best available courier for an order.
 *
 * Selection criteria: Closest courier within search radius who is AVAILABLE.
 *
 * @param restaurantLocation - Restaurant's lat/lng coordinates
 * @param availableCouriers - Pre-filtered list of couriers with AVAILABLE status
 * @returns Assignment result with selected courier ID, or failure reason
 */
export function findBestAvailableCourier(
  restaurantLocation: Coordinates,
  availableCouriers: CourierWithLocation[]
): CourierAssignmentResult {
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Filter to couriers with known location
  // Couriers without location data cannot be distance-ranked
  // ─────────────────────────────────────────────────────────────────────────
  const couriersWithKnownLocation = availableCouriers.filter(
    (courier) => courier.courierLocation !== null
  )

  if (couriersWithKnownLocation.length === 0) {
    return {
      success: false,
      courierId: null,
      reason: 'NO_AVAILABLE_COURIERS',
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Calculate distance and filter by search radius
  // ─────────────────────────────────────────────────────────────────────────
  const couriersWithDistance = couriersWithKnownLocation.map((courier) => ({
    courier,
    distanceToRestaurant: calculateDistanceMiles(restaurantLocation, {
      latitude: courier.courierLocation!.latitude,
      longitude: courier.courierLocation!.longitude,
    }),
  }))

  const couriersWithinSearchRadius = couriersWithDistance.filter(
    (c) => c.distanceToRestaurant <= COURIER_SEARCH_RADIUS_MILES
  )

  if (couriersWithinSearchRadius.length === 0) {
    return {
      success: false,
      courierId: null,
      reason: 'NO_COURIERS_IN_RANGE',
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Sort by distance and select closest
  // ─────────────────────────────────────────────────────────────────────────
  couriersWithinSearchRadius.sort((a, b) => a.distanceToRestaurant - b.distanceToRestaurant)

  const closestCourier = couriersWithinSearchRadius[0]

  return {
    success: true,
    courierId: closestCourier.courier.id,
    reason: null,
  }
}

// Legacy alias
export const findBestCourier = findBestAvailableCourier

/**
 * Check if a courier can accept a new delivery assignment.
 *
 * RULE: Only AVAILABLE couriers can accept new deliveries.
 */
export function canCourierAcceptDelivery(courier: User): boolean {
  return courier.courierStatus === CourierStatus.AVAILABLE
}

// Legacy alias
export const canAcceptDelivery = canCourierAcceptDelivery

/**
 * Get the courier status that should be set after accepting a delivery.
 *
 * RULE: Accepting a delivery changes status to ON_DELIVERY.
 */
export function getCourierStatusAfterAcceptingDelivery(): CourierStatus {
  return CourierStatus.ON_DELIVERY
}

// Legacy alias
export const getCourierStatusAfterAssignment = getCourierStatusAfterAcceptingDelivery

/**
 * Get the courier status that should be set after completing a delivery.
 *
 * RULE: Completing a delivery returns status to AVAILABLE.
 */
export function getCourierStatusAfterCompletingDelivery(): CourierStatus {
  return CourierStatus.AVAILABLE
}

// Legacy alias
export const getCourierStatusAfterDelivery = getCourierStatusAfterCompletingDelivery
