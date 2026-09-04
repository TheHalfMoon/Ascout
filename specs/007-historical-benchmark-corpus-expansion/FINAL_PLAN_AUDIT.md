# Spec 007 Final Plan Audit — Historical Benchmark Corpus Expansion

**Spec:** 007  
**Date:** 2026-09-04  
**Canonical planning base:** `4900f246e19c25c399074672b626fa8df4b5312f`  
**Pre-audit planning head:** `4826ef86198b784889af47a38e63be23af8d9f70`  
**Pre-audit planning tree:** `c564e47cc1645c6f99bfbc4245c5cb0c70051349`  
**Audit status:** `INTERNAL_AUDIT_COMPLETE / INDEPENDENT_CONFIRMATION_PENDING`

## Independence boundary

This repository artifact records the final plan-audit surface and the repository-native facts established before external review. It does **not** self-claim independent review.

`AUDIT_PASSED` may be recorded only after an external independent reviewer evaluates the exact planning head that contains this file and reports no material planning defect. After that external result is recorded, any resulting head mutation requires a second fresh exact-head cross-artifact consistency and branch-purity review before merge.

## A-01 — Successor authority and ordering

Spec 006 is canonically closed. The post-M1 roadmap places historical benchmark corpus expansion after self-verification and before selector-shadow or adversarial-receipt work. Spec 007 planning creates a new bounded Spec Kit chain and does not treat the roadmap as implementation authority.

**Internal finding:** PASS.

## A-02 — Measured problem is evidence-bound

The planning package states the current factual gap as a six-case selection corpus where T091 provides Ascout oracle-membership evidence for 3/6 cases and records 3/6 as unavailable, while full and runner-native related comparators are observable in 6/6. The package does not relabel unavailable evidence as selector failure.

**Internal finding:** PASS.

## A-03 — Scope minimality

The planned response is exactly two independently reviewed historical selection candidates: Jotai and Immer. No gap case, selector repair, product feature, receipt change, command-admission change, or universal recall threshold is introduced.

The ofetch candidate was rejected rather than admitting a live-network oracle or building new network/mocking infrastructure.

**Internal finding:** PASS.

## A-04 — Founding-history preservation

The founding `minimum_cases: 5` / `maximum_cases: 6` contract remains historical fact. Spec 007 proposes an additive successor manifest revision with selection maximum 8 while keeping minimum 5 and gap bounds 3–4. Historical T078/T091/T095 publications remain immutable.

**Internal finding:** PASS.

## A-05 — Case lifecycle and engine reuse

Current benchmark validation requires `CASE_REVIEWED` manifest input with no prior oracle observation. Current replay output may reach `BENCHMARK_ACTIVE`; current metrics consume replay evidence. Therefore the plan does not invent a new lifecycle state or schema.

Current metrics aggregate mode accepts repeated aggregate inputs. Legacy internal `T075` naming is not treated as a functional filename or six-case constraint.

**Internal finding:** PASS.

## A-06 — Jotai candidate planning sufficiency

The planning package binds the direct base/fix pair, production/test paths, stable package/lock/test-config identities, and MIT license identity. The regression delta has no observed live-network, credential, or hosted-service dependency.

Install, oracle execution, membership, deterministic repetition, exact byte SHA-256, and `BENCHMARK_ACTIVE` evidence remain explicitly deferred to authorized implementation-time replay.

**Internal finding:** PASS_FOR_PLANNING.

## A-07 — Immer candidate planning sufficiency

The planning package binds the direct base/fix pair, production/test paths, stable root package/lock/Vitest config identities, and MIT license identity. The ES2025 Iterator requirement is treated as a material runtime gate rather than assumed satisfied.

No polyfill or source/test weakening is permitted merely to make the candidate qualify.

**Internal finding:** PASS_FOR_PLANNING_WITH_RUNTIME_GATE.

## A-08 — Anti-leakage and hermeticity

All planning artifacts require the measured reconstructed source to contain the production fix while withholding the regression-test delta. The oracle remains independent evidence. Live network, credentials, hosted services, or undeclared mutable state cause fail-closed rejection.

**Internal finding:** PASS.

## A-09 — Evidence honesty

Planning does not claim donor installation, build, test execution, oracle success, comparator membership, determinism, or benchmark activation. Observed future comparator outcomes remain exactly `hit | miss | unavailable`, and a miss/unavailable result may be published without product mutation inside Spec 007.

**Internal finding:** PASS.

## A-10 — Task decomposition and dependency order

The canonical task order is:

`T110 -> T111 -> T112 -> T113 -> T114`

- T110 freezes only the successor manifest/policy case definitions;
- T111 qualifies Jotai after canonical T110 closeout;
- T112 qualifies Immer after canonical T111 closeout;
- T113 publishes only after both candidates qualify;
- T114 reconciles closeout after canonical T113 closeout.

A qualification failure returns to planning rather than broadening authority.

**Internal finding:** PASS.

## A-11 — Repository mutation bounds

Default implementation mutation surfaces are limited to:

T110:
- `benchmarks/README.md`
- `benchmarks/manifest.json`

T113:
- `benchmarks/results/t113-historical-corpus-expansion.json`

T111/T112 are repository-mutation-free by default; T114 is ledger/governance only by default. No benchmark script/test/product path is pre-authorized. A proven need to widen these surfaces requires an authority amendment before mutation.

**Internal finding:** PASS.

## A-12 — Exact-byte and runtime deferrals

The plan correctly refuses to substitute Git blob SHA-1 identities for manifest-required byte SHA-256 values. Exact byte digests and exact runtime/package-manager versions must be reverified during authorized T110/T111/T112 work.

**Internal finding:** PASS / DEFERRED_CORRECTLY.

## A-13 — Governance and merge discipline

Planning remains non-authoritative. A separate durable implementation authorization must bind the exact canonical planning merge before T110 begins.

Every repository-mutating unit requires exact-head six-lane Project CI, fresh independent substantive review, zero unresolved material findings/threads, `behind_by=0`, canonical merge base, guarded expected-head merge, and post-merge ordered-parent/tree/signature/PR/main verification.

Any head mutation invalidates earlier exact-head CI/review evidence.

**Internal finding:** PASS.

## A-14 — Pre-audit branch purity

Against canonical base `4900f246e19c25c399074672b626fa8df4b5312f`, pre-audit head `4826ef86198b784889af47a38e63be23af8d9f70` was observed as:

- status: `ahead`;
- `ahead_by=11`;
- `behind_by=0`;
- merge base exactly canonical base;
- exactly 10 changed files;
- every changed file added under `specs/007-historical-benchmark-corpus-expansion/**`;
- zero deletions;
- no product, benchmark implementation, workflow, dependency, historical result, or release mutation.

This file itself becomes the eleventh planning path and therefore requires a fresh exact-head purity comparison after commit.

**Internal finding:** PASS_PENDING_EXACT_HEAD_REFRESH.

## A-15 — Cross-artifact consistency

The current spec, clarifications, YAGNI reviews, plan, tasks, candidate review, requirements checklist, and analysis consistently require:

- exactly two candidates;
- both candidates must qualify before T113;
- rejection of either candidate means `NO_GO / RETURN_TO_PLANNING` for this two-case expansion;
- historical result immutability;
- no score target;
- no selector/product mutation;
- no implementation authority from planning merge alone.

The prior acceptance ambiguity that could be read as permitting `GO` after candidate rejection was repaired before this audit.

**Internal finding:** PASS.

## Internal audit conclusion

`SPEC_007_INTERNAL_FINAL_PLAN_AUDIT = PASS`

Unresolved internal material findings: `0`.

This is **not** the independent-audit gate. Required next evidence:

1. fresh exact-head Project CI for the head containing this audit file;
2. external independent substantive review explicitly acting as the Spec 007 final plan audit;
3. if that review is clean, repository-native recording of the external audit identity/result;
4. fresh exact-head cross-artifact consistency and branch-purity review after any recording mutation;
5. guarded planning merge only after all exact-head gates are simultaneously satisfied.
