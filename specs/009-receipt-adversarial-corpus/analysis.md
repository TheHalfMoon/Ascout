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

## Constitution alignment

### Evidence Before Claims

Aligned. The corpus requires explicit validator evidence per case and forbids aggregate `some rejection happened` claims.

### No Green by Omission

Aligned. `SPEC009-CASE-REGISTRY-V1` freezes 2 valid controls, 44 invalid cases, and 46 total declared executions. Every declared case/control must execute and be accounted for; a skipped, unexecuted, reclassified, or undeclared qualification case fails the corpus.

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

Planning now freezes `SPEC009-CASE-REGISTRY-V1` rather than deferring case-count/layer/code selection to implementation.

Exact accounting:

- valid controls: `2`;
- invalid cases: `44`;
- schema cases: `8`;
- semantic cases: `36`;
- total declared executions: `46`.

The registry was checked against the current canonical Receipt v1 schema/model validation surfaces before freezing. Required semantic code names are planning-time contract data, not implementation guesses.

If implementation evidence proves a frozen layer/code expectation factually wrong, T115 stops and returns to planning. It may not rewrite the registry in the implementation branch.

## Requirements-to-plan mapping

| Requirement domain | Plan/registry coverage | Task ownership |
| --- | --- | --- |
| valid controls | plan §§3,5; registry controls | T115 |
| stable explicit case registry | `CASE_REGISTRY.md`; plan §§4,5,13 | T115 |
| schema/semantic layer separation | plan §§2,5; registry | T115 |
| evidence/artifact integrity | registry evidence/artifact cases | T115 |
| source/comparison integrity | registry source/comparison cases | T115 |
| paths/ranges | registry schema/path and changed-scope cases | T115 |
| command authority | registry command-authority cases | T115 |
| timing/observations | registry timing/observation cases | T115 |
| selection/exercise | registry selection/exercise/branch cases | T115 |
| summary/exit | registry aggregate/decision cases | T115 |
| privacy honesty | registry privacy boundary; plan §7 | T115 |
| product-gap separation | plan §9; tasks product-gap rule | T115 / recovery planning if needed |
| canonical reconciliation | plan §11; tasks T116 | T116 |

No requirement lacks task ownership.

## Path-scope analysis

Planning converges on exactly one implementation path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Clarifications, plan, tasks, and registry change-control permit no second helper/fixture path. Any need for another tracked implementation path requires a new planning amendment before implementation continues.

No planning artifact authorizes a product file, schema file, workflow, dependency file, benchmark result, historical artifact, or second T115 implementation path.

## Failure-state consistency

All controlling artifacts agree:

- accepted invalid case => T115 `NO_GO / PRODUCT_GAP_DISCOVERED`;
- frozen layer/code shown wrong => stop and return to planning;
- no product repair inside T115;
- no registry rewrite inside T115;
- separately reviewed recovery/planning amendment required;
- T116 cannot convert such a failure into `SPEC_009 = GO`;
- exact 46-execution accounting is required for GO.

## Review/qualification consistency

All controlling artifacts require final implementation exact-head focused evidence, Project CI, independent substantive review, material-finding reconciliation, zero unresolved threads, guarded merge, and post-merge proof.

Planning itself must receive the same freshness discipline before canonical merge. This self-analysis does not substitute for the fresh independent external exact-head planning review.

## Open ambiguities

None material.

The previously open implementation-time discretion over final case count/layer/code selection is closed by `CASE_REGISTRY.md`. Registry mutations require planning amendment authority.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS / INTERNALLY_CONSISTENT / REGISTRY_FROZEN`

The package is bounded, constitution-aligned, roadmap-consistent, independent from Spec 007 terminal execution, protected against green-by-omission, and ready for an updated final plan audit plus fresh exact-head external review.
