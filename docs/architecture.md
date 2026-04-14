# Architecture Overview

## Directory Structure

```
dashly-codebase/
├── docs/                    # Product and technical documentation
├── prisma/
│   ├── schema.prisma        # Data model definitions
│   └── seed.ts              # Sample data generation
├── src/
│   ├── app/                 # Next.js App Router (pages + API)
│   │   ├── api/             # REST API routes
│   │   ├── restaurants/     # Customer: browse/view restaurants
│   │   ├── orders/          # Customer: view/track orders
│   │   ├── merchant/        # Merchant: dashboard and order mgmt
│   │   ├── courier/         # Courier: delivery management
│   │   └── admin/           # Admin: refund processing
│   ├── domain/              # Pure business logic (no I/O)
│   │   ├── restaurant/      # Restaurant availability rules
│   │   ├── cart/            # Cart validation and pricing
│   │   ├── order/           # Order lifecycle and assignment
│   │   ├── promotion/       # Promo code eligibility
│   │   ├── refund/          # Refund eligibility
│   │   └── substitution/    # Item substitution handling
│   ├── services/            # Application services (orchestration)
│   │   ├── CartService.ts
│   │   ├── OrderService.ts
│   │   ├── CourierService.ts
│   │   ├── MerchantService.ts
│   │   └── RefundService.ts
│   └── lib/                 # Shared utilities
│       ├── db.ts            # Prisma client singleton
│       ├── auth.ts          # Auth helpers
│       └── constants.ts     # Configuration values
└── tests/                   # Test files mirror src/ structure
```

## Architectural Layers

### 1. Presentation Layer (`src/app/`)

**Pages** (Server Components):
- Fetch data directly from database or services
- Render HTML with Tailwind-style inline CSS
- No client-side interactivity in v1 (forms are static)

**API Routes**:
- Handle HTTP requests
- Parse and validate input
- Call service layer
- Return JSON responses
- Handle errors and auth

### 2. Service Layer (`src/services/`)

**Purpose**: Orchestrate complex operations that involve multiple domain rules and database operations.

**Characteristics**:
- Stateless classes with methods for each use case
- Call domain functions for business rules
- Perform database operations via Prisma
- Handle transactions when needed
- Return structured results

**Example (OrderService.placeOrder)**:
```typescript
async placeOrder(input) {
  // 1. Validate cart using domain logic
  const validation = await cartService.validateForCheckout(...)

  // 2. Calculate pricing using domain logic
  const pricing = calculateCartPricing(cart, promoApplication)

  // 3. Create order in database (transaction)
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create(...)
    await tx.promotionUsage.create(...)
    await tx.cart.delete(...)
    return newOrder
  })

  return { success: true, order }
}
```

### 3. Domain Layer (`src/domain/`)

**Purpose**: Encapsulate business rules as pure functions.

**Characteristics**:
- No database access
- No external I/O
- Take data as input, return decisions
- Easy to test
- Document business rules in code

**Structure** (per domain):
```
domain/
└── {domain}/
    ├── types.ts        # TypeScript types
    └── {rule}.ts       # Pure functions implementing rules
```

**Example (promotion/eligibility.ts)**:
```typescript
export function checkPromotionEligibility(
  promotion: Promotion | null,
  context: PromotionContext
): PromotionEligibilityCheck {
  if (!promotion) return { isEligible: false, reason: 'CODE_NOT_FOUND' }
  if (!promotion.isActive) return { isEligible: false, reason: 'CODE_INACTIVE' }
  // ... more rules
  return { isEligible: true, reason: null, promotion }
}
```

### 4. Data Layer (`prisma/`)

**Prisma Schema**:
- Defines all entities and relationships
- Uses SQLite for simplicity
- Includes enums for status fields

**Prisma Client** (`src/lib/db.ts`):
- Singleton pattern for connection reuse
- Direct database access from services

## Data Flow

### Read Path (e.g., View Restaurant)
```
Browser → Page Component → prisma.restaurant.findUnique → Render HTML
```

### Write Path (e.g., Place Order)
```
Browser → API Route → Service → Domain (validate) → Prisma (write) → Response
```

### Business Rule Check
```
Service needs decision → Domain function → Pure calculation → Return result
```

## Key Design Decisions

### 1. Domain Layer Isolation
Business rules are isolated in `src/domain/` as pure functions. This makes rules:
- Easy to understand (read the function)
- Easy to test (no mocking needed)
- Easy to change (one place to update)

### 2. Service Layer Orchestration
Services combine domain rules with database operations. This separation means:
- Domain functions stay pure
- Services handle the "how" (database, transactions)
- API routes stay thin

### 3. Server Components Only
v1 uses only Server Components:
- Simpler mental model
- No client-side state management
- Forms would need client components in production

### 4. Inline Styling
CSS is inline for simplicity:
- No build step for styles
- Easy to see what's styled
- Not production-ready (would use Tailwind or CSS modules)

## Configuration

**Constants** (`src/lib/constants.ts`):
```typescript
SERVICE_FEE_PERCENTAGE = 0.05        // 5%
MINIMUM_SERVICE_FEE = 0.50           // $0.50 min
MAXIMUM_SERVICE_FEE = 10.00          // $10 max
COURIER_SEARCH_RADIUS_MILES = 5      // Courier search area
REFUND_ELIGIBILITY_HOURS = 24        // Refund window
FREE_CANCELLATION_MINUTES = 5        // No-fee cancel window
```

These values can be changed to adjust platform behavior.

## Authentication

v1 uses a simplified header-based auth:
- Client sends `x-user-id` header
- Server looks up user by ID
- Role checked against required role

Production would use:
- NextAuth.js or similar
- Session-based auth
- Proper role middleware

## Testing Strategy

**Unit Tests** (`src/domain/__tests__/`):
- Test domain functions in isolation
- No mocking needed (pure functions)
- Cover all business rule branches

**Not included in v1**:
- Integration tests (API routes)
- E2E tests (full flows)
- Service tests (would need database mocking)

## Extension Points

To add new functionality:

1. **New business rule**: Add domain function in appropriate domain folder
2. **New API endpoint**: Add route in `src/app/api/`
3. **New user flow**: Add page in `src/app/`, call services
4. **New entity**: Add to Prisma schema, migrate, update services

## Limitations

See `docs/known-limitations.md` for features not included in v1.
