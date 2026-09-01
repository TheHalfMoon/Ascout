# Spec 004 Governance Reconciliation — 2026-09-01

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** GOVERNANCE_NONCONFORMING_MERGE_IDENTIFIED  
**Repository:** TheHalfMoon/Ascout  
**Active Hermes profile:** default  
**Author:** live-truth reconciliation from canonical main  
**Date:** 2026-09-01

## Binding live truth

- Canonical main head: `21dbb6e8be2f941fa1e53fccc662cf842c3d38ef`
- Spec 004 planning merge (PR #110): `e7a99dbc13942138b280b018fc425acabb6fc05c`
- Spec 004 implementation authorization merge (PR #111): `51a06d98ad4a747b06bd916f3a7bd435cf60637d`
- PR #112 merge: `21dbb6e8be2f941fa1e53fccc662cf842c3d38ef`
- PR #112 head: `950e49e954ff4490d74d3d071b099f3c189b1b0c`
- PR #112 branch: `feat/004-branch-evidence-product-integration-t101-t103`
- PR #112 canonical base: `51a06d98ad4a747b06bd916f3a7bd435cf60637d`
- Six-lane CI on PR #112: `33509364071` — all lanes SUCCESS
- Cubic review pass 1: 6 issues raised against `3145f1e`
- Cubic review pass 2: all reported issues addressed against `660c970`
- PR #112 review decision: `APPROVED`
- Open PRs: none
- Open issues: 2 unrelated (#75, #6)

## Governing canonical authority

### Implementation Authorization
- **File:** `specs/004-branch-evidence-product-integration/IMPLEMENTATION_AUTHORIZATION.md`
- **Binding rule:** `T101 → T102 → T103, executed in canonical order. Each task begins only after the prior task is canonically closed.`

### Tasks
- **File:** `specs/004-branch-evidence-product-integration/tasks.md`
- **Execution discipline:**
  1. re-read canonical main, Constitution, Master Plan, Spec 004 authority chain, benchmark policy/result, current PR/review/Actions state;
  2. branch from exact canonical `main`;
  3. mutate only the current task;
  4. qualify exact head;
  5. reconcile review/findings on exact head;
  6. guarded merge with expected head SHA;
  7. verify ordered merge parents/tree/signature/main;
  8. record task closeout;
  9. begin the next task only after the prior task is closed canonically.

### Hard prohibitions
- No force-push or destructive history rewrite.
- No implementation mutation before this authorization is canonically merged.
- No fabricated evidence, CI, review, or completion claims.

## Material findings

### F-1 — Canonical dependency sequence violation

**Verdict:** CONFIRMED.

`IMPLEMENTATION_AUTHORIZATION.md` and `tasks.md` both require `T101 → T102 → T103` with each task beginning only after the prior task is `CLOSED_CANONICAL`.

PR #112 implemented all three tasks in a single branch and a single merge commit (`21dbb6e`). There is no durable record of T101, T102, or T103 being individually `CLOSED_CANONICAL` before the next task began. The authorization does not permit a combined merge to satisfy separate sequential closure requirements.

### F-2 — T102 began before T101 was CLOSED_CANONICAL

**Verdict:** CONFIRMED.

PR #112 commits (`37ae31e`, `3145f1e`, `22ea5cd`, `660c970`, `950e49e`) contain T102 mutations (`src/exercise.ts`) alongside T101 mutations (`src/coverage/lcov.ts`) in the same branch and same merge. No separate T101 canonical closeout precedes T102 work.

### F-3 — T103 began before T102 was CLOSED_CANONICAL

**Verdict:** CONFIRMED.

PR #112 commits contain T103 mutations (`src/receipt/model.ts`) alongside T101 and T102 mutations in the same branch and same merge. No separate T102 canonical closeout precedes T103 work.

### F-4 — Unauthorized file mutations

**Verdict:** CONFIRMED.

PR #112 changed the following files:

| File | Authorized for | Finding |
|------|----------------|---------|
| `src/coverage/lcov.ts` | T101 | Authorized surface, but mutated together with T102/T103 |
| `src/exercise.ts` | T102 | Authorized surface, but mutated together with T101/T103 |
| `src/receipt/model.ts` | T103 | Authorized surface, but mutated together with T101/T102 |
| `benchmarks/fixtures/branch-exercise/cases.json` | Not enumerated in any T101/T102/T103 authorized file surface | Unauthorized mutation |
| `tests/lcov-normalization.test.ts` | Not enumerated in any T101/T102/T103 authorized file surface | Unauthorized mutation |
| `tests/t093-branch-coverage-normalizer.contract.test.ts` | Not enumerated in any T101/T102/T103 authorized file surface | Unauthorized mutation |

The authorization enumerates task-specific contract tests (`tests/t101-lcov-branch-parser.contract.test.ts`, `tests/t102-branch-exercise.contract.test.ts`, `tests/t103-branch-receipt-validation.contract.test.ts`, `tests/fixtures/lcov/branch-cases.json`). PR #112 did not add any of these files.

### F-5 — Required contract tests absent

**Verdict:** CONFIRMED.

Required by canonical `plan.md` and `tasks.md`:

- `tests/t101-lcov-branch-parser.contract.test.ts` — absent
- `tests/t102-branch-exercise.contract.test.ts` — absent
- `tests/t103-branch-receipt-validation.contract.test.ts` — absent
- `tests/fixtures/lcov/branch-cases.json` — absent

PR #112 instead modified existing generic tests (`tests/lcov-normalization.test.ts`, `tests/t093-branch-coverage-normalizer.contract.test.ts`) that are not the dedicated task contract evidence required by canonical authority.

### F-6 — Receipt schema version integrity

**Verdict:** PRESERVED, but via unauthorized path.

`src/receipt/model.ts` was modified to add optional `branch_not_exercised_lines` and `branch_unresolved_lines` without a corresponding receipt schema review or schema file update. The receipt schema file (`specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`) was not modified. The `additionalProperties: false` constraint in the schema means any receipt emitted with the new optional fields would fail strict validation unless the schema is updated. This is a hidden integration risk.

### F-7 — Benchmark result mutation

**Verdict:** CONFIRMED.

`benchmarks/fixtures/branch-exercise/cases.json` was modified in PR #112. The authorization requires `benchmarks/results/t095-branch-exercise-qualification.json` to remain unchanged. While the modified file is a fixture rather than a result blob, the authorization does not enumerate fixture mutation as an authorized surface for any task. This is an unauthorized surface mutation.

### F-8 — Current merged state canonical compliance

**Verdict:** NON-COMPLIANT.

The merged state cannot be considered canonically compliant without retroactively changing authority. The authorization explicitly requires sequential task closure. No retroactive task closeouts are fabricated here.

## Reconciliation answers

1. **Did PR #112 violate the required T101 → T102 → T103 canonical dependency sequence?**  
   YES. All three tasks were implemented and merged together in one branch and one merge, violating the sequential closure requirement.

2. **Did T102 begin before T101 was `CLOSED_CANONICAL`?**  
   YES. T102 mutations (`src/exercise.ts`) appear in the same branch as T101 mutations with no separate T101 canonical closeout.

3. **Did T103 begin before T102 was `CLOSED_CANONICAL`?**  
   YES. T103 mutations (`src/receipt/model.ts`) appear in the same branch as T101 and T102 mutations with no separate T102 canonical closeout.

4. **Did PR #112 modify any file not authorized for the active task?**  
   YES. `benchmarks/fixtures/branch-exercise/cases.json`, `tests/lcov-normalization.test.ts`, and `tests/t093-branch-coverage-normalizer.contract.test.ts` were modified but are not enumerated in any T101/T102/T103 authorized file surface.

5. **Are any required T101/T102/T103 contract tests absent?**  
   YES. All four required contract test files are absent: `tests/t101-lcov-branch-parser.contract.test.ts`, `tests/t102-branch-exercise.contract.test.ts`, `tests/t103-branch-receipt-validation.contract.test.ts`, `tests/fixtures/lcov/branch-cases.json`.

6. **Can the current merged state be considered canonically compliant without retroactively changing authority?**  
   NO. The authorization explicitly requires sequential task closure. The current merged state does not satisfy that requirement.

7. **If not, what forward-only repair restores compliance?**  
   Record PR #112 as a governance-nonconforming merged unit. Do not mark T101/T102/T103 `CLOSED_CANONICAL` from PR #112. Revert PR #112 through an ordinary forward commit/PR from exact current canonical main. Qualify the revert exact head with required CI and review. Merge the revert normally with expected-head protection. Verify ordered parents, tree, signature, and canonical main. Then execute T101, T102, T103 sequentially per canonical authority.

## Forward-only repair plan

1. Record this reconciliation as durable canonical evidence.
2. Create revert branch from exact current canonical main (`21dbb6e`).
3. Revert PR #112 merge through ordinary forward commit.
4. Run exact-head six-lane CI on revert PR.
5. Fresh exact-head review.
6. Guarded expected-head merge.
7. Post-merge verification: ordered parents, tree, signature, canonical main.
8. Execute T101 from exact revert-merged main.
9. Execute T102 from exact T101 merge.
10. Execute T103 from exact T102 merge.
11. Spec 004 closeout only after all three tasks are individually `CLOSED_CANONICAL`.

## Hard prohibitions reaffirmed

- No force-push.
- No rebase of shared history.
- No destructive history rewrite.
- No retroactive authorization fabrication.
- No retroactive task closeout fabrication.
- No combined merge substituted for sequential closure.
- No hidden Windows CI failure.
- No benchmark-result fabrication or overwrite.
