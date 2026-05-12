/**
 * Review Service
 *
 * Manages post-delivery ratings and reviews:
 * - Customer submits rating after order delivered
 * - Updates restaurant aggregate scores
 * - Tracks issue reports for quality correlation
 *
 * AMPLITUDE FEATURE KEYS:
 * - merchant_menu_accuracy: reviews with WRONG_ITEMS or MISSING_ITEMS issues
 * - dasher_offer_quality: reviews with LATE_DELIVERY issues
 * - support_resolution_speed: reviews that escalate to refunds
 *
 * KEY CONSTRAINTS (for Spark to discover):
 * - Reviews are tied to orders (one review per order)
 * - Restaurant avgRating is recalculated on each review (not cached efficiently)
 * - No courier ratings yet - only restaurant/delivery overall
 *
 * SEE: docs/analytics/instrumentation-map.md
 *
 * LIMITATION_REVIEW_RESPONSE: Restaurants cannot respond to reviews.
 * LIMITATION_REVIEW_MODERATION: No moderation queue - all reviews published immediately.
 * LIMITATION_DASHER_RATINGS: Delivery rating affects restaurant score, not individual dasher.
 */

import { prisma } from '@/lib/db'
import { ReviewIssueType } from '@/lib/enums'

// ============================================================================
// TYPES
// ============================================================================

export interface CreateReviewInput {
  orderId: string
  customerId: string
  overallRating: number      // 1-5
  foodRating?: number        // 1-5
  deliveryRating?: number    // 1-5
  comment?: string
  issueType?: ReviewIssueType
}

export interface ReviewResult {
  success: boolean
  reviewId?: string
  error?: string
}

// ============================================================================
// SERVICE
// ============================================================================

export class ReviewService {
  /**
   * Submit a review for a delivered order.
   *
   * FEATURE: merchant_menu_accuracy, dasher_offer_quality
   * CONSTRAINT: One review per order, no edits after submission
   */
  async createReview(input: CreateReviewInput): Promise<ReviewResult> {
    const {
      orderId,
      customerId,
      overallRating,
      foodRating,
      deliveryRating,
      comment,
      issueType,
    } = input

    // Validate rating range
    if (overallRating < 1 || overallRating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' }
    }

    // Get order to verify it's delivered and belongs to customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.customerId !== customerId) {
      return { success: false, error: 'Not authorized to review this order' }
    }

    if (order.status !== 'DELIVERED') {
      return { success: false, error: 'Can only review delivered orders' }
    }

    if (order.review) {
      return { success: false, error: 'Order already reviewed' }
    }

    // Create review and update restaurant rating in transaction
    const review = await prisma.$transaction(async (tx) => {
      // Create the review
      const newReview = await tx.review.create({
        data: {
          orderId,
          customerId,
          restaurantId: order.restaurantId,
          overallRating,
          foodRating,
          deliveryRating,
          comment,
          hadIssue: !!issueType,
          issueType,
        },
      })

      // Recalculate restaurant average
      // LIMITATION: Full recalc on every review - not efficient at scale
      // Would need cached running average or background job
      const aggregates = await tx.review.aggregate({
        where: { restaurantId: order.restaurantId },
        _avg: { overallRating: true },
        _count: { id: true },
      })

      await tx.restaurant.update({
        where: { id: order.restaurantId },
        data: {
          avgRating: aggregates._avg.overallRating ?? 0,
          reviewCount: aggregates._count.id,
        },
      })

      return newReview
    })

    return { success: true, reviewId: review.id }
  }

  /**
   * Get reviews for a restaurant.
   *
   * Used by merchant dashboard and customer browsing.
   */
  async getRestaurantReviews(restaurantId: string, limit: number = 20) {
    return prisma.review.findMany({
      where: { restaurantId },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        order: {
          select: { id: true, placedAt: true, total: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Get reviews by a customer.
   */
  async getCustomerReviews(customerId: string) {
    return prisma.review.findMany({
      where: { customerId },
      include: {
        restaurant: {
          select: { id: true, name: true },
        },
        order: {
          select: { id: true, placedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get reviews with issues for analysis.
   *
   * FEATURE: merchant_menu_accuracy, dasher_offer_quality
   * Used to correlate issues with specific problem types.
   */
  async getReviewsWithIssues(issueType?: ReviewIssueType, market?: string) {
    const where: Record<string, unknown> = { hadIssue: true }

    if (issueType) {
      where.issueType = issueType
    }

    if (market) {
      where.restaurant = { market }
    }

    return prisma.review.findMany({
      where,
      include: {
        restaurant: {
          select: { id: true, name: true, market: true },
        },
        order: {
          select: {
            id: true,
            placedAt: true,
            deliveredAt: true,
            estimatedDelivery: true,
          },
        },
        customer: {
          select: { id: true, market: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get restaurant rating breakdown.
   *
   * Returns distribution of ratings for display (1-star, 2-star, etc.)
   */
  async getRatingBreakdown(restaurantId: string) {
    const reviews = await prisma.review.groupBy({
      by: ['overallRating'],
      where: { restaurantId },
      _count: { overallRating: true },
    })

    // Build breakdown with all ratings 1-5
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of reviews) {
      breakdown[r.overallRating] = r._count.overallRating
    }

    return breakdown
  }

  /**
   * Get issue summary for analytics.
   *
   * FEATURE: merchant_menu_accuracy, dasher_offer_quality
   * Returns issue counts by type, optionally filtered by market.
   */
  async getIssueSummary(market?: string) {
    const where: Record<string, unknown> = { hadIssue: true }

    if (market) {
      where.restaurant = { market }
    }

    const issues = await prisma.review.groupBy({
      by: ['issueType'],
      where,
      _count: { issueType: true },
    })

    return issues.reduce((acc, i) => {
      if (i.issueType) {
        acc[i.issueType] = i._count.issueType
      }
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Check if order has been reviewed.
   */
  async hasReview(orderId: string): Promise<boolean> {
    const review = await prisma.review.findUnique({
      where: { orderId },
    })
    return !!review
  }
}

export const reviewService = new ReviewService()
