# UA-P01 Implementation Authorization V2 — Shared Assurance Contract Spine

**Status:** PROPOSED / NOT EFFECTIVE  
**Ledger:** Issue #360  
**Canonical base:** `ba8f2912a5f850719e6fbadd48971256a8cdf11b`  
**Canonical base tree:** `b214d876d83a7dbcaadab185ba90d7784d1c63c8`  
**Date:** 2026-09-19

## 1. Authority state

```text
UA_P01_AUTHORIZATION_V2 = PROPOSED / NOT_EFFECTIVE
UA_P01_IMPLEMENTATION_AUTHORIZED = NO
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
```

This artifact is prospective authority only.

Its presence, review, PR-head CI success, or merge by itself does not authorize
UA-P01 source mutation.

UA-P01 implementation becomes effective only after:

1. this exact final artifact is qualified on its original exact-head attempt;
2. the PR is guarded-merged by normal merge using the expected head SHA;
3. canonical main/ordered parents/tree/signature/path identity is verified;
4. push-triggered post-merge Project CI succeeds on attempt 1 across all six
   required lanes; and
5. Issue #360 closes:

```text
UA_P01_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE
UA_P01_IMPLEMENTATION_AUTHORIZED = YES
```

## 2. Canonical planning predecessor

Unified Assurance planning is canonical through:

```text
PLANNING_PR = #358
PLANNING_HEAD = c98017ea657cd24d5495aa124a66b4785dc5ab0f
PLANNING_MERGE = 741b2f761e27de929789d88c1287f2c01b8bb9c0
PLANNING_MERGE_TREE = 0a2d2b2261b93d0d23860327e048ae8ddb25b537
POST_MERGE_PROJECT_CI = 35432899507
POST_MERGE_PROJECT_CI_CONCLUSION = SUCCESS
POST_MERGE_REQUIRED_LANES = 6/6 SUCCESS
```

The canonical task registry names the first implementation phase
`UA-P01 Shared assurance contracts` and tasks `UA-P01-T01..T18`.

## 3. Failed UA-P01 V1 candidate remains durable evidence

The first UA-P01 authorization candidate was PR #361.

```text
PR = #361
HEAD = 6ae6331563093f25a7842c461f125d8e638d21ea
BASE = 741b2f761e27de929789d88c1287f2c01b8bb9c0
PROJECT_CI_RUN = 35434630121
RUN_ATTEMPT = 1
CONCLUSION = FAILURE
FAILED_LANE = macos-14 / node-22
FAILED_SUITE = tests/browser-benchmark.integration.test.ts
FAILURE = beforeAll hook timed out in 600000ms
PR_DISPOSITION = CLOSED_UNMERGED
```

The V1 candidate is permanently unqualified.

```text
UA_P01_AUTHORIZATION_V1 = FAILED / NOT_EFFECTIVE
RERUN_TO_GREEN = FORBIDDEN
RETROACTIVE_QUALIFICATION = FORBIDDEN
FAILURE_EVIDENCE = PRESERVED
```

This V2 artifact does not overwrite, reinterpret, or upgrade that failure.

## 4. Canonical CI-stability recovery lineage

The V1 failure exposed a pre-existing Chromium provisioning race. Recovery
proceeded prospectively and preserved all failed evidence.

### 4.1 Browser-CI recovery authorization V1

```text
AUTH_PR = #363
AUTH_MERGE = d179f7998c824c8dc18a6686a2e01e2d5ef413af
POST_MERGE_PROJECT_CI = 35436345191
POST_MERGE_CONCLUSION = FAILURE
FAILED_LANE = windows-2025 / node-22
FAILED_TEST = tests/run.test.ts :: T024 retention bound
AUTHORITY_RESULT = CANONICAL_BUT_NOT_EFFECTIVE
```

No retroactive activation occurred.

### 4.2 T024 Windows deadline repair

```text
REPAIR_ISSUE = #364
REPAIR_PR = #365
REPAIR_MERGE = cb33f4ecbed02c514d574baeaab6dc57322c4997
POST_MERGE_PROJECT_CI = 35437862314
POST_MERGE_CONCLUSION = SUCCESS
POST_MERGE_REQUIRED_LANES = 6/6 SUCCESS
```

The repair changed only the named local T024 test deadline
`15000ms -> 60000ms` under separate prospective authority.

### 4.3 Browser-CI recovery authorization V2

```text
AUTH_ISSUE = #366
AUTH_PR = #367
AUTH_MERGE = 3c6b636943d3d7ce1bac0ea5d49c6ea192e9bac7
POST_MERGE_PROJECT_CI = 35443072603
POST_MERGE_CONCLUSION = SUCCESS
POST_MERGE_REQUIRED_LANES = 6/6 SUCCESS
AUTHORITY_RESULT = CLOSED_CANONICAL / EFFECTIVE
```

### 4.4 Browser-CI workflow recovery implementation

```text
IMPLEMENTATION_PR = #368
IMPLEMENTATION_HEAD = da3b1cb556b01cbca48bfed4a8eb593895395995
IMPLEMENTATION_MERGE = ba8f2912a5f850719e6fbadd48971256a8cdf11b
IMPLEMENTATION_TREE = b214d876d83a7dbcaadab185ba90d7784d1c63c8
PR_HEAD_SELF_VERIFICATION = 35443842650 / SUCCESS
PR_HEAD_PROJECT_CI = 35443842683 / SUCCESS / 6 of 6
POST_MERGE_PROJECT_CI = 35446207305
POST_MERGE_RUN_ATTEMPT = 1
POST_MERGE_CONCLUSION = SUCCESS
POST_MERGE_REQUIRED_LANES = 6/6 SUCCESS
BROWSER_CI_RECOVERY = CLOSED_CANONICAL / COMPLETE
```

The workflow now provisions the already-required exact
`playwright@1.63.0` Chromium runtime once per matrix lane before tests.

This recovery grants no UA-P01 authority by implication.

## 5. G75 historical authority reconciliation

The following canonical planning truth is binding:

```text
P016_10_13_CODE_PRESENCE = CANONICAL_FACT
P016_10_13_AUTHORITY_PROVENANCE = INCOMPLETE
P016_10_13_AUTHORITY_PRECEDENT = NO
P016_10_13_HISTORY_REWRITE = FORBIDDEN
RETROACTIVE_AUTHORITY_FABRICATION = FORBIDDEN
P016_14_PLUS_FRONTIER = SUPERSEDED_BY_UNIFIED_ASSURANCE_SUCCESSOR_PLAN
P016_14_PLUS_IMPLEMENTATION_AUTHORITY = NO
```

Issue #344 authorized P016-02 through P016-09 only.

Canonical main contains P016-10 through P016-13 through PRs #354-#357, but
the planning audit did not find separate canonical pre-merge authorization
for those units.

Therefore:

- P016-10..13 remain canonical implementation input;
- their technical presence is not revoked;
- they are not precedent for bypassing authority;
- history is not rewritten;
- authority is not fabricated retroactively;
- the unexecuted P016-14+ implementation frontier is prospectively
  superseded by the Unified Assurance task registry;
- any corresponding future capability must enter through its Unified
  Assurance phase/task and separate effective authority.

## 6. Constitution classification

Canonical P0 planning classifies UA-P01 as:

```text
CONSTITUTION_COMPATIBLE
```

Reason:

- contracts/types/validators/tests only;
- no external engine execution;
- no provider/model requirement;
- no donor intake;
- no new network effect;
- no publication effect;
- no service/daemon/database;
- no Constitution weakening.

Compatibility is not authority. This V2 artifact remains required.

## 7. Exact authorized phase after effectiveness

Only these tasks become authorized after Issue #360 closes effective:

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

No UA-P02 or later phase is authorized by implication.

## 8. Repository task discipline remains binding

`CONTRIBUTING.md` requires one canonical task per task-scoped branch/PR.

Therefore:

- this artifact authorizes the dependency-ordered UA-P01 phase;
- each task still receives its own branch and pull request;
- multiple forward-only commits are allowed only within that one task;
- future tasks may not be implemented early;
- a successor task may begin only after its predecessor is canonically merged,
  post-merge verified, and closed;
- no task bundling, force-push, rebase, or shared-history rewrite is
  authorized.

Read-only preparation is allowed but must be revalidated at task start.

## 9. Authorized implementation objective

Build the shared internal Ascout assurance-contract spine without changing
current `ascout check` semantics.

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

## 10. Exact task sequence and acceptance

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
- no source/tree identity is guessed, repaired, or independently rederived.

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

- required-shape violations fail closed;
- version handling is explicit;
- no second schema runtime/service/database is added.

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
- no canonicalization dependency is added.

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

- every expected rejection proves its intended boundary;
- valid controls prove the harness does not reject everything.

### UA-P01-T17 — Existing check compatibility

Prove current `ascout check` semantics remain unchanged.

Acceptance:

- existing tests remain green;
- receipt/task/exit semantics remain unchanged;
- no CLI surface change;
- assurance contracts remain internal/additive.

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

T18 is closeout only and does not authorize P2.

## 11. Authorized tracked implementation mutation surface

After Issue #360 becomes effective, UA-P01 task PRs may mutate only:

```text
src/assurance/**
tests/assurance-*.test.ts
```

Rules:

- `src/assurance/**` is a new internal namespace;
- a task may modify files created by completed earlier UA-P01 tasks only when
  required by the current task;
- `tests/assurance-*.test.ts` is reserved for UA-P01 contract/adversarial/
  compatibility proof;
- existing product/source files remain read-only;
- existing tests run as compatibility evidence but are not modified;
- no public CLI/export requirement is introduced.

If a valid implementation requires any other tracked path, stop and return to
planning/authorization amendment.

## 12. Explicitly forbidden tracked paths

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

The positive allowlist in Section 11 is the actual authority boundary.

## 13. Dependency and source-intake boundary

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
Audit Skill, and all other donors/reference sources remain read-only planning
inputs during UA-P01.

Alibaba OpenCodeReview may not execute under UA-P01.

## 14. Effect ceiling

UA-P01 effect ceiling:

```text
PURE_IN_PROCESS_CONTRACT_LOGIC
+ TEST_FIXTURE_FILE_IO_IN_TEST_TEMP_DIRECTORIES_ONLY_WHEN_ALREADY_SUPPORTED
```

No new contract/validator may:

- launch a process;
- launch a browser;
- make a network request;
- mutate product source;
- write GitHub;
- install a dependency;
- access credentials;
- grant a capability;
- authorize a later phase.

The existing Project CI browser provisioning step is repository qualification
infrastructure and is not authority for new UA-P01 runtime effects.

## 15. Source-binding and privacy invariants

Persistable target/evidence contracts must not contain:

- raw credential-bearing remotes;
- raw absolute local repository paths;
- raw secrets;
- unbounded stdout/stderr;
- hidden source-identity substitutions.

UA-P01 MUST reuse canonical source facts rather than create a second
source-state implementation.

For T01 specifically, existing canonical `SourceStateV1`,
`RepositoryIdentity`, and source/tree identity semantics are read-only
inputs/reference contracts. New target code may validate/copy already-safe
fields but must not read Git, normalize remotes, hash repository paths, or
reimplement `composeSourceState`.

## 16. No-green-by-omission invariants

UA-P01 MUST NOT define a claim model where:

- missing required evidence becomes supported;
- unavailable work disappears;
- stale evidence silently counts as current;
- refused work counts as PASS;
- unknown becomes false/clear;
- one clean engine erases another validated finding;
- an aggregate score overrides a mandatory gap.

## 17. Deterministic serialization rules

Canonical serialization/digest implementation must:

- be deterministic for identical semantic input;
- recursively sort object keys or prove an equivalent canonical rule;
- preserve array order where semantically meaningful;
- reject unsupported values rather than stringify them inconsistently;
- use repository-native Node cryptography;
- add no canonicalization dependency.

## 18. Phase hard-zero integrity gates

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

## 19. Existing P016-10..13 characterization rule

UA-P01 does not modify browser code.

It may read existing P016-10..13 code only to avoid contract duplication and
understand canonical source/evidence identities.

No UA-P01 test may:

- relabel P016-10..13 as historically authorized;
- depend on a nonexistent P016-14+ implementation;
- widen browser authority;
- use browser success as global assurance proof.

## 20. Frozen brand/UI separation

PR #359 remains:

```text
OPEN / DRAFT / FROZEN
```

Frozen branch/snapshot:

```text
freeze/ascout-brand-ui-v1
8a53e41938c13ef3270903fb5c9402372a6a9201
```

Brand/UI work is separate from UA-P01 and must not be merged into or used to
widen this phase.

## 21. Authorization PR purity

This V2 authorization PR itself may change exactly one tracked path:

```text
specs/017-unified-assurance/UA_P01_IMPLEMENTATION_AUTHORIZATION_V2.md
```

It MUST NOT modify product source, tests, package metadata, lockfiles,
workflows, configuration, Constitution, benchmarks, brand files, or prior
specs.

## 22. Authorization candidate qualification gate

Before this V2 artifact may merge, its exact final head MUST prove:

1. canonical base remains
   `ba8f2912a5f850719e6fbadd48971256a8cdf11b`;
2. changed tracked path count is exactly one;
3. changed path is exactly this V2 artifact;
4. PR #361 remains closed/unmerged failure evidence;
5. Issue #366 remains CLOSED_CANONICAL and browser-CI recovery remains
   complete;
6. recovery PR #368 remains canonically merged;
7. PR #359 remains frozen/separate with zero path overlap;
8. G75 values in Section 5 remain exact;
9. Self Verification succeeds;
10. original-attempt Project CI succeeds across all six required lanes;
11. the pre-test Chromium provisioning step succeeds on all six lanes;
12. exact-head review finds zero unresolved material authorization/security/
    portability findings;
13. unresolved review thread count is zero;
14. canonical main and exact head remain unchanged immediately before merge;
15. guarded normal merge uses the exact expected head;
16. post-merge main/ordered parents/tree/signature/path identity is verified;
17. push-triggered post-merge Project CI succeeds on attempt 1 across all six
    lanes; and
18. only then Issue #360 closes
    `CLOSED_CANONICAL / EFFECTIVE`.

No successful PR-head CI alone makes the authorization effective.

## 23. Task execution loop after effectiveness

For each `UA-P01-Txx`:

```text
re-read live main + Constitution + Issue #360 + V2 authorization
-> prove predecessor CLOSED_CANONICAL
-> create one task-scoped branch from exact main
-> implement that one task only
-> run focused deterministic/adversarial tests
-> run relevant compatibility evidence
-> run full typecheck/test/build
-> qualify exact head with original-attempt Project CI
-> qualify Self Verification where applicable
-> perform exact-head maintainer/independent review
-> reconcile every material finding only by justified forward commit
-> verify branch purity
-> guarded normal merge using exact expected head
-> verify canonical main / ordered parents / tree / signature / changed paths
-> verify push-triggered post-merge Project CI
-> record task CLOSED_CANONICAL
-> only then begin the next task
```

No routine founder approval is required between tasks already covered by this
effective phase authorization.

## 24. Completion boundary

When UA-P01-T18 is canonically closed:

```text
UA_P01_SHARED_ASSURANCE_CONTRACTS = CLOSED_CANONICAL / COMPLETE
UA_P02_IMPLEMENTATION_AUTHORIZED = NO
ASCOUT_PROJECT_COMPLETE = NO
```

The next phase requires a fresh live Constitution/authority decision and
separate canonical implementation authorization.
