# UA-P04 Implementation Authorization — Kodac Workflow and Publication Convergence

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #527
**Authorization base:** `e02cce13e2412fb6cee329fd70d431d7a6b5910a`
**Phase:** `UA-P04 — Kodac workflow and GitHub publication convergence`

## 1. Purpose

This artifact defines the only implementation authority that may make UA-P04 product-source mutations after it becomes canonically effective.

It is authorization-only. This artifact does not implement UA-P04 and grants no source mutation authority merely by existing on a branch or pull request.

```text
UA_P04_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P04_IMPLEMENTATION_AUTHORIZED = NO
UA_P04_CONSTITUTION_AMENDMENT = PROPOSED / NOT_RATIFIED
ASCOUT_PROJECT_COMPLETE = NO
```

Founder direction recorded in the session authorizes creation, review, qualification, and canonical admission of this bounded governance proposal. It does not pre-authorize implementation before this artifact becomes EFFECTIVE.

## 2. Canonical predecessors

At this authorization base:

```text
CANONICAL_MAIN = e02cce13e2412fb6cee329fd70d431d7a6b5910a
PR_526_MERGE = e02cce13e2412fb6cee329fd70d431d7a6b5910a
PR_526_BASE = e19b6491faed2af5e79606de880fb3c3d2a44681
PR_526_HEAD = 17ba17783138e1ad4d9af814c9ceeef2770c92dd
PR_526_STATE = MERGED
POST_MERGE_PROJECT_CI = run 35915499680 / 6_6 SUCCESS on e02cce13e2412fb6cee329fd70d431d7a6b5910a
UA_P03 = CLOSED_CANONICAL / COMPLETE
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
UA_P02_ENGINE_REGISTRY_AND_PLANNER = CLOSED_CANONICAL / COMPLETE
ARTEMIS_A0_THROUGH_A13 = COMPLETE
LOCAL_ZERO_COST_PLANNING = CLOSED_CANONICAL / COMPLETE
CONSTITUTION_VERSION = 1.0.0 (ratified 2026-08-21, last amended 2026-08-21)
UA_P04_IMPLEMENTATION_AUTHORIZED = NO
OPEN_PR_359 = UNRELATED / MUST_NOT_BE_USED_AS_AUTHORITY
PR_519 = CLOSED / DISQUALIFIED / UNMERGED (historical evidence only)
```

No UA-P04 task has started. No Kodac bytes have been copied. No publication effect exists in the product.

## 3. Constitution compatibility review and bounded amendment

### 3.1 Classification

The P0 canonicalization matrix classifies UA-P04 as:

```text
UA-P04 = CONSTITUTION_AMENDMENT_REQUIRED
```

Reason: UA-P04 adds durable workflow and publication effects beyond the current M1 product surface. GitHub effects need explicit authority independent of repository ownership.

This review confirms that classification. UA-P04 cannot proceed as `CONSTITUTION_COMPATIBLE` without a bounded amendment because:

- M1 Principle IV limits Ascout v0.x to the developer's own trusted local repository with no account, upload, backend, cloud service, or model key required for core verification.
- M1 Principle V requires a minimal CLI core with no daemon, server, graph database, SQLite requirement, Rust requirement, public plugin SDK, required LLM, or cloud control plane.
- M1 Principle VII requires bounded, read-only, private execution with verification artifacts in `.ascout/` and no silent product-source mutation.
- M1 wedge excludes publication surfaces and workflow automation runtimes.
- UA-P04 introduces local durable run, stage, attempt, and event records plus an explicit GitHub publication effect (comment and check publication adapter with receipts).

A narrow amendment is therefore required. No broad constitutional rewrite is proposed.

### 3.2 What is preserved

The amendment weakens nothing:

```text
PRINCIPLE_I_EVIDENCE_BEFORE_CLAIMS = PRESERVED
PRINCIPLE_II_NO_GREEN_BY_OMISSION = PRESERVED
PRINCIPLE_III_SOURCE_BOUND_TRUTH = PRESERVED
PRINCIPLE_IV_TRUST_BOUNDARY_CORE = PRESERVED (core verification remains local and keyless)
PRINCIPLE_V_MINIMAL_CORE = PRESERVED (no new mandatory runtime)
PRINCIPLE_VI_CONSERVATIVE_VERIFICATION = PRESERVED
PRINCIPLE_VII_PRIVACY_AND_BOUNDS = PRESERVED
PRINCIPLE_VIII_PROVENANCE_AND_LICENSE = PRESERVED (strengthened by T01 gates)
M1_RECEIPT_CONTRACT = PRESERVED
```

Core claims (`ascout check`, `ascout review`) remain available without network, account, key, provider, daemon, server, database, or paid fallback. Missing optional capability remains explicit `NOT_RUN` or `INCOMPLETE`, never fabricated clean output.

### 3.3 Bounded delta (ratification candidate v1.0.0 to v1.1.0)

Upon effectiveness of this authorization, the following delta is ratified as Constitution v1.1.0. The mechanical application to `.specify/memory/constitution.md` must land on canonical main before any UA-P04-T01 implementation branch is created.

```text
AMENDMENT_ID = A04
AMENDMENT_SCOPE = UA-P04 durable workflow and GitHub publication effects only
VERSION_CHANGE = 1.0.0 -> 1.1.0
```

Amendment text to be appended as a bounded subsection under Founding Product Constraints, titled `Amendment A04 — Durable workflow and separate publication effect`:

1. Ascout may persist local durable workflow evidence (run, stage, attempt, event, freshness, idempotency, and reconciliation records) as bounded local evidence in `.ascout/`, ignored by default, with documented retention, redaction of secret-bearing values, and no mandatory daemon, server, database, cloud storage, or external service.
2. GitHub publication is a separate effect, never part of core verification. A review result, Watch event, model output, Jev result, or local event does not implicitly grant publication authority. Generation, PublicationIntent, authorization, effect, and PublicationReceipt are distinct.
3. Publication requires all of the following bound to the effect: exact repository identity, exact issue, pull request, or comment target, exact source head, exact publication payload digest, redaction and classification decision, authority identity, attempt identity, effect result, and reconciliation state.
4. Never publish from stale evidence. Never publish sensitive evidence without classification and redaction. Unknown publication outcome must not cause blind retry. A retry must not create duplicate comments or effects.
5. Publication requires explicit effect authority intersecting intent ceiling, policy ceiling, engine descriptor ceiling, phase authority, explicit network policy, explicit provider policy, and explicit data-egress policy. Any missing intersection fails closed.
6. Tests and qualification must not perform live GitHub publication. Publication behavior is proven with exact-head fixtures and durable receipt semantics only.
7. Configuration remains a correction and override surface. It must not become a workflow, prerequisite-graph, automation, or notification language.
8. P04 durable stage, attempt, and event semantics may be reused by future Watch work. P04 must not create a generic notification command center, a general workflow automation system, a communication platform, a ChromaDB-dependent system, or any mandatory external service.
9. Kodac-derived patterns are observations and discipline only. Kodac must not become a second policy or claim authority. Ascout owns final evidence, finding, coverage, freshness, and claim semantics.
10. All local-zero-cost gates remain enforced: zero operator runtime cost, offline core, no mandatory Ascout backend, no silent paid fallback, telemetry off by default, local artifact retention by default, explicit data egress, optional engine absence explicit, entitlement truth independence, model source and weight provenance, donor permission and notice, and clean-machine local execution.

No other Constitution text changes. No principle is weakened. Any future phase needing broader effects requires its own amendment.

### 3.4 Ratification mechanics

```text
CONSTITUTION_CHANGE_IN_THIS_PR = NO
MECHANICAL_APPLICATION_PR_REQUIRED_BEFORE_T01 = YES
MECHANICAL_APPLICATION_SCOPE = .specify/memory/constitution.md exact section-3.3 text plus version 1.1.0 only
T01_START_BLOCKED_UNTIL = this authorization EFFECTIVE and constitution v1.1.0 on canonical main
```

This PR changes exactly one new authorization file and does not itself mutate the Constitution. Ratification occurs only when the effectiveness gate in section 19 is fully proven.

## 4. Authorized task set after effectiveness

Exactly:

```text
UA-P04-T01
UA-P04-T02
UA-P04-T03
UA-P04-T04
UA-P04-T05
UA-P04-T06
UA-P04-T07
UA-P04-T08
UA-P04-T09
UA-P04-T10
UA-P04-T11
```

No UA-P05 or later implementation is authorized by implication.

One task, one branch, one PR remains mandatory.

## 5. Task definitions

| Task | Deliverable | Acceptance boundary |
|---|---|---|
| UA-P04-T01 | Kodac capability characterization | Selected workflows frozen by Ascout-owned fixtures; exact source re-pin with license, notice, provenance, and dependency review recorded before any copy; smallest donor surface; no wholesale import |
| UA-P04-T02 | Exact-head freshness engine | Changed head stales review evidence; stale finding cannot publish or satisfy a current claim |
| UA-P04-T03 | Durable stage and attempt model | Crash and resume does not erase incomplete work; incomplete stages remain visible; resume revalidates target, policy, and engine identity |
| UA-P04-T04 | Idempotency and reconciliation | Unknown result does not duplicate side effect; ambiguous outcome fails closed with durable reconciliation state |
| UA-P04-T05 | Reviewer-role separation | Acceptance-critical independence enforceable from model, provider, and context lineage; self-review cannot satisfy independence |
| UA-P04-T06 | PublicationIntent | Generation separate from GitHub effect; intent binds exact target, head, payload digest, classification, authority, and idempotency identity without performing the effect |
| UA-P04-T07 | Redaction and classification gate | Sensitive evidence cannot publish accidentally; classification and redaction decision bound before any effect |
| UA-P04-T08 | GitHub publication adapter | Exact target, head, and comment identities; explicit effect authority; no silent publication; no live publication in tests |
| UA-P04-T09 | PublicationReceipt | Result, retry, and reconciliation durable; unknown outcome never becomes success |
| UA-P04-T10 | Duplicate and stale publication tests | Zero duplicate or stale current claims across retry, reconnect, concurrency, and changed-head cases |
| UA-P04-T11 | P4 qualification | CI, review, and exact-head publication fixtures; all hard-zero invariants proven on a fresh exact head |

## 6. Frozen inputs

UA-P04 consumes as frozen inputs:

- all canonical UA-P01 contracts (`src/assurance/contracts/**`);
- the UA-P02 registry, availability model, authority ceiling, effect evaluator, qualification lookup, deterministic planner, omission planner, preview renderer, and native adapter;
- the UA-P03 review profile, context capsule, observation isolation, location validation, coverage accounting, normalization, dedup, absence handling, injection boundary, independence policy, benchmark corpus, and read-only review command.

```text
src/assurance/contracts/** = READ_ONLY_UNDER_UA_P04
src/assurance/kernel/** = READ_ONLY_UNDER_UA_P04
src/assurance/engines/native/** = READ_ONLY_UNDER_UA_P04
src/assurance/engines/mobile-artemis/** = READ_ONLY_UNDER_UA_P04
src/assurance/output/** = READ_ONLY_UNDER_UA_P04
src/assurance/review/** = READ_ONLY_UNDER_UA_P04
src/assurance/engines/review/** = READ_ONLY_UNDER_UA_P04
src/cli.ts = READ_ONLY_UNDER_UA_P04
ascout.config.json schema = READ_ONLY_UNDER_UA_P04
```

If an implementation task concludes that a frozen input must change, that task stops. A separate authorization amendment and compatibility review are required before such mutation.

## 7. Positive mutation surface after effectiveness

Only:

```text
src/assurance/workflow/**
src/assurance/publication/**
tests/assurance-workflow-*.test.ts
tests/assurance-publication-*.test.ts
```

Surface ownership:

### `src/assurance/workflow/**`

Primary UA-P04 implementation surface for:

- selected Kodac-derived workflow semantics reimplemented under Ascout authority;
- local event normalization;
- durable run, stage, and attempt records;
- exact-head freshness and invalidation;
- idempotency keys and reconciliation state;
- reviewer-role separation mechanics;
- crash and resume preservation of incomplete work.

### `src/assurance/publication/**`

Reserved for UA-P04-T06 through UA-P04-T10:

- PublicationIntent construction without performing effects;
- pre-publication classification and redaction gate;
- GitHub publication adapter behind explicit effect authority;
- PublicationReceipt persistence with result, retry, and reconciliation;
- duplicate and stale publication prevention;
- exact target, head, comment, payload-digest, authority, and attempt binding.

### `tests/assurance-workflow-*.test.ts`

Reserved for UA-P04 focused, adversarial, determinism, crash and resume, idempotency, and compatibility proof.

### `tests/assurance-publication-*.test.ts`

Reserved for UA-P04 intent separation, redaction, receipt durability, duplicate and stale prevention, and exact-head fixture proof. No live GitHub publication in any test.

If a task requires any tracked path outside this positive surface, implementation stops and returns to authorization amendment.

## 8. Authority model

Planning authority is not execution authority. Generation is not publication authority.

```text
REVIEW_OBSERVATION != FINDING
FINDING != SUPPORTED_CLAIM
GENERATION != PUBLICATION_INTENT
PUBLICATION_INTENT != AUTHORIZATION
AUTHORIZATION != EFFECT
EFFECT != SUPPORTED_CLAIM
PROVIDER_PRESENT != PROVIDER_AUTHORIZED
ENGINE_PRESENT != ENGINE_EXECUTION_AUTHORIZED
LOCAL_EVENT != PUBLICATION_AUTHORITY
```

All workflow construction and all publication effects must remain within the intersection of:

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

UA-P04 does not authorize:

```text
CONSTITUTION_CHANGE_BEYOND_SECTION_3_3 = NO
UA_P01_CONTRACT_MUTATION = NO
UA_P02_PLANNER_MUTATION = NO
UA_P03_REVIEW_MUTATION = NO
CLI_SURFACE_CHANGE = NO
CONFIG_SCHEMA_CHANGE = NO
CONFIG_WORKFLOW_LANGUAGE = NO
DONOR_SOURCE_INTAKE_BEYOND_T01_CHARACTERIZATION = NO
VENDORED_DONOR_COPY_WITHOUT_PROVENANCE = NO
WHOLESALE_KODAC_IMPORT = NO
SECOND_POLICY_AUTHORITY = NO
LIVE_GITHUB_PUBLICATION_IN_TESTS_OR_QUALIFICATION = NO
ASCOUT_OWNED_GITHUB_CREDENTIAL = NO
CREDENTIAL_PERSISTENCE = NO
SILENT_PUBLICATION = NO
STALE_EVIDENCE_PUBLICATION_AS_CURRENT = NO
SENSITIVE_EVIDENCE_PUBLICATION_WITHOUT_REDACTION = NO
BLIND_RETRY_ON_UNKNOWN_OUTCOME = NO
DUPLICATE_COMMENT_ON_RETRY = NO
MANDATORY_NETWORK_FOR_CORE_CLAIM = NO
MANDATORY_PROVIDER_FOR_CORE_CLAIM = NO
MANDATORY_ASCOUT_BACKEND = NO
MANDATORY_CLOUD_STORAGE = NO
MANDATORY_EXTERNAL_SERVICE = NO
CHROMADB_DEPENDENCY = NO
GENERIC_AUTOMATION_PLATFORM = NO
NOTIFICATION_COMMAND_CENTER = NO
DAEMON_OR_SERVER_REQUIREMENT = NO
SQLITE_REQUIREMENT = NO
DEPENDENCY_CHANGE = NO
PACKAGE_CHANGE = NO
LOCKFILE_CHANGE = NO
WORKFLOW_CHANGE = NO
SCORE_OVER_MISSING_OR_FAILED_EVIDENCE = NO
UA_P05_OR_LATER_IMPLEMENTATION = NO
```

Qualification runs with GitHub credentials absent. No test performs a live GitHub effect.

## 10. CLI and backward-compatibility boundary

The public CLI remains exactly the existing surface throughout UA-P04:

```text
ascout init
ascout doctor
ascout check
ascout review [--format json|terminal]
```

During UA-P04:

```text
ascout publish = unsupported
ascout workflow = unsupported
review write or publication flags = refused
```

`ascout check` task status, receipt, exit-code, changed-command admission, terminal, JSON, and agent semantics must remain unchanged throughout UA-P04. `ascout review` remains read-only with no write or publication path. Publication is a library-level explicitly authorized effect only; no new CLI publication command is admitted by this phase.

## 11. Required hard-zero invariants

Every UA-P04 implementation candidate must preserve:

```text
stale_head_published_as_current = 0
stale_head_satisfies_current_claim = 0
duplicate_publication_on_retry_or_reconnect = 0
sensitive_evidence_published_without_classification_redaction = 0
publication_without_explicit_effect_authority = 0
generation_implies_publication = 0
unknown_publication_outcome_recorded_as_success = 0
blind_retry_on_unknown_outcome = 0
crash_erases_incomplete_stage_or_attempt = 0
resume_assumes_prior_in_memory_pass = 0
unreviewed_scope_implied_clean = 0
self_review_satisfies_independence = 0
valid_observation_suppressed_by_normalization = 0
missing_review_converted_to_pass = 0
credential_persisted_in_artifact_or_receipt = 0
silent_paid_provider_fallback = 0
existing_ascout_check_semantic_regression = 0
existing_ascout_review_read_only_regression = 0
config_workflow_language_accepted = 0
```

Any hard-zero failure blocks the task regardless of aggregate pass rate.

## 12. Determinism requirements

Workflow and publication contract outputs must be deterministic for identical canonical inputs wherever no model or network call is involved. Normalization, freshness evaluation, stage transitions, idempotency decisions, classification, and reconciliation bind:

- exact target identity;
- exact intent identity;
- exact policy identity and digest;
- exact review profile identity;
- exact context capsule identity and digest;
- exact engine descriptor and qualification identity;
- exact source head;
- exact attempt identity;
- exact payload digest.

Ordering must not depend on filesystem traversal order, insertion order, clock time, randomness, process scheduling, network results, or unstable object iteration.

## 13. No-silent-fallback, absence, and local-zero-cost rules

A missing, unqualified, timed-out, denied, or unauthorized workflow or publication capability yields an explicit omission with reason. Absence must propagate as `NOT_RUN` or `INCOMPLETE` into coverage and claim assessment.

Never:

```text
required publication unavailable
-> publish weaker content or nothing
-> preserve stronger claim
```

Preserved economics, offline, privacy, and provenance gates:

```text
ZERO_OPERATOR_RUNTIME_COST_GATE = PRESERVED
OFFLINE_CORE_GATE = PRESERVED
NO_MANDATORY_ASCOUT_BACKEND_GATE = PRESERVED
NO_SILENT_PAID_FALLBACK_GATE = PRESERVED
TELEMETRY_OFF_DEFAULT_GATE = PRESERVED
LOCAL_ARTIFACT_GATE = PRESERVED
EXPLICIT_DATA_EGRESS_GATE = PRESERVED
OPTIONAL_ENGINE_ABSENCE_GATE = PRESERVED
ENTITLEMENT_TRUTH_INDEPENDENCE_GATE = PRESERVED
MODEL_SOURCE_AND_WEIGHT_PROVENANCE_GATE = PRESERVED
DONOR_PERMISSION_AND_NOTICE_GATE = PRESERVED
CLEAN_MACHINE_LOCAL_EXECUTION_GATE = PRESERVED
```

User-funded and bring-your-own-key providers may exist only as explicit optional adapters under appropriate authority. No silent remote or paid fallback is permitted.

## 14. Kodac and source admission boundary

Founder planning identifies `TheHalfMoon/Kodac` as a workflow and publication discipline donor. Planning candidacy is not admission.

UA-P04-T01 must, before any copied or adapted Kodac bytes enter Ascout:

1. re-pin the exact live Kodac source identity (repository, immutable commit, tree, and observed freshness relative to the P0 planning pin `406b335277f2df1e3dedf24cdb45847dff919d44`);
2. record the exact selected behavior and smallest required donor surface;
3. freeze selected workflow semantics with Ascout-owned fixtures;
4. record exact destination paths in `src/assurance/workflow/**` or `src/assurance/publication/**`;
5. classify each intake as copied, adapted, or reimplemented;
6. record license, notice obligations, permission basis, third-party boundary, dependency delta, and security review;
7. complete characterization tests proving the frozen behavior.

Rules:

```text
KODAC_WHOLESALE_COPY = NO
KODAC_AS_SECOND_AUTHORITY = NO
SMALLEST_REQUIRED_DONOR_SURFACE = YES
ASCOUT_OWNS_FINAL_SEMANTICS = YES
PATH_LEVEL_PROVENANCE_BEFORE_INTAKE = YES
CHARACTERIZATION_TESTS_BEFORE_INTAKE = YES
```

Issue #419 (ARES admission) remains independent and does not authorize Kodac intake. No UA-P04 task intakes ARES bytes. No UA-P04 task waits on ARES because no UA-P04 acceptance criterion requires ARES execution.

## 15. Publication effect safety

GitHub publication is a separate effect governed by sections 8, 9, 11, and 13.

Required separation:

```text
Generation -> PublicationIntent -> Authorization -> Effect -> PublicationReceipt
```

A PublicationIntent must bind exact repository identity, exact issue, pull request, or comment target, exact source head, exact publication payload digest, redaction and classification decision, authority identity, and idempotency and attempt identity without performing the effect.

A PublicationReceipt must bind effect result and reconciliation state durably. Unknown outcome remains unknown and blocks success claims until reconciled. Reconciliation must not fabricate success and must not duplicate effects.

Adapted Laya-style concepts (local event normalization, durable run and stage timeline, rules and firing audit semantics, agent workspace timeline concepts) may inform local workflow evidence only. They must not widen publication authority and must not create a generic automation surface.

## 16. Failure discipline

Required CI, test, and review failures are immutable evidence.

Do not:

- rerun-to-green;
- skip a failing test;
- weaken assertions;
- widen a global timeout to hide a local timing defect;
- use stale CI from another head;
- reuse an earlier qualification after head or configuration drift;
- force-push, rebase, or rewrite shared history.

A proven infrastructure or timing issue requires a separately prospective repair with preserved original failure evidence.

## 17. Task qualification discipline

Every UA-P04 task PR must prove:

1. exact canonical base and predecessor;
2. one-task scope and authorized-path purity;
3. focused tests for the task acceptance contract;
4. exact-head Self Verification attempt 1 success;
5. exact-head Project CI attempt 1 success across all six required lanes;
6. fresh maintainer exact-head review with zero material findings;
7. Alibaba Open Code Review bound to the exact head with raw findings preserved, material findings repaired and re-reviewed, and zero unresolved material findings;
8. Jev-backed review and evidence bound to the exact head, or an exact recorded tool limitation where Jev cannot execute (limitations never become fabricated passes);
9. unresolved material review threads = 0;
10. main, base, head, and scope unchanged immediately before merge;
11. guarded normal merge with exact expected head;
12. merge tree, ordered parents, signature, and main verified;
13. post-merge Project CI attempt 1 success across all six required lanes;
14. only then close the task `CLOSED_CANONICAL`.

PR #359 must not be merged, modified, repurposed, or cited as implementation authority under this authorization.

## 18. UA-P04 closeout

`UA-P04-T11` is qualification and closeout only. It may add only a bounded qualification sentinel or fixture within the authorized test surface and must not introduce a new capability.

P4 may close only when T01 through T10 are canonical and all hard-zero invariants are proven on a fresh exact head.

On successful T11 post-merge qualification:

```text
UA_P04 = CLOSED_CANONICAL / COMPLETE
UA_P05_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

## 19. Authorization PR purity

This authorization artifact's own PR may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P04_IMPLEMENTATION_AUTHORIZATION.md
```

No source, tests, dependencies, workflows, configs, benchmarks, donor material, Constitution text, or prior authorization artifacts may change in the authorization PR.

## 20. Effectiveness gate

Merging this authorization artifact is not sufficient by itself.

Before this authority becomes effective require:

1. exact authorization head bound to this one-file diff;
2. Self Verification attempt 1 success on that exact head;
3. Project CI attempt 1 success across all six required lanes on that exact head;
4. maintainer exact-head review with zero material findings;
5. Alibaba Open Code Review bound to the exact head with zero unresolved material findings;
6. Jev evidence bound to the exact head, or an exact recorded limitation where Jev cannot execute;
7. unresolved review threads = 0;
8. canonical main remains the expected authorization base immediately before merge;
9. guarded normal merge with exact expected head;
10. merge tree, ordered parents, verified signature, and canonical main proof;
11. push-triggered post-merge Project CI attempt 1 success across all six required lanes;
12. Issue #527 closes as `CLOSED_CANONICAL / EFFECTIVE`.

Only after all twelve conditions:

```text
UA_P04_IMPLEMENTATION_AUTHORIZED = YES
UA_P04_CONSTITUTION_AMENDMENT_A04 = RATIFIED
```

Until then:

```text
UA_P04_IMPLEMENTATION_AUTHORIZED = NO
UA_P04_SOURCE_MUTATION = FORBIDDEN
UA_P04_CONSTITUTION_AMENDMENT_A04 = NOT_RATIFIED
```

After effectiveness and before any T01 implementation branch, the mechanical Constitution v1.1.0 application PR described in section 3.4 must land on canonical main.

Refs #527
Refs #481
Refs #419
Refs #359
