/**
 * Subscription Service (Dashly Plus)
 *
 * Manages Plus membership lifecycle:
 * - Trial starts (14-day free trial)
 * - Subscription conversion (trial → paid)
 * - Plan changes (monthly ↔ annual)
 * - Cancellation with reason tracking
 * - Pause/resume for retention
 *
 * AMPLITUDE FEATURE KEYS:
 * - dashly_plus_retention: subscription conversions, cancellations, pauses
 *
 * KEY CONSTRAINTS (for Spark to discover):
 * - ADR-005: Plus membership is boolean flag on user - no benefit tiers yet
 * - Trial period is fixed at 14 days (no A/B testing infrastructure)
 * - Cancellation reasons are captured but not acted upon (no win-back flows)
 *
 * SEE: docs/analytics/instrumentation-map.md
 * SEE: docs/adr/005-boolean-plus-membership.md
 *
 * LIMITATION_PLUS_TIERS: Currently single tier ($9.99/mo). No premium tier
 * with enhanced benefits. See docs/known-limitations.md for opportunities:
 * - Tiered benefits (Plus, Plus Premium)
 * - Family plans
 * - Student/military discounts
 * - Corporate accounts
 */

import { prisma } from '@/lib/db'
import { SubscriptionStatus, SubscriptionPlan, CancelReason } from '@/lib/enums'

// ============================================================================
// CONSTANTS
// ============================================================================

const TRIAL_DAYS = 14
const MONTHLY_PRICE = 9.99
const ANNUAL_PRICE = 99.99 // ~17% discount vs monthly

// Plus benefits (currently all-or-nothing, no tiers)
// FEATURE: dashly_plus_retention
// LIMITATION: Benefits are boolean - you either have Plus or you don't
export const PLUS_BENEFITS = {
  freeDelivery: true,           // $0 delivery on orders $15+
  reducedServiceFee: 0.05,      // 5% vs 15% standard
  prioritySupport: true,        // Faster support queue
  exclusiveOffers: true,        // Plus-only promos
  noMinimumOrder: false,        // Still requires $15 minimum (future enhancement)
} as const

// ============================================================================
// TYPES
// ============================================================================

export interface StartTrialInput {
  userId: string
  stripeCustomerId?: string
}

export interface ConvertTrialInput {
  userId: string
  plan: SubscriptionPlan
  stripeSubscriptionId?: string
}

export interface CancelInput {
  userId: string
  reason: CancelReason
  feedback?: string
}

export interface SubscriptionResult {
  success: boolean
  subscriptionId?: string
  error?: string
}

// ============================================================================
// SERVICE
// ============================================================================

export class SubscriptionService {
  /**
   * Start a 14-day free trial.
   *
   * FEATURE: dashly_plus_retention (trial_started event)
   * CONSTRAINT: Fixed 14-day trial, no A/B testing on duration
   */
  async startTrial(input: StartTrialInput): Promise<SubscriptionResult> {
    const { userId, stripeCustomerId } = input

    // Check if user already has a subscription
    const existing = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (existing) {
      if (existing.status === SubscriptionStatus.CANCELLED) {
        // Returning subscriber - could offer win-back deal (not implemented)
        // LIMITATION: No win-back flow for churned subscribers
        return { success: false, error: 'Previous subscription found. Please contact support.' }
      }
      return { success: false, error: 'Active subscription already exists' }
    }

    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

    // Create subscription
    // Note: Plus membership is determined by subscription status, not a separate flag
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        status: SubscriptionStatus.TRIAL,
        plan: SubscriptionPlan.MONTHLY, // Default plan after trial
        monthlyPrice: MONTHLY_PRICE,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
        stripeCustomerId,
      },
    })

    return { success: true, subscriptionId: subscription.id }
  }

  /**
   * Convert trial to paid subscription.
   *
   * FEATURE: dashly_plus_retention (subscription_converted event)
   * METRIC: trial_to_paid_conversion_rate (current: ~32%, target: 40%)
   */
  async convertTrial(input: ConvertTrialInput): Promise<SubscriptionResult> {
    const { userId, plan, stripeSubscriptionId } = input

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      return { success: false, error: 'No subscription found' }
    }

    if (subscription.status !== SubscriptionStatus.TRIAL) {
      return { success: false, error: 'Subscription is not in trial' }
    }

    const now = new Date()
    const periodEnd = new Date(now)
    if (plan === SubscriptionPlan.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        plan,
        monthlyPrice: plan === SubscriptionPlan.ANNUAL ? ANNUAL_PRICE / 12 : MONTHLY_PRICE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId,
      },
    })

    return { success: true, subscriptionId: subscription.id }
  }

  /**
   * Cancel subscription with reason tracking.
   *
   * FEATURE: dashly_plus_retention (subscription_cancelled event)
   * CONSTRAINT: Reasons are tracked but no automated retention offers
   * LIMITATION: No save attempts, no partial refunds, no pause offering
   */
  async cancel(input: CancelInput): Promise<SubscriptionResult> {
    const { userId, reason, feedback } = input

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      return { success: false, error: 'No subscription found' }
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return { success: false, error: 'Subscription already cancelled' }
    }

    // Cancel subscription
    // Note: Plus membership is determined by subscription status (ACTIVE/TRIAL)
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
        // Note: feedback is not stored - LIMITATION for analysis
      },
    })

    return { success: true, subscriptionId: subscription.id }
  }

  /**
   * Pause subscription (retention mechanism).
   *
   * FEATURE: dashly_plus_retention (subscription_paused event)
   * LIMITATION: Max pause duration not enforced
   */
  async pause(userId: string): Promise<SubscriptionResult> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      return { success: false, error: 'No subscription found' }
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { success: false, error: 'Only active subscriptions can be paused' }
    }

    // Pause subscription - benefits determined by status check
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date(),
      },
    })

    return { success: true, subscriptionId: subscription.id }
  }

  /**
   * Resume paused subscription.
   */
  async resume(userId: string): Promise<SubscriptionResult> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      return { success: false, error: 'No subscription found' }
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      return { success: false, error: 'Subscription is not paused' }
    }

    // Resume subscription - benefits determined by status check
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
      },
    })

    return { success: true, subscriptionId: subscription.id }
  }

  /**
   * Get subscription details for a user.
   */
  async getSubscription(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Get subscription metrics for analysis.
   *
   * FEATURE: dashly_plus_retention
   * Returns aggregate data for Plus performance analysis.
   */
  async getMetrics() {
    const [
      totalActive,
      totalTrial,
      totalCancelled,
      cancelReasons,
    ] = await Promise.all([
      prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatus.TRIAL },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatus.CANCELLED },
      }),
      prisma.subscription.groupBy({
        by: ['cancelReason'],
        where: { status: SubscriptionStatus.CANCELLED },
        _count: { cancelReason: true },
      }),
    ])

    return {
      totalActive,
      totalTrial,
      totalCancelled,
      cancelReasons: cancelReasons.reduce((acc, r) => {
        if (r.cancelReason) {
          acc[r.cancelReason] = r._count.cancelReason
        }
        return acc
      }, {} as Record<string, number>),
    }
  }

  /**
   * Check if user has active Plus benefits.
   * Utility method for other services to check Plus status.
   */
  async hasActiveBenefits(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    return subscription?.status === SubscriptionStatus.ACTIVE ||
           subscription?.status === SubscriptionStatus.TRIAL
  }
}

export const subscriptionService = new SubscriptionService()
