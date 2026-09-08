# Specification 009 — Final Plan Audit

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Audit role

This repository-side audit checks the complete Spec 009 planning package after reconciliation of the latest independent exact-head review. It does not substitute for a fresh independent substantive review of the new final head.

## Canonical planning input

Planning began from:

- canonical `main`: `fb6bb2ec152e41da05901509b0b62d1eb3636648`;
- canonical base tree: `f2a7331aaac4108375979afda3d706f9aa2e0fd7`;
- planning ledger: Issue #252.

Spec 007 was already terminal under the current specification and remains isolated from Spec 009.

## Exact frozen planning contract

`CASE_REGISTRY.md` freezes `SPEC009-CASE-REGISTRY-V1`:

- valid controls: `2`;
- invalid cases: `44`;
- schema invalid cases: `8`;
- semantic invalid cases: `36`;
- total declared executions: `46`.

The registry also freezes:

- the control identity/state anchors used by candidate construction;
- the source control for every invalid case;
- every permitted assignment/addition/removal for every invalid case;
- the expected rejection layer;
- required semantic issue codes.

For each case, implementation must deep-copy the named source control, apply exactly the listed operations, and leave every unlisted field unchanged. No compensating bookkeeping, normalization, equivalent mutation, alternate candidate, or fallback construction is authorized.

If the exact frozen candidate cannot reach its declared validator boundary on the then-canonical implementation base, T115 stops and returns to planning.

## Exact implementation boundary

The only planned T115 tracked implementation path is:

- `tests/receipt-adversarial-corpus.contract.test.ts`

No second helper/fixture path, product path, schema path, workflow, dependency, benchmark-result path, release surface, or Spec 007 evidence surface is authorized.

## Workflow audit

### 1. Constitution and governance alignment

PASS. The package strengthens Evidence Before Claims, No Green by Omission, Source-Bound Truth, Explicit Authority, Native Capability Before Invention, bounded execution, and benchmark-gated growth.

### 2. Feature specification

PASS. `spec.md` binds exact control/candidate construction, exact accounting, exact one-path scope, failure separation, and non-goals without granting implementation authority.

### 3. Clarifications

PASS. `clarifications.md` removes implementation-time bookkeeping discretion, defines exact frozen candidate handling, preserves validator layering, and states the separate authorization gate.

### 4. First Ponytail / YAGNI review

PASS. `ponytail-review.md` now reflects the final exact contract rather than its earlier preliminary design. It requires `2 / 44 / 8 / 36 / 46`, both controls, and one tracked T115 path with no conditional helper authority.

### 5. Technical plan

PASS. `plan.md` reuses exact current validators and binds the runner to exact source controls and exact candidate assignments from the registry.

### 6. Second Ponytail / YAGNI review

PASS. `plan-ponytail-review.md` preserves one tracked implementation path and no result-publication task.

### 7. Exact adversarial registry

PASS. Every case has a stable ID, exact source control, exact candidate construction, expected layer, and required semantic issue code(s) where applicable. All unlisted fields are frozen unchanged.

### 8. Tasks

PASS. `tasks.md` contains only dependency-ordered `T115 -> T116`, binds T115 to exact candidate construction, and prohibits product repair or registry/candidate substitution inside T115.

### 9. Requirements checklist

PASS. Existing checklist requirements remain satisfied. The exact candidate-construction freeze strengthens stable identity, complete accounting, one-path YAGNI, and no-green-by-omission requirements.

### 10. Cross-artifact analysis

PASS. `analysis.md` records and reconciles the latest independent findings, confirms exact candidate construction, and finds no remaining material contradiction after reconciliation.

### 11. Supply-chain review

PASS. No new external source, dependency, service, dataset, model, or license obligation is introduced.

## Independent exact-head review reconciliation

CodeRabbit completed a fresh substantive review of former candidate head:

`fcba20f4a037b81ff15bb5e31b74f5ec999d3575`

The review identified two material findings.

### F1 — Candidate construction remained discretionary

The former registry allowed implementation-selected bookkeeping through general wording such as `strictly necessary`, `if needed`, and `or otherwise violate`.

Reconciliation now incorporated into the planning package:

- removed the general bookkeeping allowance;
- froze control identity/state anchors used by candidate construction;
- froze the source control for every invalid case;
- froze exact assignments/additions/removals for every case;
- required all unlisted fields to remain unchanged;
- replaced alternative construction wording with one exact construction;
- froze compound compensation explicitly where required;
- made inability to reach the frozen boundary a stop-and-return-to-planning condition.

`F1 = RECONCILED_PROSPECTIVELY`

### F2 — Preliminary Ponytail statements contradicted the final contract

The former Ponytail review retained an approximate case count, conditional second control, and possible second helper path.

Reconciliation now incorporated into the planning package:

- exact `2 / 44 / 8 / 36 / 46` accounting;
- both controls mandatory;
- exactly one tracked T115 implementation path;
- explicit supersession of preliminary count/control/path wording;
- no conditional helper authority.

`F2 = RECONCILED_PROSPECTIVELY`

The review of `fcba20f4...` does not qualify any later head. A new fresh independent substantive exact-head review is mandatory after this reconciliation commit.

## Acceptance audit

For future authorized T115 GO, focused evidence must prove exactly:

- registry version = `SPEC009-CASE-REGISTRY-V1`;
- valid controls = `2` and both pass schema + semantic validation;
- invalid cases = `44` and all execute exactly once;
- schema invalid cases = `8` and all fail schema validation;
- semantic invalid cases = `36`, all pass schema first, then fail semantic validation;
- every semantic case observes every required semantic issue code;
- total declared/executed count = `46`;
- accepted invalid case IDs = `[]`;
- skipped/unexecuted case IDs = `[]`;
- undeclared qualification case IDs = `[]`;
- candidate-construction deviations = `[]`.

No aggregate percentage or partial pass may substitute for exact accounting.

## Failure-governance audit

PASS.

If an invalid case is accepted:

`T115 = NO_GO / PRODUCT_GAP_DISCOVERED`

If a frozen candidate cannot reach its declared boundary, or a frozen layer/code/candidate is factually wrong:

`T115 = NO_GO / RETURN_TO_PLANNING`

In either case:

- preserve the observed evidence;
- do not change `src/**` or schema;
- do not substitute candidate construction;
- do not weaken expected layer/code;
- return to separately reviewed planning/authorization.

## Prior non-qualifying CI/review evidence

Earlier planning heads and their CI/review evidence remain historical only. In particular:

- head `89e19c00f01274e9440dbd1cb154440fb963fa89` had a non-qualifying original Project CI attempt with a Windows/Node 24 timeout failure;
- head `fcba20f4a037b81ff15bb5e31b74f5ec999d3575` received the substantive review that produced F1/F2 and therefore cannot be merged unchanged as qualified planning.

No rerun-to-green or stale-review substitution is permitted.

## Planning merge gate

Before this planning package may become canonical, require all of the following on the exact unchanged post-reconciliation final head:

1. base remains canonical `fb6bb2ec152e41da05901509b0b62d1eb3636648` unless live canonical governance legitimately advances first;
2. base-to-head diff contains only Spec 009 planning artifacts;
3. no `.planning-seed` or implementation/product/test/workflow/dependency/result mutation remains;
4. exact frozen registry/accounting/candidate-construction contract is present;
5. Self Verification succeeds on the exact final head where applicable;
6. Project CI succeeds across every required OS/Node lane on the original qualifying attempt for that exact final head;
7. fresh independent substantive exact-head review covers registry completeness, candidate construction, layer/code accuracy, governance, YAGNI, failure separation, Spec 007 isolation, and branch purity;
8. every material finding is reconciled on that same final head;
9. zero unresolved material review threads remain;
10. live ruleset and observable branch-protection truth are reverified;
11. canonical `main` and exact PR head are unchanged immediately before merge;
12. guarded normal merge uses the exact expected head SHA;
13. post-merge ordered parents, merge tree, GitHub signature, PR state, canonical main, and exact canonical path delta are verified;
14. Issue #252 closes `SPEC_009_PLANNING = CLOSED_CANONICAL`;
15. implementation remains unauthorized until a separate `IMPLEMENTATION_AUTHORIZATION.md` is independently qualified, guarded-merged, and post-merge verified.

## Final audit decision

`FINAL_PLAN_AUDIT = PASS / F1_F2_RECONCILED / READY_FOR_FRESH_FINAL_HEAD_QUALIFICATION`

`REGISTRY = SPEC009-CASE-REGISTRY-V1 / EXACT_CANDIDATES_FROZEN`

`IMPLEMENTATION_AUTHORIZED = NO`
