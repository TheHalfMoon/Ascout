# Specification 017 — UA-P01 Shared Assurance Contracts Implementation Authorization

## Status

```text
SPEC_017_UA_P01_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
UA_P01_IMPLEMENTATION_AUTHORIZED = NO
```

**Authorization ledger:** Issue #360  
**Canonical authorization base:** `741b2f761e27de929789d88c1287f2c01b8bb9c0`  
**Canonical authorization-base tree:** `0a2d2b2261b93d0d23860327e048ae8ddb25b537`

This artifact authorizes no implementation mutation until it is exact-head
qualified, guarded-merged, post-merge verified, and Issue #360 is closed as:

```text
UA_P01_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE
UA_P01_IMPLEMENTATION_AUTHORIZED = YES
```

Before that closeout, `UA-P01` remains non-effective planning only.

## Canonical authority chain

Read this authorization in precedence order with:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Unified Assurance planning merged by PR #358;
4. `docs/strategy/ASCOUT_UNIFIED_ASSURANCE_CONTRACT_FREEZE_2026-09-19.md`;
5. `docs/strategy/ASCOUT_UNIFIED_ASSURANCE_IMPLEMENTATION_BLUEPRINT_2026-09-19.md`;
6. `docs/strategy/ASCOUT_UNIFIED_ASSURANCE_TASK_REGISTRY_2026-09-19.md`;
7. `docs/strategy/ASCOUT_UNIFIED_ASSURANCE_IMPLEMENTATION_HANDOFF_2026-09-19.md`;
8. `docs/strategy/ASCOUT_UNIFIED_ASSURANCE_GAP_AUDIT_2026-09-19.md`;
9. `docs/strategy/ASCOUT_UNIFIED_ASSURANCE_P0_CANONICALIZATION_2026-09-19.md`;
10. Issue #360;
11. this authorization artifact.

Live canonical repository/GitHub truth overrides stale prose.

## Canonical planning predecessor

Unified Assurance planning is canonical:

```text
Planning PR:
  #358

Qualified planning head:
  c98017ea657cd24d5495aa124a66b4785dc5ab0f

Planning merge:
  741b2f761e27de929789d88c1287f2c01b8bb9c0

Planning merge tree:
  0a2d2b2261b93d0d23860327e048ae8ddb25b537

Ordered parents:
  e23331a46ea04bbcfd4dc4e2b538dbb410125a1a
  c98017ea657cd24d5495aa124a66b4785dc5ab0f

GitHub merge verification:
  verified = true
  reason = valid

PR-head Project CI:
  run 35431241498
  conclusion = SUCCESS

PR-head Self Verification:
  run 35431241503
  conclusion = SUCCESS

Final exact-head CodeRabbit review:
  prior material findings reconciled
  no new material planning blocker

Unresolved material review threads:
  0

Post-merge Project CI:
  run 35432899507
  attempt = 1
  conclusion = SUCCESS
  required six-lane matrix = SUCCESS
```

No implementation authority was granted by the planning merge.

## Founder authority element

The founder's live directive on 2026-09-19 is to continue Ascout through
canonical governance without routine approval pauses.

That directive satisfies the founder-intent element for this bounded
authorization only.

It does not waive:

- Constitution requirements;
- exact-head qualification;
- branch purity;
- predecessor ordering;
- source binding;
- no-green-by-omission;
- privacy/redaction;
- CI;
- review reconciliation;
- licensing/provenance;
- effect authority;
- one-task-per-branch/PR discipline.

## G75 historical authority reconciliation

This authorization prospectively resolves the successor frontier without
rewriting history.

Canonical facts:

1. Issue #344 made P016-01 effective for P016-02 through P016-09 only.
2. The same artifact explicitly excluded P016-10+ from that authority.
3. P016-10 through P016-13 later entered canonical history through PRs
   #354, #355, #356, and #357.
4. The Unified Assurance live audit did not find a separate canonical
   authorization ledger that made P016-10 through P016-13 effective before
   those merges.
5. Existing P016-10 through P016-13 implementation history is preserved.
6. This authorization MUST NOT fabricate retroactive authority.

Binding disposition:

```text
P016_10_13_CODE_PRESENCE = CANONICAL_FACT
P016_10_13_TECHNICAL_VALIDITY = NOT_REVOKED_BY_THIS_AUTHORIZATION
P016_10_13_AUTHORITY_PROVENANCE = INCOMPLETE
P016_10_13_AUTHORITY_PRECEDENT = NO
P016_10_13_HISTORY_REWRITE = FORBIDDEN
RETROACTIVE_AUTHORITY_FABRICATION = FORBIDDEN

P016_14_PLUS_FRONTIER = SUPERSEDED_PROSPECTIVELY_BY_UNIFIED_ASSURANCE
P016_14_PLUS_IMPLEMENTATION_AUTHORITY = NO
P016_14_PLUS_AUTOMATIC_CARRY_FORWARD = FORBIDDEN
```

Meaning:

- P016-10..13 code remains canonical source that later work may read,
  characterize, test, and reuse where the new phase actually requires it;
- its presence does not prove that wider historical authority existed;
- the unexecuted P016-14+ planning frontier no longer supplies successor
  implementation authority;
- any capability corresponding to P016-14+ must enter through the Unified
  Assurance phase/task that owns it and receive that phase's future authority.

This is a prospective successor decision, not a retroactive history repair.

## Constitution classification

The canonical P0 matrix classifies `UA-P01 Shared assurance contracts` as:

```text
CONSTITUTION_COMPATIBLE
```

Reason:

- contract/types/validators/tests only;
- no new external execution surface;
- no model/provider requirement;
- no donor engine;
- no network effect;
- no publication effect;
- no new service/daemon/database;
- no Constitution weakening.

Compatibility is not authority. This artifact is still required.

## Exact authorized phase

After this artifact becomes effective, exactly:

```text
UA-P01-T01
UA-P01-T02
UA-P01-T03
UA-P01-T04
UA-P01-T05
UA-P01-T06
UA-P01-T07
UA-P01-T08
UA-P01-T09
UA-P01-T10
UA-P01-T11
UA-P01-T12
UA-P01-T13
UA-P01-T14
UA-P01-T15
UA-P01-T16
UA-P01-T17
UA-P01-T18
```

No `UA-P02` or later task is authorized by implication.

## Repository task discipline remains binding

`CONTRIBUTING.md` requires one canonical task per task-scoped branch and PR.

Therefore:

- this phase authorization covers the full dependency-ordered UA-P01 sequence;
- each task still gets its own branch and pull request;
- a task may contain multiple forward-only commits only when they belong to
  that single task;
- future tasks may not be implemented early;
- the next task may begin only after its predecessor is canonically merged
  and post-merge closed;
- no rebase, force-push, destructive history rewrite, or task bundling is
  authorized.

Read-only preparation is allowed but must be revalidated when a task becomes
eligible.

## Authorized implementation objective

Build the shared internal assurance-contract spine without changing current
`ascout check` semantics.

The phase may implement only:

1. `AssuranceTarget`;
2. `AssuranceIntent`;
3. `AssurancePolicySnapshot`;
4. `AssurancePlan`;
5. `EngineDescriptor`;
6. `EngineQualification`;
7. `EngineRun`;
8. `EvidenceRef`;
9. `Finding` and append-only lifecycle events;
10. `CoverageClaim`;
11. `OmissionRecord`;
12. `ContradictionRecord`;
13. `ClaimAssessment`;
14. strict structural schemas or equivalent pure structural validators;
15. semantic validators;
16. deterministic serialization and digest;
17. bounded adversarial contract fixtures/tests;
18. compatibility proof that existing `ascout check` behavior is unchanged.

## Exact task sequence and acceptance

### UA-P01-T01 — AssuranceTarget

Deliver:

- exact target type;
- constructor/parser/validator;
- source-binding invariants.

Acceptance:

- exact source identity preserved;
- malformed target rejected;
- cross-target identity mismatch rejected;
- raw credential-bearing remote identity cannot enter persisted target truth;
- raw absolute local repository path cannot enter persisted target truth;
- no source/tree identity is guessed or repaired.

### UA-P01-T02 — AssuranceIntent

Deliver:

- requested claim;
- profile;
- scope;
- include/exclude constraints;
- maximum effect class;
- budget;
- exact target reference;
- surface provenance.

Acceptance:

- malformed/unknown enum/state rejected;
- intent cannot grant execution authority;
- effect request remains data only.

### UA-P01-T03 — AssurancePolicySnapshot

Deliver:

- trusted policy sources;
- advisory repository policy sources;
- mandatory checks;
- effect ceilings;
- qualification/independence/freshness/data rules;
- deterministic identity/digest input.

Acceptance:

- advisory repository policy cannot weaken canonical minimums;
- policy source classes remain explicit.

### UA-P01-T04 — AssurancePlan

Deliver selected/omitted work and explicit requirements.

Acceptance:

- omitted checks carry reasons;
- required effects are explicit;
- plan never becomes effect authority.

### UA-P01-T05 — EngineDescriptor

Deliver exact engine identity/capability/effect/authority-ceiling contract.

Acceptance:

- exact identity required;
- authority ceiling explicit;
- unknown implementation cannot inherit capability truth.

### UA-P01-T06 — EngineQualification

Deliver exact implementation/config/platform qualification references.

Acceptance:

- mismatch invalidates qualification;
- provider self-description is not qualification evidence.

### UA-P01-T07 — EngineRun

Deliver immutable execution-occurrence identity/lineage contract only.

Acceptance:

- run binds plan, target, engine, qualification, config, runtime, and lineage;
- this task defines data only and executes no engine.

### UA-P01-T08 — EvidenceRef

Deliver resolvable evidence lineage/classification contract.

Acceptance:

- target/run lineage required;
- dangling evidence is invalid;
- stale or differently bound evidence cannot silently become current.

### UA-P01-T09 — Finding + lifecycle

Deliver canonical finding and append-only lifecycle events.

Acceptance:

- a clean later engine result cannot erase a validated finding;
- producer observation remains attributable;
- lifecycle transitions are explicit.

### UA-P01-T10 — CoverageClaim

Deliver multidimensional coverage/unknown representation.

Acceptance:

- coverage is not one opaque percentage;
- unknown/unsupported/unobserved dimensions remain explicit.

### UA-P01-T11 — OmissionRecord + ContradictionRecord

Deliver first-class missing/conflicting-evidence contracts.

Acceptance:

- omission reason is explicit;
- contradiction preserves both sides and lineage;
- neither can be silently dropped by aggregation.

### UA-P01-T12 — ClaimAssessment

Deliver claim reconciliation contract.

Acceptance:

- supporting, contradicting, missing, stale, refused, and unknown evidence are
  represented;
- no aggregate score overrides missing mandatory evidence;
- only Ascout reconciliation owns this terminal contract.

### UA-P01-T13 — Structural schemas

Deliver strict versioned structural validators.

Acceptance:

- unknown required-shape violations fail closed;
- version handling is explicit;
- no second service/database/schema runtime is added.

### UA-P01-T14 — Semantic validator

Deliver cross-object/source/claim referential invariants.

Acceptance:

- cross-target references rejected;
- dangling refs rejected;
- invalid lifecycle relationships rejected;
- claim/evidence authority invariants fail closed.

### UA-P01-T15 — Deterministic serialization/digest

Deliver stable serialization/digest primitives.

Acceptance:

- identical semantic input produces byte-stable canonical serialization;
- object insertion order does not change digest;
- unsupported/non-finite/non-JSON values fail closed;
- no dependency is added merely for canonical JSON.

### UA-P01-T16 — Adversarial contract corpus

Deliver bounded owned fixtures for:

- malformed structures;
- cross-target evidence;
- dangling refs;
- stale evidence;
- invalid lifecycle transitions;
- omitted mandatory evidence;
- contradictory evidence;
- invalid/unknown states;
- serialization instability attempts.

Acceptance:

- every expected rejection proves the intended structural/semantic boundary;
- valid controls prove the harness does not reject everything.

### UA-P01-T17 — Existing check compatibility

Prove current `ascout check` semantics remain unchanged.

Acceptance:

- existing tests remain green;
- receipt/task/exit semantics are unchanged;
- no CLI surface change is required;
- new assurance contracts remain internal/additive.

### UA-P01-T18 — Exact-head phase qualification

Prove:

- full typecheck;
- full tests;
- build;
- Project CI;
- Self Verification where applicable;
- exact-head independent review;
- zero unresolved material review threads;
- phase hard gates;
- canonical closeout.

T18 is qualification/closeout, not authority for P2.

## Authorized tracked implementation mutation surface

After Issue #360 becomes effective, UA-P01 task PRs may mutate only:

```text
src/assurance/**
tests/assurance-*.test.ts
```

Rules:

- `src/assurance/**` is a new internal namespace;
- task PRs may modify files created by canonically completed earlier UA-P01
  tasks only when required by the current task;
- `tests/assurance-*.test.ts` is reserved for UA-P01 contract/adversarial/
  compatibility proof;
- existing product/source files remain read-only under this phase;
- existing tests are executed as compatibility evidence but are not modified;
- no public CLI/export requirement is introduced by this phase.

If a valid implementation requires mutation outside this surface, the task
MUST stop and return to planning/authorization amendment.

## Explicitly forbidden tracked paths

UA-P01 MUST NOT mutate:

```text
package.json
package-lock.json
.github/**
.specify/memory/constitution.md
src/check.ts
src/cli.ts
src/browser/**
src/quality/**
src/receipt/**
benchmarks/**
specs/001-016/**
docs/brand/**
```

This list is illustrative plus binding; the positive allowlist above is the
actual authority boundary.

## Dependency and source-intake boundary

UA-P01 authorizes:

```text
NEW_RUNTIME_DEPENDENCY = NO
NEW_DEV_DEPENDENCY = NO
DONOR_CODE_IMPORT = NO
DONOR_ENGINE_EXECUTION = NO
EXTERNAL_PROVIDER = NO
NETWORK_REQUIRED_BY_NEW_CODE = NO
```

Kodac, Sentrdel, Kernux, WePLD, Alibaba OpenCodeReview, Cloudflare Security
Audit Skill, and all other donor/reference sources remain read-only planning
inputs during UA-P01.

Their future source-admission records are not needed for this phase because
this phase imports none of their code.

## Effect ceiling

UA-P01 effect ceiling:

```text
PURE_IN_PROCESS_CONTRACT_LOGIC
+ TEST_FIXTURE_FILE_IO_IN_TEST_TEMP_DIRECTORIES_ONLY_WHEN_ALREADY_SUPPORTED
```

No contract or validator may itself:

- launch a process;
- launch a browser;
- make a network request;
- mutate product source;
- write GitHub;
- install a dependency;
- access credentials;
- grant a capability;
- authorize a later phase.

## Source-binding/privacy invariants

The phase MUST preserve constitutional source truth.

Persistable target/evidence contracts must not contain:

- raw credential-bearing remotes;
- raw absolute local repository paths;
- raw secrets;
- unbounded stdout/stderr;
- hidden source-identity substitutions.

An adapter may read existing canonical source identity data, but it must not
invent a second source-state implementation.

## No-green-by-omission invariants

The phase MUST NOT define a claim model where:

- missing required evidence becomes supported;
- unavailable work disappears;
- stale evidence counts as current without explicit reconciliation;
- refused work counts as PASS;
- unknown becomes false/clear;
- one clean engine erases another validated finding;
- an aggregate score overrides a mandatory gap.

## Deterministic serialization rules

Canonical serialization/digest implementation must:

- be deterministic for identical semantic input;
- sort object keys recursively or provide an equivalent proven canonical rule;
- preserve array order where array order is semantically meaningful;
- reject unsupported values rather than silently stringify them differently;
- use repository-native Node cryptography for digesting;
- avoid a new canonicalization dependency.

## Phase hard-zero integrity gates

Every applicable UA-P01 qualification must preserve zero instances of:

```text
cross_target_evidence_accepted = 0
dangling_evidence_ref_accepted = 0
stale_evidence_silently_current = 0
raw_secret_or_raw_local_path_persisted_by_new_contracts = 0
unsupported_state_silently_coerced = 0
finding_erased_by_clean_engine_result = 0
mandatory_omission_hidden = 0
contradiction_dropped = 0
claim_supported_with_missing_mandatory_evidence = 0
deterministic_digest_drift_for_identical_input = 0
existing_ascout_check_semantic_regression = 0
```

Aggregate pass rate cannot override these gates.

## Existing P016-10..13 characterization rule

UA-P01 does not modify browser code.

It may read existing P016-10..13 code only to avoid contract duplication and
to understand existing source/evidence identities.

No UA-P01 test may:

- relabel P016-10..13 as historically authorized;
- depend on a nonexistent P016-14+ implementation;
- widen browser authority;
- use browser success as global assurance proof.

## Authorization PR purity

This authorization PR itself may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P01_IMPLEMENTATION_AUTHORIZATION.md
```

It MUST NOT modify product source, tests, package metadata, lockfiles,
workflows, configuration, Constitution, benchmarks, or any prior spec.

## Authorization candidate qualification gate

Before this authorization artifact may merge, its exact final head MUST prove:

1. canonical base is still `741b2f761e27de929789d88c1287f2c01b8bb9c0`
   or any main advancement is explicitly reconciled before qualification;
2. branch purity is exactly the one authorization file;
3. PR #359 remains frozen/separate and has no path overlap;
4. Project CI succeeds on the exact authorization head;
5. Self Verification succeeds where applicable;
6. exact-head review finds zero unresolved material authorization/security
   findings;
7. unresolved review threads = 0;
8. maintainer exact-head verification is recorded;
9. merge uses unchanged expected head;
10. post-merge canonical main/tree/signature state is verified;
11. post-merge Project CI succeeds on the merge commit;
12. Issue #360 is then, and only then, closed
    `CLOSED_CANONICAL / EFFECTIVE`.

No successful PR-head CI alone makes the authorization effective.

## Task execution loop after effectiveness

For each `UA-P01-Txx` task:

```text
re-read live main + Constitution + Issue #360 + this authorization
-> prove predecessor CLOSED_CANONICAL
-> branch from exact main
-> implement that one task only
-> focused deterministic tests
-> relevant adversarial/compatibility test
-> full typecheck/test/build
-> exact-head Project CI
-> Self Verification where applicable
-> exact-head review
-> reconcile all material findings with forward commits
-> verify branch purity
-> guarded expected-head merge
-> verify main / ordered parents / tree / signature
-> verify post-merge Project CI
-> record task closeout
-> only then start the next task
```

No routine founder approval is required between tasks already covered by this
effective phase authorization.

## Completion boundary

When `UA-P01-T18` is canonically closed:

```text
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

The next phase requires its own fresh Constitution/authority decision and
explicit canonical implementation authorization.
