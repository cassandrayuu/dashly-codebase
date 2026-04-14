/**
 * Cart Validation Tests
 *
 * Tests for cart validation rules before checkout.
 *
 * Coverage:
 * - All 6 validation rules
 * - Edge cases
 * - Error message accuracy
 */

import { describe, it, expect, vi } from 'vitest'
import { validateCartForCheckout, calculateCartSubtotal } from '../cart/validation'
import { CartWithDetails } from '../cart/types'
import { Restaurant, MenuItem, CartItem, OpeningHours } from '@prisma/client'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
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
    minimumOrderAmount: 15.00,
    deliveryFee: 3.99,
    estimatedPrepTime: 25,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    restaurantId: 'rest-1',
    categoryId: 'cat-1',
    name: 'Test Item',
    description: 'A test item',
    price: 10.00,
    imageUrl: null,
    isAvailable: true,
    isPopular: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockCartItem(
  menuItem: MenuItem,
  overrides: Partial<CartItem> = {}
): CartItem & { menuItem: MenuItem } {
  return {
    id: 'cart-item-1',
    cartId: 'cart-1',
    menuItemId: menuItem.id,
    quantity: 1,
    specialInstructions: null,
    menuItem,
    ...overrides,
  }
}

function createOpeningHours(restaurant: Restaurant): OpeningHours[] {
  // Open 9am-9pm every day
  return Array.from({ length: 7 }, (_, i) => ({
    id: `hours-${i}`,
    restaurantId: restaurant.id,
    dayOfWeek: i,
    openTime: '09:00',
    closeTime: '21:00',
    isClosed: false,
  }))
}

function createMockCart(
  restaurant: Restaurant,
  items: Array<CartItem & { menuItem: MenuItem }>
): CartWithDetails {
  return {
    id: 'cart-1',
    customerId: 'cust-1',
    restaurantId: restaurant.id,
    promoCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    restaurant,
    items,
  }
}

// ============================================================================
// RULE 1: Cart must have at least one item
// ============================================================================

describe('RULE 1: Cart must not be empty', () => {
  it('returns EMPTY_CART error when cart has no items', () => {
    const restaurant = createMockRestaurant()
    const cart = createMockCart(restaurant, [])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].type).toBe('EMPTY_CART')
  })

  it('passes when cart has items', () => {
    const restaurant = createMockRestaurant()
    const item = createMockMenuItem({ price: 20.00 })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    // Use a time when restaurant is open
    const mockNow = new Date('2025-01-15T12:00:00')
    vi.useFakeTimers().setSystemTime(mockNow)

    const result = validateCartForCheckout(cart, hours)

    // Should not have EMPTY_CART error
    expect(result.errors.find(e => e.type === 'EMPTY_CART')).toBeUndefined()
  })
})

// ============================================================================
// RULE 2: All items must be available
// ============================================================================

describe('RULE 2: All items must be available', () => {
  it('returns ITEM_UNAVAILABLE error for unavailable items', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 0 })
    const item = createMockMenuItem({ isAvailable: false, name: 'Sold Out Item' })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    expect(result.isValid).toBe(false)
    const error = result.errors.find(e => e.type === 'ITEM_UNAVAILABLE')
    expect(error).toBeDefined()
    expect(error!.message).toContain('Sold Out Item')
    expect(error!.itemId).toBe(cartItem.id)
  })

  it('returns multiple errors when multiple items are unavailable', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 0 })
    const item1 = createMockMenuItem({ id: 'item-1', isAvailable: false, name: 'Item 1' })
    const item2 = createMockMenuItem({ id: 'item-2', isAvailable: false, name: 'Item 2' })
    const cartItem1 = createMockCartItem(item1, { id: 'ci-1' })
    const cartItem2 = createMockCartItem(item2, { id: 'ci-2' })
    const cart = createMockCart(restaurant, [cartItem1, cartItem2])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    const unavailableErrors = result.errors.filter(e => e.type === 'ITEM_UNAVAILABLE')
    expect(unavailableErrors).toHaveLength(2)
  })
})

// ============================================================================
// RULE 3: Item quantities must be positive integers
// ============================================================================

describe('RULE 3: Item quantities must be valid', () => {
  it('returns INVALID_QUANTITY error for quantity of 0', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 0 })
    const item = createMockMenuItem()
    const cartItem = createMockCartItem(item, { quantity: 0 })
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    const error = result.errors.find(e => e.type === 'INVALID_QUANTITY')
    expect(error).toBeDefined()
  })

  it('returns INVALID_QUANTITY error for negative quantity', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 0 })
    const item = createMockMenuItem()
    const cartItem = createMockCartItem(item, { quantity: -1 })
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    const error = result.errors.find(e => e.type === 'INVALID_QUANTITY')
    expect(error).toBeDefined()
  })

  it('passes for positive integer quantities', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 0 })
    const item = createMockMenuItem({ price: 5.00 })
    const cartItem = createMockCartItem(item, { quantity: 5 })
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    expect(result.errors.find(e => e.type === 'INVALID_QUANTITY')).toBeUndefined()
  })
})

// ============================================================================
// RULE 4: Order subtotal must meet minimum
// ============================================================================

describe('RULE 4: Minimum order amount', () => {
  it('returns BELOW_MINIMUM error when subtotal < minimumOrderAmount', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 25.00 })
    const item = createMockMenuItem({ price: 10.00 })
    const cartItem = createMockCartItem(item, { quantity: 1 }) // $10 total
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    const error = result.errors.find(e => e.type === 'BELOW_MINIMUM')
    expect(error).toBeDefined()
    expect(error!.message).toContain('$25.00')
    expect(error!.message).toContain('$15.00 more') // Need $15 more
  })

  it('passes when subtotal equals minimumOrderAmount exactly', () => {
    const restaurant = createMockRestaurant({ minimumOrderAmount: 20.00 })
    const item = createMockMenuItem({ price: 10.00 })
    const cartItem = createMockCartItem(item, { quantity: 2 }) // $20 total
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    expect(result.errors.find(e => e.type === 'BELOW_MINIMUM')).toBeUndefined()
  })

  it('calculates subtotal correctly with multiple items', () => {
    const restaurant = createMockRestaurant()
    const item1 = createMockMenuItem({ id: 'i1', price: 10.00 })
    const item2 = createMockMenuItem({ id: 'i2', price: 15.00 })
    const cartItem1 = createMockCartItem(item1, { id: 'ci1', quantity: 2 }) // $20
    const cartItem2 = createMockCartItem(item2, { id: 'ci2', quantity: 1 }) // $15
    const cart = createMockCart(restaurant, [cartItem1, cartItem2])

    const subtotal = calculateCartSubtotal(cart)

    expect(subtotal).toBe(35.00)
  })
})

// ============================================================================
// RULE 5: Restaurant must be open
// ============================================================================

describe('RULE 5: Restaurant must be open', () => {
  it('returns RESTAURANT_CLOSED error when restaurant is closed for the day', () => {
    const restaurant = createMockRestaurant()
    const item = createMockMenuItem({ price: 20.00 })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])

    // All days closed
    const hours = Array.from({ length: 7 }, (_, i) => ({
      id: `hours-${i}`,
      restaurantId: restaurant.id,
      dayOfWeek: i,
      openTime: '09:00',
      closeTime: '21:00',
      isClosed: true,
    }))

    const result = validateCartForCheckout(cart, hours)

    const error = result.errors.find(e => e.type === 'RESTAURANT_CLOSED')
    expect(error).toBeDefined()
  })

  it('returns RESTAURANT_CLOSED error when restaurant is inactive', () => {
    const restaurant = createMockRestaurant({ isActive: false })
    const item = createMockMenuItem({ price: 20.00 })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    const error = result.errors.find(e => e.type === 'RESTAURANT_CLOSED')
    expect(error).toBeDefined()
    expect(error!.message).toContain('not accepting orders')
  })
})

// ============================================================================
// RULE 6: Delivery address must be in zone
// ============================================================================

describe('RULE 6: Delivery zone check', () => {
  it('returns OUT_OF_DELIVERY_ZONE error when address is too far', () => {
    const restaurant = createMockRestaurant({
      latitude: 37.7749,
      longitude: -122.4194,
      deliveryRadiusMiles: 2.0,
    })
    const item = createMockMenuItem({ price: 20.00 })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    // Oakland - about 10 miles away
    const farLocation = { latitude: 37.8044, longitude: -122.2712 }

    const result = validateCartForCheckout(cart, hours, farLocation)

    const error = result.errors.find(e => e.type === 'OUT_OF_DELIVERY_ZONE')
    expect(error).toBeDefined()
    expect(error!.message).toContain('2 miles')
  })

  it('passes when address is within delivery radius', () => {
    const restaurant = createMockRestaurant({
      latitude: 37.7749,
      longitude: -122.4194,
      deliveryRadiusMiles: 5.0,
    })
    const item = createMockMenuItem({ price: 20.00 })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    // Very close location
    const nearLocation = { latitude: 37.7750, longitude: -122.4190 }

    const result = validateCartForCheckout(cart, hours, nearLocation)

    expect(result.errors.find(e => e.type === 'OUT_OF_DELIVERY_ZONE')).toBeUndefined()
  })

  it('skips zone check when no delivery location provided', () => {
    const restaurant = createMockRestaurant()
    const item = createMockMenuItem({ price: 20.00 })
    const cartItem = createMockCartItem(item)
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    // No delivery location
    const result = validateCartForCheckout(cart, hours, undefined)

    expect(result.errors.find(e => e.type === 'OUT_OF_DELIVERY_ZONE')).toBeUndefined()
  })
})

// ============================================================================
// Multiple Errors
// ============================================================================

describe('Multiple validation errors', () => {
  it('returns all errors at once, not just the first', () => {
    const restaurant = createMockRestaurant({
      minimumOrderAmount: 100.00,
      isActive: false,
    })
    const item = createMockMenuItem({ price: 5.00, isAvailable: false })
    const cartItem = createMockCartItem(item, { quantity: 1 })
    const cart = createMockCart(restaurant, [cartItem])
    const hours = createOpeningHours(restaurant)

    const result = validateCartForCheckout(cart, hours)

    // Should have multiple errors
    expect(result.errors.length).toBeGreaterThan(1)

    const errorTypes = result.errors.map(e => e.type)
    expect(errorTypes).toContain('ITEM_UNAVAILABLE')
    expect(errorTypes).toContain('BELOW_MINIMUM')
    expect(errorTypes).toContain('RESTAURANT_CLOSED')
  })
})
