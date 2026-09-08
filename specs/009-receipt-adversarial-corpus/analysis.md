# Specification 009 — Cross-Artifact Analysis

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Inputs reviewed

- `.specify/memory/constitution.md`
- `CONTRIBUTING.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- current Receipt v1 schema and semantic validator surfaces
- current receipt contract tests, including the valid test-task/coverage and branch-evidence fixtures
- Issue #252
- every Spec 009 planning artifact
- CodeRabbit exact-head planning reviews through candidate `e89da2dcd704893527829c9f61eddad0638b1285`

## Constitution alignment

### Evidence Before Claims

Aligned. Every frozen invalid case must produce direct validator evidence at its declared boundary. Aggregate rejection is insufficient.

### No Green by Omission

Aligned. `SPEC009-CASE-REGISTRY-V1` freezes exactly two valid controls, 44 invalid cases, and 46 total declared executions. Every declared control/case must execute exactly once for GO, and undeclared qualification cases may not contribute.

### Source-Bound Truth

Aligned. Source/comparison cases challenge existing binding rules without inventing alternate source semantics.

### Explicit Authority

Aligned. Planning grants no implementation authority. T115 requires a separately canonical implementation authorization.

### Native Capability Before Invention

Aligned. The plan reuses current Vitest, TypeScript, JSON Schema, and semantic validators with no dependency, workflow, service, or generalized mutation engine.

## Roadmap alignment

Receipt mutation/adversarial testing is an explicit M1.2 roadmap candidate. The roadmap remains non-authoritative; Spec 009 planning plus a separate implementation authorization is the canonicalization route.

Spec 009 is independent of Spec 007 T113/T114 terminal execution and grants no authority to retry or reinterpret that evidence.

## Exact registry analysis

Planning freezes `SPEC009-CASE-REGISTRY-V1`:

- valid controls: `2`;
- invalid cases: `44`;
- schema cases: `8`;
- semantic cases: `36`;
- total declared executions: `46`.

The registry now freezes the complete JSON value of `control-valid-line-receipt`, not only selected anchors. Every Receipt v1 field used by that control is explicit, including run metadata, source start/end state, comparison, selection, task authority/runtime fields, changed-code facts, line exercise, test changes, findings, evidence digests/bindings, artifacts, stability, and summary.

`control-valid-branch-receipt` is also exact: it is the complete line control plus exactly five specified branch-group properties with two exact canonically ordered records. No other baseline field may differ.

Every invalid case then freezes:

- exact source control;
- exact assignments/additions/removals;
- all unlisted fields unchanged;
- expected rejection layer;
- required semantic issue code set.

There is therefore no implementation-selected baseline literal, compensating bookkeeping, equivalent mutation, fallback candidate, or second candidate construction.

If a frozen control is invalid, or an exact frozen candidate cannot reach the planned boundary on the then-canonical implementation base, T115 stops and returns to planning.

## Exact-head review reconciliation

### F1 — Candidate construction remained discretionary

CodeRabbit review of `fcba20f4a037b81ff15bb5e31b74f5ec999d3575` found general bookkeeping and alternative-mutation discretion.

Reconciled by exact per-case operations and the unlisted-fields-unchanged rule.

`F1 = RECONCILED_PROSPECTIVELY`

### F2 — Preliminary Ponytail language contradicted the final contract

The same review found stale approximate count, optional-control, and conditional-helper language.

Reconciled by exact `2 / 44 / 8 / 36 / 46` accounting, both controls mandatory, and exactly one tracked T115 implementation path.

`F2 = RECONCILED_PROSPECTIVELY`

### F3 — Source controls were not fully frozen

CodeRabbit review of exact candidate `e89da2dcd704893527829c9f61eddad0638b1285` found that `CASE_REGISTRY.md` called the controls complete while leaving required fields outside selected anchors as implementation-chosen deterministic literals. Because the line control sourced 41 invalid cases and the branch control derived from it, this preserved baseline discretion.

Reconciliation:

- replaced the anchor-only control definition with the complete frozen JSON value of `control-valid-line-receipt`;
- explicitly froze every run/source/comparison/selection/task/exercise/evidence/artifact/stability/summary value;
- replaced implementation-selected digests/tool metadata/argv/cache/source-path values with exact literals;
- defined `control-valid-branch-receipt` only as the exact line control plus five exact branch properties;
- required both controls to pass both exact validators unchanged;
- made any frozen-control rejection a stop-and-return-to-planning condition;
- added `baseline-control deviations = []` to GO accounting.

`F3 = RECONCILED_PROSPECTIVELY / REQUIRES_FRESH_FINAL_HEAD_REVIEW`

No review of `e89da2d...` qualifies the successor head containing this reconciliation.

## Requirements-to-plan mapping

| Requirement domain | Planning authority | Task |
| --- | --- | --- |
| complete valid controls | `CASE_REGISTRY.md` exact frozen controls | T115 |
| exact case registry | `CASE_REGISTRY.md` | T115 |
| exact candidate construction | registry exact-candidate rule | T115 |
| schema/semantic boundary | `spec.md`, `plan.md`, registry | T115 |
| evidence/artifact binding | registry evidence cases | T115 |
| source/comparison binding | registry source cases | T115 |
| path/range integrity | registry schema/changed-scope cases | T115 |
| command authority | registry command cases | T115 |
| timing/observations | registry timing cases | T115 |
| selection/exercise/branch | registry selection/exercise/branch cases | T115 |
| completeness/exit | registry decision cases | T115 |
| product-gap separation | `plan.md`, `tasks.md` | T115 / recovery planning |
| canonical closeout | `tasks.md` | T116 |

No requirement lacks task ownership.

## Path-scope analysis

Exactly one T115 tracked path is planned:

`tests/receipt-adversarial-corpus.contract.test.ts`

No helper, fixture, product, schema, workflow, dependency, benchmark-result, release, or Spec 007 evidence path is authorized.

## Failure-state consistency

All controlling artifacts require:

- accepted frozen invalid case => `T115 = NO_GO / PRODUCT_GAP_DISCOVERED`;
- rejected frozen valid control => `T115 = NO_GO / RETURN_TO_PLANNING`;
- exact candidate unable to reach frozen boundary => `T115 = NO_GO / RETURN_TO_PLANNING`;
- factually wrong frozen layer/code/candidate => `T115 = NO_GO / RETURN_TO_PLANNING`;
- no product/schema repair or baseline/candidate/expectation rewrite inside T115.

## Review/qualification consistency

The final planning head must independently prove exact planning-only scope, Self Verification success, original-attempt six-lane Project CI success, fresh substantive independent exact-head review, reconciliation of all material findings, zero unresolved material threads, live rules/protection truth, guarded merge, and post-merge parent/tree/signature/PR/main/path proof.

## Open ambiguities

None material identified after F1/F2/F3 prospective reconciliation. Fresh independent exact-head review remains required to validate that conclusion.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS / F1_F2_F3_RECONCILED / COMPLETE_CONTROLS_AND_EXACT_CANDIDATES_FROZEN`

`IMPLEMENTATION_AUTHORIZED = NO`
