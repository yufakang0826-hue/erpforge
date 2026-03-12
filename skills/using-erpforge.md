---
name: using-erpforge
description: Activates when any ERP development task begins — module design, platform integration, order management, accounting, or logistics
---

# ERPForge — AI-Powered Skills Framework

ERPForge is a toolkit, not a rulebook. Use what helps, skip what doesn't.

It provides composable skills, deep domain knowledge, and production-ready templates for building cross-border e-commerce ERP systems. Think of it as an experienced colleague's playbook — draw from it freely.

## Core Principles

These principles come from hard-won experience building production ERP systems. We recommend following them because they prevent real problems we've encountered.

### 1. Module Boundaries + Public API Communication
Every feature belongs to exactly one module. Modules communicate through well-defined public APIs — never through direct database access or internal imports. Experience shows this is the single most impactful architectural decision for long-term maintainability.

### 2. Platform Engine Pattern
E-commerce platforms (eBay, Amazon, Walmart, Mercado Libre) each have wildly different APIs, auth flows, rate limits, and data models. The Platform Engine pattern provides a unified abstraction layer: one interface, multiple implementations, zero platform-specific logic leaking into business code.

### 3. Multi-Tenant Isolation (Shared Schema + RLS + tenantId)
Every table has a `tenantId` column. Row-Level Security policies enforce isolation at the database level. We strongly recommend ensuring no query escapes without a tenant filter — a single miss can cause a data leak.

### 4. Domain-Driven Design
The system is organized around business domains, not technical layers:
- **Order Lifecycle** — State machine with 10+ states, split/merge shipments, multi-fulfillment modes
- **Accounting** — Double-entry bookkeeping, multi-currency, automatic journal entries
- **Logistics** — Carrier routing, cost calculation, tracking, cross-border compliance
- **Product Catalog** — SPU/SKU hierarchy, platform-specific attributes, listing lifecycle

### 5. Relentless Quality
Every detail matters — from animation timing to number formatting to error states. This is an enterprise SaaS product, not a prototype.

---

## Recommended Skill Combinations

Pick the combination that fits your task. Each skill can also be used independently (see "A La Carte" below).

| Task Type | Recommended Skills | Why This Combination |
|-----------|-------------------|---------------------|
| **New module** | `erp-module-design` → `fullstack-module-build` → `verification-before-completion` | Design first prevents rework; verification catches gaps |
| **Bug fix** | `systematic-debugging` → `verification-before-completion` | Methodical diagnosis beats guessing; verify the fix actually works |
| **Platform integration** | `platform-integration` → `verification-before-completion` | Platform APIs have many quirks; verification ensures completeness |
| **Quality polish** | `quality-polish` → `verification-before-completion` | Polish to enterprise standard, then verify nothing regressed |
| **Full cycle** | `erp-module-design` → `fullstack-module-build` → `quality-polish` → `verification-before-completion` | The complete journey from concept to polished delivery |

## A La Carte

Every skill is a self-contained guide. You can read one file and apply one pattern — no need to adopt the full framework.

---

## Available Skills Index

Check each skill's trigger condition. If your current task matches, the corresponding skill likely has useful guidance.

| Skill | File | Trigger Condition |
|-------|------|-------------------|
| **ERP Module Design** | `skills/erp-module-design.md` | Designing a new module, feature, or major component |
| **Fullstack Module Build** | `skills/fullstack-module-build.md` | You have an approved design and are ready to implement |
| **Platform Integration** | `skills/platform-integration.md` | Integrating with a new e-commerce platform API |
| **Systematic Debugging** | `skills/systematic-debugging.md` | Investigating a bug, error, or unexpected behavior |
| **Verification Before Completion** | `skills/verification-before-completion.md` | About to declare a task "done" or "complete" |
| **Quality Polish** | `skills/quality-polish.md` | Module is functionally complete, time to refine |
| **Test-Driven Development** | `skills/test-driven-development.md` | Implementing a feature or fixing a bug — write tests first |
| **Anti-Rationalization** | `skills/anti-rationalization.md` | Referenced by all other skills — defends against cutting corners |

---

## Domain Knowledge Index

Deep knowledge base for cross-border e-commerce ERP domains. Read the relevant knowledge file when you need domain context.

| Knowledge Area | File | When to Read |
|---------------|------|--------------|
| **Order Lifecycle** | `knowledge/order-lifecycle.md` | Working on order management, state transitions, fulfillment |
| **Accounting Foundations** | `knowledge/accounting-foundations.md` | Double-entry bookkeeping, chart of accounts, journal entries |
| **Product Catalog** | `knowledge/product-catalog.md` | SPU/SKU modeling, attributes, category trees |
| **Logistics & Shipping** | `knowledge/logistics-shipping.md` | Carrier integration, shipping cost, tracking, cross-border |
| **Pricing & Costs** | `knowledge/pricing-costs.md` | Pricing strategies, cost calculation, margin analysis |
| **eBay Integration** | `knowledge/platform-ebay.md` | eBay API specifics, auth, listing, order sync |
| **Walmart Integration** | `knowledge/platform-walmart.md` | Walmart API specifics, auth, listing, order sync |
| **Mercado Libre Integration** | `knowledge/platform-mercadolibre.md` | Mercado Libre API specifics, auth, listing, order sync |
| **Amazon Integration** | `knowledge/platform-amazon.md` | Amazon SP-API specifics, auth, listing, order sync |

---

## Code Templates Index

Production-ready scaffolding. Use these templates as starting points — they encode architectural decisions and best practices.

| Template | File | Use When |
|----------|------|----------|
| **Backend Module** | `templates/backend-module.md` | Creating a new backend module (routes, services, schema) |
| **Platform Engine** | `templates/platform-engine.md` | Adding a new e-commerce platform integration |
| **List Page** | `templates/list-page.md` | Building a data list/table page with filters |
| **Detail Page** | `templates/detail-page.md` | Building a detail/edit page for a single entity |
| **Dashboard Widget** | `templates/dashboard-widget.md` | Creating a dashboard card or chart component |

---

## Quality Protocols

Cross-cutting quality checks that apply to all work. These are referenced by skills but can also be invoked independently.

| Protocol | File | Purpose |
|----------|------|---------|
| **API Contract** | `protocols/api-contract.md` | REST API design, error handling, response format |
| **Database Schema** | `protocols/database-schema.md` | Schema design, migrations, indexing, RLS |
| **UI Consistency** | `protocols/ui-consistency.md` | Component usage, spacing, animation, responsive |
| **Error Handling** | `protocols/error-handling.md` | Error boundaries, user-facing messages, logging |
| **Security Checklist** | `protocols/security-checklist.md` | Auth, input validation, injection prevention |
| **Workflow Patterns** | `protocols/workflow-orchestration.md` | Recommended workflow patterns and checkpoints |

---

## How Skills Work Together

A typical flow — adapt to your situation:

```
User Request
    |
    v
[Browse skill index for relevant guidance]
    |
    +--> Design phase?     --> erp-module-design
    |                           |
    |                           v
    +--> Build phase?      --> fullstack-module-build
    |                           |
    |                           v
    +--> Platform API?     --> platform-integration
    |                           |
    |                           v
    +--> Bug/Error?        --> systematic-debugging
    |                           |
    |                           v
    +--> About to finish?  --> verification-before-completion
    |                           |
    |                           v
    +--> Polish needed?    --> quality-polish
    |
    +--> All phases:       --> test-driven-development (parallel)
    |                      --> anti-rationalization (always helpful)
    |
    v
[Read relevant knowledge/ files for domain context]
    |
    v
[Use templates/ for scaffolding when creating new components]
    |
    v
[Apply protocols/ as quality checks before declaring done]
```

---

## Priority Order

1. **User instructions** — Always take precedence over everything else
2. **ERPForge skills** — Follow the applicable skill's methodology
3. **System default behavior** — Only when no skill or user instruction applies

When in doubt, check the skill index. When still in doubt, ask the user.

---

*ERPForge v1.0.0 — Building enterprise-grade ERP systems, one skill at a time.*
