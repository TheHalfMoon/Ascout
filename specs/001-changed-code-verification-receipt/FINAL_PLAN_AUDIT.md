# 001 — Independent Final Plan Audit

**Date:** 2026-08-22  
**Audit target exact head:** `4b830c65ba285f1fac3824a2558485eb6f8c9274`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — clean CodeRabbit + Qodo evidence on the post-audit successor and final purity verification are required**

This audit supersedes all earlier Ascout founding-plan audits for merge-readiness purposes.

## 1. Reconciliation Status

Accepted external-review findings are reconciled:

- Qodo Q1–Q4: **RESOLVED**.
- CodeRabbit CR1–CR15: **RESOLVED**.

Latest CodeRabbit finding CR15 was valid. The planning prose previously allowed normalization before validation, which could erase the forbidden original spelling by collapsing `src//file.ts`, removing the trailing separator in `src/`, or resolving traversal before the validator observed it.

The repair is deliberately narrow:

- `plan.md` now requires fail-closed validation of the original repository/run-relative receipt candidate before any lossy normalization, separator collapse, trailing-separator removal, or dot-segment resolution;
- `data-model.md` carries the same ordering invariant and states invalid spellings are rejected rather than repaired;
- `spec.md` acceptance scenario 12, edge cases, clarification, FR-042, and SC-015 use the same raw-form rejection semantics;
- T009, T025, T033, and T081 make the ordering executable and require proof that invalid forms, including `src//file.ts` and `src/`, are never normalized into valid-looking receipt paths;
- CHK090 locks this cross-artifact ordering invariant.

No new task ID, dependency, runtime component, validator subsystem, or product capability was added.

## 2. Product / Authority / Evidence Truth

The audited planning set still requires:

- evidence before claims;
- no green by omission;
- stable material exercise gaps cannot return exit `0`;
- changed effective command/config authority is refused before launch/load by default;
- any override is explicit, per invocation, receipt-visible, never remembered or auto-added;
- exact source/run binding and explicit drift;
- run-bound evidence with no cross-tree transfer;
- opaque privacy-safe repository identity;
- canonical relative persisted paths only;
- original invalid receipt path spellings are rejected before lossy normalization and are never repaired;
- one pure semantic receipt validator in addition to JSON Schema;
- fixed M1 task surface (`typecheck`, `lint`, `test`, `pytestBasic`);
- no universal proof ladder;
- trusted developer-owned local repository scope for v0.x.

**Result:** `PASS`

## 3. Canonical Path Contract

A persisted receipt path candidate is validated on its **original candidate spelling** before any operation can collapse or erase invalid syntax.

Rejected before lossy normalization:

- POSIX absolute paths;
- Windows drive and UNC forms;
- URI-absolute forms;
- backslashes;
- `.` / `..` segments;
- duplicate separators such as `src//file.ts`;
- trailing separators such as `src/`.

The validator never repairs these into canonical output. Only after raw-form rejection succeeds may non-lossy namespace-containment/canonicality logic operate on the already-canonical relative candidate.

The implementation task plan tests this at contract/semantic, implementation-validator, end-to-end, and cross-platform golden layers.

**Result:** `PASS`

## 4. Canonical Document Authority

There is one live normative Master Plan v1:

```text
docs/founding/MASTER_PLAN_V1.md
```

`docs/founding/ASCOUT_MASTER_PLAN_V1.md` is only a `SUPERSEDED / NON-AUTHORITATIVE` tombstone and explicitly prohibits use for Spec Kit derivation, implementation authorization, requirements interpretation, task planning, review, or release decisions.

**Result:** `PASS`

## 5. Machine Contract / Benchmark / YAGNI

Receipt/config contracts remain versioned and strict. Evidence references, task statuses/reasons, rename fidelity, exercise states/counts/reasons, command admission, aggregate completeness, source stability, exit precedence, and path raw-form/canonical/containment invariants remain explicitly validated.

Absolute benchmark gates remain:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

M1 still introduces no DB, daemon/server, semantic graph, public plugin SDK, persistent trust store, VFS/path-policy subsystem, required AI, browser/security suite, mutation/fuzzing stack, or arbitrary workflow DSL.

**Result:** `PASS`

## 6. Task / Checklist Audit

Task range remains exactly:

```text
T001–T088
```

Current checklist:

```text
90 / 90 PASS
```

CR15 only strengthens path-validation ordering and existing test obligations in T009/T025/T033/T081; it does not expand product scope.

**Result:** `PASS`

## 7. Planning-Branch Purity at Audit Target

Exact comparison `main` → `4b830c65ba285f1fac3824a2558485eb6f8c9274`:

- main/base: `6735fe500c8408081a9950ac33abc69c3f272ce3`;
- ahead: 106;
- behind: 0;
- changed files: 19;
- paths remain only `.specify/`, `docs/founding/`, `specs/001-changed-code-verification-receipt/`, and `LICENSE`;
- no `src/`;
- no `tests/`;
- no `benchmarks/`;
- no manifest/lockfile;
- no workflow;
- no product implementation.

**Result:** `PASS`

## 8. Connected Review Inventory

Actual code-review integrations evidenced on PR #1:

1. CodeRabbit.
2. Qodo Code Review.

No additional code-review bot or GitHub Actions review workflow is evidenced on this PR lineage.

The post-audit successor must be frozen and receive clean exact-head evidence from both integrations before merge consideration.

## 9. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audit target `4b830c65ba285f1fac3824a2558485eb6f8c9274`:

- open accepted BLOCKER findings: **0**;
- open accepted MAJOR findings: **0**;
- accepted Qodo findings unrepaired: **0**;
- accepted CodeRabbit CR1–CR15 findings unrepaired: **0**;
- checklist: **90/90 PASS**;
- product implementation files: **0**;
- task range: **T001–T088**;
- behind main: **0**.

Writing this audit creates a governance-only successor. That successor is **not** authorized for merge or implementation until CodeRabbit and Qodo independently review the same exact head cleanly and branch purity, review-thread state, head identity, and mergeability are reverified.

Do not start T001 from this audit alone.