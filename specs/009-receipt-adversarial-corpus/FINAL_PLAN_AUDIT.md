# Specification 009 — Final Plan Audit

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Audit role

This artifact is a repository-side final planning audit. It checks completeness and internal consistency of the Spec 009 planning package. It does NOT substitute for the required fresh independent substantive exact-head review before planning merge.

## Canonical planning input

Planning began from:

- `main`: `fb6bb2ec152e41da05901509b0b62d1eb3636648`
- tree: `f2a7331aaac4108375979afda3d706f9aa2e0fd7`
- Issue #252

At planning start, PR #251 had already merged and Spec 007 was durably terminal under the current specification.

## Workflow audit

### 1. Constitution compliance

PASS. The package strengthens evidence integrity, no-green-by-omission, source binding, command authority, and bounded execution. It weakens none of them.

### 2. Feature specification

PASS. `spec.md` defines purpose, requirements, acceptance, and explicit non-goals without granting implementation authority.

### 3. Material clarification

PASS. `clarifications.md` resolves validator layering, exact registry authority, valid-control authority, mutation minimality, privacy limits, failure handling, exact one-path implementation surface, and authorization sequencing.

### 4. First Ponytail/YAGNI reduction

PASS. `ponytail-review.md` rejects generalized mutation/fuzz frameworks, new CLI/workflow/dependencies, product refactor, result publication, and universal secret detection.

### 5. Technical plan

PASS. `plan.md` reuses exact current validators, binds the one-path implementation to `SPEC009-CASE-REGISTRY-V1`, establishes exact accounting/failure handling, and binds qualification expectations.

### 6. Second Ponytail/YAGNI reduction

PASS. `plan-ponytail-review.md` removes the separate result-publication task and preserves one tracked implementation path.

### 7. Exact adversarial registry

PASS. `CASE_REGISTRY.md` freezes implementation-time case discretion:

- valid controls: `2`;
- invalid cases: `44`;
- schema invalid cases: `8`;
- semantic invalid cases: `36`;
- total declared executions: `46`.

Every case has a stable ID, exact expected layer, and required semantic issue code(s) where applicable. The registry prohibits add/remove/rename/merge/split/skip/reclassification or required-code weakening without a separately reviewed canonical planning amendment.

The required semantic code names were checked against current canonical Receipt v1 validation source before the registry was frozen. A later factual mismatch is a stop-and-return-to-planning condition, not implementation authority to rewrite expectations.

### 8. Implementation tasks

PASS. `tasks.md` contains only dependency-ordered T115 -> T116, binds T115 to the exact registry and one tracked test path, and prevents product or expectation repair inside T115.

### 9. Requirements-quality checklist

PASS. `checklists/requirements.md` covers scope, trust, corpus design, YAGNI, qualification, cross-spec safety, and planning completeness. The frozen registry strengthens its stable-ID and complete-accounting requirements without weakening any checklist item.

### 10. Cross-artifact analysis

PASS. `analysis.md` incorporates the frozen registry, removes implementation-time code-name discretion, and finds no material contradiction, missing task ownership, path-scope mismatch, or Spec 007 authority leakage.

### 11. Supply-chain review

PASS. No new external source, dependency, network requirement, dataset, model, or license obligation is planned.

## Evidence-priority audit

The planning rationale is evidence-backed:

- receipt adversarial testing is explicitly named in the post-M1 roadmap;
- the Constitution makes receipt integrity a core product invariant;
- current tests are feature/regression oriented rather than one dedicated bounded exact-accounting adversarial corpus;
- T091 reports the known T078 Ascout selector miss repaired in the six-case replay while preserving unavailable outcomes;
- Spec 009 does not claim selector correctness from that result;
- Spec 007 terminal failure is preserved and not used as authority for new T113 execution.

## Scope audit

Final planned implementation surface is exactly:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Planning authorizes no other implementation path.

A later implementation authorization may not add a helper/fixture path without a new planning amendment.

## Acceptance audit

The acceptance rule is absolute for the frozen bounded corpus:

- registry version must be `SPEC009-CASE-REGISTRY-V1`;
- both valid controls must be accepted by schema and semantic validators;
- all 44 invalid cases must execute exactly once;
- all 8 schema cases must fail schema validation;
- all 36 semantic cases must pass schema first and fail semantic validation;
- every semantic case must expose all required semantic issue code(s);
- total declared execution count must equal `46`;
- no declared case may be skipped/unexecuted;
- no undeclared case may contribute to qualification counts;
- accepted invalid case IDs must be `[]` for GO;
- no accepted invalid case may be hidden by an aggregate score.

No invented percentage threshold is used.

## Failure-governance audit

PASS. If an invalid case is accepted:

- T115 fails as `NO_GO / PRODUCT_GAP_DISCOVERED`;
- the case remains unchanged;
- no `src/**` or schema repair occurs inside T115;
- no registry expectation is weakened;
- exact failure evidence is recorded;
- a separate recovery planning/authorization chain is required.

If a frozen expected layer/code is factually wrong, T115 also stops and returns to planning rather than silently changing the test.

This preserves measurement provenance and avoids test-to-green repair inside the measurement unit.

## Planning branch evidence already observed

An earlier planning head `89e19c00f01274e9440dbd1cb154440fb963fa89` is not qualifying evidence for the final planning head. Its original Project CI attempt included a Windows/Node 24 failure in two pre-existing redaction regression tests due to `5000ms` timeouts. No rerun was used to convert that attempt into qualifying evidence.

All planning qualification must therefore be re-established from scratch on the final unchanged planning head after the registry-freeze mutations.

## Planning merge gate

Before this planning package may become canonical, require all of the following on its exact unchanged final head:

1. changed paths are only Spec 009 planning artifacts;
2. no `.planning-seed` or accidental file remains in the final diff;
3. no implementation/product/test/workflow/dependency/result mutation is present;
4. exact final head/tree and base-to-head scope are verified;
5. exact frozen registry and accounting are present;
6. exact-head Self Verification succeeds where applicable;
7. exact-head Project CI succeeds across all required lanes on the original qualifying attempt for that final head;
8. fresh independent substantive exact-head review covers correctness, governance, scope, registry completeness, issue-code/layer correctness, YAGNI, failure separation, and branch purity;
9. every material finding is reconciled on the final head;
10. zero unresolved material review threads remain;
11. live ruleset/protection truth is reverified;
12. canonical `main` remains the expected PR base immediately before merge;
13. merge is guarded by exact expected head SHA;
14. post-merge ordered parents, merge tree, GitHub signature, PR state, canonical main, and exact path delta are verified;
15. Issue #252 closes `SPEC_009_PLANNING = CLOSED_CANONICAL`;
16. implementation remains unauthorized until a separate authorization artifact is independently qualified and merged.

## Final audit decision

`FINAL_PLAN_AUDIT = PASS / READY_FOR_FRESH_INDEPENDENT_EXACT_HEAD_REVIEW`

`REGISTRY = SPEC009-CASE-REGISTRY-V1 / FROZEN`

`IMPLEMENTATION_AUTHORIZED = NO`
