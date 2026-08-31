# Feature Specification: Branch Exercise Evidence Qualification

**Feature Branch:** `docs/003-branch-exercise-qualification-planning`  
**Created:** 2026-09-01  
**Status:** Planning  
**Input:** Canonical post-M2 evidence-depth review on `main` `92f57989085999aeb4f617f7ec8389afa7caece2`.

## Why

Ascout currently proves changed-line execution from LCOV `DA:` records. LCOV may also report `BRDA:` branch observations. A line can be executed while an instrumented branch on that same line is never taken. Current Ascout does not claim branch completeness, so this is not a defect in the existing receipt; it is a candidate evidence-depth gap that must be measured before product semantics expand.

## Goal

Build a benchmark-only, deterministic qualification that measures whether LCOV branch evidence finds branch-only changed-code exercise gaps beyond current line evidence while remaining fail-closed on unknown, malformed, or repository-unmappable observations.

## User Scenarios & Testing

### User Story 1 — Detect a branch-only exercise gap (P1)

As a maintainer deciding whether branch evidence is worth integrating, I need a deterministic case where current line evidence says a changed line executed while branch evidence shows one instrumented branch did not execute.

**Acceptance:** qualification reports the line observation separately from one `BRANCH_NOT_EXERCISED` observation and never rewrites historical receipt evidence.

### User Story 2 — Avoid false branch gaps (P1)

When every instrumented branch is exercised, qualification must report zero branch gaps.

### User Story 3 — Preserve uncertainty (P1)

When LCOV branch `taken` is `-` or a branch observation cannot be mapped defensibly, qualification reports unresolved evidence rather than exercised/not-exercised fabrication.

### User Story 4 — Produce auditable qualification evidence (P2)

The final qualification result must bind exact source, fixtures/cases, normalized observations, aggregate counts, promotion-gate outcomes, and relevant digests without modifying product semantics.

## Functional Requirements

- **FR-001:** Qualification code MUST live outside `src/` and MUST NOT change product behavior.
- **FR-002:** It MUST parse LCOV `SF:` and `BRDA:` records needed for branch qualification.
- **FR-003:** Branch identity MUST be the tuple `(path, line, block_id, branch_id)` after repository-safe path normalization.
- **FR-004:** `taken` MUST be a non-negative safe integer or `null` for LCOV `-`.
- **FR-005:** `taken > 0` maps to `BRANCH_EXERCISED`; `taken = 0` maps to `BRANCH_NOT_EXERCISED`; `taken = null` maps to `BRANCH_UNRESOLVED`.
- **FR-006:** Unknown/malformed/path-unsafe evidence MUST fail closed or remain unresolved; it MUST NOT be silently dropped when material to the case.
- **FR-007:** Repeated valid observations for the same branch identity MUST aggregate deterministically without integer overflow.
- **FR-008:** Output ordering MUST be deterministic by path, line, block, branch.
- **FR-009:** Qualification MUST include branch-only-gap, fully-exercised, unknown, malformed, containment, and deterministic aggregation cases.
- **FR-010:** The evaluator MUST compare current line-level conclusion with branch-level qualification for each case.
- **FR-011:** The final result MUST explicitly state whether the future-product promotion gate is `GO` or `NO_GO`.
- **FR-012:** `GO` requires at least one proven branch-only gap, zero false gaps in fully-exercised cases, correct unresolved handling, fail-closed malformed/containment behavior, deterministic output, and green exact-head six-lane CI.
- **FR-013:** Historical benchmark result files MUST NOT be overwritten.
- **FR-014:** No runtime dependency, receipt schema/version, CLI, task status, completeness, exit semantics, trust/admission behavior, publication, release, or tag change is in scope.
- **FR-015:** A `GO` result authorizes only future planning; it does not authorize product integration.

## Success Criteria

- **SC-001:** Branch-only-gap case proves at least one line-exercised / branch-not-exercised divergence.
- **SC-002:** Fully-exercised case yields zero false branch gaps.
- **SC-003:** Unknown branch case yields unresolved evidence and no fabricated gap/pass.
- **SC-004:** Malformed and outside-repository cases fail closed.
- **SC-005:** Repeated runs serialize byte-identical semantic JSON apart from explicitly prohibited volatile fields (the canonical result itself contains no volatile timestamp).
- **SC-006:** Exact closeout head passes Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24 Project CI.
- **SC-007:** `src/`, receipt contracts, package identity/dependencies, and historical benchmark publications are unchanged from the canonical planning base.

## Non-Goals

- product branch coverage support;
- function coverage;
- AST/control-flow reconstruction;
- source-map invention beyond existing repository path normalization principles;
- mutation/property/fuzz testing;
- browser/API/security integration;
- new dependency or plugin architecture;
- receipt v2 or additive receipt fields;
- changing what current `ascout check` returns.

## Constitutional Alignment

This feature strengthens Evidence Before Claims, No Green by Omission research, Source-Bound Truth, Native Capability Before Invention, Conservative Affected Verification, and Benchmark-Gated Growth while deliberately avoiding product/schema expansion before evidence exists.
