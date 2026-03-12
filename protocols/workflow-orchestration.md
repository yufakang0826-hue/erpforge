---
name: workflow-orchestration
description: Reference guide for workflow patterns — common skill combinations, phase checkpoints, and recovery strategies for multi-step ERP development tasks
---

# Workflow Patterns — Reference Guide

## Overview

This document describes common workflow patterns for ERP development tasks. Each pattern is a proven approach — adopt what fits your situation, adapt what doesn't, skip what's not relevant.

---

## Workflow Patterns

| # | Pattern | When It Applies | Skill Combination |
|---|---------|----------------|-------------------|
| 1 | **Module Design** | Designing a new module, feature, or entity | `erp-module-design` |
| 2 | **Module Build** | Implementing an approved design | `fullstack-module-build` → `quality-polish` |
| 3 | **Platform Integration** | Integrating a platform API | `platform-integration` → `quality-polish` |
| 4 | **Bug Fix** | Fixing a bug or error | `systematic-debugging` → `verification-before-completion` |
| 5 | **Quality Polish** | Refining a functionally complete module | `quality-polish` |
| 6 | **Test Development** | Adding tests for a module or feature | `test-driven-development` |
| 7 | **Full Cycle** | Design and build from scratch | `erp-module-design` → `fullstack-module-build` → `quality-polish` |
| 8 | **Hotfix** | Critical production issue | `systematic-debugging` → `verification-before-completion` (expedited) |

### Choosing a Pattern

```
User Request
    |
    +--> Need design first?        --> Pattern 1: Module Design
    |
    +--> Design approved, build?   --> Pattern 2: Module Build
    |
    +--> Platform API work?        --> Pattern 3: Platform Integration
    |
    +--> Bug or error?
    |     +--> Critical?           --> Pattern 8: Hotfix
    |     +--> Normal              --> Pattern 4: Bug Fix
    |
    +--> Polish existing module?   --> Pattern 5: Quality Polish
    |
    +--> Need tests?               --> Pattern 6: Test Development
    |
    +--> Design + build together?  --> Pattern 7: Full Cycle
```

---

## Phase Depth Options

Not every task needs the same level of ceremony. Choose the depth that fits:

### Full (5 Phases)
Best for: New modules, complex features, platform integrations

```
Design → Backend → Frontend → Test → Deliver
```

Each phase has a checkpoint before moving to the next. This gives the most structure and catches issues early.

### Lite (3 Phases)
Best for: Medium features, enhancements, most bug fixes

```
Design → Implement → Verify
```

Combines backend and frontend into one implementation phase. Still validates design upfront and verifies at the end.

### Minimal
Best for: Small fixes, configuration changes, simple tweaks

```
Just verify before declaring done
```

When the change is straightforward, the main value is making sure it actually works.

---

## Skill Chaining

### Sequential Chains

Some patterns benefit from chaining skills in sequence:

```
Pattern 2 — Module Build:
  fullstack-module-build (Phase 1-5)
    → quality-polish (if refinement needed)
    → verification-before-completion

Pattern 3 — Platform Integration:
  platform-integration (Phase 1-5)
    → quality-polish (if refinement needed)
    → verification-before-completion

Pattern 7 — Full Cycle:
  erp-module-design
    → [User reviews and approves design]
    → fullstack-module-build
    → quality-polish
    → verification-before-completion
```

### Parallel Skills

These skills add value alongside any workflow:

- `test-driven-development` — Helpful during any implementation phase
- `anti-rationalization` — A useful gut-check against cutting corners

### Cross-Cutting Checks

Useful checkpoints to consider during any workflow:

| When | What to Check |
|------|--------------|
| Starting work | Load relevant context and knowledge |
| Design decisions | Align with existing architecture |
| Data access code | Verify tenant isolation |
| Platform code | Check platform compatibility |
| Financial code | Validate precision handling |
| Finishing work | Update relevant documentation |

Reference: `protocols/cross-cutting-checks.md`

---

## Recovery Strategies

### When a Phase Isn't Working

A suggested approach when you hit a wall:

```
Phase N isn't working
  → Diagnose the issue (systematic-debugging skill can help)
  → Try a fix → Re-verify
  → If still stuck, step back and reconsider the approach
  → If fundamentally blocked, bring it to the user
```

Experience shows that after 2-3 failed attempts at the same approach, it's usually better to step back and rethink rather than keep trying the same thing.

### Switching Patterns

Sometimes you discover mid-task that you need a different approach:

| Situation | What to Consider |
|-----------|-----------------|
| Build reveals design flaw | Pause build, revisit design |
| Bug found during build | Fix the bug, then resume building |
| Platform quirk discovered | Document it, adjust implementation |
| Polish reveals missing feature | Implement the feature, then resume polish |

### Switching Approach

1. **Pause** current work (note where you are and what's done)
2. **Address** the discovered issue
3. **Resume** from where you paused

---

## When to Involve the User

Some situations benefit from user input:

| Situation | Why Involve the User |
|-----------|---------------------|
| Repeated failures on the same issue | Fresh perspective often helps |
| Multiple valid approaches, unclear winner | User has business context you may lack |
| Security concern discovered | User should be aware immediately |
| Design flaw during build | User may have design authority |
| Scope growing beyond original request | User should decide what's in scope |
| Blocked by external dependency | User may be able to unblock |

### Providing Context When Escalating

When bringing an issue to the user, it helps to include:

- What happened (brief)
- What you've tried
- Why it's not working
- Options you see (with tradeoffs)
- Your recommendation

---

## Hotfix Pattern — Special Considerations

Hotfixes are about speed without sacrificing correctness:

| Normal Workflow | Hotfix Approach |
|----------------|-----------------|
| Full design phase | Skip design — go straight to diagnosis |
| Full test suite | Targeted tests for the specific fix |
| Full quality polish | Skip polish — ship the fix |
| All quality gates | Focus on compilation, functional verification, and deployment readiness |

**What stays the same in a hotfix:**
- Root cause must be located (no blind fixes)
- Fix must be verified with fresh evidence
- Tenant isolation must not be compromised
- Full test suite should still pass

---

## Typical Lifecycle

A common flow for a full-featured task:

```
1. UNDERSTAND   — What is the user asking for?
2. CLASSIFY     — Which pattern fits best?
3. CONTEXT      — Load relevant knowledge
4. PLAN         — Identify skill chain, estimate phases
5. EXECUTE      — Follow skill chain, phase by phase
6. CHECK        — Quality checks at phase boundaries
7. FIX          — Address any issues found
8. VERIFY       — Run verification-before-completion
9. DELIVER      — Update documentation, hand off
```

---

*Good workflow patterns are guardrails, not handcuffs — they keep you on the road while you choose the speed.*
