# Dashly

A food delivery marketplace built for **AI-assisted product analysis and spec generation**.

## What This Is

Dashly is a realistic DoorDash/Uber Eats-style codebase designed to demonstrate how AI can help with product development. It features:

- **Working app** with customers, restaurants, and couriers
- **Clear business rules** documented in code comments
- **Strategic limitations** representing real product opportunities
- **AI-friendly structure** for spec generation

This is a demo environment, not a production app.

---

## Quick Start

```bash
npm install
npm run db:reset   # Creates database with demo data
npm run dev        # http://localhost:3000
npm test           # Run tests
```

## Demo Accounts

| Role | Email | Actions |
|------|-------|---------|
| Customer | sarah@example.com | Browse, order, track |
| Restaurant | mario@bellaroma.com | Manage orders |
| Courier | alex@dashly.com | Accept deliveries |
| Admin | support@dashly.com | Process refunds |

---

## For AI Product Assistants (Spark)

This codebase is structured for LLM analysis and **cross-system reasoning** with Amplitude analytics.

### Quick Navigation

| Want to... | Read this |
|------------|-----------|
| **Map analytics to code** | `docs/analytics/instrumentation-map.md` |
| **Understand technical constraints** | `docs/adr/*.md` |
| Understand the product | `docs/product-overview.md` |
| Find enhancement opportunities | `docs/known-limitations.md` |
| See user journeys | `docs/user-flows.md` |
| Understand architecture | `docs/architecture.md` |
| Find config values | `src/lib/constants.ts` |

---

## Amplitude Integration (Feature Keys)

This codebase is aligned with **Dashly's Amplitude analytics** for cross-system product reasoning.

### Feature Key → Code Mapping

| Feature Key | Primary Code Location | ADR | Key Constraint |
|-------------|----------------------|-----|----------------|
| `checkout_conversion` | `src/services/OrderService.ts` | ADR-001 | Synchronous payment (4.2% failure) |
| `delivery_tracking_accuracy` | `src/domain/order/assignment.ts` | ADR-002 | Static ETA (±12 min accuracy) |
| `dashly_plus_retention` | `prisma/schema.prisma` (User) | ADR-005 | Boolean flag only, no subscription |
| `merchant_menu_accuracy` | `src/services/MerchantService.ts` | ADR-003 | 4-hour pull-based sync |
| `dasher_offer_quality` | `src/domain/order/assignment.ts` | ADR-004 | Nearest-only assignment |
| `support_resolution_speed` | `src/domain/refund/eligibility.ts` | ADR-006 | Manual approval (4.2 hr avg) |
| `promo_redemption` | `src/domain/promotion/eligibility.ts` | — | Single promo per order |
| `search_relevance` | `src/app/restaurants/page.tsx` | — | Name-only search |

### How to Use Feature Keys

1. **Search for `FEATURE:` comments** in code to find Amplitude-aligned locations
2. **Read the ADR** for technical constraints Spark should surface
3. **Check instrumentation map** for event → code → limitation mapping

```bash
# Find all feature key annotations
grep -r "FEATURE:" src/
```

### Cross-System Reasoning Pattern

When analyzing a metric issue, Spark should:

1. **Amplitude** → Identify metric (e.g., `checkout_conversion` at 42% abandonment)
2. **Instrumentation Map** → Find code location (`OrderService.placeOrder()`)
3. **ADR** → Understand technical constraint (ADR-001: synchronous payment)
4. **Code** → See implementation details and `LIMITATION_*` markers
5. **Spec** → Generate recommendation based on constraint

---

### Limitation Markers

Search for `LIMITATION_*` in code to find enhancement opportunities:

| Marker | Area | Related Feature Key |
|--------|------|---------------------|
| `LIMITATION_SUBSTITUTION_INTELLIGENCE` | Smart item substitution | `merchant_menu_accuracy` |
| `LIMITATION_ORDER_EDITING` | Post-checkout modifications | `checkout_conversion` |
| `LIMITATION_COURIER_BATCHING` | Delivery optimization | `dasher_offer_quality` |
| `LIMITATION_AUTO_REFUNDS` | Auto-approval rules | `support_resolution_speed` |

Each marker includes current behavior, gaps, and file references.

---

## Three Strategic Enhancement Areas

These are high-value product opportunities with intentionally simplified implementations:

### 1. Substitution Handling
**Now:** Merchant picks ONE substitute manually → customer accepts/rejects
**Gap:** No preferences, no auto-matching, no ranked alternatives

### 2. Post-Checkout Modifications
**Now:** Orders are immutable after placement
**Gap:** No item changes, no address updates, no tip adjustments

### 3. Courier Assignment & ETA
**Now:** Closest courier wins, ETA = prep time + 15 min buffer
**Gap:** No traffic, no batching, no performance weighting

See `docs/known-limitations.md` for detailed walkthroughs and spec generation prompts.

---

## Business Rules

| Rule | Location |
|------|----------|
| Restaurant must be open | `domain/restaurant/availability.ts` |
| Delivery address in zone | `domain/restaurant/availability.ts` |
| Minimum order amount | `domain/cart/validation.ts` |
| Single restaurant per cart | `services/CartService.ts` |
| Promo code eligibility | `domain/promotion/eligibility.ts` |
| 5% service fee ($0.50-$10) | `domain/cart/pricing.ts` |
| Free cancel within 5 min | `domain/order/lifecycle.ts` |
| Refund within 24 hours | `domain/refund/eligibility.ts` |

---

## Project Structure

```
docs/                    # Product & architecture docs
src/
  app/                   # Next.js pages and API routes
  domain/                # Pure business logic (testable)
  services/              # Orchestration layer
  components/            # UI components
  lib/                   # Constants, enums, utilities
prisma/                  # Database schema and seed
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- Vitest

## Testing

```bash
npm test          # Watch mode
npm run test:run  # Single run
npm run build     # Type check
```

---

## ADR Index (Technical Constraints)

These Architectural Decision Records document constraints that Spark should surface when analyzing product opportunities:

| ADR | Constraint | Impact | Feature Key |
|-----|------------|--------|-------------|
| [ADR-001](docs/adr/001-synchronous-payment-flow.md) | Synchronous payment with 30-sec timeout | 4.2% payment failures, 42% abandonment | `checkout_conversion` |
| [ADR-002](docs/adr/002-static-eta-calculation.md) | Static ETA, no GPS freshness | ±12 min accuracy, 23% late rate | `delivery_tracking_accuracy` |
| [ADR-003](docs/adr/003-pull-based-menu-sync.md) | 4-hour pull-based menu sync | 3% cancellation in Phoenix | `merchant_menu_accuracy` |
| [ADR-004](docs/adr/004-nearest-courier-assignment.md) | Nearest-only assignment | 0.79 acceptance in Miami | `dasher_offer_quality` |
| [ADR-005](docs/adr/005-boolean-plus-membership.md) | Boolean flag, no subscription infra | 62% 3-month retention | `dashly_plus_retention` |
| [ADR-006](docs/adr/006-manual-refund-approval.md) | All refunds need manual approval | 4.2 hour resolution time | `support_resolution_speed` |

Each ADR includes:
- Context and current implementation
- Impact on product metrics
- Related Amplitude events
- Potential future solution
- Spark demo angle
