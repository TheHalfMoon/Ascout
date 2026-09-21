# UA-P02 Implementation Authorization — Engine Registry and Deterministic Planner

**Status:** `PROPOSED / NOT_EFFECTIVE`  
**Ledger:** Issue #424  
**Authorization base:** `af0bc5848a66f03e72cd9a04a63663be390b34bf`  
**Phase:** `UA-P02 — Engine registry and planner`

## 1. Purpose

This artifact defines the only implementation authority that may make UA-P02 product-source mutations after it becomes canonically effective.

It is authorization-only. This artifact does not implement UA-P02 and grants no source mutation authority merely by existing on a branch or pull request.

```text
UA_P02_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
```

## 2. Canonical predecessor

At this authorization base:

```text
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
CANONICAL_MAIN = af0bc5848a66f03e72cd9a04a63663be390b34bf
UA_P02_CONSTITUTION_CLASS = CONSTITUTION_COMPATIBLE
```

The compatibility decision is narrow: UA-P02 is declarative registration and planning only. External engine execution is not part of this phase.

## 3. Authorized task set after effectiveness

Exactly:

```text
UA-P02-T01
UA-P02-T02
UA-P02-T03
UA-P02-T04
UA-P02-T05
UA-P02-T06
UA-P02-T07
UA-P02-T08
UA-P02-T09
UA-P02-T10
UA-P02-T11
```

No UA-P03 or later implementation is authorized by implication.

One task / one branch / one PR remains mandatory.

## 4. Task definitions

| Task | Deliverable | Acceptance boundary |
|---|---|---|
| UA-P02-T01 | Engine Registry | Register canonical `EngineDescriptorV1` values by exact engine/implementation/configuration identity; reject ambiguous duplicate identity. |
| UA-P02-T02 | Availability model | Expose explicit `AVAILABLE`, `UNAVAILABLE`, and `NOT_QUALIFIED` outcomes with bounded reasons; absence never becomes success. |
| UA-P02-T03 | Authority ceiling enforcement | Selected engine capability/effect authority cannot exceed the canonical descriptor ceiling. |
| UA-P02-T04 | Effect-class evaluator | Planning fails closed when required effects exceed intent, policy, descriptor, or phase authority. |
| UA-P02-T05 | Qualification lookup/invalidation | Exact implementation/configuration/platform bindings are enforced; identity drift invalidates qualification. |
| UA-P02-T06 | Deterministic planner | Identical canonical inputs produce identical selected engines, omissions, plan content, and digest. |
| UA-P02-T07 | Omission planner | Required unavailable/unqualified checks become explicit claim-impacting omissions. |
| UA-P02-T08 | Plan preview terminal/JSON | Preview is deterministic and effect-free; rendering cannot execute an engine. |
| UA-P02-T09 | Native Ascout engine adapter | Project current check/test facts are represented through one read-only native descriptor/adapter without changing existing execution semantics. |
| UA-P02-T10 | No-silent-fallback adversarial corpus | A weaker substitute cannot retain stronger claim/evidence credit; missing capability remains visible. |
| UA-P02-T11 | Exact-head phase qualification | Full P2 invariants, compatibility, CI, review, guarded merge, and post-merge proof. |

## 5. Frozen UA-P01 inputs

UA-P02 consumes the canonical P01 contracts as frozen inputs:

- `AssuranceTargetV1`;
- `AssuranceIntentV1`;
- `AssurancePolicySnapshotV1`;
- `AssurancePlanV1`;
- `EngineDescriptorV1`;
- `EngineQualificationV1`;
- `EngineRunV1`;
- `EvidenceRefV1`;
- finding, coverage, omission, contradiction, and claim-assessment contracts;
- canonical serialization/digest and structural/semantic validation.

```text
src/assurance/contracts/** = READ_ONLY_UNDER_UA_P02
```

If an implementation task concludes that a P01 contract must change, that task stops. A separate authorization amendment and contract-compatibility review are required before such mutation.

## 6. Positive mutation surface after effectiveness

Only:

```text
src/assurance/kernel/**
src/assurance/engines/native/**
src/assurance/output/**
tests/assurance-*.test.ts
```

Surface ownership:

### `src/assurance/kernel/**`

Primary UA-P02 implementation surface for:

- registry;
- availability;
- authority/effect evaluation;
- qualification lookup and invalidation;
- deterministic planner;
- omissions;
- no-silent-fallback policy.

### `src/assurance/output/**`

Reserved for UA-P02-T08 only:

- effect-free plan preview projection;
- deterministic terminal/JSON representation;
- no CLI command registration.

### `src/assurance/engines/native/**`

Reserved for UA-P02-T09 only:

- declarative identity for the existing Ascout-native check/test capability;
- read-only projection of already-existing facts;
- no second execution path;
- no new subprocess;
- no behavior change to `ascout check`.

### `tests/assurance-*.test.ts`

Reserved for UA-P02 focused, adversarial, determinism, and compatibility proof.

If a task requires any tracked path outside this positive surface, implementation stops and returns to authorization amendment.

## 7. Authority model

UA-P02 may reason about engine descriptors and planned effects, but it may not perform newly authorized effects.

Planning authority is not execution authority.

```text
ENGINE_DESCRIPTOR_PRESENT != ENGINE_EXECUTION_AUTHORIZED
ENGINE_AVAILABLE != ENGINE_QUALIFIED
ENGINE_QUALIFIED != ENGINE_SELECTED
ENGINE_SELECTED != ENGINE_RUN
PLAN_PREVIEW != EFFECT_AUTHORIZATION
```

All plan construction must remain within the intersection of:

```text
intent effect ceiling
∩ policy effect ceiling
∩ engine descriptor ceiling
∩ phase authority
```

Any missing intersection fails closed.

## 8. Hard exclusions

UA-P02 does not authorize:

```text
ARES_SOURCE_INTAKE = NO
DONOR_SOURCE_INTAKE = NO
EXTERNAL_ENGINE_EXECUTION = NO
OPENCODEREVIEW_EXECUTION = NO
SENTRDEL_EXECUTION = NO
KERNUX_EXECUTION = NO
MODEL_OR_PROVIDER_INVOCATION = NO
NETWORK_AUTHORITY = NO
NEW_PROCESS_EXECUTION_AUTHORITY = NO
CREDENTIAL_AUTHORITY = NO
PUBLICATION_AUTHORITY = NO
GITHUB_EFFECTS = NO
BROWSER_AUTHORITY_EXPANSION = NO
REMOTE_RUNTIME = NO
DYNAMIC_SECURITY = NO
DEPENDENCY_CHANGE = NO
PACKAGE_CHANGE = NO
LOCKFILE_CHANGE = NO
WORKFLOW_CHANGE = NO
CONFIG_CHANGE = NO
CONSTITUTION_CHANGE = NO
CLI_SURFACE_EXPANSION = NO
UA_P03_OR_LATER_IMPLEMENTATION = NO
```

## 9. CLI and backward-compatibility boundary

The public CLI remains exactly the existing surface:

```text
ascout init
ascout doctor
ascout check
```

During UA-P02:

```text
ascout review = unsupported
ascout test = unsupported
ascout security = unsupported
ascout cyber = unsupported
ascout assure = unsupported
```

UA-P02 plan-preview rendering is an internal/library projection under `src/assurance/output/**`; it does not authorize a new public command.

`ascout check` task status, receipt, exit-code, changed-command admission, terminal, JSON, and agent semantics must remain unchanged.

## 10. Required hard-zero invariants

Every UA-P02 implementation candidate must preserve:

```text
unavailable_engine_promoted_to_pass = 0
not_qualified_engine_selected_as_qualified = 0
wrong_version_inherits_qualification = 0
wrong_configuration_inherits_qualification = 0
wrong_platform_inherits_required_qualification = 0
ambiguous_duplicate_engine_identity_accepted = 0
engine_output_exceeds_descriptor_authority = 0
plan_exceeds_intent_effect_ceiling = 0
plan_exceeds_policy_effect_ceiling = 0
plan_exceeds_phase_authority = 0
required_unavailable_engine_hidden = 0
weaker_fallback_preserves_stronger_claim = 0
identical_snapshot_nondeterministic_plan = 0
plan_preview_triggers_execution = 0
native_adapter_creates_second_execution_path = 0
existing_ascout_check_semantic_regression = 0
```

Any hard-zero failure blocks the task regardless of aggregate pass rate.

## 11. Determinism requirements

Registry and planner outputs must be deterministic for identical canonical inputs.

At minimum bind planning decisions to:

- exact target identity;
- exact intent identity;
- exact policy identity/digest;
- exact descriptor implementation/configuration identity;
- exact qualification identity and applicable platform binding;
- exact availability snapshot;
- exact planner identity/version/configuration digest.

Ordering may not depend on filesystem traversal order, insertion order, clock time, randomness, process scheduling, network results, or unstable object iteration.

## 12. Availability and qualification semantics

Availability and qualification are independent.

Required states must remain distinguishable:

```text
AVAILABLE
UNAVAILABLE
NOT_QUALIFIED
```

`AVAILABLE` means only that the declared implementation is locally discoverable by the bounded P2 mechanism. It does not assert execution success, correctness, or qualification.

`NOT_QUALIFIED` must preserve why the exact implementation/configuration/platform cannot inherit a qualification record.

UA-P02 must not contact a provider or execute an external tool to discover availability.

## 13. No-silent-fallback rule

Fallback is valid only when the replacement descriptor satisfies every mandatory capability, qualification, effect, evidence, and independence requirement for the claim.

Otherwise the planner records an omission/incomplete requirement.

Never:

```text
required stronger engine unavailable
-> choose weaker engine
-> preserve stronger claim
```

## 14. Native adapter boundary

UA-P02-T09 may represent the existing Ascout check/test capability as a native engine descriptor/adapter only to make current facts available to the planner.

It must not:

- call `runCheck` as a hidden second execution;
- introduce another process runner;
- widen current check selection;
- change task status vocabulary;
- change receipt/exit semantics;
- fabricate test coverage or evidence absent from the existing result;
- convert current product facts into broader assurance PASS.

## 15. ARES boundary

Issue #419 records founder authorization to copy/adapt all requested ARES source, but the requested source is currently inaccessible and unpinned.

UA-P02:

- does not intake ARES bytes;
- does not register an ARES implementation as available or qualified without exact source identity;
- does not wait on ARES because no UA-P02 acceptance criterion requires donor execution;
- may later consume a provenance-qualified ARES descriptor only under a separately authorized source-admission task and without external execution in P2.

## 16. Failure discipline

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

## 17. Task qualification discipline

Every UA-P02 task PR must prove:

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

## 18. UA-P02 closeout

`UA-P02-T11` is qualification/closeout only. It may add only a bounded P2 sentinel/test within the authorized test surface and must not introduce a new capability.

P2 may close only when T01 through T10 are canonical and all hard-zero invariants are proven on a fresh exact head.

On successful T11 post-merge qualification:

```text
UA_P02 = CLOSED_CANONICAL / COMPLETE
UA_P03_IMPLEMENTATION_AUTHORIZED = NO
ARES_SOURCE_ADMITTED = NO unless separately proven under #419
ASCOUT_PROJECT_COMPLETE = NO
```

## 19. Authorization PR purity

This authorization artifact's own PR may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P02_IMPLEMENTATION_AUTHORIZATION.md
```

No source, tests, dependencies, workflows, configs, benchmarks, donor material, or prior authorization artifacts may change in the authorization PR.

## 20. Effectiveness gate

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
10. Issue #424 closes as `CLOSED_CANONICAL / EFFECTIVE`.

Only after all ten conditions:

```text
UA_P02_IMPLEMENTATION_AUTHORIZED = YES
```

Until then:

```text
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
UA_P02_SOURCE_MUTATION = FORBIDDEN
```

Refs #424  
Refs #419