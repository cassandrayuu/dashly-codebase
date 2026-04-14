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

## For AI Product Assistants

This codebase is structured for LLM analysis. Start here:

| Want to... | Read this |
|------------|-----------|
| Understand the product | `docs/product-overview.md` |
| Find enhancement opportunities | `docs/known-limitations.md` |
| See user journeys | `docs/user-flows.md` |
| Understand architecture | `docs/architecture.md` |
| Find config values | `src/lib/constants.ts` |

### Limitation Markers

Search for `LIMITATION_*` in code to find enhancement opportunities:

| Marker | Area |
|--------|------|
| `LIMITATION_SUBSTITUTION_INTELLIGENCE` | Smart item substitution |
| `LIMITATION_ORDER_EDITING` | Post-checkout modifications |
| `LIMITATION_COURIER_BATCHING` | Delivery optimization |

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
