# Dashly

A food delivery marketplace connecting customers, restaurants, and couriers.

## Overview

Dashly is a three-sided marketplace:
- **Customers** browse restaurants and place orders
- **Restaurants** manage menus and fulfill orders
- **Couriers** pick up and deliver orders

## Quick Start

```bash
npm install
npm run db:reset
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role | Email | Actions |
|------|-------|---------|
| Customer | sarah@example.com | Browse, order, track |
| Restaurant | mario@bellaroma.com | Manage orders |
| Courier | alex@dashly.com | Accept deliveries |
| Admin | support@dashly.com | Process refunds |

## Project Structure

```
src/
├── app/           # Pages and API routes
├── domain/        # Business rules (pure functions)
├── services/      # Database operations
├── components/    # Shared UI components
└── lib/           # Utilities and constants
```

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

## Testing

```bash
npm test          # Watch mode
npm run test:run  # Single run
npm run build     # Type check
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- Vitest
