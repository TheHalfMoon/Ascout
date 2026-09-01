# Feature Specification: Branch-Evidence Product Integration

**Feature Branch:** `docs/004-branch-evidence-product-integration-planning`  
**Created:** 2026-09-01  
**Status:** Planning  
**Input:** Canonical post-M2 evidence-depth review on `main` `ae620e7a2bd152f3e6ea2a89d393483c038c5840`.

## Why

Ascout currently proves changed-line execution from LCOV `DA:` records. LCOV may also report `BRDA:` branch observations. A line can be executed while an instrumented branch on that same line is never taken. Current Ascout does not claim branch completeness, so this is not a defect in the existing receipt; it is a candidate evidence-depth gap measured by Spec 003.

Spec 003 proved this gap is real and detectable with fail-closed handling. The measured `GO` result authorizes planning a bounded product integration that enriches changed-code verification semantics without weakening evidence integrity, backward compatibility, or trust guarantees.

## Goal

Integrate qualified LCOV branch evidence into Ascout's existing changed-code exercise pipeline as an additive parallel dimension, preserving exact line semantics, deterministic serialization, no-green-by-omission, source-binding, six-lane compatibility, and receipt v1 backward compatibility.

## User Scenarios & Testing

### User Story 1 — Detect a branch-only exercise gap (P1)

As a maintainer running `ascout check` on a changed production source, I need Ascout to report not only that a changed line was executed but also whether all instrumented branches on that line were taken. If a changed line is line-exercised while one branch is not taken, Ascout must report a material branch gap.

**Acceptance:** receipt includes optional branch records; completeness becomes `materially_incomplete`; exit code is `4` when no higher-precedence condition applies.

### User Story 2 — Preserve line-only behavior (P1)

When LCOV contains no branch records or when branch parsing is unavailable, Ascout must behave exactly as before: identical line exercise records, identical completeness, and identical exit code.

**Acceptance:** existing changed-line exercise tests pass unchanged; line-only fixtures produce identical receipts.

### User Story 3 — Preserve uncertainty (P1)

When LCOV branch `taken` is `-` or a branch observation cannot be mapped defensibly, Ascout must report unresolved branch evidence rather than exercised/not-exercised fabrication.

**Acceptance:** unknown/malformed/path-unsafe branch data yields `BRANCH_UNRESOLVED` or fail-closed behavior; never silently converted to `EXERCISED`.

### User Story 4 — Fail closed on malformed or unsafe input (P1)

Malformed `BRDA:` records, incomplete source records, or path-unsafe source paths must cause the branch parser to fail closed with a machine-stable reason. No fabricated branch evidence is injected.

**Acceptance:** malformed/containment fixtures produce unresolved or fail-closed outcomes; no invented branch observations.

### User Story 5 — Deterministic branch evidence (P2)

Branch records must serialize deterministically by path, line, block, branch. Repeated valid observations for the same branch identity must aggregate safely without integer overflow.

**Acceptance:** repeated numeric aggregation test passes; branch record ordering is stable.

### User Story 6 — Backward-compatible receipt (P2)

Existing tools that consume receipt v1 must continue to parse the receipt when branch evidence is absent. Old parsers must not fail on the new optional fields.

**Acceptance:** receipt schema version remains `"1.0"`; `branch_records` is optional; absent branch fields do not break existing consumers.

## Functional Requirements

- **FR-001:** `src/coverage/lcov.ts` MUST optionally parse LCOV `SF:` and `BRDA:` records and return branch observations alongside existing line points.
- **FR-002:** Branch identity MUST be the tuple `(repository_relative_path, line, block_id, branch_id)` after repository-safe path normalization.
- **FR-003:** `taken` MUST be a non-negative safe integer or `null` for LCOV `-`.
- **FR-004:** `taken > 0` maps to `BRANCH_EXERCISED`; `taken = 0` maps to `BRANCH_NOT_EXERCISED`; `taken = null` maps to `BRANCH_UNRESOLVED`.
- **FR-005:** Unknown/malformed/path-unsafe evidence MUST fail closed or remain unresolved; it MUST NOT be silently dropped when material to the case.
- **FR-006:** Repeated valid observations for the same branch identity MUST aggregate deterministically without integer overflow.
- **FR-007:** Output ordering MUST be deterministic by path, line, block, branch.
- **FR-008:** `src/exercise.ts` MUST build branch records and branch summary counts from branch observations intersected with changed new-line ranges.
- **FR-009:** `src/exercise.ts` MUST preserve existing line exercise records, counts, and semantics exactly.
- **FR-010:** `src/receipt/model.ts` MUST add `BranchRecordV1` and optional branch fields to `ExerciseV1` without changing the receipt schema version.
- **FR-011:** `exerciseHasMaterialGap` MUST include branch gaps as additive material incompleteness.
- **FR-012:** `decideReceiptExitCode` MUST continue to return exit code `4` when completeness is `materially_incomplete` due to branch gaps.
- **FR-013:** `validateExercise` MUST validate branch records when present and MUST NOT fail when `branch_records` is absent.
- **FR-014:** Branch parsing and exercise building MUST be wired through `src/check.ts` without altering task execution, selection, admission, or findings semantics.
- **FR-015:** The implementation MUST include focused contract tests proving branch-only gaps, fully exercised branches, unknown/malformed/containment behavior, backward compatibility, completeness, exit code, and deterministic serialization.
- **FR-016:** Historical benchmark result files MUST NOT be overwritten.
- **FR-017:** No new runtime dependency, CLI/terminal/agent output change, publication, release, or tag change is in scope unless explicitly planned.

## Success Criteria

- **SC-001:** Branch-only-gap case proves at least one line-exercised / branch-not-exercised divergence.
- **SC-002:** Fully-exercised case yields zero false branch gaps.
- **SC-003:** Unknown branch case yields unresolved evidence and no fabricated gap/pass.
- **SC-004:** Malformed and outside-repository cases fail closed.
- **SC-005:** Repeated runs serialize byte-identical semantic JSON for branch records apart from explicitly prohibited volatile fields.
- **SC-006:** Exact closeout head passes Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24 Project CI.
- **SC-007:** `src/` changes are limited to `src/coverage/lcov.ts`, `src/exercise.ts`, `src/receipt/model.ts`, `src/check.ts`, and `tests/`.
- **SC-008:** Existing changed-line exercise tests continue to pass unchanged.
- **SC-009:** Receipt schema version remains `"1.0"`.
- **SC-010:** Line-only repositories produce identical exercise records, completeness, and exit code when no branch records are present.

## Non-Goals

- product branch coverage support as a standalone claim;
- function coverage;
- AST/control-flow reconstruction;
- source-map invention beyond existing repository path normalization principles;
- mutation/property/fuzz testing;
- browser/API/security integration;
- new dependency or plugin architecture;
- receipt v2 or additive receipt fields beyond optional branch fields;
- changing what current `ascout check` returns for line-only cases;
- CLI flags for branch control;
- arbitrary branch coverage percentage thresholds.

## Constitutional Alignment

This feature strengthens Evidence Before Claims, No Green by Omission, Source-Bound Truth, Conservative Affected Verification, and Benchmark-Gated Growth while preserving Native Capability Before Invention and Minimal Core. It does not weaken any existing constitutional constraint.
