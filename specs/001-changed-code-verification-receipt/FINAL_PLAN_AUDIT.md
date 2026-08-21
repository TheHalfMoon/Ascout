# 001 — Independent Final Plan Audit

**Date:** 2026-08-22  
**Audit target exact head:** `b300549c64e084203a29fb254f35cb24e966558a`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — clean CodeRabbit + Qodo evidence on the post-audit successor and final exact-head purity/thread/mergeability verification are required**

This audit supersedes all earlier Ascout founding-plan audits for merge-readiness purposes.

## 1. Reconciliation Status

Accepted external-review findings are reconciled:

- Qodo Q1–Q4: **RESOLVED**.
- CodeRabbit CR1–CR17: **RESOLVED**.

The latest reconciliation includes three related but distinct data-integrity repairs:

- CR15: invalid persisted path spellings are rejected on their original receipt-candidate spelling before any lossy normalization can repair them;
- CR16: M1 `working_tree_vs_head` comparison identity is bound to the same exact full Git object ID captured as source-start HEAD;
- CR17: changed new-line ranges require `start <= end` and are rejected before changed-line, coverage, or exercise arithmetic.

No new task ID, dependency, runtime component, comparison mode, database, graph, or validation service was added.

## 2. Product / Authority / Evidence Truth

The audited planning set requires:

- evidence before claims;
- no green by omission;
- stable material exercise gaps cannot return exit `0`;
- changed effective command/config authority is refused before launch/load by default;
- override is explicit, per invocation, receipt-visible, never remembered or auto-added;
- exact source/run binding and explicit drift;
- `source.start.head_sha` and `comparison.base_ref` are full 40/64-hex Git object IDs and are exactly equal for M1 `working_tree_vs_head`;
- unborn HEAD is unsupported for M1 normal check;
- changed new-line ranges reject `start > end` before any derived arithmetic;
- run-bound evidence with no cross-tree transfer;
- opaque privacy-safe repository identity;
- canonical relative persisted paths only;
- original invalid receipt path spellings are rejected before lossy normalization and never repaired;
- one pure semantic receipt validator in addition to JSON Schema;
- fixed M1 task surface (`typecheck`, `lint`, `test`, `pytestBasic`);
- trusted developer-owned local repository scope for v0.x.

**Result:** `PASS`

## 3. Source / Comparison / Range Integrity

Receipt v1 now constrains source/comparison identity as follows:

```text
source.start.head_sha = full Git object ID
comparison.kind       = working_tree_vs_head
comparison.base_ref   = full resolved Git object ID
comparison.base_ref   = source.start.head_sha   (semantic invariant)
```

Accepted Git object formats are full lowercase SHA-1 (40 hex) and SHA-256 (64 hex). Abbreviated, malformed, symbolic/free-form, unborn, or mismatched M1 comparison identities fail closed.

Each `changed_new_line_ranges` item is a two-positive-integer `[start, end]` pair and semantic validation requires `start <= end`. `[10, 1]` is a required negative regression and cannot reach changed-line counting, coverage intersection, exercise aggregation, or receipt emission.

**Result:** `PASS`

## 4. Canonical Path Contract

A persisted receipt path candidate is validated on its **original candidate spelling** before any operation can collapse or erase invalid syntax.

Rejected before lossy normalization:

- POSIX absolute paths;
- Windows drive and UNC forms;
- URI-absolute forms;
- backslashes;
- `.` / `..` segments;
- duplicate separators such as `src//file.ts`;
- trailing separators such as `src/`.

The validator never repairs these into canonical output. Only after raw-form rejection succeeds may non-lossy namespace-containment/canonicality logic operate.

**Result:** `PASS`

## 5. Canonical Document Authority

There is one live normative Master Plan v1:

```text
docs/founding/MASTER_PLAN_V1.md
```

`docs/founding/ASCOUT_MASTER_PLAN_V1.md` is only a `SUPERSEDED / NON-AUTHORITATIVE` tombstone and cannot drive implementation, Spec Kit derivation, review, or release decisions.

**Result:** `PASS`

## 6. Machine Contract / Benchmark / YAGNI

Receipt/config contracts remain versioned and strict. Evidence references, task statuses/reasons, rename fidelity, exercise states/counts/reasons, command admission, aggregate completeness, source stability, exact HEAD comparison binding, changed-line range validity, exit precedence, and path raw-form/canonical/containment invariants are explicitly validated.

Absolute benchmark gates remain:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

M1 still introduces no DB, daemon/server, semantic graph, public plugin SDK, persistent trust store, VFS/path-policy subsystem, required AI, browser/security suite, mutation/fuzzing stack, arbitrary workflow DSL, or committed `--base` comparison mode.

**Result:** `PASS`

## 7. Task / Checklist Audit

Task range remains exactly:

```text
T001–T088
```

Current checklist:

```text
92 / 92 PASS
```

CR16/CR17 strengthen existing source/diff/receipt tasks T009/T011/T018/T020/T025/T026/T033/T081; no task ID or M1 scope is added.

**Result:** `PASS`

## 8. Planning-Branch Purity at Audit Target

Exact comparison `main` → `b300549c64e084203a29fb254f35cb24e966558a`:

- main/base: `6735fe500c8408081a9950ac33abc69c3f272ce3`;
- ahead: 114;
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

## 9. Connected Review Inventory

Actual code-review integrations evidenced on PR #1:

1. CodeRabbit.
2. Qodo Code Review.

No additional code-review bot or GitHub Actions review workflow is evidenced on this PR lineage.

The post-audit successor must be frozen and receive clean exact-head evidence from both integrations before merge consideration.

## 10. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audit target `b300549c64e084203a29fb254f35cb24e966558a`:

- open accepted BLOCKER findings: **0**;
- open accepted MAJOR findings: **0**;
- accepted Qodo findings unrepaired: **0**;
- accepted CodeRabbit CR1–CR17 findings unrepaired: **0**;
- checklist: **92/92 PASS**;
- product implementation files: **0**;
- task range: **T001–T088**;
- behind main: **0**.

Writing this audit creates a governance-only successor. That successor is **not** authorized for merge or implementation until CodeRabbit and Qodo independently review the same exact head cleanly and branch purity, review-thread state, head identity, and mergeability are reverified.

Do not start T001 from this audit alone.