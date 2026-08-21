# 001 — Post-Plan Ponytail/YAGNI Review

**Gate:** PASS AFTER CROSS-ARTIFACT REDUCTION  
**Date:** 2026-08-21

## Decision

The repaired technical plan is the minimum credible M1 architecture. Cross-artifact analysis found one genuine Ponytail failure in the earlier candidate: config v1 allowed arbitrary task names plus user-defined prerequisites, which was functionally a small workflow/task-runner DSL despite the plan saying no DSL. That surface has been deleted before implementation.

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
- No schema-validation runtime dependency unless implementation evidence proves a small strict validator cannot uphold the fixed v1 contracts.

## Abstraction audit

- `src/tools/*` are concrete integrations, not a plugin hierarchy.
- `receipt/model.ts` is justified because three renderers share one truth model.
- `process.ts` is justified by launch/timeout/tree-kill safety.
- `git.ts` is justified by source identity/diff/drift sharing Git semantics.
- Fixed internal prerequisite ordering is allowed; **user-defined task/prerequisite graphs are not**.
- No repository graph, service layer, event bus, DI container, persistence abstraction, or workflow engine is permitted.

## Boundaries locked

### B1 — No recursive widening engine

A narrowed test run may trigger at most one post-run widening pass. If the wider pass still leaves a material changed executable line unexercised/unresolved, Ascout reports incomplete exit `4`; it does not recursively invent impact analysis.

### B2 — No semantic test-weakening analyzer

M1 reports factual changed/deleted test/snapshot paths only. Semantic weakening inference waits for a reliable future detector with benchmark evidence.

### B3 — No config workflow DSL

Config v1 can only override fixed semantic tasks (`typecheck`, `lint`, `test`, `pytestBasic`) plus timeout/budget/redaction. Arbitrary task names, user-authored prerequisites, workspace orchestration, expressions, and hooks are deleted from M1.

### B4 — No green exercise gap

An exercise gap is the product's core signal. Allowing selected tests to pass and then returning clean exit `0` while changed executable lines remain `NOT_EXERCISED`/`UNRESOLVED` would make Ascout a misleading task runner. The repaired plan uses exit `4` for this stable-but-incomplete state.

## Security reductions from analyze

- Raw credential-bearing Git origin strings are never persisted; repository identity is credential-safe.
- Persisted/rendered argv is redacted using the evidence redaction policy; raw argv is transient launch input only.
- All non-gitignored untracked files except `.ascout/` participate in source identity, eliminating an undefined "relevant untracked" omission heuristic.
- Unstaged worktree mode/type participates in tree identity so executable-bit/type changes cannot disappear when bytes are unchanged.

## Complexity budget

The source tree remains an upper bound. Adjacent modules SHOULD collapse when trivial. New runtime dependencies, DB/background processes, semantic indexes, generic plugin interfaces, arbitrary config workflow edges, or recursive widening require a plan amendment and constitution check.

**Disposition:** repaired plan is lean enough for final cross-artifact analysis and independent final audit. No implementation is authorized.
