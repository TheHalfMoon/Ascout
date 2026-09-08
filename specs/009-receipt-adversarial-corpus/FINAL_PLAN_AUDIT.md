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

PASS. `clarifications.md` resolves validator layering, fixture authority, mutation minimality, privacy limits, failure handling, implementation surface, and authorization sequencing.

### 4. First Ponytail/YAGNI reduction

PASS. `ponytail-review.md` rejects generalized mutation/fuzz frameworks, new CLI/workflow/dependencies, product refactor, result publication, and universal secret detection.

### 5. Technical plan

PASS. `plan.md` reuses exact current validators, defines a one-file fixture/case registry/runner design, establishes failure handling, and binds qualification expectations.

### 6. Second Ponytail/YAGNI reduction

PASS. `plan-ponytail-review.md` removes the separate result-publication task and preserves a one-path implementation preference.

### 7. Implementation tasks

PASS. `tasks.md` contains only dependency-ordered T115 -> T116 and prevents product repair inside T115.

### 8. Requirements-quality checklist

PASS. `checklists/requirements.md` covers scope, trust, corpus design, YAGNI, qualification, cross-spec safety, and planning completeness.

### 9. Cross-artifact analysis

PASS. `analysis.md` finds no material contradiction, missing task ownership, path-scope mismatch, or Spec 007 authority leakage.

### 10. Supply-chain review

PASS. No new external source, dependency, network requirement, dataset, model, or license obligation is planned.

## Evidence-priority audit

The planning rationale is evidence-backed:

- receipt adversarial testing is explicitly named in the post-M1 roadmap;
- the Constitution makes receipt integrity a core product invariant;
- current tests are feature/regression oriented rather than one dedicated bounded adversarial corpus;
- T091 reports the known T078 Ascout selector miss repaired in the six-case replay while preserving unavailable outcomes;
- Spec 009 does not claim selector correctness from that result;
- Spec 007 terminal failure is preserved and not used as authority for new T113 execution.

## Scope audit

Final planned implementation surface is exactly:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Planning authorizes no other implementation path.

A later implementation authorization may not silently add a helper path. Any need for a second path requires planning reconciliation before implementation.

## Acceptance audit

The acceptance rule is appropriately absolute for the bounded declared corpus:

- every valid control must be accepted;
- every invalid case must be rejected at its declared layer;
- every semantic case must expose required semantic issue code(s);
- every declared case must execute;
- no accepted invalid case may be hidden by an aggregate score.

No invented percentage threshold is used.

## Failure-governance audit

PASS. If an invalid case is accepted:

- T115 fails;
- the case remains unchanged;
- no `src/**` or schema repair occurs inside T115;
- exact failure evidence is recorded;
- a separate recovery planning/authorization chain is required.

This preserves measurement provenance and avoids test-to-green repair inside the measurement unit.

## Planning merge gate

Before this planning package may become canonical, require all of the following on its exact unchanged final head:

1. changed paths are only Spec 009 planning artifacts;
2. no `.planning-seed` or accidental file remains in the final diff;
3. no implementation/product/test/workflow/dependency/result mutation is present;
4. exact final head/tree and base-to-head scope are verified;
5. exact-head Self Verification succeeds where applicable;
6. exact-head Project CI succeeds across all required lanes on the qualifying attempt;
7. fresh independent substantive exact-head review covers correctness, governance, scope, YAGNI, validator layering, failure separation, and branch purity;
8. every material finding is reconciled on the final head;
9. zero unresolved material review threads remain;
10. live ruleset/protection truth is reverified;
11. canonical `main` remains the expected PR base immediately before merge;
12. merge is guarded by exact expected head SHA;
13. post-merge ordered parents, merge tree, GitHub signature, PR state, canonical main, and exact path delta are verified;
14. Issue #252 closes `SPEC_009_PLANNING = CLOSED_CANONICAL`;
15. implementation remains unauthorized until a separate authorization artifact is independently qualified and merged.

## Final audit decision

`FINAL_PLAN_AUDIT = PASS / READY_FOR_FRESH_INDEPENDENT_EXACT_HEAD_REVIEW`

`IMPLEMENTATION_AUTHORIZED = NO`
