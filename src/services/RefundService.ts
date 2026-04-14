/**
 * Refund Service
 *
 * Handles refund operations:
 * - Creating refund requests
 * - Admin review and processing
 * - Refund status tracking
 */

import { prisma } from '@/lib/db'
import { RefundReason, RefundType, RefundStatus } from '@/lib/enums'
import { checkRefundEligibility, getSuggestedRefundAmount, getIneligibilityMessage } from '@/domain/refund/eligibility'

export interface CreateRefundInput {
  orderId: string
  requesterId: string
  reason: RefundReason
  reasonDetail?: string
  refundType: RefundType
  amount?: number // For partial refunds
  itemIds?: string[] // For partial refunds
}

export class RefundService {
  /**
   * Request a refund for an order.
   */
  async requestRefund(input: CreateRefundInput): Promise<{ success: boolean; refundId?: string; error?: string }> {
    const { orderId, requesterId, reason, reasonDetail, refundType, amount, itemIds } = input

    // Get order with existing refunds
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        refunds: true,
        items: true,
      },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    // Verify requester owns the order
    if (order.customerId !== requesterId) {
      return { success: false, error: 'Not authorized to request refund for this order' }
    }

    // Check eligibility
    const eligibility = checkRefundEligibility(order, reason)
    if (!eligibility.isEligible) {
      return {
        success: false,
        error: getIneligibilityMessage(eligibility.reason!),
      }
    }

    // Calculate refund amount
    let refundAmount: number

    switch (refundType) {
      case 'FULL':
        refundAmount = eligibility.maxRefundAmount
        break
      case 'DELIVERY_FEE':
        refundAmount = order.deliveryFee
        break
      case 'PARTIAL':
        if (!amount || amount <= 0) {
          return { success: false, error: 'Amount required for partial refund' }
        }
        if (amount > eligibility.maxRefundAmount) {
          return {
            success: false,
            error: `Maximum refundable amount is $${eligibility.maxRefundAmount.toFixed(2)}`,
          }
        }
        refundAmount = amount
        break
      default:
        refundAmount = getSuggestedRefundAmount(order, reason)
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        orderId,
        requesterId,
        reason,
        reasonDetail,
        refundType,
        amount: refundAmount,
        itemIds: itemIds?.join(','),
        status: RefundStatus.PENDING,
      },
    })

    return { success: true, refundId: refund.id }
  }

  /**
   * Get pending refunds for admin review.
   */
  async getPendingRefunds() {
    return prisma.refund.findMany({
      where: { status: RefundStatus.PENDING },
      include: {
        order: {
          include: {
            items: {
              include: { menuItem: true },
            },
            restaurant: true,
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { requestedAt: 'asc' },
    })
  }

  /**
   * Approve a refund request.
   */
  async approveRefund(
    refundId: string,
    processedById: string,
    adminNote?: string
  ): Promise<{ success: boolean; error?: string }> {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    })

    if (!refund) {
      return { success: false, error: 'Refund not found' }
    }

    if (refund.status !== RefundStatus.PENDING) {
      return { success: false, error: 'Refund already processed' }
    }

    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.APPROVED,
        processedById,
        adminNote,
        resolvedAt: new Date(),
      },
    })

    // In a real system, this would trigger payment processing
    // For now, we just mark it approved

    return { success: true }
  }

  /**
   * Deny a refund request.
   */
  async denyRefund(
    refundId: string,
    processedById: string,
    adminNote: string
  ): Promise<{ success: boolean; error?: string }> {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    })

    if (!refund) {
      return { success: false, error: 'Refund not found' }
    }

    if (refund.status !== RefundStatus.PENDING) {
      return { success: false, error: 'Refund already processed' }
    }

    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.DENIED,
        processedById,
        adminNote,
        resolvedAt: new Date(),
      },
    })

    return { success: true }
  }

  /**
   * Get refund history for a customer.
   */
  async getCustomerRefunds(customerId: string) {
    return prisma.refund.findMany({
      where: { requesterId: customerId },
      include: {
        order: {
          include: { restaurant: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    })
  }

  /**
   * Get refund by ID.
   */
  async getRefund(refundId: string) {
    return prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            items: {
              include: { menuItem: true },
            },
            restaurant: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
        processedBy: {
          select: { id: true, name: true },
        },
      },
    })
  }
}

export const refundService = new RefundService()
