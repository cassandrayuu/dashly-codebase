# ADR-005: Boolean Plus Membership

**Status:** Accepted
**Date:** 2024-02-20
**Feature Key:** `dashly_plus_retention`
**Related Amplitude Events:** `Membership - Viewed - Plus Upsell`, `Membership - Converted - Plus Subscription`, `Membership - Canceled - Plus Subscription`

## Context

Dashly Plus is a subscription program offering benefits like free delivery and exclusive promotions. The subscription system needs to track membership status, billing, and entitlements.

## Current Implementation

```prisma
// prisma/schema.prisma
model User {
  id            String   @id
  email         String   @unique
  is_plus_member Boolean @default(false)  // ← Only this field exists
  // No subscription model
  // No billing integration
  // No entitlement enforcement
}
```

**Code Location:**
- `prisma/schema.prisma` - `User.is_plus_member` boolean
- `src/domain/cart/pricing.ts` - Should check Plus for free delivery (not enforced)

## Current Limitation

1. **Boolean only:** No subscription lifecycle (trial, active, paused, cancelled)
2. **No billing:** No Stripe/payment integration for recurring charges
3. **No entitlements:** Free delivery benefit not actually enforced in pricing
4. **No pause/resume:** Members can only be Plus or not Plus
5. **No renewal tracking:** Can't predict or prevent churn
6. **No trial:** Can't offer trial periods to convert customers

## Impact on Product Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| 3-month retention | 62% | 78% | -16% |
| Monthly churn | 3.8% | 1.6% | +2.2% |
| Order frequency (Plus) | 3.8/mo | 6.2/mo | -2.4 |

## Related Amplitude Events

- `Membership - Viewed - Plus Upsell` - Not tracked (no upsell UI)
- `Membership - Converted - Plus Subscription` - Manual flag toggle only
- `Membership - Canceled - Plus Subscription` - Captures cancel reasons
- `is_plus_member` user property in all events

## Why Retention Is Low

**Missing retention mechanics:**
```
Current state:
- No onboarding showing Plus value
- No usage dashboard ("You saved $X this month")
- No pause option (cancel is only choice)
- No win-back flow after cancellation
- No reminder of benefits before renewal

Customer experience:
"I subscribed but forgot I have it"
"I don't see the value anymore"
"I wanted to pause, but had to cancel"
```

## Potential Future Solution

**Full Subscription Infrastructure:**

```prisma
model Subscription {
  id              String   @id
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  status          SubscriptionStatus  // TRIAL, ACTIVE, PAUSED, CANCELLED, EXPIRED
  plan            PlanType            // MONTHLY, ANNUAL

  trialEndsAt     DateTime?
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  stripeSubscriptionId String?
  stripeCustomerId     String?

  cancelReason    String?
  cancelledAt     DateTime?
  pausedAt        DateTime?
  pauseResumeAt   DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAUSED
  PAST_DUE
  CANCELLED
  EXPIRED
}
```

**Entitlement Enforcement:**
```typescript
// src/domain/subscription/entitlements.ts
function getDeliveryFee(user: User, subscription: Subscription | null): number {
  if (subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL') {
    return 0; // Free delivery for Plus members
  }
  return calculateStandardDeliveryFee();
}
```

**Retention Features:**
- Trial period (7 or 14 days)
- Pause subscription (up to 3 months)
- Usage dashboard showing savings
- Renewal reminder emails
- Win-back offers after cancellation

**Requirements:**
- Stripe Subscriptions API integration
- `Subscription` model with full lifecycle
- Entitlement service for benefit enforcement
- Background jobs for renewal/expiration
- Member dashboard UI
- Email/notification infrastructure

## Spark Demo Angle

When Spark analyzes Plus retention issues, it should discover:

1. **From Amplitude:** 62% 3-month retention, 3.8% monthly churn
2. **From this ADR:** Plus is just a boolean, no lifecycle management
3. **From code:** `User.is_plus_member` is the only subscription data
4. **From feedback:** "I don't see the value" - no usage dashboard
5. **Recommendation:** Full subscription infrastructure per this ADR

**Demo Question:** "Why is Dashly Plus retention low and what subscription features would improve it?"

## Decision

Accept boolean membership for MVP. Plan full subscription infrastructure as retention improvement tied to `dashly_plus_retention` feature key.

## Consequences

- Minimal implementation for MVP launch
- Known retention gap accepted for now
- No billing complexity
- Cannot offer trials, pause, or show value
- Significant investment required for proper subscriptions
