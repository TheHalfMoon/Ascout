# 001 — Post-Plan Ponytail/YAGNI Review

**Gate:** `PASS_AFTER_REPAIR`  
**Date:** 2026-08-21

## Decision

The repaired technical plan is the minimum credible M1 architecture. Two earlier designs failed the Ponytail test and were deleted before implementation:

1. config v1 briefly behaved like a workflow/task-runner DSL; and
2. changed command/config surfaces were only warned about before execution, requiring a security fix.

The final design closes both without adding a trust database, sandbox, daemon, or policy engine.

## Dependency ladder

### `cross-spawn` — KEEP

Windows command-shim/PATHEXT/shebang launch behavior is security-sensitive plumbing outside Ascout's wedge. Reuse is smaller than reimplementing it.

Boundary: launch normalization only. Ascout owns timeout, bounded capture, process-tree termination, result semantics, and tests.

### All other product runtime libraries — REJECT FOR M1

- No CLI framework: `node:util.parseArgs` is enough.
- No executable config framework/parser: JSON is enough.
- No coverage database/library: strict line-level LCOV parser is enough.
- No Git library: Git CLI is canonical.
- No logging framework: bounded receipt/artifact writers are enough.
- No schema-validation runtime dependency unless implementation proves a small strict validator cannot uphold the fixed v1 contracts.

## Abstraction audit

- `src/tools/*` remain concrete integrations, not a plugin hierarchy.
- `receipt/model.ts` is justified because three renderers share one truth model.
- `process.ts` is justified by launch/timeout/tree-kill safety.
- `git.ts` is justified by source identity/diff/drift sharing Git semantics.
- Fixed internal prerequisite ordering is allowed; user-defined task/prerequisite graphs are not.
- No repository graph, event bus, DI container, persistence abstraction, workflow engine, sandbox manager, or trust database is permitted.

## Boundaries locked

### B1 — No recursive widening engine

A narrowed test run may trigger at most one post-run widening pass. If the wider pass still leaves material changed executable code unexercised/unresolved, Ascout reports incomplete exit `4`; it does not invent recursive impact analysis.

### B2 — No semantic test-weakening analyzer

M1 reports factual changed/deleted test/snapshot paths only. Semantic weakening inference waits for a reliable future detector with benchmark evidence.

### B3 — No config workflow DSL

Config v1 can override only fixed semantic tasks (`typecheck`, `lint`, `test`, `pytestBasic`) plus timeout/budget/redaction. Arbitrary task names, user prerequisites, workspace orchestration, expressions, hooks, and admission grants are deleted from M1.

### B4 — No green exercise gap

Remaining material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines produce stable incomplete exit `4`, not clean success.

### B5 — Changed execution authority defaults to refusal

If the current diff changes the **effective authority files actually used** to derive/load a repository task, warning-then-execute is rejected. The task becomes `NOT_RUN(command_surface_changed)` before process launch/load. A human may explicitly admit the changed surface for one invocation with `--allow-changed-command-surface`.

The admission mechanism deliberately does **not** add:

- `.ascout/trust.json`;
- persistent trust grants;
- a sandbox/VM/container layer;
- a generic policy language;
- approval databases;
- agent-autonomous escalation.

This is the smallest design that closes the M1 authority gap.

## Security/privacy reductions

- Raw credential-bearing Git origins are never persisted.
- Local-only identity is a one-way hash of canonical real path; raw absolute workstation path is never persisted.
- Persisted/rendered argv is redacted; raw argv is transient launch input only.
- All non-gitignored untracked files except `.ascout/` participate in source identity.
- Unstaged type/mode participates in tree identity.
- Changed effective command authority is refused by default rather than merely warned about.

## Complexity budget

The source tree remains an upper bound. Adjacent modules SHOULD collapse when trivial. New runtime dependencies, DB/background processes, semantic indexes, generic plugin interfaces, arbitrary config workflow edges, recursive widening, persistent trust state, or automatic admission escalation require a plan amendment and constitution check.

**Disposition:** `PASS_AFTER_REPAIR`. The repaired plan is lean enough for final independent audit. No implementation is authorized.