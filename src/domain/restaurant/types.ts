/**
 * Restaurant domain types
 */

export interface RestaurantAvailability {
  isOpen: boolean
  opensAt: string | null // Next opening time if closed
  closesAt: string | null // Closing time if open
  reason: 'open' | 'closed_today' | 'outside_hours' | 'inactive'
}

export interface DeliveryZoneCheck {
  isDeliverable: boolean
  distanceMiles: number
  reason: 'in_zone' | 'out_of_zone' | 'restaurant_inactive'
}

export interface Coordinates {
  latitude: number
  longitude: number
}
