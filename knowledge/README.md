# Knowledge Base

Domain knowledge for building cross-border e-commerce ERP systems. Distilled from real production experience, not documentation rehashes.

## Structure

```
knowledge/
├── domain/                    # Business domain knowledge
│   ├── order-lifecycle.md     # Order state machine, holds, routing, sync
│   ├── accounting-model.md    # Double-entry bookkeeping, multi-currency
│   ├── product-catalog.md     # Three-layer product architecture
│   ├── logistics-model.md     # Shipping, tracking, carrier abstraction
│   └── pricing-model.md       # Cost-driven pricing, platform fees
├── platforms/                 # Platform integration patterns
│   ├── platform-abstraction.md # Multi-platform architecture (START HERE)
│   ├── ebay-patterns.md       # eBay OAuth, APIs, quirks
│   ├── walmart-patterns.md    # Walmart Feed API, settlement reports
│   ├── amazon-patterns.md     # SP-API, FBA vs FBM, throttling
│   └── mercadolibre-patterns.md # MeLi across 12 Latin American markets
└── architecture/              # System architecture patterns
    ├── module-boundaries.md   # Module structure, public API pattern
    ├── multi-tenant.md        # Shared schema + tenantId + RLS
    ├── tech-stack.md          # Recommended stack with rationale
    └── event-driven.md        # BullMQ workers, circuit breaker, DLQ
```

## How to Use

These knowledge files are designed to be loaded by AI agents as context when building ERP features. They provide:

1. **Domain models** — What tables to create, what fields to include, what states to track
2. **Platform quirks** — Hard-won lessons from production that documentation doesn't tell you
3. **Architecture patterns** — How to structure code for maintainability and multi-tenancy
4. **Checklists** — Step-by-step guides for adding new platforms or features

## Reading Order

For new developers:
1. `architecture/tech-stack.md` — Understand the technology choices
2. `architecture/module-boundaries.md` — Understand code structure
3. `platforms/platform-abstraction.md` — Understand multi-platform architecture
4. Then dive into specific domain files as needed
