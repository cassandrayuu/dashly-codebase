/**
 * Refund domain types
 */

import { Order, Refund } from '@prisma/client'
import { RefundReason, RefundType, RefundStatus, OrderStatus } from '@/lib/enums'

export interface RefundEligibility {
  isEligible: boolean
  reason: RefundIneligibilityReason | null
  maxRefundAmount: number
}

export type RefundIneligibilityReason =
  | 'ORDER_NOT_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'REFUND_WINDOW_EXPIRED'
  | 'ALREADY_REFUNDED'
  | 'AMOUNT_EXCEEDS_ORDER'

export interface RefundCalculation {
  refundableAmount: number
  itemRefunds: ItemRefund[]
  deliveryFeeRefundable: boolean
}

export interface ItemRefund {
  itemId: string
  itemName: string
  quantity: number
  refundAmount: number
}

export { RefundReason, RefundType, RefundStatus }
