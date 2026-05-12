/**
 * Subscription Domain Types
 *
 * Type definitions for Dashly Plus subscription management.
 *
 * AMPLITUDE FEATURE KEYS:
 * - dashly_plus_retention
 *
 * SEE: docs/adr/005-boolean-plus-membership.md
 */

import { SubscriptionStatus, SubscriptionPlan, CancelReason } from '@/lib/enums'

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

/**
 * Subscription state for domain logic.
 */
export interface SubscriptionState {
  status: SubscriptionStatus
  plan: SubscriptionPlan
  isTrialing: boolean
  daysUntilTrialEnd: number | null
  isActive: boolean
  isPaused: boolean
  isCancelled: boolean
}

/**
 * Trial eligibility check result.
 */
export interface TrialEligibility {
  isEligible: boolean
  reason?: 'already_subscribed' | 'previous_trial' | 'previous_subscription'
}

/**
 * Cancellation analysis for retention.
 */
export interface CancellationAnalysis {
  reason: CancelReason
  tenure: number              // Days subscribed before cancel
  totalSavings: number        // Savings during subscription
  ordersAsPlus: number        // Orders placed while Plus
  wasHighValue: boolean       // High-value customer indicator
  suggestedRetention?: 'pause' | 'discount' | 'extend_trial'
}

// ============================================================================
// BILLING TYPES
// ============================================================================

/**
 * Billing period for subscription.
 */
export interface BillingPeriod {
  start: Date
  end: Date
  price: number
  plan: SubscriptionPlan
}

/**
 * Prorated amount for plan changes.
 */
export interface ProratedAmount {
  credit: number              // Credit from remaining period
  charge: number              // Charge for new plan
  netAmount: number           // Net charge/refund
}

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Plus program metrics for analysis.
 */
export interface PlusMetrics {
  totalSubscribers: number
  activeSubscribers: number
  trialSubscribers: number
  churnedSubscribers: number
  trialConversionRate: number
  monthlyChurnRate: number
  avgTenureDays: number
  topCancelReasons: Array<{ reason: CancelReason; count: number }>
}
