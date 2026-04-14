/**
 * Substitution domain types
 */

import { SubstitutionStatus } from '@/lib/enums'

export interface SubstitutionOffer {
  originalItemId: string
  originalItemName: string
  originalPrice: number
  substituteItemId: string
  substituteItemName: string
  substitutePrice: number
  priceDifference: number // Positive = substitute costs more
  merchantNote: string
}

export interface SubstitutionDecision {
  itemId: string
  action: 'ACCEPT' | 'REJECT' | 'REFUND'
}

export interface SubstitutionResult {
  success: boolean
  newStatus: SubstitutionStatus
  priceAdjustment: number // Adjustment to order total
  message: string
}

export { SubstitutionStatus }
