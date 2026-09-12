# Spec 015 Tasks — Planning Materialization Only

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #318
**Base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`

Global rules for planning materialization:

1. re-read canonical `main`, Constitution, Master Plan, Spec 015 package, Spec 014 reconciliation contract, and live GitHub state;
2. use exactly one task-scoped branch/PR for planning files; no product source mutation;
3. bind every claim to exact post-T128 head; preserve historical evidence;
4. no force-push, rebase of shared history, history rewriting, or gate weakening;
5. no donor import, dependency adoption, service addition, or Constitution amendment;
6. no implementation authority follows from planning merge.

## P015-01 — Freeze planning core

Materialize `GAP_EVIDENCE.md`, `spec.md`, `clarifications.md`, `ponytail-review.md`, `plan.md`, `plan-ponytail-review.md`, `tasks.md` (this file), `analysis.md`, `checklists/requirements.md`, `CONSTITUTION_DELTA.md`, `SOURCES_AND_PROVENANCE.md`, `BENCHMARK_DESIGN.md`, `FINAL_PLAN_AUDIT.md`, `HEAD_CROSS_ARTIFACT_REVIEW.md` plus architecture, qa, and research annexes. No product code.

## P015-02 — Exact-head planning qualification

Planning PR receives exact-lockfile install, typecheck, full tests, build (docs-only expected green), exact-head review with zero unresolved material threads, and guarded merge. Post-merge CI success required.

## P015-03 — Implementation authorization gate (separate future chain)

After planning merge, a separate authorization chain must prove donor and license qualification, benchmark design execution, YAGNI reduction, exact-head review, and explicit founder authorization before any product mutation. No tag, release, npm publication, or Spec 014 implementation follows from planning.

```text
TASK_ORDER = P015-01 -> P015-02 -> SEPARATE_IMPLEMENTATION_AUTHORIZATION
IMPLEMENTATION_AUTHORITY = NO
```
