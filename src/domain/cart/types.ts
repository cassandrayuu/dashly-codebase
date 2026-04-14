/**
 * Cart domain types
 */

import { Cart, CartItem, MenuItem, Restaurant } from '@prisma/client'

export interface CartWithDetails extends Cart {
  items: (CartItem & { menuItem: MenuItem })[]
  restaurant: Restaurant
}

export interface CartValidationResult {
  isValid: boolean
  errors: CartValidationError[]
}

export interface CartValidationError {
  type: CartErrorType
  message: string
  itemId?: string // For item-specific errors
}

export type CartErrorType =
  | 'EMPTY_CART'
  | 'RESTAURANT_CLOSED'
  | 'ITEM_UNAVAILABLE'
  | 'BELOW_MINIMUM'
  | 'OUT_OF_DELIVERY_ZONE'
  | 'INVALID_QUANTITY'

export interface CartPricing {
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  total: number
  itemCount: number
}
