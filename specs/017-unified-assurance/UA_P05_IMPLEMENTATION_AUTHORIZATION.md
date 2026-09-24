# UA-P05 Implementation Authorization — Unified Test Profile

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #542
**Authorization base:** `697a29ef8b188bf55aacaa98f7da0c03d6ac5654`
**Phase:** `UA-P05 — Unified Test profile`

## 1. Purpose

This artifact defines the only implementation authority that may make UA-P05 product-source mutations after it becomes canonically effective.

It is authorization-only. This artifact does not implement UA-P05 and grants no source mutation authority merely by existing on a branch or pull request.

```text
UA_P05_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P05_IMPLEMENTATION_AUTHORIZED = NO
UA_P05_CONSTITUTION_AMENDMENT = PROPOSED / NOT_RATIFIED
ASCOUT_PROJECT_COMPLETE = NO
```

Founder direction recorded in the session authorizes creation, review, qualification, and canonical admission of this bounded governance proposal. It does not pre-authorize implementation before this artifact becomes EFFECTIVE.

## 2. Canonical predecessors

At this authorization base:

```text
CANONICAL_MAIN = 697a29ef8b188bf55aacaa98f7da0c03d6ac5654
PR_541_MERGE = 697a29ef8b188bf55aacaa98f7da0c03d6ac5654
UA_P04 = CLOSED_CANONICAL / COMPLETE
UA_P03 = CLOSED_CANONICAL / COMPLETE
UA_P02_ENGINE_REGISTRY_AND_PLANNER = CLOSED_CANONICAL / COMPLETE
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
CONSTITUTION_VERSION = 1.1.0 (Amendment A04 ratified for workflow and publication)
UA_P05_IMPLEMENTATION_AUTHORIZED = NO
OPEN_PR_359 = UNRELATED / MUST_NOT_BE_USED_AS_AUTHORITY
PR_535 = CLOSED / DISQUALIFIED / UNMERGED (preserved Windows timing negative evidence)
```

No UA-P05 task has started. No test-profile capability exists beyond the M1 `ascout check` core.

## 3. Constitution compatibility review and bounded amendment

### 3.1 Classification

The P0 canonicalization matrix classifies UA-P05 as:

```text
UA-P05 = CONSTITUTION_AMENDMENT_REQUIRED
```

Reason: UA-P05 expands into verification classes explicitly outside M1, including mutation, property, fuzz, performance, API, and browser-related orchestration.

This review confirms that classification. UA-P05 cannot proceed as compatible without a bounded amendment because M1 Principle V requires a minimal core and the M1 wedge excludes mutation, property, fuzz, DAST, load, accessibility, and performance verification as first-class surfaces.

### 3.2 What is preserved

```text
PRINCIPLE_I_EVIDENCE_BEFORE_CLAIMS = PRESERVED
PRINCIPLE_II_NO_GREEN_BY_OMISSION = PRESERVED
PRINCIPLE_III_SOURCE_BOUND_TRUTH = PRESERVED
PRINCIPLE_IV_TRUST_BOUNDARY_CORE = PRESERVED (core check remains local and keyless)
PRINCIPLE_V_MINIMAL_CORE = EXTENDED_ONLY_BY_THIS_DELTA (no new mandatory runtime)
PRINCIPLE_VI_CONSERVATIVE_VERIFICATION = PRESERVED
PRINCIPLE_VII_PRIVACY_AND_BOUNDS = PRESERVED
PRINCIPLE_VIII_PROVENANCE_AND_LICENSE = PRESERVED
M1_RECEIPT_CONTRACT = PRESERVED
AMENDMENT_A04_WORKFLOW_AND_PUBLICATION = PRESERVED
```

A test PASS never becomes a broader assurance PASS. Omitted test classes remain visible. `ascout check` semantics are unchanged.

### 3.3 Bounded delta (ratification candidate v1.1.0 to v1.2.0)

Upon effectiveness of this authorization, the following delta is ratified as Constitution v1.2.0. The mechanical application to `.specify/memory/constitution.md` must land on canonical main before any UA-P05-T01 implementation branch is created.

```text
AMENDMENT_ID = A05
AMENDMENT_SCOPE = UA-P05 unified test effects only
VERSION_CHANGE = 1.1.0 -> 1.2.0
```

Amendment text to be appended as a bounded subsection titled `Amendment A05 — Unified Test profile`:

1. Ascout may orchestrate deterministic testing as a first-class Test profile with QUICK, STANDARD, DEEP, and RELEASE policies, adapter-first, with budgets and predicted effect classes visible in the plan.
2. The existing check and test selection and execution behavior is preserved with PASS, FAIL, FLAKY, BLOCKED, ERROR, and NOT_RUN semantics unchanged. Affected scope that cannot be narrowed safely must widen visibly.
3. Unified Coverage and Omission projection must keep test selection, execution, changed-code exercise, deselection accounting, and unknown limitations visible. Deselected tests must not be presented as passed.
4. External runner, contract, schema, property, fuzz, mutation, performance, and recovery outputs are normalized as observations. They never self-attest and never override missing or failed mandatory evidence.
5. Property, fuzz, mutation, performance, and recovery adapters are admitted only when qualified with explicit counterexamples, effect requirements, attempted, killed, and survived accounting, and budget enforcement. Unsupported scope yields explicit omission, never clean PASS.
6. P016 browser evidence projection reuses IntentTest, oracle, and journey truth without inventing new browser authority. No hidden mock substitution is permitted.
7. Failure Intelligence observations (reproduced, contradictory, flaky, environment failure, harness failure, product regression, unknown) remain observations. Root-cause probabilities are never canonical facts. Environment and harness failure remain distinguishable from product PASS. Retry success never erases the original failure.
8. An additive `ascout test` command may exist. `ascout check` remains unchanged and `ascout test` is additive only.
9. All local-zero-cost gates remain enforced: zero operator runtime cost, offline core, no mandatory Ascout backend, no silent paid fallback, telemetry off by default, local artifact retention by default, explicit data egress, optional engine absence explicit, entitlement truth independence, model source and weight provenance, donor permission and notice, and clean-machine local execution.
10. No mandatory network, account, key, provider, daemon, server, database, or paid fallback is introduced for any core claim. Missing capability remains explicit NOT_RUN or INCOMPLETE.

No other Constitution text changes. Any future phase needing broader effects requires its own amendment.

### 3.4 Ratification mechanics

```text
CONSTITUTION_CHANGE_IN_THIS_PR = NO
MECHANICAL_APPLICATION_PR_REQUIRED_BEFORE_T01 = YES
MECHANICAL_APPLICATION_SCOPE = .specify/memory/constitution.md exact section-3.3 text plus version 1.2.0 only
T01_START_BLOCKED_UNTIL = this authorization EFFECTIVE and constitution v1.2.0 on canonical main
```

## 4. Authorized task set after effectiveness

Exactly:

```text
UA-P05-T01
UA-P05-T02
UA-P05-T03
UA-P05-T04
UA-P05-T05
UA-P05-T06
UA-P05-T07
UA-P05-T08
UA-P05-T09
UA-P05-T10
UA-P05-T11
UA-P05-T12
```

No UA-P06 or later implementation is authorized by implication.

One task, one branch, one PR remains mandatory.

## 5. Task definitions

| Task | Deliverable | Acceptance boundary |
|---|---|---|
| UA-P05-T01 | Test profile policy | QUICK, STANDARD, DEEP, RELEASE semantics with budgets and effect classes visible |
| UA-P05-T02 | Existing check adapter | Preserved task status and receipt semantics around current verification |
| UA-P05-T03 | Unified test Coverage projection | Test selection, execution, and changed exercise visible with deselection accounting |
| UA-P05-T04 | P016 browser evidence projection | Reused IntentTest, oracle, and journey truth with no hidden mock substitution |
| UA-P05-T05 | Contract and schema adapter boundary | External runner outputs normalized as observations only |
| UA-P05-T06 | Property and fuzz adapter contract | Counterexamples and effect requirements explicit |
| UA-P05-T07 | Mutation adapter contract | Attempted, killed, and survived visible |
| UA-P05-T08 | Performance and recovery adapter contracts | No generic PASS from omitted classes; budgets enforced |
| UA-P05-T09 | `ascout test` CLI | Additive only; `ascout check` unchanged |
| UA-P05-T10 | Test benchmark v1 | Seed selection, flake, exercise, mutation, property, and browser misses |
| UA-P05-T11 | Backward-compat qualification | Existing check golden fixtures unchanged |
| UA-P05-T12 | P5 qualification | CI, review, and exact-head test fixtures with hard gates zero |

## 6. Frozen inputs

```text
src/assurance/contracts/** = READ_ONLY_UNDER_UA_P05
src/assurance/kernel/** = READ_ONLY_UNDER_UA_P05
src/assurance/engines/native/** = READ_ONLY_UNDER_UA_P05
src/assurance/engines/mobile-artemis/** = READ_ONLY_UNDER_UA_P05
src/assurance/output/** = READ_ONLY_UNDER_UA_P05
src/assurance/review/** = READ_ONLY_UNDER_UA_P05
src/assurance/engines/review/** = READ_ONLY_UNDER_UA_P05
src/assurance/workflow/** = READ_ONLY_UNDER_UA_P05
src/assurance/publication/** = READ_ONLY_UNDER_UA_P05
src/cli.ts = READ_ONLY_UNDER_UA_P05 (except UA-P05-T09 additive test command)
ascout.config.json schema = READ_ONLY_UNDER_UA_P05
```

If an implementation task concludes that a frozen input must change, that task stops. A separate authorization amendment and compatibility review are required before such mutation.

## 7. Positive mutation surface after effectiveness

Only:

```text
src/assurance/test/**
tests/assurance-test-*.test.ts
src/cli.ts (UA-P05-T09 only, additive test command)
```

If a task requires any tracked path outside this positive surface, implementation stops and returns to authorization amendment.

## 8. Authority model

```text
TEST_OBSERVATION != FINDING
TEST_PASS != SUPPORTED_CLAIM
OMITTED_CLASS != PASS
FLAKY_HIDDEN != PASS
ENVIRONMENT_FAILURE != PRODUCT_PASS
RETRY_SUCCESS != ORIGINAL_FAILURE_ERASED
```

All test construction must remain within the intersection of intent, policy, engine descriptor, phase authority, and explicit network, provider, and data-egress policy ceilings. Any missing intersection fails closed.

## 9. Hard exclusions

UA-P05 does not authorize:

```text
CONSTITUTION_CHANGE_BEYOND_SECTION_3_3 = NO
UA_P01_THROUGH_UA_P04_SURFACE_MUTATION = NO
CLI_SURFACE_CHANGE_BEFORE_T09 = NO
CHECK_SEMANTIC_REGRESSION = NO
CONFIG_WORKFLOW_LANGUAGE = NO
SCORE_OVER_MISSING_OR_FAILED_EVIDENCE = NO
TEST_PASS_AS_ASSURANCE_PASS = NO
OMITTED_CLASS_AS_PASS = NO
FLAKE_CONCEALMENT = NO
ENVIRONMENT_FAILURE_AS_PRODUCT_PASS = NO
UNQUALIFIED_ADAPTER_SELF_ATTESTATION = NO
MANDATORY_NETWORK_PROVIDER_BACKEND = NO
SILENT_PAID_FALLBACK = NO
DEPENDENCY_CHANGE = NO
PACKAGE_CHANGE = NO
LOCKFILE_CHANGE = NO
WORKFLOW_CHANGE = NO
UA_P06_OR_LATER_IMPLEMENTATION = NO
```

## 10. CLI and backward-compatibility boundary

Until UA-P05-T09 the public CLI remains exactly:

```text
ascout init
ascout doctor
ascout check
ascout review [--format json|terminal]
```

During UA-P05 before T09:

```text
ascout test = unsupported
```

T09 adds exactly one additive `test` command. `ascout check` parse, render, exit, receipt, admission, terminal, JSON, and agent semantics must remain unchanged throughout UA-P05.

## 11. Required hard-zero invariants

```text
omitted_test_class_implied_pass = 0
test_pass_presented_as_assurance_pass = 0
existing_ascout_check_semantic_regression = 0
existing_ascout_review_read_only_regression = 0
weaker_substitute_preserves_stronger_claim = 0
flaky_failure_concealed = 0
environment_or_harness_failure_presented_as_product_pass = 0
retry_success_erases_original_failure = 0
unqualified_adapter_output_self_attests = 0
missing_engine_converted_to_pass = 0
mock_substituted_for_real_component = 0
credential_persisted_in_artifact_or_receipt = 0
silent_paid_provider_fallback = 0
```

Any hard-zero failure blocks the task regardless of aggregate pass rate.

## 12. Determinism requirements

Test contract outputs must be deterministic for identical canonical inputs wherever no model or network call is involved, binding exact target, intent, policy, engine descriptor, qualification, source head, and attempt identities. Ordering must not depend on traversal order, clock time, randomness, scheduling, or network results.

## 13. No-silent-fallback, absence, and local-zero-cost rules

Missing, unqualified, timed-out, denied, or over-budget test capability yields explicit omission with reason propagating as NOT_RUN or INCOMPLETE. Never choose weaker review or nothing while preserving the stronger claim. All economics, offline, privacy, and provenance gates from section 3.3 item 9 remain enforced.

## 14. Donor and external boundary

No donor source intake is authorized by this phase beyond already-admitted pins. Any future intake requires exact revision, path-level provenance, license, notice, dependency, and security review under its own authority. Winds-derived capability may be referenced only as characterization input where the UA-P05 tasks prove value; no wholesale import is authorized.

## 15. Failure discipline

Required CI, test, and review failures are immutable evidence. No rerun-to-green, no skipped failing tests, no weakened assertions, no global timeout widening to hide local defects, no stale CI, no reused qualification after drift, no force-push, rebase, or history rewrite. Proven infrastructure issues require separately prospective repair with preserved original failure evidence.

## 16. Task qualification discipline

Every UA-P05 task PR must prove exact base and predecessor, one-task scope and authorized-path purity, focused tests, exact-head Self Verification attempt 1 success, exact-head Project CI attempt 1 success across all six lanes, fresh maintainer exact-head review with zero material findings, Alibaba Open Code Review bound to the exact head with zero unresolved material findings, Jev evidence bound to the exact head (or exact recorded limitation), zero unresolved material threads, unchanged main, base, head, and scope immediately before merge, guarded normal merge with exact expected head, verified merge tree, parents, signature, and main, and post-merge Project CI attempt 1 success across all six lanes. Only then close the task CLOSED_CANONICAL.

PR #359 must not be merged, modified, repurposed, or cited as implementation authority under this authorization.

## 17. UA-P05 closeout

`UA-P05-T12` is qualification and closeout only with a bounded sentinel or fixture and no new capability. P5 may close only when T01 through T11 are canonical and all hard-zero invariants are proven on a fresh exact head. On successful T12 post-merge qualification:

```text
UA_P05 = CLOSED_CANONICAL / COMPLETE
UA_P06_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

## 18. Authorization PR purity

This authorization artifact's own PR may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P05_IMPLEMENTATION_AUTHORIZATION.md
```

No source, tests, dependencies, workflows, configs, benchmarks, donor material, Constitution text, or prior authorization artifacts may change in the authorization PR.

## 19. Effectiveness gate

Merging this authorization artifact is not sufficient by itself. Before this authority becomes effective require exact authorization head bound to this one-file diff, Self Verification attempt 1 success, Project CI attempt 1 success across all six lanes, maintainer exact-head review with zero material findings, Alibaba Open Code Review with zero unresolved material findings, Jev evidence (or exact recorded limitation), zero unresolved threads, unchanged canonical main immediately before merge, guarded normal merge with exact expected head, verified merge tree, parents, signature, and main, push-triggered post-merge Project CI attempt 1 success across all six lanes, and Issue #542 closed as CLOSED_CANONICAL / EFFECTIVE. Only after all conditions:

```text
UA_P05_IMPLEMENTATION_AUTHORIZED = YES
UA_P05_CONSTITUTION_AMENDMENT_A05 = RATIFIED
```

Until then implementation mutation remains FORBIDDEN and the amendment remains NOT_RATIFIED. After effectiveness and before any T01 branch, the mechanical Constitution v1.2.0 application PR from section 3.4 must land on canonical main.

Refs #542
Refs #527
Refs #419
Refs #359
