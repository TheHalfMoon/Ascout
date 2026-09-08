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
- `tasks.md`
- `checklists/requirements.md`

## Constitution alignment

### Evidence Before Claims

Aligned. The corpus requires explicit validator evidence per case and forbids aggregate `some rejection happened` claims.

### No Green by Omission

Aligned. Every declared case must execute and be accounted for; a skipped or unexecuted case fails the corpus.

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

## Requirements-to-plan mapping

| Requirement domain | Plan coverage | Task ownership |
| --- | --- | --- |
| valid controls | plan §§3,5 | T115 |
| stable explicit case registry | plan §§4,5 | T115 |
| schema/semantic layer separation | plan §§2,5 | T115 |
| evidence/artifact integrity | plan §6.1 | T115 |
| source/comparison integrity | plan §6.2 | T115 |
| paths/ranges | plan §6.3 | T115 |
| command authority | plan §6.4 | T115 |
| timing/observations | plan §6.5 | T115 |
| selection/exercise | plan §6.6 | T115 |
| summary/exit | plan §6.7 | T115 |
| privacy honesty | plan §7 | T115 |
| product-gap separation | plan §9 | T115 / recovery planning if needed |
| canonical reconciliation | plan §11 | T116 |

No requirement lacks task ownership.

## Path-scope analysis

Planning converges on one implementation path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

This is consistent across clarifications, both YAGNI reviews, plan, tasks, and checklist.

No planning artifact authorizes a second helper, product file, schema file, workflow, dependency file, benchmark result, or historical artifact.

## Failure-state consistency

All artifacts agree:

- accepted invalid case => T115 failure;
- no product repair inside T115;
- separately reviewed recovery planning required;
- T116 cannot convert such a failure into `SPEC_009 = GO`;
- complete all-valid rejection accounting is required for GO.

## Review/qualification consistency

All artifacts require final implementation exact-head CI, independent substantive review, material-finding reconciliation, zero unresolved threads, guarded merge, and post-merge proof.

Planning itself must receive the same freshness discipline before canonical merge. This self-analysis does not substitute for the independent final planning audit or fresh external exact-head review.

## Open ambiguities

None material.

Implementation must re-read current semantic issue codes immediately before authoring each case. Planning deliberately does not freeze guessed code names that have not been verified from current source.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS / INTERNALLY_CONSISTENT`

The package is bounded, constitution-aligned, roadmap-consistent, independent from Spec 007 terminal execution, and ready for independent final planning audit plus fresh exact-head branch-purity review.
