# ADR-006: Manual Refund Approval

**Status:** Accepted
**Date:** 2024-03-01
**Feature Key:** `support_resolution_speed`
**Related Amplitude Events:** `Support - Opened - Chat`, `Support - Requested - Refund`

## Context

When customers have issues with their orders (late delivery, wrong items, quality problems), they can request refunds. The refund workflow determines how quickly issues are resolved and customer trust is maintained.

## Current Implementation

```typescript
// src/domain/refund/eligibility.ts
// All refunds require manual admin approval

enum RefundStatus {
  PENDING,    // Customer requested, awaiting review
  APPROVED,   // Admin approved
  DENIED,     // Admin denied
  PROCESSED   // Refund issued
}

// Workflow:
// 1. Customer requests refund within 24-hour window
// 2. Refund enters PENDING status
// 3. Admin reviews in admin dashboard
// 4. Admin approves/denies with reason
// 5. If approved, refund processed
```

**Code Location:**
- `src/domain/refund/eligibility.ts` - Eligibility rules
- `src/services/RefundService.ts` - Request and processing
- `src/app/admin/refunds/page.tsx` - Admin review UI

## Current Limitation

1. **All manual:** Every refund waits for human review
2. **No auto-approval:** Even clear-cut cases (30+ min late) need admin
3. **No risk scoring:** Can't distinguish fraud from legitimate claims
4. **Slow resolution:** Average 4.2 hours from request to resolution
5. **Admin bottleneck:** Peak times create refund backlogs
6. **No self-service:** Customers can't resolve simple issues themselves

## Impact on Product Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Resolution time | 4.2 hours | 15 min (auto) | High - customer frustration |
| Support contact rate | 6.4% | 4% | Medium - preventable contacts |
| Refund approval rate | 78% | N/A | Most refunds are legitimate |

## Related Amplitude Events

- `Support - Requested - Refund` - Every refund request
- `refund_reason` distribution shows most are legitimate
- `refund_type` (full vs partial) shows claim patterns
- Time between request and resolution not currently tracked

## Refund Request Breakdown

```
By reason (from Amplitude):
- EXCESSIVE_DELAY: 35%    ← Auto-approvable if >30 min late
- MISSING_ITEMS: 25%      ← Auto-approvable with photo proof
- WRONG_ITEMS: 20%        ← Auto-approvable with photo proof
- QUALITY_ISSUE: 12%      ← Needs review
- NEVER_DELIVERED: 5%     ← Auto-approvable if GPS confirms
- OTHER: 3%               ← Needs review

~65% of refunds could be auto-approved with simple rules
```

## Potential Future Solution

**Tiered Auto-Approval System:**

```typescript
// src/domain/refund/auto-approval.ts

function evaluateRefundRequest(request: RefundRequest): RefundDecision {
  // Tier 1: Instant auto-approve
  if (request.reason === 'EXCESSIVE_DELAY' && request.delayMinutes > 30) {
    return { action: 'AUTO_APPROVE', confidence: 0.95 };
  }

  if (request.reason === 'NEVER_DELIVERED' && !gpsConfirmsDelivery(request.orderId)) {
    return { action: 'AUTO_APPROVE', confidence: 0.90 };
  }

  // Tier 2: Auto-approve with evidence
  if (request.reason === 'MISSING_ITEMS' && request.hasPhotoEvidence) {
    return { action: 'AUTO_APPROVE', confidence: 0.85 };
  }

  // Tier 3: Risk-scored manual review
  const riskScore = calculateFraudRisk(request);
  if (riskScore < 0.2) {
    return { action: 'AUTO_APPROVE', confidence: 0.80 };
  }

  return { action: 'MANUAL_REVIEW', riskScore };
}
```

**Fraud Risk Factors:**
- Customer refund history (>3 in 30 days = higher risk)
- Order value (>$100 = higher risk)
- Account age (<30 days = higher risk)
- Merchant dispute rate
- Delivery GPS accuracy

**Self-Service Resolution:**
- In-app refund request with photo upload
- Instant approval for qualifying cases
- Real-time status updates

**Requirements:**
- Auto-approval rules engine
- Fraud risk scoring model
- Photo evidence upload infrastructure
- GPS delivery confirmation integration
- Customer refund history tracking
- Audit trail for auto-decisions

**Expected Improvement:**
- Resolution time: 4.2 hours → 15 min (for auto-approved)
- Auto-approval rate: 0% → 65%
- Support contact rate: 6.4% → 4%
- Admin workload: -60%

## Spark Demo Angle

When Spark analyzes support resolution issues, it should discover:

1. **From Amplitude:** 4.2 hour average resolution, 6.4% contact rate
2. **From this ADR:** All refunds require manual approval
3. **From code:** `RefundService` has no auto-approval logic
4. **From refund reasons:** 65% could be auto-approved with simple rules
5. **Recommendation:** Tiered auto-approval system per this ADR

**Demo Question:** "Why is refund resolution slow and what would speed up support?"

## Decision

Accept manual refund approval for MVP. Plan tiered auto-approval as support improvement tied to `support_resolution_speed` feature key.

## Consequences

- Complete human control for MVP
- Known 4.2 hour resolution time accepted for now
- No fraud risk if all reviewed manually
- Customer satisfaction impacted
- Admin scaling required as volume grows
- Investment required for auto-approval infrastructure
