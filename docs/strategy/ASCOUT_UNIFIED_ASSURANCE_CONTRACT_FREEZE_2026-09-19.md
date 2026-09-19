# Ascout Unified Assurance — Contract Freeze

**Status:** IMPLEMENTATION-READY PLANNING / NO IMPLEMENTATION AUTHORITY  
**Date:** 2026-09-19  
**Planning branch:** `plan/unified-assurance-platform`  
**Planning base:** `e23331a46ea04bbcfd4dc4e2b538dbb410125a1a`

## 0. Purpose

This document freezes the semantic contracts that implementation must preserve. It exists so implementation agents do not redesign truth, authority, or evidence semantics while building Review, Test, Security, Cyber, Assure, and Kernux-backed Reality Verification.

The exact serialized schema may evolve during the authorized contract slice, but the ownership and invariants below are binding unless a fresh constitutional/planning amendment proves a material contradiction.

## 1. Authority hierarchy

The authority order is:

```text
Ascout Constitution
-> canonical Ascout source + exact implementation authorization
-> AssurancePolicySnapshot
-> AssurancePlan
-> qualified engine/runtime capabilities
-> observed Evidence
-> normalized Findings/Coverage
-> Ascout reconciliation
-> ClaimAssessment
```

Never invert this hierarchy.

```text
MODEL_OUTPUT != AUTHORITY
SCANNER_OUTPUT != AUTHORITY
KERNux_EVENT != FINAL_CLAIM
CI_GREEN != RELEASE_READY
TEST_PASS != FULL_ASSURANCE
SOURCE_PERMISSION != CODE_ADMISSION
ENGINE_AVAILABLE != ENGINE_QUALIFIED
PLAN != EFFECT_AUTHORITY
```

## 2. Core contracts

### 2.1 AssuranceTarget

Binds all claim-bearing evidence to one exact subject.

Minimum semantic fields:

```text
repository_identity
source_start_identity
head_revision when available
base_revision when applicable
tree_identity
change_set_identity
worktree/session generation when applicable
policy_snapshot_id
spec/task/acceptance identity when applicable
environment identity
graph/index generation when material
build_artifact identity when Reality Verification applies
```

Rules:

- evidence from another target is stale/inapplicable unless explicit reconciliation proves otherwise;
- raw credential-bearing remotes and raw local absolute repository paths remain forbidden in persisted identity;
- source drift between stages is visible and can invalidate aggregation.

### 2.2 AssuranceIntent

Normalized user/workflow request.

Minimum semantics:

```text
intent_id
requested_claim
profile
scope
explicit include/exclude constraints
maximum effect class
budget
target
surface provenance
```

Intent does not grant process, network, write, browser, app, credential, or publication authority.

### 2.3 AssurancePolicySnapshot

Immutable policy identity for one plan/run.

Includes:

```text
policy_id
policy_version/digest
trusted policy sources
repository advisory policy sources
minimum mandatory checks
effect ceilings
engine qualification requirements
independence requirements
freshness rules
risk-acceptance rules
data/egress rules
```

Source-branch configuration cannot weaken canonical minimum policy.

### 2.4 AssurancePlan

Inspectably explains what will run and why.

Minimum semantics:

```text
plan_id
intent_id
target_id
requested_claim
selected check classes
selected engine identities
selected runtime requirements
required effect classes
qualification requirements
budget/time/concurrency envelope
expected evidence types
omitted checks + reason
staleness policy
plan generation evidence
```

A plan is not execution authority.

### 2.5 EngineDescriptor

Every internal/external engine is described by:

```text
engine_id
engine_kind
exact implementation/source/version identity
capabilities
supported input/output
effect classes
process/network/provider requirements
sandbox requirements
configuration trust boundary
license/provenance state
qualification evidence
known limitations
authority ceiling
```

Unknown or mismatched implementation identity cannot inherit prior qualification.

### 2.6 EngineQualification

Binds one exact engine implementation/configuration to proven capability profiles.

```text
qualification_id
engine_id
implementation identity
configuration identity
profile identities
benchmark/corpus identity
platform identity
evidence refs
result
expiry/invalidation rules
```

Provider self-description never substitutes for qualification.

### 2.7 EngineRun

One immutable execution occurrence.

```text
run_id
plan_id
target_id
engine_id
qualification refs
input/context manifest
command/config identity
environment/runtime identity
start/finish
exit/result class
stdout/stderr artifact refs where retained
coverage limitations
recovery/retry lineage
```

### 2.8 EvidenceRef

Durable pointer to observed facts/artifacts.

```text
evidence_id
producer
run_id
target_id
kind
content/artifact identity
digest
trust class
data classification
freshness
redaction state
retention
lineage
```

Dangling evidence refs are invalid.

### 2.9 Finding

Canonical concern across review, test quality, security, cyber, runtime, supply chain, or operations.

```text
finding_id
kind
severity
confidence/validation state
rule/check identity
primary location
related locations/path
symbol/resource/asset identities
reachability state
producer observations
reproduction/proof refs
first-seen target
last-verified target
status
suppression/risk acceptance metadata
```

Canonical status vocabulary:

```text
CANDIDATE
REQUIRES_MORE_EVIDENCE
VALIDATED
OPEN
REJECTED_FALSE_POSITIVE
REPAIRED_PENDING_REVERIFY
VERIFIED_FIXED
ACCEPTED_RISK
SUPERSEDED
```

A clean later engine cannot delete a validated finding by itself.

### 2.10 FindingLifecycleEvent

Append-only transition record.

Must bind:

```text
finding_id
previous_state
new_state
actor/provenance
target
reason
evidence refs
timestamp/order
expiry/review date when risk accepted
```

### 2.11 CoverageClaim

Coverage is multidimensional and never reduced to one percentage for authority.

Minimum dimensions include:

```text
changed files/symbols reviewed
logical review groups
languages/ecosystems
rules/check classes
tests selected/executed
changed-line/branch/function exercise where meaningful
mutation attempts/kills/survivors
property/fuzz space and counterexamples
browser journeys/oracles
API/service journeys
real app/desktop journeys
install/upgrade/recovery journeys
SAST/secrets/SCA/SBOM/IaC/CI
reachability/security invariants
threat-model assets/boundaries
platform/runtime/browser matrix
dynamic endpoints actually authorized/exercised
unsupported/unreadable/opaque scope
reviewer/engine independence where required
```

Unknown stays unknown.

### 2.12 OmissionRecord

Every applicable non-run check records:

```text
check_class
reason_code
reason_text
claim_impact
required qualification/effect that was unavailable
```

No green by omission.

### 2.13 ContradictionRecord

Conflicting evidence is first-class.

```text
contradiction_id
target_id
claims/evidence in conflict
producer identities
reconciliation status
required next evidence
```

### 2.14 Reproduction

Exact reproduction/counterexample for a finding.

Includes target, inputs, runtime/environment, action/command identity, observed result, minimization status, repeatability, and evidence refs.

### 2.15 Reverification

Links old finding/check to new exact-target evidence.

Outcome:

```text
FIXED
STILL_PRESENT
CHANGED
INCONCLUSIVE
NOT_RUN
```

### 2.16 FixProposal

Advisory only.

Carries zero write authority.

### 2.17 ThreatModel

Versioned model of:

```text
assets
entrypoints
trust boundaries
identities
privileged effects
secrets
external inputs
dependencies/supply chain
browser/network surfaces
recovery paths
required security checks
```

Model-generated threat models are candidate planning evidence, not deterministic project fact.

### 2.18 DynamicTargetAuthorization

Required before active network/adversarial execution.

Must bind:

```text
exact target/origin/host/port/protocol scope
authorization provenance
start/expiry
allowed actions/methods
credentials and least-privilege scope
rate/concurrency/request/time budgets
forbidden actions
redirect policy
stop conditions
evidence/redaction policy
cleanup/incident policy
```

A URL in source, browser login, repository ownership, or model request is not sufficient.

### 2.19 PublicationIntent / PublicationReceipt

Generation and publication are separate.

Must bind exact target/head, finding/comment identity, destination, redaction/classification decision, idempotency identity, publication result, and reconciliation state.

### 2.20 DonorSourceRecord

Required for copied/derived/reimplemented privileged source.

Minimum fields:

```text
source_id
repository
exact_revision/tree
selected paths/blob digests
license
notice obligations
permission basis
third-party boundary
dependency delta
security review
integration mode
destination
behavioral characterization
benchmark need
modification notes
upstream-watch policy
status
```

## 3. Reality Verification contracts

### 3.1 RealityTestPlan

Defines a real-world verification journey.

```text
plan_id
assurance_target
source_revision
build_artifact_identity
requested_claim
journey_id/version
runtime requirements
capability requirements
environment requirements
setup_steps
actions
observations
assertions
cleanup_steps
allowed effects
network scope
credential refs
secret policy
evidence requirements
budget
retry/recovery policy
```

### 3.2 RealityRun

Binds one actual real-world run to:

```text
source/tree
build artifact digest
Ascout plan
Kernux runtime identity
Kernux implementation/version
runtime kind/platform
container/VM/image identity
browser version
app/service identity
configuration
credential capability identity without plaintext
network scope
lineage
```

### 3.3 LabManifest

Defines reproducible isolated environment:

```text
lab_id
runtime provider/version
base image/host identity
filesystem/mount policy
network/DNS policy
resource limits
environment allowlist
credential refs
services
seed data
cleanup policy
```

### 3.4 SubstrateClass

Required substrate is explicit:

```text
UNIT_MOCK
CONTRACT_FAKE
SERVICE_EMULATOR
SYNTHETIC_FIXTURE
REAL_COMPONENT
REAL_EXTERNAL_AUTHORIZED
```

Lower substrate cannot satisfy a stronger required class.

## 4. Task/outcome contract

Existing Constitution task vocabulary remains authoritative for executable Ascout tasks:

```text
PASS
FAIL
FLAKY
BLOCKED
ERROR
NOT_APPLICABLE
NOT_RUN(reason_code, reason_text)
```

Unified assurance may add claim-level states, but it must not reinterpret task PASS.

Recommended claim-level state:

```text
SUPPORTED
BLOCKED
INCOMPLETE
INCONCLUSIVE
STALE
REFUSED
```

A ClaimAssessment MUST expose supporting, contradicting, missing, stale, and refused evidence classes.

## 5. Effect classes

Freeze the planning taxonomy:

```text
E0_READ_ONLY_ANALYSIS
E1_LOCAL_DETERMINISTIC_PROCESS
E2_LOCAL_WRITE_ARTIFACT_ONLY
E3_ISOLATED_LOCAL_EXECUTION
E4_BROWSER_OR_APP_INTERACTION
E5_AUTHORIZED_NETWORK_READ
E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT
E7_ACTIVE_SECURITY_VALIDATION
```

Each plan states maximum effect class.

Higher effect requires explicit policy/qualification/authority and cannot be inferred from lower classes.

## 6. Trust classes

Evidence must preserve producer/trust semantics.

Candidate classes:

```text
ASCOUT_DETERMINISTIC
QUALIFIED_INTERNAL_ENGINE
QUALIFIED_EXTERNAL_ENGINE
KERNux_RUNTIME_OBSERVATION
MODEL_OBSERVATION
HUMAN_ATTESTATION
IMPORTED_UNTRUSTED
EXTERNAL_INTELLIGENCE
```

Trust class does not by itself determine claim acceptance.

## 7. Engine role freeze

### Ascout native

Owns:

- target/source identity;
- policy snapshot;
- plan;
- evidence normalization;
- finding lifecycle;
- coverage/omissions;
- freshness;
- contradiction reconciliation;
- ClaimAssessment;
- compatibility with existing `ascout check`.

### Alibaba OpenCodeReview

Role:

- primary AI review engine candidate;
- deterministic selection/grouping/rules + agent review;
- output normalized as external review observations;
- zero final claim/publication/write authority by default.

### Kodac capability set

Role:

- review/workflow/GitHub publication discipline;
- exact-head freshness;
- independent reviewer semantics;
- durable workflow/retry/idempotency;
- qualification profiles;
- donor provenance.

### Sentrdel

Role:

- deterministic security/invariant/reachability engine;
- coverage loss/unknown semantics;
- proof/retest security lifecycle.

### Cloudflare Security Audit Skill

Role:

- deep audit methodology;
- reconnaissance;
- coverage-led hunting;
- candidate validation;
- independent per-finding verification.

### Kernux

Role:

- reality execution fabric;
- browser/web;
- computer/app;
- files/process/PTY;
- local/WSL/container/VM/SSH/remote;
- grants/runtime truth;
- Events/Artifacts/Evidence observations.

Kernux does not own Ascout ClaimAssessment.

## 8. Backward compatibility freeze

During additive rollout:

```text
ascout init
ascout doctor
ascout check
```

retain current semantics unless a separately versioned migration is approved.

New surfaces are additive:

```text
ascout review
ascout test
ascout security
ascout cyber
ascout assure
ascout explain
ascout evidence
ascout engines
```

Do not silently turn `ascout check` into the unified profile.

## 9. Constitution compatibility gate

Before each implementation phase, classify it:

```text
CONSTITUTION_COMPATIBLE
CONSTITUTION_AMENDMENT_REQUIRED
DEFERRED
```

At minimum, the following require explicit fresh review and may require amendment before implementation:

- arbitrary/untrusted repository operation;
- privileged daemon/server becoming required core;
- remote runtime trust expansion;
- dynamic external security testing;
- cloud/control-plane requirements;
- public arbitrary plugin execution;
- any weakening of trusted-local, local-first, evidence-before-claims, source binding, or no-green-by-omission.

Planning documents do not authorize these effects.

## 10. Absolute integrity gates

No aggregate metric can override:

```text
cross_target_evidence_leakage = 0
fabricated_pass = 0
hidden_applicable_not_run = 0
source_binding_violation = 0
stale_evidence_accepted_as_current = 0
unqualified_model_only_pass = 0
finding_erased_by_clean_engine_only = 0
recovery_history_erasure = 0
silent_weaker_engine_fallback = 0
unauthorized_source_mutation = 0
unauthorized_publication = 0
unauthorized_network_effect = 0
unauthorized_app_external_effect = 0
secret_leakage_from_ascout_artifacts = 0
donor_source_without_provenance = 0
unsupported_scope_counted_as_covered = 0
hidden_mock_substitution = 0
real_build_artifact_mismatch = 0
process_state_fabrication = 0
required_cleanup_omission = 0
```

## 11. Frozen architectural decision

Ascout is an Engineering Assurance OS, not a scanner bundle.

One target, one evidence model, one finding lifecycle, one coverage model, one freshness model, one policy system, many qualified engines and runtimes.
