/**
 * Application Enums
 *
 * SQLite does not support native enums, so all enum fields are stored as strings
 * in the database. This file provides TypeScript enums and type guards for
 * validation at the application layer.
 *
 * These enums match the string values stored in the database and documented
 * in prisma/schema.prisma.
 */

// ============================================================================
// USER ENUMS
// ============================================================================

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  COURIER = 'COURIER',
  ADMIN = 'ADMIN',
}

export enum CourierStatus {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  ON_DELIVERY = 'ON_DELIVERY',
}

// ============================================================================
// ORDER ENUMS
// ============================================================================

/**
 * Order status progression:
 *
 *   PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → COURIER_ASSIGNED → PICKED_UP → DELIVERED
 *      ↓          ↓           ↓              ↓                  ↓
 *   CANCELLED  CANCELLED   CANCELLED      CANCELLED          CANCELLED
 *
 * Terminal states: DELIVERED, CANCELLED
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COURIER_ASSIGNED = 'COURIER_ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum SubstitutionStatus {
  NONE = 'NONE',
  UNAVAILABLE = 'UNAVAILABLE',
  SUBSTITUTE_OFFERED = 'SUBSTITUTE_OFFERED',
  SUBSTITUTE_ACCEPTED = 'SUBSTITUTE_ACCEPTED',
  SUBSTITUTE_REJECTED = 'SUBSTITUTE_REJECTED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
}

// ============================================================================
// PROMOTION ENUMS
// ============================================================================

/**
 * Discount calculation types:
 * - FLAT_AMOUNT: Fixed dollar discount (e.g., $5 off)
 * - PERCENTAGE: Percentage of subtotal (e.g., 15% off)
 * - FREE_DELIVERY: Waives delivery fee
 */
export enum DiscountType {
  FLAT_AMOUNT = 'FLAT_AMOUNT',
  PERCENTAGE = 'PERCENTAGE',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

// ============================================================================
// REFUND ENUMS
// ============================================================================

export enum RefundReason {
  WRONG_ITEMS = 'WRONG_ITEMS',
  MISSING_ITEMS = 'MISSING_ITEMS',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  NEVER_DELIVERED = 'NEVER_DELIVERED',
  EXCESSIVE_DELAY = 'EXCESSIVE_DELAY',
  OTHER = 'OTHER',
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  DELIVERY_FEE = 'DELIVERY_FEE',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  PROCESSED = 'PROCESSED',
}

// ============================================================================
// SUBSCRIPTION ENUMS (Dashly Plus)
// ============================================================================
// FEATURE: dashly_plus_retention
// ADR: docs/adr/005-boolean-plus-membership.md

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export enum CancelReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  NOT_ENOUGH_VALUE = 'NOT_ENOUGH_VALUE',
  SWITCHING_COMPETITOR = 'SWITCHING_COMPETITOR',
  TEMPORARY_PAUSE = 'TEMPORARY_PAUSE',
  OTHER = 'OTHER',
}

// ============================================================================
// MARKET ENUMS
// ============================================================================
// Used for geographic segmentation and market-specific analysis
// FEATURE: merchant_menu_accuracy (Phoenix), dasher_offer_quality (Miami)

export enum Market {
  SF = 'sf',       // San Francisco - mature, healthy baseline
  AUS = 'aus',     // Austin - growing market
  PHX = 'phx',     // Phoenix - struggling, menu accuracy issues
  MIA = 'mia',     // Miami - struggling, dasher supply issues
}

// ============================================================================
// REVIEW ENUMS
// ============================================================================
// FEATURE: merchant_menu_accuracy, dasher_offer_quality

export enum ReviewIssueType {
  LATE_DELIVERY = 'LATE_DELIVERY',
  WRONG_ITEMS = 'WRONG_ITEMS',
  MISSING_ITEMS = 'MISSING_ITEMS',
  QUALITY = 'QUALITY',
  OTHER = 'OTHER',
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole)
}

export function isValidCourierStatus(value: string): value is CourierStatus {
  return Object.values(CourierStatus).includes(value as CourierStatus)
}

export function isValidOrderStatus(value: string): value is OrderStatus {
  return Object.values(OrderStatus).includes(value as OrderStatus)
}

export function isValidDiscountType(value: string): value is DiscountType {
  return Object.values(DiscountType).includes(value as DiscountType)
}

export function isValidRefundReason(value: string): value is RefundReason {
  return Object.values(RefundReason).includes(value as RefundReason)
}

export function isValidRefundStatus(value: string): value is RefundStatus {
  return Object.values(RefundStatus).includes(value as RefundStatus)
}

export function isValidSubscriptionStatus(value: string): value is SubscriptionStatus {
  return Object.values(SubscriptionStatus).includes(value as SubscriptionStatus)
}

export function isValidMarket(value: string): value is Market {
  return Object.values(Market).includes(value as Market)
}
