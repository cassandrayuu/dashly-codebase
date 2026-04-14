# Dashly Demo - Team Overview

## What Is This?

Dashly is a **demo codebase** for showing how AI can assist with product thinking and spec generation. It's a realistic food delivery marketplace (like DoorDash) with:

- Working UI and API
- Real business logic
- **Intentional limitations** that AI can identify and spec solutions for

**This is NOT a production app.** It's a controlled environment for AI product analysis demos.

---

## Why This Structure?

The codebase is designed so an AI assistant can:

1. **Understand current behavior** — Business rules are documented in code comments
2. **Identify improvement opportunities** — `LIMITATION_*` markers flag gaps
3. **Generate enhancement specs** — Each limitation includes context for PRD/spec writing
4. **Trace implementation paths** — Key files are listed for each feature area

---

## The Three Demo Scenarios

These are the primary use cases for AI analysis demos:

### Scenario 1: Substitution Handling
> "An item is out of stock. What happens today, and how could we improve it?"

**Current state:** Merchant manually picks one substitute, customer accepts or rejects.

**AI can identify:**
- No customer preferences stored
- Single option only (no alternatives)
- No push notification
- Manual merchant effort for each item

**Demo prompt:** *"Write a PRD for intelligent substitution handling with customer preferences."*

---

### Scenario 2: Post-Checkout Order Changes
> "Customer placed an order but forgot to add fries. What can they do?"

**Current state:** Nothing. Cancel and reorder (may incur fees).

**AI can identify:**
- Orders are immutable
- No edit window
- No address correction
- Cancellation fees penalize legitimate mistakes

**Demo prompt:** *"Design a feature that lets customers modify orders within 5 minutes of checkout."*

---

### Scenario 3: Courier Assignment & ETA
> "How do we decide which courier gets an order? How accurate is our ETA?"

**Current state:** Closest courier (straight-line distance) wins. ETA = prep time + 15 min.

**AI can identify:**
- No traffic or road routing
- No multi-order batching
- Static ETA (ignores real-world factors)
- No courier preferences or performance data

**Demo prompt:** *"Create a technical spec for traffic-aware courier assignment with accurate ETAs."*

---

## How to Run a Demo

1. **Start the app:** `npm run dev`
2. **Point AI at the codebase** (Claude, Cursor, etc.)
3. **Ask product questions:**
  - "How does substitution work today?"
  - "What are the main product gaps?"
  - "Write a spec for [feature]"

The AI should find the relevant docs, limitation markers, and business rules automatically.

---

## Key Files for AI Analysis

| Purpose | File |
| --- | --- |
| Product overview | `docs/product-overview.md` |
| Limitation details + spec prompts | `docs/known-limitations.md` |
| User flow walkthroughs | `docs/user-flows.md` |
| Architecture | `docs/architecture.md` |
| All configurable values | `src/lib/constants.ts` |
| Business rules (substitution) | `src/domain/substitution/handling.ts` |
| Business rules (order lifecycle) | `src/domain/order/lifecycle.ts` |
| Business rules (courier assignment) | `src/domain/order/assignment.ts` |

---

## Known Gaps in AI Analysis Support

These areas could be stronger for AI spec generation:

| Gap | Impact | Status |
| --- | --- | --- |
| No API endpoint docs | AI can't spec API changes accurately | Could add |
| No error flow docs | Unclear what happens when validation fails | Could add |
| No baseline metrics | Can't write "improve X by Y%" without data | Intentional (demo) |
| No concurrency docs | Race conditions not addressed | Low priority |

---

## Not Included (Intentionally)

- Real authentication (uses header-based demo auth)
- Real payments
- Real push notifications
- Production error handling
- Full test coverage

These are omitted to keep the demo focused and the codebase small.

---

## Questions?

The best way to explore is to ask an AI assistant to analyze the codebase. Try:

- "What are the three main product limitations?"
- "How does courier assignment work today?"
- "Write a PRD for customer substitution preferences"
