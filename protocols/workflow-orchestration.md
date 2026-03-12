---
name: workflow-orchestration
description: Defines the 8 workflow types, their triggers, sequencing, fallback protocols, and escalation matrix for multi-step ERP development tasks
---

# Workflow Orchestration Protocol

## Overview

Every ERP development task follows one of 8 workflow types. Each workflow chains specific skills in a defined sequence. This protocol governs how workflows start, chain, recover from failure, and escalate.

---

## The 8 Workflow Types

| # | Workflow | Trigger | Primary Skill Chain |
|---|---------|---------|-------------------|
| 1 | **Module Design** | "Design a new module/feature/entity" | `erp-module-design` |
| 2 | **Module Build** | "Build/implement {approved design}" | `fullstack-module-build` → `quality-polish` |
| 3 | **Platform Integration** | "Integrate {platform} API" | `platform-integration` → `quality-polish` |
| 4 | **Bug Fix** | "Fix {bug/error/issue}" | `systematic-debugging` → `verification-before-completion` |
| 5 | **Quality Polish** | "Polish/refine/improve UI of {module}" | `quality-polish` |
| 6 | **Test Development** | "Add tests for {module/feature}" | `test-driven-development` |
| 7 | **Full Cycle** | "Design and build {module}" | `erp-module-design` → `fullstack-module-build` → `quality-polish` |
| 8 | **Hotfix** | "Critical production issue" | `systematic-debugging` → `verification-before-completion` (expedited) |

### Workflow Selection

```dot
digraph workflow_selection {
    rankdir=TB
    node [shape=box, style="rounded,filled", fillcolor="#f0f0f0"]

    start [label="User Request" shape=ellipse]
    q1 [label="Design exists?" shape=diamond fillcolor="#e3f2fd"]
    q2 [label="What type of work?" shape=diamond fillcolor="#e3f2fd"]
    q3 [label="Production\ncritical?" shape=diamond fillcolor="#e3f2fd"]

    wf1 [label="WF-1\nModule Design" fillcolor="#e8f5e9"]
    wf2 [label="WF-2\nModule Build" fillcolor="#e8f5e9"]
    wf3 [label="WF-3\nPlatform Integration" fillcolor="#e8f5e9"]
    wf4 [label="WF-4\nBug Fix" fillcolor="#e8f5e9"]
    wf5 [label="WF-5\nQuality Polish" fillcolor="#e8f5e9"]
    wf6 [label="WF-6\nTest Development" fillcolor="#e8f5e9"]
    wf7 [label="WF-7\nFull Cycle" fillcolor="#fff3e0"]
    wf8 [label="WF-8\nHotfix" fillcolor="#ffcdd2"]

    start -> q1
    q1 -> q2 [label="Yes"]
    q1 -> wf1 [label="No — design first"]
    q2 -> wf2 [label="Build"]
    q2 -> wf3 [label="Platform"]
    q2 -> wf5 [label="Polish"]
    q2 -> wf6 [label="Tests"]
    q2 -> q3 [label="Bug"]
    q3 -> wf8 [label="Yes — critical"]
    q3 -> wf4 [label="No — normal"]

    wf1 -> wf2 [label="Design approved →" style=dashed]
    wf2 -> wf5 [label="Build complete →" style=dashed]
}
```

---

## Workflow State Machine

Every workflow instance transitions through these states:

```dot
digraph workflow_states {
    rankdir=LR
    node [shape=circle, style=filled, fillcolor="#f0f0f0"]

    created [fillcolor="#e3f2fd"]
    planning [fillcolor="#fff3e0"]
    in_progress [fillcolor="#e8f5e9"]
    qa_review [fillcolor="#fce4ec"]
    completed [fillcolor="#a5d6a7"]
    rework [fillcolor="#ffcdd2"]
    escalated [fillcolor="#ff8a80"]

    created -> planning [label="start"]
    planning -> in_progress [label="plan approved"]
    in_progress -> qa_review [label="implementation done"]
    qa_review -> completed [label="all gates pass"]
    qa_review -> rework [label="gate fails"]
    rework -> in_progress [label="fix applied"]
    rework -> escalated [label="3 attempts failed"]
    in_progress -> escalated [label="blocked"]
    escalated -> in_progress [label="user unblocks"]
}
```

### State Definitions

| State | Description | Allowed Actions |
|-------|-------------|----------------|
| `created` | Workflow initialized, not yet started | Start planning |
| `planning` | Loading context, identifying skills, creating plan | Approve plan, modify plan |
| `in_progress` | Actively implementing the current phase | Continue, flag blocker |
| `qa_review` | Running quality gates (QG-1 through QG-5) | Pass gate, fail gate |
| `completed` | All gates passed, deliverable ready | Archive, start next workflow |
| `rework` | A gate failed, fixing issues | Apply fix, escalate |
| `escalated` | Blocked or 3+ rework attempts, needs user input | User resolves |

---

## Skill Chain Sequencing

### Sequential Chains

Some workflows chain skills in strict sequence:

```
WF-2 Module Build:
  fullstack-module-build (Phase 1-5)
    → quality-gates (QG-1 through QG-5)
    → quality-polish (if user requests)
    → verification-before-completion

WF-3 Platform Integration:
  platform-integration (Phase 1-5)
    → quality-gates (QG-1 through QG-5)
    → quality-polish (if user requests)
    → verification-before-completion

WF-7 Full Cycle:
  erp-module-design
    → [USER APPROVAL GATE]
    → fullstack-module-build
    → quality-gates
    → quality-polish
    → verification-before-completion
```

### Parallel Skills

Some skills run in parallel with all workflows:

- `test-driven-development` — Active during any implementation phase
- `anti-rationalization` — Active at all times, referenced by all skills

### Cross-Cutting Checks

At specific points in every workflow:

| Point | Cross-Cutting Check |
|-------|-------------------|
| Workflow start | CC-1 Context Loading |
| Any design decision | CC-2 Design Alignment |
| Any data access code | CC-3 Tenant Isolation |
| Any platform code | CC-4 Platform Compatibility |
| Any financial code | CC-5 Financial Precision |
| Workflow end | CC-6 Knowledge Dual-Write |

Reference: `protocols/cross-cutting-checks.md`

---

## Fallback Protocol

### Same-Workflow Fallback

When a phase fails within a workflow:

```
Phase N fails
  → Diagnose failure (systematic-debugging)
  → Fix attempt 1 → Re-verify phase N
  → Fix attempt 2 → Re-verify phase N
  → Fix attempt 3 → Re-verify phase N
  → ESCALATE to user
```

### Workflow Switch

Sometimes the right response to a failure is switching to a different workflow:

| Situation | Switch From | Switch To |
|-----------|------------|-----------|
| Build reveals design flaw | WF-2 Module Build | WF-1 Module Design |
| Bug found during build | WF-2 Module Build | WF-4 Bug Fix → Resume WF-2 |
| Platform quirk discovered | WF-3 Platform Integration | WF-4 Bug Fix (mini) → Resume WF-3 |
| Polish reveals missing feature | WF-5 Quality Polish | WF-2 Module Build → Resume WF-5 |

### Switch Protocol

1. **Pause** current workflow (save state: which phase, what's done)
2. **Start** the new workflow (with context from the paused one)
3. **Complete** the new workflow
4. **Resume** the original workflow from where it paused

---

## Escalation Matrix

### When to Escalate

| Trigger | Escalation Level |
|---------|-----------------|
| 3 fix attempts failed on same issue | Escalate to user |
| Expert agents disagree on approach | Escalate to user |
| Security vulnerability discovered | Escalate to user immediately |
| Design flaw discovered during build | Escalate to user (design authority) |
| Scope creep detected | Escalate to user |
| Dependency blocker (external service, API access) | Escalate to user |

### Escalation Package

Every escalation must include:

```markdown
## Escalation: {Brief Description}

### What happened
{1-2 sentences describing the situation}

### What was tried
1. Attempt 1: {what} → {result}
2. Attempt 2: {what} → {result}
3. Attempt 3: {what} → {result}

### Why it's blocked
{Root cause analysis — why attempts failed}

### Proposed options
A. {Option A} — Pros: ... Cons: ...
B. {Option B} — Pros: ... Cons: ...
C. {Option C} — Pros: ... Cons: ...

### Recommendation
{Which option and why}
```

### User Response Handling

After escalation, the user may:

| User Response | Action |
|--------------|--------|
| Selects an option | Implement that option, resume workflow |
| Provides new information | Incorporate and retry |
| Changes scope | Adjust plan and resume |
| Defers decision | Park the workflow, move to next task |

---

## Hotfix Workflow (WF-8) Special Rules

Hotfixes have expedited gates but the same quality bar:

| Normal Workflow | Hotfix Workflow |
|----------------|-----------------|
| Full design phase | Skip design — go straight to diagnosis |
| Full test suite | Targeted tests for the specific fix |
| Full quality polish | Skip polish — ship the fix |
| QG-1 through QG-5 | QG-1 + QG-2 + QG-5 (skip QG-3 unless security, skip QG-4) |

**What does NOT change in hotfix:**
- Root cause must be located (no blind fixes)
- Fix must be verified with fresh evidence
- Tenant isolation must not be compromised
- Full test suite must pass (even if not all new tests required)

---

## Workflow Lifecycle Summary

```
1. TRIGGER     — User request arrives
2. CLASSIFY    — Map to workflow type (WF-1 through WF-8)
3. LOAD        — CC-1: Load context and knowledge
4. PLAN        — Identify skill chain, estimate phases
5. EXECUTE     — Follow skill chain, phase by phase
6. GATE        — Quality gates at each phase boundary
7. REWORK      — Fix failures (max 3 per gate)
8. DELIVER     — CC-6: Dual-write knowledge
9. VERIFY      — verification-before-completion
10. COMPLETE   — Archive, update status
```

---

*Orchestration is not overhead. It's the difference between a well-run factory and a pile of parts.*
