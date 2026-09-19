# Ascout Unified Assurance — Implementation Blueprint

**Status:** IMPLEMENTATION-READY PLANNING / NO IMPLEMENTATION AUTHORITY  
**Date:** 2026-09-19  
**Planning branch:** `plan/unified-assurance-platform`  
**Depends on:** Contract Freeze + Master Plan + Source Map + Gap Audit + Kernux Reality Fabric

## 0. Objective

Convert the unified Ascout strategy into a build program that an implementation agent can execute without redesigning the product.

This blueprint does not replace active Spec 016 authority. It defines the successor program and must be reconciled against live `main` before implementation authorization.

## 1. Product target

The target product is:

```text
ASCOUT
  review
  test
  security
  cyber
  assure
```

All surfaces share:

```text
AssuranceTarget
AssurancePolicySnapshot
AssurancePlan
Engine Registry
Evidence
Finding
Coverage
Freshness
Reverification
ClaimAssessment
```

Kernux provides reality execution; Ascout remains claim authority.

## 2. Repository architecture target

Do not create separate products inside the repository.

Recommended additive structure:

```text
src/
  assurance/
    contracts/
      target.ts
      intent.ts
      policy.ts
      plan.ts
      engine.ts
      evidence.ts
      finding.ts
      coverage.ts
      claim.ts
      reality.ts
    kernel/
      planner.ts
      registry.ts
      normalizer.ts
      reconciler.ts
      freshness.ts
      omissions.ts
      contradictions.ts
      claim-assessor.ts
    profiles/
      review/
      test/
      security/
      cyber/
      assure/
    engines/
      native/
      open-code-review/
      sentrdel/
      kernux/
      external/
    publication/
    output/
    provenance/

src/browser/
  existing Spec 016 code remains authoritative for browser intent/oracle semantics

schemas/
  assurance/

benchmarks/
  assurance/
  review/
  reality/
  security/
  cyber/

provenance/
  unified-assurance/
```

Exact file names may change, but ownership boundaries may not.

## 3. Integration strategy

### 3.1 Existing Ascout core

Reuse, do not replace:

- source identity and drift detection;
- receipt/evidence integrity;
- task status vocabulary;
- changed-command admission;
- environment identity;
- bounded process execution;
- coverage/exercise semantics;
- browser P016 intent/oracle/journey/evidence;
- self-verification and adversarial corpus patterns.

### 3.2 Alibaba OpenCodeReview

Start adapter-first.

Initial integration:

```text
AssuranceTarget
-> Review Context Capsule
-> OpenCodeReview invocation
-> machine-readable raw observation
-> validation
-> normalized Finding/Coverage
-> Ascout receipt/ClaimAssessment
```

No source port in first wedge.

### 3.3 Sentrdel

Start companion-engine adapter-first.

Initial integration:

```text
AssuranceTarget
-> Sentrdel deterministic request
-> versioned output
-> Evidence/Coverage/Finding normalization
-> Ascout reconciliation
```

Do not rewrite Rust merely for language consolidation.

### 3.4 Kernux

Start protocol bridge first, execution later as Kernux phases become qualified.

```text
RealityTestPlan
-> Kernux capability negotiation
-> qualified Runtime
-> bounded Grant
-> real execution
-> Kernux Events/Artifacts/Evidence
-> Ascout normalization
```

No raw browser/computer bypass for claim-bearing reality tests.

## 4. Delivery phases

### UA-P0 — Planning canonicalization and authority

**Goal:** make the plan canonical and safe to implement.

Required outputs:

- exact live main reconciliation;
- exact donor/source re-pins;
- Constitution compatibility matrix;
- owner-wide source inventory disposition;
- planning PR review/CI;
- explicit implementation authorization for UA-P01 only.

Exit gate:

```text
PLAN_CANONICAL = YES
OPEN_MATERIAL_PLANNING_FINDINGS = 0
FIRST_WEDGE_AUTHORIZED = YES
```

No runtime code before this gate.

### UA-P01 — Assurance contracts and compatibility spine

**Goal:** add shared contracts without changing existing `ascout check` behavior.

Implement:

- AssuranceTarget adapter over existing source identity;
- AssuranceIntent;
- AssurancePolicySnapshot;
- AssurancePlan;
- EngineDescriptor/Qualification/Run;
- EvidenceRef;
- Finding/Lifecycle;
- CoverageClaim;
- OmissionRecord;
- ContradictionRecord;
- ClaimAssessment;
- deterministic serialization/digest;
- JSON schema or equivalent structural validators;
- semantic validators;
- compatibility tests proving no current receipt/check regression.

No model, network, donor engine, Kernux, Sentrdel, or publication effect.

Exit gate:

- all new contracts deterministic;
- invalid/dangling/cross-target structures rejected;
- existing tests/typecheck/build pass;
- `ascout check` output unchanged except explicitly approved additive internals;
- adversarial contract corpus passes.

### UA-P2 — Engine registry and planner

**Goal:** make engines declarative and qualified before integrating them.

Implement:

- Engine Registry;
- capability discovery;
- authority ceilings;
- qualification refs;
- availability states;
- effect classes;
- engine selection;
- omitted-engine reasons;
- plan preview;
- no-silent-fallback policy;
- engine identity/digest validation.

First internal engine adapter: existing Ascout check/test capability.

Exit gate:

- unavailable engine cannot become PASS;
- wrong version/config cannot inherit qualification;
- planner is deterministic for identical input snapshot;
- no external process/network yet.

### UA-P3 — Review v1 with Alibaba OpenCodeReview

**Goal:** ship useful `ascout review` without weakening evidence rules.

Implement:

- Review profile;
- Review Context Capsule;
- exact base/head/diff binding;
- OpenCodeReview adapter;
- provider/model/config/rule/budget provenance;
- raw observation schema;
- location/source validation;
- logical group/file coverage;
- finding normalization/dedup preserving producer observations;
- explicit truncation/unsupported scope;
- optional independent reviewer policy;
- no-write/no-publication default;
- JSON/terminal output.

Benchmark:

- owned seeded correctness defects;
- known-safe cases;
- stale target;
- hallucinated path/line;
- prompt injection in source;
- provider absence;
- model timeout;
- context truncation;
- duplicate finding;
- changed head after review.

Exit gate:

```text
cross_target_review_credit = 0
invalid_location_promoted = 0
hidden_unreviewed_scope = 0
model_only_completion = 0
```

### UA-P4 — Kodac workflow/publication convergence

**Goal:** add durable review workflow and safe GitHub effects.

Implement/adapt:

- exact-head review freshness;
- reviewer independence identity;
- durable stage/attempt records;
- idempotency;
- ambiguous result reconciliation;
- PublicationIntent/Receipt;
- pre-publication classification/redaction;
- GitHub comment/check publication adapter;
- duplicate publication prevention;
- changed-head invalidation.

Exit gate:

- generation and publication separate;
- stale finding cannot publish as current;
- duplicate retry cannot double-publish;
- publication requires explicit effect authority.

### UA-P5 — Unified Test profile

**Goal:** make existing Ascout verification a first-class Test profile.

Implement:

- `ascout test`;
- adapter around existing check/test selection/execution;
- unified Coverage/Omission projection;
- preserve PASS/FAIL/FLAKY/BLOCKED/ERROR/NOT_RUN semantics;
- changed-code exercise mapping;
- P016 browser evidence projection;
- contract/API/property/fuzz/mutation adapters only when qualified;
- test profile QUICK/STANDARD/DEEP/RELEASE policies.

Backward compatibility:

- `ascout check` unchanged;
- `ascout test` is additive.

Exit gate:

- no existing check behavior regression;
- omitted test class visible;
- test PASS never becomes broader assurance PASS.

### UA-P6 — Sentrdel Security integration

**Goal:** ship `ascout security` with deterministic security evidence.

Implement:

- Sentrdel EngineDescriptor;
- exact binary/source/config identity;
- versioned request/response;
- invariant/security result import;
- explicit UNKNOWN/COVERAGE_LOST;
- SARIF/external evidence normalization;
- SAST;
- secrets;
- SCA/dependencies;
- SBOM;
- IaC/CI checks;
- reachability;
- security invariant regression;
- proof/reproduction refs;
- remediation -> retest state.

Exit gate:

- clean external scanner cannot erase validated finding;
- unsupported scope is visible;
- imported SARIF does not become verified truth automatically;
- false-positive rejection requires evidence.

### UA-P7 — Deep Security Audit orchestration

**Goal:** adapt Cloudflare audit method into Ascout.

Implement:

```text
reconnaissance
-> coverage ledger
-> bounded hunter tasks
-> candidate Findings
-> validation
-> independent per-finding verification
-> report
```

Requirements:

- read-only by default;
- fresh verifier context;
- explicit coverage debt;
- source content treated as hostile instructions;
- no dynamic network effect yet.

Exit gate:

- every validated finding has evidence;
- every skipped region is visible;
- hunter consensus alone cannot validate.

### UA-P8 — Kernux Reality contracts and local bridge

**Goal:** make `ascout test --real` executable on qualified local Kernux capabilities.

Implement:

- RealityTestPlan;
- RealityRun;
- LabManifest;
- SubstrateClass;
- Kernux EngineDescriptor;
- protocol/capability negotiation;
- local real web bridge;
- real API/service bridge;
- process/files/PTY evidence import;
- real desktop/app bridge when Kernux capability is qualified;
- cleanup evidence;
- build artifact/source binding;
- P016 browser oracle compatibility.

First reality benchmark includes the 12 seeded defects in the Kernux Reality Fabric plan.

Exit gate:

```text
hidden_mock_substitution = 0
build_artifact_mismatch = 0
process_state_fabrication = 0
missing_required_cleanup = 0
cross_project_browser_state_leak = 0
```

### UA-P9 — Isolated Lab and runtime qualification

**Goal:** support reproducible clean environments.

Implement:

- container Lab;
- stronger isolation provider interface;
- optional VM/microVM when justified;
- WSL;
- provider qualification profile;
- image/config digest;
- filesystem/mount policy;
- network deny/allow policy;
- resource limits;
- seed data;
- teardown/recovery;
- hostile qualification tests.

OpenSandbox remains adapter/provider candidate, not automatic trust.

Exit gate:

- same workload runs in one local + one isolated qualified runtime;
- weaker provider cannot satisfy stronger claim;
- cleanup failure blocks required clean claim.

### UA-P10 — Remote runtime reality verification

**Goal:** support SSH/paired remote runtime without losing truth.

Constitution compatibility must be re-evaluated before authorization.

Implement only if authorized:

- remote runtime identity/enrollment;
- mutual auth;
- capability negotiation;
- host-policy intersection;
- exact operation identity;
- reconnect;
- contact vs execution distinction;
- remote evidence/artifact transfer;
- revocation;
- replay/idempotency tests.

Exit gate:

- disconnect never fabricates exit;
- retry cannot duplicate side effects;
- controller cannot exceed host policy.

### UA-P11 — Cyber profile and threat model

**Goal:** add security assurance planning beyond static AppSec.

Implement:

- `ascout cyber`;
- ThreatModel;
- assets/entrypoints/trust boundaries;
- supply-chain admission planning;
- threat-intel adapter contract;
- STIX/TAXII/OpenCTI-compatible optional enrichment;
- adversarial local/lab plans;
- no active external probing by default.

Exit gate:

- threat intel freshness explicit;
- intel correlation alone cannot create verified source finding;
- supply-chain install scripts never execute on host implicitly.

### UA-P12 — Dynamic authorized security verification

**Goal:** allow bounded real security validation against explicit authorized targets.

Constitution amendment/review is mandatory before this phase if current Constitution does not already authorize the exact scope.

Implement:

- DynamicTargetAuthorization;
- exact host/origin/port/protocol scope;
- redirect reauthorization;
- credential capabilities;
- rate/concurrency/time/request budgets;
- scanner/template identity;
- stop conditions;
- request/response evidence;
- cleanup;
- incident handling;
- E7 effect gate.

Exit gate:

```text
out_of_scope_request_sent = 0
credential_forwarded_to_unqualified_origin = 0
unauthorized_dynamic_effect = 0
```

### UA-P13 — Assure composite profile

**Goal:** answer claim-oriented questions.

Implement:

- `ascout assure`;
- claim requirement matrices;
- evidence joins;
- contradiction handling;
- freshness aggregation;
- mandatory omission handling;
- RELEASE/ADVERSARIAL profiles;
- no aggregate score override.

Example claim packs:

- CHANGE_VERIFIED;
- REVIEW_COMPLETE;
- SECURITY_CHECKED;
- REALITY_TESTED;
- RELEASE_READY.

Exit gate:

- one missing mandatory evidence class -> INCOMPLETE;
- stale/contradictory evidence cannot become SUPPORTED;
- exact target/source/build preserved across profiles.

### UA-P14 — Explain, reproduce, retest

**Goal:** make evidence actionable without granting repair authority.

Implement:

- `ascout explain`;
- `ascout evidence`;
- reproduce plan;
- minimization where supported;
- FixProposal;
- Reverification;
- point retest + affected regression;
- risk acceptance lifecycle/expiry.

No automatic source fix in this phase unless separately authorized.

### UA-P15 — IDE/MCP/GitHub surfaces

**Goal:** expose one truth model through multiple interfaces.

Implement:

- MCP tools;
- IDE diagnostics/annotations;
- GitHub checks/comments;
- machine JSON;
- terminal UX.

All surfaces must use the same AssuranceIntent/Plan/policy path.

No privileged UI fast path.

### UA-P16 — Donor migration and parity

**Goal:** selectively converge Kodac/Sentrdel capabilities into Ascout maintenance ownership.

For every retained capability:

```text
source identity
-> characterization fixture
-> adapter/port
-> dual-run parity
-> semantic delta review
-> benchmark
-> provenance/notices
-> operational dependency removal
```

Archive is prohibited until every retained capability has explicit disposition.

### UA-P17 — Packaging and supply-chain hardening

**Goal:** make the unified product installable without forcing users to install development toolchains.

Implement:

- Ascout Node package;
- qualified companion binaries where used;
- version/digest manifest;
- Windows/macOS/Linux matrix;
- SBOM;
- third-party notices;
- release provenance/attestation;
- update/rollback semantics;
- optional engine discovery;
- no unmatched companion version under qualified claim.

### UA-P18 — Final conformance and release qualification

**Goal:** prove the unified platform claims.

Run:

- contract adversarial corpus;
- review seeded corpus;
- security invariant corpus;
- reality benchmark;
- source/provenance audit;
- platform matrix;
- install/upgrade/rollback;
- crash/recovery;
- privacy/secret tests;
- performance budgets;
- exact-head independent review;
- final completion matrix.

Project completion only if every required row is PROVEN or explicitly N/A.

## 5. First implementation wedge

The first implementation authorization should be deliberately small:

```text
UA-P01 only
```

Specifically:

1. AssuranceTarget compatibility wrapper;
2. AssuranceIntent;
3. AssurancePolicySnapshot;
4. AssurancePlan;
5. EngineDescriptor/Qualification/Run;
6. EvidenceRef;
7. Finding/Lifecycle;
8. CoverageClaim;
9. OmissionRecord/ContradictionRecord;
10. ClaimAssessment;
11. schema + semantic validators;
12. focused adversarial corpus;
13. no CLI behavior change except optional hidden/internal tests.

Why:

- proves the shared truth model first;
- does not require donors/network/models/Rust companion/Kernux;
- allows independent review of authority semantics;
- minimizes rollback blast radius.

## 6. Second implementation wedge

After UA-P01 canonical closure:

```text
UA-P2 + minimal UA-P3
```

Deliver:

- Engine Registry;
- native Ascout adapter;
- Review profile;
- Alibaba OpenCodeReview adapter;
- no publication;
- no source write;
- no Sentrdel;
- no Kernux runtime;
- benchmark v1.

This creates the first new user-visible value without pulling all systems forward.

## 7. Third implementation wedge

After Review v1:

```text
UA-P5 Unified Test
+ minimal UA-P6 Sentrdel Security
```

Then Reality Verification follows when Kernux capabilities are actually qualified.

## 8. Source-admission execution rules

Before any donor source/dependency/companion integration:

1. re-pin exact source immediately before intake;
2. record exact selected paths/blobs;
3. verify permission/license/NOTICE;
4. inspect nested third-party code;
5. characterize behavior;
6. security review privileged paths;
7. define authority ceiling;
8. define benchmark;
9. record dependency delta;
10. add provenance machine record;
11. implement;
12. parity/reverify.

Permission to copy source does not skip these steps.

## 9. Benchmark program

### Review corpus

Must contain:

- seeded correctness bugs;
- architecture/spec violations;
- test-quality issues;
- performance risks;
- safe controls;
- malicious prompt text;
- hallucinated file/line trap;
- truncation;
- unsupported language;
- stale target;
- conflicting reviewers.

### Test corpus

Must contain:

- affected-selection misses;
- flaky failure/recovery;
- changed code not exercised;
- mutation survivor;
- property counterexample;
- fuzz crash;
- browser journey drift;
- API schema drift;
- platform-dependent failure.

### Security corpus

Must contain:

- known invariant regressions;
- safe controls;
- false-positive candidates;
- unsupported coverage;
- SARIF conflict;
- dependency reachability true/false/unknown;
- synthetic secret;
- IaC/CI misconfiguration;
- remediation/retest.

### Reality corpus

Use the 12 seeded reality defects already defined.

### Cyber corpus

Must contain:

- target authorization refusal;
- redirect scope change;
- credential withholding;
- rate/stop limit;
- network denial;
- lab cleanup;
- threat-intel stale record;
- malicious package install script held in isolation.

## 10. Performance budgets

Every profile requires budget measurement.

Track:

```text
planning latency
engine startup
review latency
test latency
security latency
reality setup/runtime/cleanup
artifact volume
memory
CPU
network egress
model/token cost where applicable
```

Performance optimization must not hide mandatory checks.

## 11. Data lifecycle

Define before release:

- artifact classification;
- default local retention;
- GC;
- export;
- deletion;
- sensitive trace handling;
- model/provider egress disclosure;
- remote artifact transfer;
- no automatic evidence commit/upload.

## 12. Failure semantics

Never collapse:

```text
repository failure
engine/tool failure
policy refusal
missing authority
missing capability
source drift
runtime disconnect
cleanup failure
inconclusive evidence
```

into one generic failure.

Exit code contract is frozen only during an authorized CLI contract slice.

## 13. Implementation PR discipline

Every implementation task follows:

```text
reverify live main + authority
-> branch from exact main
-> implement one bounded task
-> focused tests
-> affected integration tests
-> relevant benchmark
-> typecheck/build/full tests
-> exact-head CI
-> Self Verification where applicable
-> independent exact-head review
-> zero material unresolved threads
-> guarded expected-head merge
-> post-merge main/tree/CI proof
```

No force-push/rebase/shared-history rewrite.

## 14. Completion definition

Unified Ascout is not complete until:

- Review is implemented and benchmarked;
- Test profile is implemented without breaking check;
- Security is implemented with Sentrdel-grade unknown/coverage honesty;
- Reality Verification works through qualified Kernux substrates;
- Cyber planning and authorized dynamic validation are correctly separated;
- Assure can aggregate exact-target evidence safely;
- provenance/licenses/notices complete;
- Kodac/Sentrdel retained capability migration complete;
- packaging works on supported platforms;
- release/install/update/rollback proven;
- all absolute integrity gates are zero;
- final exact-head independent audit passes.

Until then:

```text
IMPLEMENTATION_READY_PLAN = YES
IMPLEMENTATION_AUTHORITY = NO
PROJECT_COMPLETE = NO
```
