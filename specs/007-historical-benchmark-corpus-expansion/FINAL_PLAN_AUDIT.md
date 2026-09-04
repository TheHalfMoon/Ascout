# Spec 007 Final Plan Audit — Historical Benchmark Corpus Expansion

**Spec:** 007  
**Date:** 2026-09-04  
**Canonical planning base:** `4900f246e19c25c399074672b626fa8df4b5312f`  
**Pre-audit planning head:** `4826ef86198b784889af47a38e63be23af8d9f70`  
**Pre-audit planning tree:** `c564e47cc1645c6f99bfbc4245c5cb0c70051349`  
**Independently audited head:** `0d880092d21072a785766feee2e25dcf0dfbaf68`  
**Independently audited tree:** `03bdd8652c0ab4facc401968dc8ae4b7b4354adc`  
**Independent review:** PR #156 comment `5541045921` by `coderabbitai[bot]`  
**Audit status:** `AUDIT_PASSED / FINAL_EXACT_HEAD_QUALIFICATION_REQUIRED`

## Independence boundary

The internal audit surface was written before external review and explicitly refused to self-claim independence.

CodeRabbit then independently evaluated exact head `0d880092d21072a785766feee2e25dcf0dfbaf68`, exact tree `03bdd8652c0ab4facc401968dc8ae4b7b4354adc`, and the complete 11-file Spec 007 planning package. In PR #156 comment `5541045921`, the reviewer reported:

- `Independent final plan audit: PASS` for that exact head;
- no material correctness finding;
- no material governance finding;
- no material evidence-integrity finding;
- no material security/hermeticity finding;
- no material portability/runtime finding;
- no material scope finding;
- no material cross-artifact inconsistency.

This repository-native recording mutates the planning head after the independent audit. Therefore the independent audit remains evidence about the exact audited content plus this mechanical recording step, while merge qualification now requires fresh Project CI and a second fresh independent exact-head cross-artifact consistency / branch-purity review on the resulting final head.

## A-01 — Successor authority and ordering

Spec 006 is canonically closed. The post-M1 roadmap places historical benchmark corpus expansion after self-verification and before selector-shadow or adversarial-receipt work. Spec 007 planning creates a new bounded Spec Kit chain and does not treat the roadmap as implementation authority.

**Finding:** PASS.

## A-02 — Measured problem is evidence-bound

The planning package states the current factual gap as a six-case selection corpus where T091 provides Ascout oracle-membership evidence for 3/6 cases and records 3/6 as unavailable, while full and runner-native related comparators are observable in 6/6. The package does not relabel unavailable evidence as selector failure.

**Finding:** PASS.

## A-03 — Scope minimality

The planned response is exactly two independently reviewed historical selection candidates: Jotai and Immer. No gap case, selector repair, product feature, receipt change, command-admission change, or universal recall threshold is introduced.

The ofetch candidate was rejected rather than admitting a live-network oracle or building new network/mocking infrastructure.

**Finding:** PASS.

## A-04 — Founding-history preservation

The founding `minimum_cases: 5` / `maximum_cases: 6` contract remains historical fact. Spec 007 proposes an additive successor manifest revision with selection maximum 8 while keeping minimum 5 and gap bounds 3–4. Historical T078/T091/T095 publications remain immutable.

**Finding:** PASS.

## A-05 — Case lifecycle and engine reuse

Current benchmark validation requires `CASE_REVIEWED` manifest input with no prior oracle observation. Current replay output may reach `BENCHMARK_ACTIVE`; current metrics consume replay evidence. Therefore the plan does not invent a new lifecycle state or schema.

Current metrics aggregate mode accepts repeated aggregate inputs. Legacy internal `T075` naming is not treated as a functional filename or six-case constraint.

**Finding:** PASS.

## A-06 — Jotai candidate planning sufficiency

The planning package binds the direct base/fix pair, production/test paths, stable package/lock/test-config identities, and MIT license identity. The regression delta has no observed live-network, credential, or hosted-service dependency.

Install, oracle execution, membership, deterministic repetition, exact byte SHA-256, and `BENCHMARK_ACTIVE` evidence remain explicitly deferred to authorized implementation-time replay.

**Finding:** PASS_FOR_PLANNING.

## A-07 — Immer candidate planning sufficiency

The planning package binds the direct base/fix pair, production/test paths, stable root package/lock/Vitest config identities, and MIT license identity. The ES2025 Iterator requirement is treated as a material runtime gate rather than assumed satisfied.

No polyfill or source/test weakening is permitted merely to make the candidate qualify.

**Finding:** PASS_FOR_PLANNING_WITH_RUNTIME_GATE.

## A-08 — Anti-leakage and hermeticity

All planning artifacts require the measured reconstructed source to contain the production fix while withholding the regression-test delta. The oracle remains independent evidence. Live network, credentials, hosted services, or undeclared mutable state cause fail-closed rejection.

**Finding:** PASS.

## A-09 — Evidence honesty

Planning does not claim donor installation, build, test execution, oracle success, comparator membership, determinism, or benchmark activation. Observed future comparator outcomes remain exactly `hit | miss | unavailable`, and a miss/unavailable result may be published without product mutation inside Spec 007.

**Finding:** PASS.

## A-10 — Task decomposition and dependency order

The canonical task order is:

`T110 -> T111 -> T112 -> T113 -> T114`

- T110 freezes only the successor manifest/policy case definitions;
- T111 qualifies Jotai after canonical T110 closeout;
- T112 qualifies Immer after canonical T111 closeout;
- T113 publishes only after both candidates qualify;
- T114 reconciles closeout after canonical T113 closeout.

A qualification failure returns to planning rather than broadening authority.

**Finding:** PASS.

## A-11 — Repository mutation bounds

Default implementation mutation surfaces are limited to:

T110:
- `benchmarks/README.md`
- `benchmarks/manifest.json`

T113:
- `benchmarks/results/t113-historical-corpus-expansion.json`

T111/T112 are repository-mutation-free by default; T114 is ledger/governance only by default. No benchmark script/test/product path is pre-authorized. A proven need to widen these surfaces requires an authority amendment before mutation.

**Finding:** PASS.

## A-12 — Exact-byte and runtime deferrals

The plan correctly refuses to substitute Git blob SHA-1 identities for manifest-required byte SHA-256 values. Exact byte digests and exact runtime/package-manager versions must be reverified during authorized T110/T111/T112 work.

**Finding:** PASS / DEFERRED_CORRECTLY.

## A-13 — Governance and merge discipline

Planning remains non-authoritative. A separate durable implementation authorization must bind the exact canonical planning merge before T110 begins.

Every repository-mutating unit requires exact-head six-lane Project CI, fresh independent substantive review, zero unresolved material findings/threads, `behind_by=0`, canonical merge base, guarded expected-head merge, and post-merge ordered-parent/tree/signature/PR/main verification.

Any head mutation invalidates earlier exact-head CI/review evidence.

**Finding:** PASS.

## A-14 — Audited-head branch purity

Against canonical base `4900f246e19c25c399074672b626fa8df4b5312f`, independently audited head `0d880092d21072a785766feee2e25dcf0dfbaf68` was observed as:

- status: `ahead`;
- `ahead_by=12`;
- `behind_by=0`;
- merge base exactly canonical base;
- exactly 11 changed files;
- every changed file added under `specs/007-historical-benchmark-corpus-expansion/**`;
- zero deletions;
- no product, benchmark implementation, workflow, dependency, historical result, or release mutation.

The current head after recording the external audit must be freshly rechecked before merge.

**Finding:** PASS_FOR_AUDITED_HEAD / FINAL_HEAD_REFRESH_REQUIRED.

## A-15 — Cross-artifact consistency

The current spec, clarifications, YAGNI reviews, plan, tasks, candidate review, requirements checklist, and analysis consistently require:

- exactly two candidates;
- both candidates must qualify before T113;
- rejection of either candidate means `NO_GO / RETURN_TO_PLANNING` for this two-case expansion;
- historical result immutability;
- no score target;
- no selector/product mutation;
- no implementation authority from planning merge alone.

The prior acceptance ambiguity that could be read as permitting `GO` after candidate rejection was repaired before the independent audit.

**Finding:** PASS.

## Audit conclusion

`SPEC_007_FINAL_PLAN_AUDIT = AUDIT_PASSED`

Independent audited head: `0d880092d21072a785766feee2e25dcf0dfbaf68`  
Independent audited tree: `03bdd8652c0ab4facc401968dc8ae4b7b4354adc`  
Independent review evidence: PR #156 comment `5541045921`  
Independent material findings: `0`

Planning is **not yet merge-qualified** because this recording commit creates a new exact head. Required final gates:

1. reverify the resulting head/tree and planning-path purity;
2. fresh six-lane Project CI on that exact head;
3. fresh independent exact-head cross-artifact consistency and branch-purity review;
4. zero unresolved material review threads;
5. unchanged canonical predecessor / `behind_by=0` / mergeability and live ruleset checks;
6. guarded expected-head planning merge and post-merge verification.
