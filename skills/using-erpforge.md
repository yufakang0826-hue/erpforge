---
name: using-erpforge
description: Activates when any ERP development task begins — module design, platform integration, order management, accounting, or logistics
---

# ERPForge — AI-Powered Skills Framework

ERPForge is an AI-powered skills framework for building cross-border e-commerce ERP systems. It turns AI agents into experienced ERP architects by providing composable skills, deep domain knowledge, and production-ready templates.

## Core Principles

### 1. Module Boundaries + Public API Communication
Every feature belongs to exactly one module. Modules communicate through well-defined public APIs — never through direct database access or internal imports. This is non-negotiable.

### 2. Platform Engine Pattern
E-commerce platforms (eBay, Amazon, Walmart, Mercado Libre) each have wildly different APIs, auth flows, rate limits, and data models. The Platform Engine pattern provides a unified abstraction layer: one interface, multiple implementations, zero platform-specific logic leaking into business code.

### 3. Multi-Tenant Isolation (Shared Schema + RLS + tenantId)
Every table has a `tenantId` column. Row-Level Security policies enforce isolation at the database level. No query escapes without a tenant filter. No exceptions.

### 4. Domain-Driven Design
The system is organized around business domains, not technical layers:
- **Order Lifecycle** — State machine with 10+ states, split/merge shipments, multi-fulfillment modes
- **Accounting** — Double-entry bookkeeping, multi-currency, automatic journal entries
- **Logistics** — Carrier routing, cost calculation, tracking, cross-border compliance
- **Product Catalog** — SPU/SKU hierarchy, platform-specific attributes, listing lifecycle

### 5. Relentless Quality
"Not perfect enough" is a valid reason to reject work. Every detail matters — from animation timing to number formatting to error states. This is an enterprise SaaS product, not a prototype.

---

## <EXTREMELY-IMPORTANT>Skill-First Principle</EXTREMELY-IMPORTANT>

**Before executing ANY task, you MUST check if an applicable skill exists.**

This is not a suggestion. This is a hard requirement. Even if there is only a 1% chance a skill applies, check the index below. Skills encode hard-won lessons from building production ERP systems — skipping them means repeating mistakes that have already been solved.

The check takes 5 seconds. The cost of skipping it can be days of rework.

---

## Available Skills Index

Check each skill's trigger condition. If your current task matches, read and follow that skill **before writing any code**.

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
| **Workflow Orchestration** | `protocols/workflow-orchestration.md` | Multi-step task coordination, state management |

---

## How Skills Work Together

```
User Request
    |
    v
[Check using-erpforge skill index]
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
    |                      --> anti-rationalization (always active)
    |
    v
[Read relevant knowledge/ files for domain context]
    |
    v
[Use templates/ for scaffolding when creating new components]
    |
    v
[Apply protocols/ as quality gates before declaring done]
```

---

## <EXTREMELY-IMPORTANT>Priority Order</EXTREMELY-IMPORTANT>

1. **User instructions** — Always take precedence over everything else
2. **ERPForge skills** — Follow the applicable skill's methodology
3. **System default behavior** — Only when no skill or user instruction applies

When in doubt, check the skill index. When still in doubt, ask the user.

---

*ERPForge v1.0.0 — Building enterprise-grade ERP systems, one skill at a time.*
