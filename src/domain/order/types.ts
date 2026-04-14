/**
 * Order domain types
 */

import { Order, OrderItem } from '@prisma/client'
import { OrderStatus, SubstitutionStatus } from '@/lib/enums'

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export interface OrderStatusTransition {
  isAllowed: boolean
  reason: string | null
}

export interface OrderCancellation {
  canCancel: boolean
  reason: CancellationBlockReason | null
  willIncurFee: boolean
  cancellationFee: number
}

export type CancellationBlockReason =
  | 'ALREADY_PICKED_UP'
  | 'ALREADY_DELIVERED'
  | 'ALREADY_CANCELLED'

export interface SubstitutionRequest {
  originalItemId: string
  substituteItemId: string | null // null = no substitute, just remove
  note: string
}

export interface SubstitutionResponse {
  itemId: string
  status: SubstitutionStatus
}

export { OrderStatus, SubstitutionStatus }
