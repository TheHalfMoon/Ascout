# UA-P03 Implementation Authorization — Unified Review Profile

**Status:** `PROPOSED / NOT_EFFECTIVE`
**Ledger:** Issue #481
**Authorization base:** `befc373f3c046b5b533bbed32f5c0813ad207777`
**Phase:** `UA-P03 — Review v1 / Alibaba OpenCodeReview`

## 1. Purpose

This artifact defines the only implementation authority that may make UA-P03 product-source mutations after it becomes canonically effective.

It is authorization-only. This artifact does not implement UA-P03 and grants no source mutation authority merely by existing on a branch or pull request.

```text
UA_P03_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P03_IMPLEMENTATION_AUTHORIZED = NO
```

## 2. Canonical predecessors

At this authorization base:

```text
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
UA_P02_ENGINE_REGISTRY_AND_PLANNER = CLOSED_CANONICAL / COMPLETE
ARTEMIS_A0_THROUGH_A13 = COMPLETE
LOCAL_ZERO_COST_PLANNING = CLOSED_CANONICAL / COMPLETE
CANONICAL_MAIN = befc373f3c046b5b533bbed32f5c0813ad207777
UA_P03_CONSTITUTION_CLASS = CONSTITUTION_COMPATIBLE
```

Constitution compatibility (v1.0.0, ratified 2026-08-21) is narrow:

- Review engines produce observations only; Ascout findings, coverage, omissions, and claim assessments remain the sole claim authority (Principles I, II).
- Provider-backed review is an optional capability, never mandatory for a core claim; provider absence yields explicit NOT_RUN/INCOMPLETE, never fabricated clean review (Principles II, IV).
- No Ascout-owned provider credential and no mandatory account/key for core verification (Principle IV).
- OpenCodeReview source is admitted only through the exact-revision provenance review required by T01 (Principle VIII).
- Decision Fabric enters P03 in SHADOW mode only and cannot alter the finding lifecycle (reconciled roadmap §5).

## 3. Predecessor gate LZ-G01

Before any provider-dependent engine admission inside UA-P03 (T04 and later), the bounded compatibility decision LZ-G01 defined in `docs/strategy/ASCOUT_LOCAL_ZERO_COST_ROADMAP_RECONCILIATION_2026-09-22.md` §3 must resolve and be recorded:

Goal: determine whether the frozen canonical contracts can represent execution location, operator/user monetary cost class, data-egress class, network requirement, credential requirement, hardware requirement, artifact sensitivity, local/offline availability, and runtime isolation requirement as deterministic supplementary policy/descriptor metadata without mutating UA-P01 contracts.

Possible outcomes:

```text
A. COMPATIBLE_WITH_SUPPLEMENTAL_METADATA
B. CONTRACT_AMENDMENT_REQUIRED -> stop; separately reviewed amendment first
C. DEFERRED -> no provider-dependent engine admitted until resolved
```

LZ-G01 is effect-free planning/compatibility work. It is completed as part of UA-P03-T01. T04 and later tasks must not start under outcome B or C.

## 4. Authorized task set after effectiveness

Exactly:

```text
UA-P03-T01
UA-P03-T02
UA-P03-T03
UA-P03-T04
UA-P03-T05
UA-P03-T06
UA-P03-T07
UA-P03-T08
UA-P03-T09
UA-P03-T10
UA-P03-T11
UA-P03-T12
UA-P03-T13
UA-P03-T14
UA-P03-T15
```

No UA-P04 or later implementation is authorized by implication.

One task / one branch / one PR remains mandatory.

## 5. Task definitions

| Task | Deliverable | Acceptance boundary |
|---|---|---|
| UA-P03-T01 | OpenCodeReview source re-pin + LZ-G01 decision | Exact upstream revision/license/NOTICE/dependency delta recorded; LZ-G01 outcome A recorded, or B/C stops the phase. No copied donor bytes without provenance review. |
| UA-P03-T02 | Review profile contract | diff/pr/workspace/spec/correctness scopes normalized; malformed scope rejected. |
| UA-P03-T03 | Review Context Capsule | Bounded source/spec/test/architecture context with exact provenance; unbounded context refused. |
| UA-P03-T04 | OpenCodeReview adapter | Machine-readable execution with recorded provider/model/config identity; no silent provider substitution. Requires LZ-G01 outcome A. |
| UA-P03-T05 | Raw review observation schema | Untrusted model output isolated from canonical Finding; no direct promotion path. |
| UA-P03-T06 | Location/source validator | Hallucinated path/line, stale head, or out-of-target observation cannot promote to Finding. |
| UA-P03-T07 | Logical-group coverage accounting | Reviewed/unreviewed groups and files explicitly visible; unreviewed scope never implied clean. |
| UA-P03-T08 | Finding normalization | Producer observation and provenance preserved; normalization cannot suppress a valid observation. |
| UA-P03-T09 | Dedup/correlation | Duplicates grouped without destroying independent evidence; correlation rationale recorded. |
| UA-P03-T10 | Provider absence/timeout handling | Absent/timed-out provider yields NOT_RUN/INCOMPLETE with reason; never a fabricated clean review. |
| UA-P03-T11 | Prompt-injection boundary tests | Repository/model text cannot widen tools, effects, or authority; injection attempts become findings or refusals. |
| UA-P03-T12 | Independent-review policy | Independence derived from model/provider/context lineage; self-review cannot satisfy independence. |
| UA-P03-T13 | Review benchmark corpus v1 | Seeded defects plus safe controls plus stale/hallucination cases; benchmark measures Ascout review claims. |
| UA-P03-T14 | `ascout review` CLI/JSON | Read-only default; no write/publication; JSON and terminal semantics match library behavior. |
| UA-P03-T15 | Exact-head phase qualification | Full P3 invariants, compatibility, CI, review, guarded merge, and post-merge proof. |

## 6. Frozen inputs

UA-P03 consumes as frozen inputs:

- all canonical UA-P01 contracts (`src/assurance/contracts/**`);
- the UA-P02 registry, availability model, authority ceiling, effect evaluator, qualification lookup, deterministic planner, omission planner, preview renderer, and native adapter;
- the reconciled zero-cost planning package (cost/privacy/location policy requirements).

```text
src/assurance/contracts/** = READ_ONLY_UNDER_UA_P03
src/assurance/kernel/** = READ_ONLY_UNDER_UA_P03
src/assurance/engines/native/** = READ_ONLY_UNDER_UA_P03
src/assurance/engines/mobile-artemis/** = READ_ONLY_UNDER_UA_P03
src/assurance/output/** = READ_ONLY_UNDER_UA_P03
```

If an implementation task concludes that a frozen input must change, that task stops. A separate authorization amendment and compatibility review are required before such mutation.

## 7. Positive mutation surface after effectiveness

Only:

```text
src/assurance/review/**
src/assurance/engines/review/**
tests/assurance-review-*.test.ts
src/cli.ts (UA-P03-T14 only, single read-only review command)
```

Surface ownership:

### `src/assurance/review/**`

Primary UA-P03 implementation surface for:

- review profile contract;
- Review Context Capsule;
- raw observation schema and isolation;
- location/source validation;
- coverage accounting;
- finding normalization;
- dedup/correlation;
- absence/timeout semantics;
- injection boundary;
- independence policy;
- benchmark corpus support types.

### `src/assurance/engines/review/**`

Reserved for UA-P03-T04 and its qualification support:

- OpenCodeReview execution adapter behind the versioned Ascout boundary;
- recorded provider/model/config identity;
- explicit absence/timeout mapping (with T10 tests);
- no credential persistence;
- no network beyond the explicitly user-authorized provider path at runtime;
- no live provider invocation in tests or qualification.

### `tests/assurance-review-*.test.ts`

Reserved for UA-P03 focused, adversarial, determinism, and compatibility proof.

### `src/cli.ts`

Reserved for UA-P03-T14 only:

- one read-only `review` command;
- terminal and JSON output matching library semantics;
- no write, no publication, no configuration mutation by default.

If a task requires any tracked path outside this positive surface, implementation stops and returns to authorization amendment.

## 8. Authority model

Planning authority is not execution authority. Review output is evidence input, never sovereign judgment.

```text
REVIEW_OBSERVATION != FINDING
FINDING != SUPPORTED_CLAIM
PROVIDER_PRESENT != PROVIDER_AUTHORIZED
ENGINE_PRESENT != ENGINE_EXECUTION_AUTHORIZED
SHADOW_DECISION != LIFECYCLE_TRANSITION
```

All review construction must remain within the intersection of:

```text
intent effect ceiling
∩ policy effect ceiling
∩ engine descriptor ceiling
∩ phase authority
∩ explicit network policy
∩ explicit provider policy
∩ explicit data-egress policy
```

Any missing intersection fails closed.

## 9. Hard exclusions

UA-P03 does not authorize:

```text
DONOR_SOURCE_INTAKE_BEYOND_T01_PIN = NO
VENDORED_DONOR_COPY_WITHOUT_PROVENANCE = NO
LIVE_PROVIDER_INVOCATION_IN_TESTS_OR_QUALIFICATION = NO
ASCOUT_OWNED_PROVIDER_CREDENTIAL = NO
SILENT_PROVIDER_FALLBACK = NO
MANDATORY_PROVIDER_FOR_CORE_CLAIM = NO
SCORE_OVER_MISSING_OR_FAILED_EVIDENCE = NO
SHADOW_DECISION_WRITES_TO_LIFECYCLE = NO
MODEL_SUPPRESSION_OF_VALID_OBSERVATION = NO
PUBLICATION_AUTHORITY = NO
GITHUB_EFFECTS = NO
CREDENTIAL_PERSISTENCE = NO
DEPENDENCY_CHANGE = NO
PACKAGE_CHANGE = NO
LOCKFILE_CHANGE = NO
WORKFLOW_CHANGE = NO
CONFIG_CHANGE = NO
CONSTITUTION_CHANGE = NO
UA_P01_CONTRACT_MUTATION = NO
UA_P04_OR_LATER_IMPLEMENTATION = NO
```

Review may not require network, account, key, or provider for any core Ascout claim. Qualification runs with provider credentials absent.

## 10. CLI and backward-compatibility boundary

The public CLI remains exactly the existing surface until UA-P03-T14:

```text
ascout init
ascout doctor
ascout check
```

During UA-P03 before T14:

```text
ascout review = unsupported
```

T14 adds exactly one read-only `review` command with terminal and JSON output. No write or publication behavior is admitted; publication remains owned by UA-P04.

`ascout check` task status, receipt, exit-code, changed-command admission, terminal, JSON, and agent semantics must remain unchanged throughout UA-P03.

## 11. Required hard-zero invariants

Every UA-P03 implementation candidate must preserve:

```text
untrusted_observation_promoted_to_finding = 0
hallucinated_location_accepted = 0
stale_head_review_accepted_as_current = 0
unreviewed_scope_implied_clean = 0
valid_observation_suppressed_by_model_or_normalization = 0
missing_review_converted_to_pass = 0
provider_absence_converted_to_clean_review = 0
provider_timeout_converted_to_clean_review = 0
weaker_substitute_preserves_stronger_claim = 0
prompt_text_widens_tool_or_effect_authority = 0
self_review_satisfies_independence = 0
shadow_decision_alters_finding_lifecycle = 0
score_overrides_missing_or_failed_mandatory_evidence = 0
credential_persisted_in_artifact_or_receipt = 0
silent_paid_provider_fallback = 0
existing_ascout_check_semantic_regression = 0
```

Any hard-zero failure blocks the task regardless of aggregate pass rate.

## 12. Determinism requirements

Review contract outputs must be deterministic for identical canonical inputs wherever no model call is involved. All normalization, validation, coverage accounting, dedup, and policy decisions bind:

- exact target identity;
- exact intent identity;
- exact policy identity/digest;
- exact review profile identity;
- exact context capsule identity/digest;
- exact engine descriptor/qualification identity.

Model-backed execution records exact provider/model/config identity and treats output as untrusted input. Ordering may not depend on filesystem traversal order, insertion order, clock time, randomness, process scheduling, network results, or unstable object iteration.

## 13. No-silent-fallback and absence rule

A missing, unqualified, timed-out, or denied review engine yields an explicit omission with reason. Review absence must propagate as NOT_RUN/INCOMPLETE into coverage and claim assessment.

Never:

```text
required review unavailable
-> choose weaker review or nothing
-> preserve stronger claim
```

## 14. ARES boundary

Issue #419 records founder authorization to copy/adapt all requested ARES source, but the requested source remains inaccessible and unpinned (`BLOCKED_SOURCE_UNAVAILABLE`).

UA-P03:

- does not intake ARES bytes;
- does not register an ARES implementation as available or qualified without exact source identity;
- does not wait on ARES because no UA-P03 acceptance criterion requires ARES execution.

## 15. Failure discipline

Required CI/test/review failures are immutable evidence.

Do not:

- rerun-to-green;
- skip a failing test;
- weaken assertions;
- widen a global timeout to hide a local timing defect;
- use stale CI from another head;
- reuse an earlier qualification after head/configuration drift;
- force-push, rebase, or rewrite shared history.

A proven infrastructure/timing issue requires a separately prospective repair with preserved original failure evidence.

## 16. Task qualification discipline

Every UA-P03 task PR must prove:

1. exact canonical base and predecessor;
2. one-task scope and authorized-path purity;
3. focused tests for the task acceptance contract;
4. exact-head Self Verification attempt 1 success;
5. exact-head Project CI attempt 1 success across all six required lanes;
6. fresh maintainer exact-head review with zero material findings;
7. unresolved material review threads = 0;
8. main/base/head/scope unchanged immediately before merge;
9. guarded normal merge with exact expected head;
10. merge tree, ordered parents, signature, and main verified;
11. post-merge Project CI attempt 1 success across all six required lanes;
12. only then close the task `CLOSED_CANONICAL`.

## 17. UA-P03 closeout

`UA-P03-T15` is qualification/closeout only. It may add only a bounded P3 sentinel/test within the authorized test surface and must not introduce a new capability.

P3 may close only when T01 through T14 are canonical and all hard-zero invariants are proven on a fresh exact head.

On successful T15 post-merge qualification:

```text
UA_P03 = CLOSED_CANONICAL / COMPLETE
UA_P04_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

## 18. Authorization PR purity

This authorization artifact's own PR may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P03_IMPLEMENTATION_AUTHORIZATION.md
```

No source, tests, dependencies, workflows, configs, benchmarks, donor material, or prior authorization artifacts may change in the authorization PR.

## 19. Effectiveness gate

Merging this authorization artifact is not sufficient by itself.

Before this authority becomes effective require:

1. exact authorization head bound to this one-file diff;
2. Self Verification attempt 1 success on that exact head;
3. Project CI attempt 1 success across all six required lanes on that exact head;
4. maintainer exact-head review with zero material findings;
5. unresolved review threads = 0;
6. canonical main remains the expected authorization base immediately before merge;
7. guarded normal merge with exact expected head;
8. merge tree, ordered parents, verified signature, and canonical main proof;
9. push-triggered post-merge Project CI attempt 1 success across all six required lanes;
10. Issue #481 closes as `CLOSED_CANONICAL / EFFECTIVE`.

Only after all ten conditions:

```text
UA_P03_IMPLEMENTATION_AUTHORIZED = YES
```

Until then:

```text
UA_P03_IMPLEMENTATION_AUTHORIZED = NO
UA_P03_SOURCE_MUTATION = FORBIDDEN
```

Refs #481
Refs #449
Refs #424
Refs #419
