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

Deep knowledge base covering the domains that make ERP systems hard:

| Knowledge Area | What It Covers |
|---------------|----------------|
| Order Lifecycle | State machine, fulfillment modes, cancellation/refund flows |
| Accounting | Double-entry bookkeeping, chart of accounts, multi-currency journals |
| Product Catalog | SPU/SKU hierarchy, platform-specific attributes, listing lifecycle |
| Logistics & Shipping | Carrier APIs, cost models, tracking, cross-border compliance |
| Pricing & Costs | Pricing strategies, landed cost, margin calculation |
| Platform: eBay | Trading API, auth tokens, listing formats, order sync |
| Platform: Walmart | Marketplace API, partner auth, feed-based listings |
| Platform: Mercado Libre | REST API, OAuth flow, regional variations |
| Platform: Amazon | SP-API, role-based auth, catalog integration |

### Code Templates

Production-ready scaffolding that encodes architectural decisions:

| Template | Generates |
|----------|-----------|
| Backend Module | Express routes + Drizzle schema + service layer + validation |
| Platform Engine | Platform adapter with unified interface + platform-specific impl |
| List Page | React table page with filters, pagination, and bulk actions |
| Detail Page | React detail/edit page with form validation and state management |
| Dashboard Widget | Dashboard card with chart, KPI, or summary data |

### Quality Protocols

6 cross-cutting protocols that serve as quality gates:

| Protocol | Enforces |
|----------|----------|
| API Contract | REST conventions, error format, pagination, versioning |
| Database Schema | Migration safety, indexing strategy, RLS policies |
| UI Consistency | Component standards, spacing, animation, responsive breakpoints |
| Error Handling | Error boundaries, user messages, structured logging |
| Security Checklist | Auth, input validation, injection prevention, CORS |
| Workflow Orchestration | Multi-step coordination, saga patterns, compensation |

## Quick Start

### Claude Code

```bash
# One-line install
curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/claude-code.sh | bash
```

Or manually:

```bash
git clone https://github.com/anthropics/erpforge.git ~/.claude/plugins/erpforge
chmod +x ~/.claude/plugins/erpforge/scripts/*.sh
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/cursor.sh | bash
```

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/codex.sh | bash
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
         |---> Reads knowledge/platform-walmart.md
         |---> Uses templates/platform-engine.md
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

## Project Structure

```
erpforge/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── hooks/
│   └── hooks.json           # Session lifecycle hooks
├── scripts/
│   └── session-start.sh     # Injects meta-skill on session start
├── install/
│   ├── claude-code.sh       # Claude Code installer
│   ├── cursor.sh            # Cursor installer
│   └── codex.sh             # Codex installer
├── skills/
│   ├── using-erpforge.md    # Meta-skill (orchestrator)
│   ├── erp-module-design.md
│   ├── fullstack-module-build.md
│   ├── platform-integration.md
│   ├── systematic-debugging.md
│   ├── verification-before-completion.md
│   ├── quality-polish.md
│   ├── test-driven-development.md
│   └── anti-rationalization.md
├── knowledge/
│   ├── order-lifecycle.md
│   ├── accounting-foundations.md
│   ├── product-catalog.md
│   ├── logistics-shipping.md
│   ├── pricing-costs.md
│   ├── platform-ebay.md
│   ├── platform-walmart.md
│   ├── platform-mercadolibre.md
│   └── platform-amazon.md
├── templates/
│   ├── backend-module.md
│   ├── platform-engine.md
│   ├── list-page.md
│   ├── detail-page.md
│   └── dashboard-widget.md
├── protocols/
│   ├── api-contract.md
│   ├── database-schema.md
│   ├── ui-consistency.md
│   ├── error-handling.md
│   ├── security-checklist.md
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
