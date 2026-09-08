# Specification 009 — Cross-Artifact Analysis

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Inputs reviewed

- `.specify/memory/constitution.md`
- `CONTRIBUTING.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- `benchmarks/results/t078-selector-misses.json`
- `benchmarks/results/t091-m2-selection-replay.json`
- current Receipt v1 model/schema validation surfaces
- Issue #252
- `GAP_EVIDENCE.md`
- `spec.md`
- `clarifications.md`
- `ponytail-review.md`
- `plan.md`
- `plan-ponytail-review.md`
- `CASE_REGISTRY.md`
- `tasks.md`
- `checklists/requirements.md`
- CodeRabbit exact-head planning review on former candidate `fcba20f4a037b81ff15bb5e31b74f5ec999d3575`

## Constitution alignment

### Evidence Before Claims

Aligned. The corpus requires explicit validator evidence per case and forbids aggregate `some rejection happened` claims.

### No Green by Omission

Aligned. `SPEC009-CASE-REGISTRY-V1` freezes 2 valid controls, 44 invalid cases, and 46 total declared executions. It also freezes source controls and exact candidate assignments. Every declared case/control must execute and be accounted for; a skipped, substituted, unexecuted, reclassified, or undeclared qualification case fails the corpus.

### Source-Bound Truth

Aligned. Source/comparison mismatch cases directly challenge the current binding rules without creating alternate source semantics.

### Explicit Authority

Aligned. Command-surface/admission cases test existing authority invariants. Spec 009 itself grants no execution or product authority before a separate authorization artifact.

### Native Capability Before Invention

Aligned. Existing Vitest, TypeScript, JSON Schema validator, and semantic validator are reused. No dependency/framework/service is introduced.

### Bounded / Read-only / Private

Aligned. The planned corpus is deterministic, local test execution with no network or source mutation.

### Benchmark-gated growth

Aligned. This is trust-measurement work before broader architecture expansion.

## Roadmap alignment

The post-M1 roadmap explicitly names a receipt mutation/adversarial corpus within M1.2. Spec 009 narrows that candidate to deterministic current-contract receipt validation and does not pull M2/M3 architecture into the repository.

The roadmap is non-authoritative, so its mention does not authorize implementation. The Spec 009 planning + separate authorization chain is the canonicalization mechanism.

## Spec 007 interaction

No dependency from Spec 009 to successful T113 publication exists in the planned implementation. Spec 009 does not change historical corpus selection, metrics, replay workflow, T113 result path, or T114 ledger semantics.

Spec 007 terminal evidence remains immutable and is not used as a retry opportunity.

## Selector evidence interaction

T078's historical one-case Ascout selector miss is preserved. T091's later six-case replay reports zero current published selector misses and three unavailable Ascout cases. Spec 009 makes no universal selector claim and does not overwrite either result.

The planning rationale uses this only as prioritization evidence: there is no unresolved published selector miss with a known bounded repair target stronger than the explicit receipt-adversarial gap.

## Exact registry analysis

Planning freezes `SPEC009-CASE-REGISTRY-V1` rather than deferring corpus design to implementation.

Exact accounting:

- valid controls: `2`;
- invalid cases: `44`;
- schema cases: `8`;
- semantic cases: `36`;
- total declared executions: `46`.

The registry freezes:

- control identity/state anchors used by cases;
- the source control for every case;
- exact per-case assignments/additions/removals;
- expected layer;
- required semantic issue codes.

Implementation must leave all unlisted fields unchanged. There is no alternate-candidate or compensating-bookkeeping authority.

If implementation evidence proves a frozen candidate/layer/code expectation factually wrong, T115 stops and returns to planning. It may not rewrite the registry in the implementation branch.

## Exact-head review reconciliation

CodeRabbit's fresh substantive review of candidate `fcba20f4a037b81ff15bb5e31b74f5ec999d3575` identified two material planning findings.

### F1 — Candidate construction remained discretionary

Finding: the registry's general `strictly necessary` bookkeeping allowance and phrases such as `if needed` / `or otherwise violate` allowed T115 to select concrete candidate construction.

Reconciliation:

- removed the general bookkeeping allowance;
- froze control anchors used by mutations;
- froze exact per-case source controls and operations;
- required all unlisted fields to remain unchanged;
- replaced every alternative mutation phrase with one exact construction;
- froze compound compensation explicitly, including source-end repository mismatch and selection-widening cases;
- made exact-candidate mismatch a stop-and-return-to-planning condition.

`F1 = RECONCILED_PROSPECTIVELY / REQUIRES_FRESH_FINAL_HEAD_REVIEW`

### F2 — Preliminary Ponytail statements contradicted final contract

Finding: `ponytail-review.md` still retained an approximate 25–45 case count, a conditional second control, and possible second helper path.

Reconciliation:

- replaced the preliminary retained-design section with exact `2 / 44 / 8 / 36 / 46` accounting;
- made both controls mandatory;
- made the one tracked T115 path absolute;
- stated explicitly that preliminary count/control/path language is superseded.

`F2 = RECONCILED_PROSPECTIVELY / REQUIRES_FRESH_FINAL_HEAD_REVIEW`

No review against `fcba20f4...` qualifies any later head. Fresh independent exact-head review remains mandatory after these reconciliations.

## Requirements-to-plan mapping

| Requirement domain | Plan/registry coverage | Task ownership |
| --- | --- | --- |
| valid controls | plan §§3,5; registry controls/anchors | T115 |
| stable explicit case registry | `CASE_REGISTRY.md`; plan §§4,5,13 | T115 |
| exact candidate construction | registry exact-candidate rule; spec FR-003; plan §5 | T115 |
| schema/semantic layer separation | plan §§2,5; registry | T115 |
| evidence/artifact integrity | registry evidence/artifact cases | T115 |
| source/comparison integrity | registry source/comparison cases | T115 |
| paths/ranges | registry schema/path and changed-scope cases | T115 |
| command authority | registry command-authority cases | T115 |
| timing/observations | registry timing/observation cases | T115 |
| selection/exercise | registry selection/exercise/branch cases | T115 |
| summary/exit | registry aggregate/decision cases | T115 |
| privacy honesty | registry privacy boundary; plan §7 | T115 |
| product/planning-gap separation | plan §9; tasks failure rule | T115 / recovery planning if needed |
| canonical reconciliation | plan §11; tasks T116 | T116 |

No requirement lacks task ownership.

## Path-scope analysis

Planning authorizes exactly one implementation path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Clarifications, both YAGNI reviews, plan, tasks, and registry permit no second helper/fixture path. Any need for another tracked implementation path requires a new planning amendment before implementation continues.

No planning artifact authorizes a product file, schema file, workflow, dependency file, benchmark result, historical artifact, or second T115 implementation path.

## Failure-state consistency

All controlling artifacts agree:

- accepted invalid case => T115 `NO_GO / PRODUCT_GAP_DISCOVERED`;
- exact candidate cannot reach frozen boundary => stop and return to planning;
- frozen layer/code shown wrong => stop and return to planning;
- no product repair inside T115;
- no candidate substitution or registry rewrite inside T115;
- separately reviewed recovery/planning amendment required;
- T116 cannot convert such a failure into `SPEC_009 = GO`;
- exact 46-execution accounting is required for GO.

## Review/qualification consistency

All controlling artifacts require final implementation exact-head focused evidence, Project CI, independent substantive review, material-finding reconciliation, zero unresolved threads, guarded merge, and post-merge proof.

Planning itself must receive the same freshness discipline before canonical merge. This self-analysis does not substitute for fresh independent external exact-head planning review after F1/F2 reconciliation.

## Open ambiguities

None material identified after F1/F2 reconciliation.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS / F1_F2_RECONCILED / EXACT_CANDIDATES_FROZEN`

The package is bounded, constitution-aligned, roadmap-consistent, independent from Spec 007 terminal execution, protected against green-by-omission and candidate substitution, and requires fresh final-head qualification before merge.
