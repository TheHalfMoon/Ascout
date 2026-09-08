# Specification 009 — Final Plan Audit

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Audit role

This repository-side audit checks the complete Spec 009 planning package after reconciliation of all independent material findings observed through former exact candidate `e89da2dcd704893527829c9f61eddad0638b1285` and the later repository-side complete-baseline wording consistency correction. It does not substitute for fresh independent review of the successor final head.

## Planning input and live qualification base

- planning inception base: `fb6bb2ec152e41da05901509b0b62d1eb3636648`
- planning inception-base tree: `f2a7331aaac4108375979afda3d706f9aa2e0fd7`
- live qualification base: `9093ee06c45234d1dee0fbe30d3a0d8fd415fe6f`
- live qualification-base tree: `79b10c40d72e464c58e8afc52386f27a515fd584`
- planning ledger: Issue #252

The inception base records where Spec 009 planning began. The live qualification base is the authoritative base for final branch-purity, CI, review, and merge qualification after canonical CI repair #254/#255.

Spec 007 remains terminal and isolated.

## Exact frozen planning contract

`CASE_REGISTRY.md` freezes `SPEC009-CASE-REGISTRY-V1`:

- valid controls: `2`
- invalid cases: `44`
- schema invalid cases: `8`
- semantic invalid cases: `36`
- total declared executions: `46`

The registry freezes complete baseline truth, not selected anchors:

1. `control-valid-line-receipt` is one complete exact JSON Receipt v1 value with every run, source, comparison, selection, task, changed-code, exercise, test-change, finding, evidence, artifact, stability, and summary field fixed.
2. `control-valid-branch-receipt` is exactly that line control plus five specified branch-group properties and exactly two canonically ordered branch records.
3. Both controls must pass exact schema and semantic validators unchanged before invalid cases execute.
4. Every invalid case binds an exact source control and exact assignments/additions/removals.
5. Every unlisted candidate field remains unchanged.
6. No baseline literal, bookkeeping operation, alternate candidate, fallback mutation, normalization, or equivalent construction may be implementation-selected.

If a frozen control is rejected or an exact candidate cannot reach its frozen boundary on the then-canonical implementation base, T115 stops and returns to planning.

## Exact implementation boundary

Only one tracked T115 implementation path is planned:

`tests/receipt-adversarial-corpus.contract.test.ts`

No second helper/fixture path, product/schema/workflow/dependency/result/release/Spec007 evidence path is authorized.

## Workflow audit

### Constitution and governance

PASS. Evidence Before Claims, No Green by Omission, Source-Bound Truth, Explicit Authority, Native Capability Before Invention, bounded execution, and benchmark-gated growth are preserved.

### Specification and clarification

PASS. `spec.md` and `clarifications.md` bind both complete frozen controls and the registry as planning authority, preserve schema-first semantic evaluation, reject product repair during measurement, and require separate implementation authorization.

### YAGNI reviews

PASS. Both Ponytail reviews converge on one test path, no new dependency/workflow/product API/result publication, exact corpus accounting, and no generalized mutation framework.

### Technical plan

PASS. `plan.md` reuses exact current validators, requires both complete registry-frozen control JSON values with no implementation-selected baseline literal, and requires exact registry-frozen candidates.

### Exact registry

PASS subject to fresh independent final-head verification. Controls and candidate operations are fully specified before implementation authorization.

### Tasks

PASS. Only `T115 -> T116` is planned. T115 is measurement-only; T116 is reconciliation/next-frontier governance. T115 explicitly requires exact frozen-control fidelity and `baseline-control deviations = []`.

### Supply chain

PASS. No new external dependency, service, dataset, model, network, or license obligation is planned.

## Independent review reconciliation

### F1 — Candidate construction discretion

Former exact head `fcba20f4a037b81ff15bb5e31b74f5ec999d3575` allowed general bookkeeping and alternative mutation construction.

Reconciled through exact per-case operations and a strict unlisted-fields-unchanged rule.

`F1 = RECONCILED_PROSPECTIVELY`

### F2 — Stale Ponytail preliminary contract

The same former head retained approximate-count, conditional-control, and helper-path language.

Reconciled to exact `2 / 44 / 8 / 36 / 46` accounting, both controls mandatory, and one tracked T115 path only.

`F2 = RECONCILED_PROSPECTIVELY`

### F3 — Baseline control construction discretion

Fresh CodeRabbit review of exact head `e89da2dcd704893527829c9f61eddad0638b1285` found that the registry still specified only selected control anchors while allowing all other required fields to be implementation-chosen deterministic literals. Because 41 invalid cases sourced the line control and branch control derived from it, exact candidate identity remained incomplete.

Reconciliation incorporated:

- the complete line-control JSON value is frozen field-by-field;
- exact `ascout_version`, config digest, source state, Git/tree identities, selection mode/pass, task authorization/argv/tool/cache/runtime fields, evidence SHA-256 values, exercise, and summary are all explicit;
- no unspecified required field remains;
- the branch control is exactly the line control plus five exact branch properties only;
- both frozen controls must pass both validators unchanged;
- control rejection is a stop-and-return-to-planning condition;
- GO accounting requires `baseline-control deviations = []`.

`F3 = RECONCILED_PROSPECTIVELY`

No prior review qualifies a successor head.

## Repository-side consistency correction

A repository-side re-audit of candidate `16dcb57b9e75520f8dfce9a6f80b9e150920d3e7` found that four planning artifacts retained stale anchor-era wording even though `CASE_REGISTRY.md`, `analysis.md`, and this audit had already frozen complete controls. In particular, `plan.md` still allowed `all other required fields` to use deterministic literals, and related artifacts still referred to selected `control anchors`.

Commit `05283f42fad23cbc2c49021395ba712d54f800a8` corrects exactly:

- `spec.md`;
- `plan.md`;
- `tasks.md`;
- `clarifications.md`.

Those artifacts now uniformly require the two complete frozen control JSON values, prohibit implementation-selected baseline literals or alternate baselines, require frozen-control rejection to return to planning, and include baseline-control fidelity in GO accounting.

This was a repository-side self-audit finding, not independent review evidence. Therefore all CI/review from `16dcb57b...` is stale for final qualification and a new independent exact-head review remains mandatory.

`INTERNAL_COMPLETE_BASELINE_WORDING_CORRECTION = RECONCILED_PROSPECTIVELY / REQUIRES_FRESH_FINAL_HEAD_QUALIFICATION`

## Acceptance audit

Future authorized T115 GO must prove exactly:

```text
registry_version = SPEC009-CASE-REGISTRY-V1
valid_control_count = 2
invalid_case_count = 44
schema_case_count = 8
semantic_case_count = 36
total_declared_execution_count = 46
total_executed_count = 46
accepted_invalid_case_ids = []
skipped_or_unexecuted_case_ids = []
undeclared_qualification_case_ids = []
baseline_control_deviations = []
```

Additionally:

- both exact frozen controls pass schema + semantic validation unchanged;
- all 8 schema cases fail schema validation;
- all 36 semantic cases pass schema first and fail semantic validation;
- every required semantic issue code is observed.

No percentage threshold or partial execution may substitute.

## Failure-governance audit

If an invalid case is accepted:

`T115 = NO_GO / PRODUCT_GAP_DISCOVERED`

If a frozen control is rejected, exact candidate is unreachable at its declared boundary, or a frozen candidate/layer/code is factually wrong:

`T115 = NO_GO / RETURN_TO_PLANNING`

T115 must preserve observed evidence and must not repair `src/**`, schema, baseline controls, candidate construction, layers, or required codes.

## Prior evidence handling

All CI/review evidence on earlier planning heads is historical only. No stale CI/review, rerun-to-green, provider summary, provider availability message, or self-audit may qualify the successor final head.

## Planning merge gate

Before planning may merge, require on the exact unchanged successor final head:

1. canonical live qualification base still equals the expected live `main`;
2. diff contains only Spec 009 planning artifacts;
3. no seed/implementation/product/test/workflow/dependency/result/release mutation;
4. complete frozen controls, exact registry/accounting, and exact candidate construction are present consistently across all controlling artifacts;
5. Self Verification success where applicable;
6. Project CI original attempt succeeds on all six required OS/Node lanes;
7. fresh independent substantive exact-head review covers complete controls, candidate reachability, layer/code correctness, governance, YAGNI, failure separation, Spec 007 isolation, and branch purity;
8. every material finding is reconciled on that same final head;
9. zero unresolved material review threads;
10. live ruleset and observable branch-protection truth reverified;
11. canonical `main` and PR head unchanged immediately before merge;
12. guarded normal merge with exact expected head SHA;
13. post-merge ordered-parent/tree/signature/PR/main/path proof;
14. Issue #252 closes `SPEC_009_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`;
15. implementation remains unauthorized until a separate `IMPLEMENTATION_AUTHORIZATION.md` is independently qualified, guarded-merged, post-merge verified, and its ledger closes effective.

## Final audit decision

`FINAL_PLAN_AUDIT = PASS / F1_F2_F3_AND_INTERNAL_BASELINE_WORDING_RECONCILED / READY_FOR_FRESH_FINAL_HEAD_QUALIFICATION`

`REGISTRY = SPEC009-CASE-REGISTRY-V1 / COMPLETE_CONTROLS_AND_EXACT_CANDIDATES_FROZEN`

`IMPLEMENTATION_AUTHORIZED = NO`
