# ERPForge

> AI-powered skills framework for building cross-border e-commerce ERP systems.

ERPForge is a composable skills framework that turns AI coding agents (Claude Code, Cursor, Codex) into experienced ERP architects. It's not a code generator — it's a methodology layer that teaches AI agents how to think about and build production-grade cross-border e-commerce systems.

## Why ERPForge?

Building a cross-border e-commerce ERP is one of the hardest software engineering challenges:

- **Order complexity** — State machines with 10+ states, split/merge shipments, partial refunds, multi-warehouse fulfillment, and platform-specific order flows
- **Multi-platform chaos** — eBay, Amazon, Walmart, and Mercado Libre each have different APIs, auth mechanisms, rate limits, webhook formats, and listing requirements
- **Financial precision** — Double-entry accounting with multi-currency support, automatic journal entries, cost allocation, and regulatory compliance across countries
- **Multi-tenant SaaS** — Proper data isolation with shared schema + RLS, per-tenant configuration, and zero cross-tenant data leaks
- **Logistics labyrinth** — Carrier routing across countries, customs declarations, shipping cost optimization, and real-time tracking from multiple providers

Most teams learn these lessons the hard way — through production incidents, data corruption, and costly rewrites.

**ERPForge packages this hard-won experience into composable skills that AI agents follow automatically.** Every skill encodes real patterns from production ERP systems. Every knowledge file documents real platform quirks. Every template scaffolds real architectural decisions.

## Features

### Skills (Methodology)

8 composable skills covering the full ERP development lifecycle:

| Skill | Purpose |
|-------|---------|
| `erp-module-design` | Design modules with proper boundaries, state machines, and data models before writing code |
| `fullstack-module-build` | Implement approved designs with consistent backend/frontend patterns |
| `platform-integration` | Integrate e-commerce platform APIs using the Platform Engine pattern |
| `systematic-debugging` | Investigate bugs methodically — reproduce, isolate, fix, verify |
| `verification-before-completion` | 5-point verification before declaring any task complete |
| `quality-polish` | Refine functionally complete modules to enterprise quality standards |
| `test-driven-development` | Write tests first, implement to pass, refactor with confidence |
| `anti-rationalization` | Defense against cutting corners — referenced by all other skills |

### Domain Knowledge

14 knowledge files across 3 categories, covering the domains that make ERP systems hard:

**Domain (5 files)**

| Knowledge File | What It Covers |
|---------------|----------------|
| `order-lifecycle.md` | Cross-platform order state machine, fulfillment modes, cancellation/refund flows |
| `accounting-model.md` | Double-entry bookkeeping, multi-currency journals with CNY as functional currency |
| `product-catalog.md` | SPU/SKU hierarchy, cross-platform attributes, listing lifecycle |
| `logistics-model.md` | Carrier APIs (YunTu, YanWen, 4PX), platform shipping, cost models, tracking |
| `pricing-model.md` | Pricing strategies across 28 eBay fee types, landed cost, margin calculation |

**Platforms (5 files)**

| Knowledge File | What It Covers |
|---------------|----------------|
| `ebay-patterns.md` | OAuth, `ebay-api` SDK, field mapping, order sync, known quirks |
| `walmart-patterns.md` | OAuth, Feed API, orders, reports, known quirks |
| `mercadolibre-patterns.md` | OAuth across 12 site IDs, core APIs, regional variations |
| `amazon-patterns.md` | SP-API dual authentication, FBA vs FBM, throttling |
| `platform-abstraction.md` | Multi-platform architecture — the most important platform file |

**Architecture (4 files)**

| Knowledge File | What It Covers |
|---------------|----------------|
| `event-driven.md` | BullMQ background job patterns for sync, notifications, reports |
| `module-boundaries.md` | Module structure, communication patterns, anti-patterns |
| `multi-tenant.md` | Shared schema + tenant_id + RLS data isolation |
| `tech-stack.md` | Recommended technology choices with rationale and alternatives |

### Code Templates

5 template groups, each a directory containing multiple production-ready files:

| Template Directory | Files | What It Scaffolds |
|-------------------|-------|-------------------|
| `backend/module-scaffold/` | `schema.ts`, `types.ts`, `service.ts`, `routes.ts`, `index.ts` | Complete CRUD module (Express + Drizzle + Zod) with tenant isolation |
| `backend/platform-engine/` | `base-engine.ts`, `oauth-client.ts`, `api-client.ts`, `field-mapper.ts`, `sync-worker.ts` | Platform integration engine with OAuth, retry, circuit breaker, BullMQ sync |
| `frontend/list-page/` | `page.tsx`, `columns.tsx`, `filter-bar.tsx`, `use-data.ts` | Data table page with filters, pagination, TanStack Query hooks |
| `frontend/detail-page/` | `page.tsx`, `form-schema.ts` | Detail/edit page with Zod form validation |
| `frontend/dashboard-widget/` | `kpi-card.tsx`, `chart-card.tsx` | Dashboard cards for KPI and chart data |

### Quality Protocols

3 protocol files defining quality standards:

| Protocol File | What It Defines |
|--------------|-----------------|
| `quality-gates.md` | 5 quality gates (Compilation, Functional, Security, Two-Phase Review, Deployment) — every deliverable must pass |
| `cross-cutting-checks.md` | 6 cross-cutting checklists (Context Loading, Design Alignment, Tenant Isolation, Platform Compatibility, Financial Precision, Knowledge Dual-Write) |
| `workflow-orchestration.md` | 8 workflow types with skill chain sequencing, fallback protocols, and escalation matrix |

## Quick Start

### Claude Code

```bash
# One-line install
curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/claude-code.sh | bash
```

Or manually:

```bash
git clone https://github.com/yufakang0826-hue/erpforge.git ~/.claude/plugins/erpforge
chmod +x ~/.claude/plugins/erpforge/scripts/*.sh
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/cursor.sh | bash
```

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/codex.sh | bash
```

## Examples

### Mini ERP

A complete working example demonstrating ERPForge patterns in action:

- Multi-tenant isolation (X-Tenant-ID header + per-query tenantId filtering)
- Order state machine (7 states + transition validation)
- Inventory reservation (reserve → deduct two-phase deduction)
- Financial precision (numeric type, not float)
- Soft delete, Zod validation, module boundaries

```bash
cd examples/mini-erp
docker compose up -d postgres
npm install && npm run db:migrate && npm run db:seed
npm run dev
bash test.sh  # Run end-to-end tests
```

See [examples/mini-erp/README.md](examples/mini-erp/README.md) for details.

## A La Carte Usage

ERPForge is modular — use what you need, skip what you don't.

### Just the Knowledge
Copy `knowledge/` into your project as domain reference. No skills or plugins needed.

### Just the Templates
Use `scripts/scaffold.sh` to generate modules. Works standalone.

### Individual Skills
Each skill in `skills/` is a self-contained guide. Read one file, apply one pattern.

### Disable Auto-Activation
```bash
export ERPFORGE_MANUAL=1  # Skills won't auto-load; use them on demand
```

## How It Works

```
You: "Add Walmart order sync"
         |
         v
  [ERPForge activates]
         |
    1. Check skill index
         |---> platform-integration skill loads
         |---> Reads knowledge/platforms/walmart-patterns.md
         |---> Uses templates/backend/platform-engine/
         |
    2. Design phase (erp-module-design)
         |---> Defines module boundaries
         |---> Designs state machine
         |---> Proposes data model
         |
    3. Build phase (fullstack-module-build)
         |---> Scaffolds backend with template
         |---> Implements platform engine
         |---> Builds frontend components
         |
    4. Quality gates
         |---> verification-before-completion
         |---> quality-polish
         |---> All protocols checked
         |
         v
  Production-ready Walmart integration
```

The key insight: **skills compose**. A single task often triggers multiple skills in sequence, each building on the output of the previous one. The `using-erpforge` meta-skill orchestrates this automatically.

## Scaffolding Tool

ERPForge includes a CLI scaffolding tool for quickly generating new modules:

```bash
# Generate a backend module
./scripts/scaffold.sh backend my-module

# Generate a platform engine
./scripts/scaffold.sh platform my-platform

# Generate a frontend list page
./scripts/scaffold.sh list my-page

# Generate a frontend detail page
./scripts/scaffold.sh detail my-page

# Generate a dashboard widget
./scripts/scaffold.sh widget my-widget
```

The scaffolding tool copies the appropriate template directory, replaces placeholder names with your module name, and sets up the file structure — giving you a production-ready starting point.

## Project Structure

```
erpforge/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── hooks/
│   └── hooks.json               # Session lifecycle hooks
├── scripts/
│   ├── session-start.sh         # Injects meta-skill on session start
│   └── scaffold.sh              # Module scaffolding tool
├── install/
│   ├── claude-code.sh           # Claude Code installer
│   ├── cursor.sh                # Cursor installer
│   └── codex.sh                 # Codex installer
├── skills/
│   ├── using-erpforge.md        # Meta-skill (orchestrator)
│   ├── erp-module-design.md
│   ├── fullstack-module-build.md
│   ├── platform-integration.md
│   ├── systematic-debugging.md
│   ├── verification-before-completion.md
│   ├── quality-polish.md
│   ├── test-driven-development.md
│   └── anti-rationalization.md
├── knowledge/
│   ├── README.md
│   ├── domain/
│   │   ├── order-lifecycle.md
│   │   ├── accounting-model.md
│   │   ├── product-catalog.md
│   │   ├── logistics-model.md
│   │   └── pricing-model.md
│   ├── platforms/
│   │   ├── platform-abstraction.md
│   │   ├── ebay-patterns.md
│   │   ├── walmart-patterns.md
│   │   ├── mercadolibre-patterns.md
│   │   └── amazon-patterns.md
│   └── architecture/
│       ├── event-driven.md
│       ├── module-boundaries.md
│       ├── multi-tenant.md
│       └── tech-stack.md
├── templates/
│   ├── README.md
│   ├── backend/
│   │   ├── module-scaffold/     # schema.ts, types.ts, service.ts, routes.ts, index.ts
│   │   └── platform-engine/     # base-engine.ts, oauth-client.ts, api-client.ts, field-mapper.ts, sync-worker.ts
│   └── frontend/
│       ├── list-page/           # page.tsx, columns.tsx, filter-bar.tsx, use-data.ts
│       ├── detail-page/         # page.tsx, form-schema.ts
│       └── dashboard-widget/    # kpi-card.tsx, chart-card.tsx
├── protocols/
│   ├── quality-gates.md
│   ├── cross-cutting-checks.md
│   └── workflow-orchestration.md
├── package.json
├── README.md
├── README_CN.md
└── LICENSE
```

## Design Philosophy

ERPForge is built on a simple observation: **AI agents are only as good as the methodology they follow**.

Without guidance, AI agents will:
- Skip the design phase and jump straight to code
- Ignore module boundaries and create tightly coupled systems
- Miss edge cases in order state machines
- Implement naive multi-currency support that breaks on rounding
- Forget tenant isolation in complex queries
- Declare tasks "done" without proper verification

ERPForge fixes this by providing a skills layer that sits between the user's intent and the AI's execution. Each skill is a distilled methodology — not rigid templates, but flexible decision frameworks that adapt to the specific context.

The framework follows the **CSO (Context, Skills, Output)** principle:
1. **Context** — Understand the domain through knowledge files
2. **Skills** — Apply the right methodology for the current phase
3. **Output** — Generate code that meets enterprise quality standards

## Contributing

We welcome contributions! Here's how to get involved:

1. **Skills** — Add new skills for ERP development patterns you've learned the hard way
2. **Knowledge** — Document platform-specific quirks, domain rules, or integration patterns
3. **Templates** — Share production-tested scaffolding for common ERP components
4. **Protocols** — Propose new quality gates or improve existing ones

### Guidelines

- Skills should encode **methodology**, not just code patterns
- Knowledge should document **real quirks** discovered in production, not theoretical designs
- Templates should be **immediately usable** — no placeholder-heavy boilerplate
- All content should be written for AI agents to consume, not humans to read

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b skill/new-skill-name`)
3. Add your content with proper YAML frontmatter
4. Submit a pull request with a clear description of what your addition teaches

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**ERPForge** — Teaching AI agents to build enterprise-grade ERP systems, one skill at a time.
