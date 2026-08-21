# 001 — Post-Plan Ponytail/YAGNI Review

**Gate:** PASS WITH TWO BOUNDARIES LOCKED  
**Date:** 2026-08-21

## Decision

The technical plan remains the minimum credible architecture for the feature. It does not need a redesign before task generation.

## Dependency ladder

### `cross-spawn` — KEEP

Node itself documents special Windows handling for `.cmd`/`.bat` and warns about shell invocation. Correct escaping of package-manager/node_modules shims is security-sensitive and unrelated to Ascout's product wedge. Reusing the mature cross-platform launcher is smaller and safer than reproducing it.

Boundary: `cross-spawn` normalizes launch only. Ascout still owns timeout, bounded capture, process-tree termination, normalized result semantics, and tests.

### All other proposed runtime libraries — REJECT FOR M1

- No CLI framework: Node `util.parseArgs` is enough for three commands.
- No config parser: tracked JSON is enough.
- No coverage library/database: line-level LCOV parser is enough.
- No Git library: Git CLI is canonical.
- No logging framework: terminal/receipt writers own bounded output.
- No schema-validation runtime dependency unless implementation demonstrates that a small strict validator cannot safely uphold the v1 config contract.

## Abstraction audit

- `src/tools/*` are concrete integrations, not a plugin hierarchy.
- `receipt/model.ts` is justified because three output surfaces must share one truth model.
- `process.ts` is justified because launch/timeout/tree-kill/redaction capture is a safety boundary.
- `git.ts` is justified because source identity, diff ranges, and drift share canonical Git semantics.
- No repository graph, service layer, repository pattern, event bus, dependency injection container, or persistence abstraction is permitted by the plan.

## Two boundaries locked

### B1 — No recursive widening engine

A narrowed test run may trigger at most one post-run widening pass for the affected package/workspace. If that wider pass still cannot establish a usable execution relationship, Ascout reports the unresolved gap. M1 does not invent recursive impact analysis.

### B2 — No semantic test-weakening analyzer

M1 reports factual changed/deleted test/snapshot paths. Skip/disable/assertion analysis is optional only when a reliable detector can be added without introducing a speculative AST subsystem. The first slice does not need it.

## Complexity budget

The plan's concrete source tree is an upper bound, not a mandate. During implementation, adjacent modules SHOULD be collapsed when behavior remains trivial. New top-level runtime dependencies, databases, background processes, or semantic indexes require a plan amendment and constitution check.

**Disposition:** proceed to contracts, tasks, checklist, and cross-artifact analysis.
