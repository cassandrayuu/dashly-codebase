/**
 * Restaurant Domain Tests
 *
 * Tests for restaurant availability and delivery zone logic.
 */

import { describe, it, expect } from 'vitest'
import { checkRestaurantAvailability, checkDeliveryZone, calculateDistanceMiles } from '../restaurant/availability'
import { Restaurant, OpeningHours } from '@prisma/client'

// Mock restaurant
const mockRestaurant: Restaurant = {
  id: 'rest-1',
  merchantId: 'merch-1',
  name: 'Test Restaurant',
  description: 'A test restaurant',
  cuisine: 'Italian',
  streetAddress: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zipCode: '94102',
  latitude: 37.7749,
  longitude: -122.4194,
  deliveryRadiusMiles: 5.0,
  minimumOrderAmount: 15.0,
  deliveryFee: 3.99,
  estimatedPrepTime: 25,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock opening hours (open 9am-9pm every day except Sunday)
const mockOpeningHours: OpeningHours[] = [
  { id: '1', restaurantId: 'rest-1', dayOfWeek: 0, openTime: '09:00', closeTime: '21:00', isClosed: true }, // Sunday closed
  { id: '2', restaurantId: 'rest-1', dayOfWeek: 1, openTime: '09:00', closeTime: '21:00', isClosed: false },
  { id: '3', restaurantId: 'rest-1', dayOfWeek: 2, openTime: '09:00', closeTime: '21:00', isClosed: false },
  { id: '4', restaurantId: 'rest-1', dayOfWeek: 3, openTime: '09:00', closeTime: '21:00', isClosed: false },
  { id: '5', restaurantId: 'rest-1', dayOfWeek: 4, openTime: '09:00', closeTime: '21:00', isClosed: false },
  { id: '6', restaurantId: 'rest-1', dayOfWeek: 5, openTime: '09:00', closeTime: '21:00', isClosed: false },
  { id: '7', restaurantId: 'rest-1', dayOfWeek: 6, openTime: '09:00', closeTime: '21:00', isClosed: false },
]

describe('checkRestaurantAvailability', () => {
  it('returns open when current time is within hours', () => {
    // Wednesday at 12:00 PM
    const wednesday12pm = new Date('2025-01-15T12:00:00')

    const result = checkRestaurantAvailability(mockRestaurant, mockOpeningHours, wednesday12pm)

    expect(result.isOpen).toBe(true)
    expect(result.reason).toBe('open')
  })

  it('returns closed when current time is before opening', () => {
    // Wednesday at 7:00 AM
    const wednesday7am = new Date('2025-01-15T07:00:00')

    const result = checkRestaurantAvailability(mockRestaurant, mockOpeningHours, wednesday7am)

    expect(result.isOpen).toBe(false)
    expect(result.reason).toBe('outside_hours')
    expect(result.opensAt).toBe('09:00')
  })

  it('returns closed when current time is after closing', () => {
    // Wednesday at 10:00 PM
    const wednesday10pm = new Date('2025-01-15T22:00:00')

    const result = checkRestaurantAvailability(mockRestaurant, mockOpeningHours, wednesday10pm)

    expect(result.isOpen).toBe(false)
    expect(result.reason).toBe('outside_hours')
  })

  it('returns closed when restaurant is closed for the day', () => {
    // Sunday at 12:00 PM
    const sunday12pm = new Date('2025-01-19T12:00:00')

    const result = checkRestaurantAvailability(mockRestaurant, mockOpeningHours, sunday12pm)

    expect(result.isOpen).toBe(false)
    expect(result.reason).toBe('closed_today')
  })

  it('returns closed when restaurant is inactive', () => {
    const inactiveRestaurant = { ...mockRestaurant, isActive: false }
    const wednesday12pm = new Date('2025-01-15T12:00:00')

    const result = checkRestaurantAvailability(inactiveRestaurant, mockOpeningHours, wednesday12pm)

    expect(result.isOpen).toBe(false)
    expect(result.reason).toBe('inactive')
  })
})

describe('checkDeliveryZone', () => {
  it('returns deliverable when address is within radius', () => {
    // ~0.5 miles away
    const nearbyAddress = { latitude: 37.7800, longitude: -122.4150 }

    const result = checkDeliveryZone(mockRestaurant, nearbyAddress)

    expect(result.isDeliverable).toBe(true)
    expect(result.reason).toBe('in_zone')
    expect(result.distanceMiles).toBeLessThan(1)
  })

  it('returns not deliverable when address is outside radius', () => {
    // ~15 miles away (Oakland)
    const farAddress = { latitude: 37.8044, longitude: -122.2712 }

    const result = checkDeliveryZone(mockRestaurant, farAddress)

    expect(result.isDeliverable).toBe(false)
    expect(result.reason).toBe('out_of_zone')
    expect(result.distanceMiles).toBeGreaterThan(5)
  })

  it('returns not deliverable when restaurant is inactive', () => {
    const inactiveRestaurant = { ...mockRestaurant, isActive: false }
    const nearbyAddress = { latitude: 37.7800, longitude: -122.4150 }

    const result = checkDeliveryZone(inactiveRestaurant, nearbyAddress)

    expect(result.isDeliverable).toBe(false)
    expect(result.reason).toBe('restaurant_inactive')
  })
})

describe('calculateDistanceMiles', () => {
  it('calculates correct distance between two points', () => {
    const sf = { latitude: 37.7749, longitude: -122.4194 }
    const oakland = { latitude: 37.8044, longitude: -122.2712 }

    const distance = calculateDistanceMiles(sf, oakland)

    // SF to Oakland is approximately 8-10 miles
    expect(distance).toBeGreaterThan(8)
    expect(distance).toBeLessThan(12)
  })

  it('returns 0 for same coordinates', () => {
    const sf = { latitude: 37.7749, longitude: -122.4194 }

    const distance = calculateDistanceMiles(sf, sf)

    expect(distance).toBe(0)
  })
})
