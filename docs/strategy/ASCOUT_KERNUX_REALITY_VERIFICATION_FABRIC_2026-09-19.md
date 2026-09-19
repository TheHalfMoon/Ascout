# Ascout + Kernux Reality Verification Fabric

**Status:** PLANNING_ONLY / NO_EXECUTION_AUTHORITY
**Date:** 2026-09-19
**Parent:** Ascout Unified Assurance Platform planning package
**Observed Kernux main:** `44e8ec21f7a3b402cc78a9a6c8e7cb176dc39b46`

## 1. Founder direction

Ascout testing must not stop at source-level test runners.

The unified product must be able to prove software by actually using the software:

- build the exact candidate;
- start the real service or application;
- use the web;
- drive a browser;
- use a desktop application;
- use files, processes, and PTYs;
- run in an isolated lab;
- use an authorized remote runtime;
- exercise real user journeys;
- inspect observable outputs and side effects;
- preserve evidence for what actually happened.

Kernux is the primary execution-fabric source for this capability.

```text
ASCOUT
= assurance intent
+ claim model
+ review
+ test planning
+ security/cyber policy
+ evidence reconciliation
+ final claim authority

KERNUX
= capability kernel
+ browser/web execution
+ computer/host execution
+ local/sandbox/SSH/remote runtime fabric
+ process/files/PTY/app control
+ event/evidence capture
+ replay/recovery substrate
```

Kernux does not grant Ascout PASS. Ascout does not reimplement Kernux runtime fabric merely to perform real-world tests.

## 2. Product model: Code Verification + Reality Verification

`ascout test` has two complementary layers.

### Layer A — Code Verification

Existing and planned Ascout-native evidence:

```text
format
lint
typecheck
compile/build
unit
integration
contract/schema
coverage
mutation
property
fuzz
API/schema tests
P016 browser evidence
security regression
performance
formal/model checks
```

### Layer B — Reality Verification

Kernux-backed real execution:

```text
REAL_WEB
REAL_APP
REAL_API_SERVICE
REAL_DESKTOP
REAL_LAB
REAL_REMOTE
REAL_CROSS_APP_JOURNEY
REAL_INSTALL_UPGRADE
REAL_FAILURE_RECOVERY
```

A release claim may require both layers. A green unit/integration suite cannot silently substitute for a required Reality Verification journey.

## 3. User-facing commands

Candidate additive surfaces:

```text
ascout test --real
ascout test --web
ascout test --app
ascout test --desktop
ascout test --api
ascout test --lab
ascout test --remote
ascout test --journey
ascout test --install
ascout test --upgrade
ascout test --recovery

ascout security --runtime
ascout security --lab
ascout security --web
ascout security --app

ascout assure --real
ascout assure --release
```

Examples:

```text
ascout test --real --target local
ascout test --web --origin http://127.0.0.1:3000
ascout test --app --artifact dist/MyApp
ascout test --desktop --journey onboarding
ascout test --api --service api --journey create-user
ascout test --lab --profile clean-linux
ascout test --remote --runtime staging-device
ascout assure --release --require real-web,real-install
```

These are planning semantics, not current CLI promises.

## 4. Kernux capabilities Ascout should use

The observed Kernux architecture provides the exact primitives needed for real verification:

- capability kernel and bounded grants;
- privileged Rust daemon boundary;
- browser fabric;
- computer fabric;
- local host;
- WSL;
- container;
- VM;
- SSH;
- remote device;
- cloud runtime as a later optional surface;
- durable Events, Artifacts, and Evidence.

Observed browser hierarchy:

```text
WebMCP or typed page capability
-> deterministic DOM/accessibility/CDP/Playwright
-> semantic AgentQL/TinyFish-style provider
-> vision/computer-use fallback
```

Observed computer hierarchy:

```text
typed application/tool API
-> OS accessibility/UI automation
-> terminal/CLI or file operation
-> vision/mouse/keyboard fallback
```

Ascout should preserve which mechanism was used for every claim-bearing action.

## 5. Founding Kernux donor value

### Orca

Use through Kernux for agent/workspace orchestration, parallel runtime/worktree patterns, terminal/runtime UX, and remote-control concepts.

### AgentQL and TinyFish

Use through Kernux browser contracts for resilient semantic web interaction, natural-language element targeting, structured extraction, and authenticated web journeys when deterministic selectors are insufficient.

### Desktop Commander

Use through Kernux computer/runtime contracts for filesystem, process, PTY, terminal, document/data, desktop/host, and remote-machine primitives.

Ascout must not allow broad host capability to bypass Ascout and Kernux grants.

## 6. Reality Test contract

Introduce a future versioned `RealityTestPlan` with at least:

```text
plan_id
assurance_target
source_revision
build_artifact_identity
requested_claim
journey_id
journey_version
runtime_requirements
capability_requirements
environment_requirements
setup_steps[]
actions[]
observations[]
assertions[]
cleanup_steps[]
allowed_effects
network_scope
credential_refs
secret_policy
evidence_requirements
timeout_budget
retry_policy
recovery_policy
```

The plan is data. It is not process, network, browser, host, or external-side-effect authority.

## 7. Reality Run identity

Every real execution must bind:

- source revision and tree identity;
- build artifact digest;
- Ascout plan identity;
- Kernux runtime identity;
- Kernux implementation/version identity;
- runtime kind and OS/platform;
- container/VM/image identity where applicable;
- browser engine/version;
- application/service identity;
- configuration identity;
- credential capability identity without plaintext;
- network scope identity;
- run lineage.

A run on a different build, runtime, browser, or configuration cannot silently inherit the previous PASS.

## 8. Real Web testing

The web mode must use genuine browser behavior, not only DOM-unit simulation.

```text
exact candidate
-> start real app/service
-> wait for bound healthy endpoint
-> create isolated browser context
-> navigate
-> perform journey
-> inspect DOM/accessibility
-> inspect console errors
-> inspect network requests/responses
-> verify downloads/uploads
-> verify persisted application effect
-> capture trace/screenshots
-> cleanup
-> Ascout reconciliation
```

Evidence may include browser actions, action mechanism, page origin, DOM/accessibility facts, screenshots, traces, console errors, bounded network metadata, response facts, artifact digests, storage policy facts, and final user-visible state.

## 9. Real Desktop and App testing

Desktop/application testing must operate against a built or installed candidate.

Candidate capabilities:

- launch application;
- identify exact process;
- observe window/app readiness;
- interact through typed app APIs when available;
- interact through accessibility tree;
- use terminal/file operations when semantically equivalent;
- use visual computer interaction only as fallback;
- verify dialogs and notifications;
- verify filesystem effects;
- verify spawned processes;
- verify local service connections;
- verify shutdown and cleanup;
- capture screenshots, events, and logs.

Important invariant:

```text
UI says stopped != process actually exited
```

The execution host remains authoritative for process lifecycle truth.

## 10. Real API and Service testing

A real API test can build the exact service, provision dependencies in a lab, start the process, observe bound ports, execute actual protocol requests, validate authentication, verify database/file/message side effects, inject bounded malformed requests, inspect process/log/trace evidence, and verify termination.

Mocks remain useful for unit and contract testing, but a release-required real service journey cannot be satisfied solely by mocks.

## 11. Ascout Lab

`ascout test --lab` is a first-class product concept.

A Lab is a reproducible isolated execution environment for Reality Verification.

Candidate lab types:

```text
CLEAN_LOCAL_SANDBOX
CONTAINER
VM_OR_MICROVM
WSL
ISOLATED_BROWSER
MULTI_SERVICE_COMPOSED_LAB
SSH_TEST_HOST
PAIRED_REMOTE_DEVICE
FUTURE_CLOUD_EPHEMERAL
```

A future `LabManifest` should bind runtime provider/version, base image or host identity, filesystem and mount policy, network/DNS policy, resource limits, environment allowlist, credential refs, services, seeded data, and cleanup policy.

Labs are disposable by default. A dirty developer machine is not a substitute for a clean lab when the claim requires clean-environment behavior.

## 12. Real installation and upgrade testing

Reality Verification should cover the thing users actually install:

- fresh install;
- first launch;
- update;
- rollback;
- migration from supported old version;
- configuration preservation;
- data preservation;
- uninstall and cleanup;
- broken or partial update recovery.

Evidence binds installer/package digest, old version, new version, OS/runtime, pre-state, migration events, post-state, and rollback state where tested.

## 13. Cross-application journeys

Kernux allows Ascout to test workflows spanning applications.

Example:

```text
open application
-> create export
-> verify file exists
-> open browser
-> upload export
-> verify server accepted it
-> download processed result
-> verify local application can re-open it
```

A journey can involve browser, native app, terminal, filesystem, local services, authorized remote service, and document/data tooling.

## 14. Real Security Verification

Kernux strengthens `ascout security` by providing an execution substrate for Sentrdel and Cloudflare-derived findings.

Examples:

### Authentication

```text
source review says endpoint requires auth
-> start real service in lab
-> request unauthenticated
-> verify rejection
-> authenticate with synthetic test credential
-> verify allowed behavior
-> capture request/response evidence
```

### Secret handling

```text
seed synthetic secret
-> exercise real application journey
-> inspect logs/artifacts/browser output
-> assert secret does not appear
```

### File/path isolation

```text
run application in lab
-> attempt bounded traversal fixture
-> verify denied effect
-> verify no out-of-scope file mutation
```

### Browser/session isolation

```text
create project A browser context
create project B browser context
-> prove auth/storage does not cross project boundary
```

### Recovery

```text
start stateful action
-> terminate browser/process/runtime at controlled point
-> restart or reconnect
-> verify exact recovery semantics
-> verify no duplicate side effect
```

Security reality tests use synthetic or owned fixtures unless a separately authorized real target exists.

## 15. Web access rules

Web capability is a first-class test requirement.

### W1 — ordinary web/application verification

Examples include local application origins, user-owned or explicitly authorized test/staging environments, public documentation/API reads, and permitted application workflows.

### W2 — active security/adversarial web verification

Examples include DAST-style malformed requests, vulnerability reproduction, auth-boundary probing, rate/concurrency stress, and attack-style payloads.

W2 requires the stronger Cyber and DynamicTargetAuthorization path.

A URL existing in source code is never authorization.

## 16. Application access rules

Future Ascout policy should distinguish:

```text
APP_OBSERVE
APP_INTERACT
APP_WRITE_LOCAL
APP_USE_CREDENTIAL
APP_EXTERNAL_SIDE_EFFECT
```

Reading a window is not equivalent to sending a message. Filling a form is not equivalent to completing a purchase. Opening a draft is not equivalent to sending it.

Real testing must remain real without performing unintended real-world transactions.

## 17. Reality oracle mesh

A real test can combine multiple observations.

Example claim: user export succeeds.

```text
browser oracle: UI shows completed
network oracle: request returned expected protocol result
filesystem oracle: downloaded file exists
artifact oracle: digest and format are valid
application oracle: file can be reopened
server/log oracle: operation recorded exactly once
```

Visual success alone is insufficient where deterministic backend or artifact evidence exists.

## 18. Kernux evidence consumed by Ascout

Candidate evidence classes:

```text
KernuxRunIdentity
CapabilityDecisionEvidence
RuntimeIdentityEvidence
ProcessLifecycleEvidence
BrowserActionEvidence
BrowserObservationEvidence
ComputerActionEvidence
AccessibilityEvidence
NetworkExchangeEvidence
FilesystemEffectEvidence
ArtifactEvidence
ScreenshotEvidence
TraceEvidence
LogEvidence
RemoteRuntimeEvidence
CleanupEvidence
RecoveryEvidence
```

Ascout normalizes these into canonical EvidenceRef, CoverageClaim, and ClaimAssessment structures.

Kernux Events are execution facts. Ascout ClaimAssessment remains assurance authority.

## 19. No fake real test

The following do not satisfy Reality Verification by themselves:

- mocked HTTP client;
- jsdom-only UI test;
- snapshot-only test;
- model statement that the UI looks right;
- unit test simulating an installer;
- stubbed filesystem when filesystem behavior is the claim;
- synthetic process object when lifecycle behavior is the claim;
- cached screenshot from another source revision;
- browser action without exact origin/source/runtime identity;
- test runner exit code without required behavioral oracle.

Reality Verification requires the relevant real substrate.

## 20. Mock policy

Mocks are not banned. They are classified:

```text
UNIT_MOCK
CONTRACT_FAKE
SERVICE_EMULATOR
SYNTHETIC_FIXTURE
REAL_COMPONENT
REAL_EXTERNAL_AUTHORIZED
```

Every claim declares which substrate class it requires. A lower substrate class cannot satisfy a higher required class.

## 21. Runtime selection

```text
requested test requirements
-> Ascout RealityTestPlan
-> Kernux capability negotiation
-> select qualified runtime
-> request bounded grants
-> execute
-> return evidence
```

A runtime that lacks a required guarantee yields NOT_QUALIFIED, not silent fallback.

## 22. Capability and Grant integration

Kernux capability semantics should be reused or adapted rather than replaced by agent prompts.

Reality test effects must be bounded by subject/run, action, resource, runtime, constraints, consequence class, lifetime/use budget, policy revision, and delegation depth.

No agent, browser page, repository content, tool, model, or remote runtime may widen that authority.

## 23. Test profiles

### REAL_QUICK
Real build/start where cheap, one critical smoke journey, local browser/app, no broad network, strict budget.

### REAL_STANDARD
Critical user journeys, real API/service behavior, browser/network/console, clean lab where required, cleanup verification.

### REAL_DEEP
Broader journeys, multi-service lab, platform variation, recovery/failure injection, richer observability.

### REAL_RELEASE
Clean install/build artifact, supported platform/runtime matrix, critical web/app/API journeys, upgrade/migration where required, security runtime assertions, exact evidence bundle.

### REAL_ADVERSARIAL
Fuzz/failure/security scenarios under strict isolation, explicit network/credential authority, stop conditions, and cleanup.

## 24. Suggested release workflow

```text
exact candidate commit
-> code review
-> deterministic code tests
-> Sentrdel security
-> build distributable artifact
-> create Kernux lab
-> install artifact
-> start real app/services
-> real browser/API/desktop journeys
-> runtime security checks
-> recovery checks
-> clean shutdown
-> artifact/evidence export
-> Ascout reconciliation
-> release ClaimAssessment
```

This is materially stronger than CI-only confidence.

## 25. Integration boundary

```text
Ascout Assurance Planner
        |
        v
RealityTestPlan
        |
        v
Kernux Adapter
        |
        v
Kernux Capability Kernel / Runtime Fabric
        |
   +----+----+------------------+
   |         |                  |
 Browser   Computer          Runtime
   |         |                  |
 Web      App/PTY/Files   Local/Lab/SSH/Remote
   +---------+------------------+
             |
             v
        Kernux Events
        Kernux Artifacts
        Kernux Evidence
             |
             v
Ascout Evidence Normalizer
             |
             v
Ascout Reconciliation / ClaimAssessment
```

Do not make an Ascout model invoke raw computer/browser tools around this boundary for claim-bearing Reality Verification.

## 26. Staged integration while Kernux is still being built

Observed Kernux main contains active P01 protocol/contract work; most execution capabilities remain later roadmap phases. The Ascout plan must not pretend the complete Kernux runtime exists today.

```text
KR-0 contract study
KR-1 protocol bridge
KR-2 local deterministic browser bridge
KR-3 local computer/app bridge
KR-4 isolated Lab bridge
KR-5 remote runtime bridge
KR-6 full real-release assurance
```

No Ascout release gate may depend on an unavailable Kernux capability without reporting it as unavailable.

## 27. Relationship with Ascout P016

Kernux does not replace P016.

P016 owns Ascout browser intent, oracle, journey, and evidence semantics. Kernux owns broader real execution capability.

```text
P016 IntentTest / journey / oracle policy
-> RealityTestPlan
-> Kernux browser/runtime execution
-> P016-compatible browser observations/oracles
-> broader Kernux process/network/files/app evidence
-> Ascout AssuranceBundle
```

This avoids two competing browser truth systems.

## 28. Relationship with Sentrdel, Cloudflare, and Kodac

Sentrdel defines security conditions, invariants, source risk, and coverage. Kernux executes safe reproductions and real runtime checks. Ascout decides whether the evidence supports the claim.

Cloudflare-derived deep audit can send candidate findings into a bounded Kernux validation lab after Ascout authorizes target and effects.

Kodac-derived workflow and side-effect discipline strengthens durable execution, exact-head freshness, idempotency, unknown-result recovery, publication, and completion gates.

## 29. New hard gates

```text
REAL_TARGET_IDENTITY_MISMATCH = 0
REAL_BUILD_ARTIFACT_MISMATCH = 0
UNQUALIFIED_RUNTIME_USED_FOR_REQUIRED_CLAIM = 0
HIDDEN_MOCK_SUBSTITUTION = 0
UNAUTHORIZED_NETWORK_EFFECT = 0
UNAUTHORIZED_APP_SIDE_EFFECT = 0
CROSS_PROJECT_BROWSER_STATE_LEAK = 0
UNTRACKED_CREDENTIAL_USE = 0
PROCESS_STATE_FABRICATION = 0
MISSING_REQUIRED_CLEANUP = 0
EVIDENCE_FROM_DIFFERENT_RUNTIME_OR_BUILD = 0
REALITY_TEST_RESULT_WITHOUT_REQUIRED_ORACLE = 0
```

Aggregate pass rate cannot override these.

## 30. Additional gap closures

### RK-G01 — Real test reduced to browser automation
Closure: include browser, computer/app, process, filesystem, API/service, lab, remote, install, recovery, and cross-app journeys.

### RK-G02 — Real test accidentally acts on production
Closure: every network/app external effect is capability-scoped; external targets require explicit authority.

### RK-G03 — UI reports success while backend failed
Closure: oracle mesh may require UI + network + artifact/server/process evidence.

### RK-G04 — Lab is not reproducible
Closure: LabManifest binds provider/image/host/config/network/resources/seed data and cleanup.

### RK-G05 — Developer machine contamination creates false success
Closure: claims requiring clean behavior use clean/disposable lab profiles.

### RK-G06 — Real test uses different artifact than reviewed source
Closure: build artifact digest binds source revision and RealityRun.

### RK-G07 — Remote disconnect treated as completion
Closure: reuse Kernux contact versus execution truth; disconnect is not exit or success.

### RK-G08 — Retry repeats external side effects
Closure: side-effect retry requires idempotency or reconciliation semantics.

### RK-G09 — Authenticated browser state leaks across projects
Closure: isolated context by default and explicit profile reuse.

### RK-G10 — Vision fallback hides uncertainty
Closure: record action mechanism and confidence; prefer typed/deterministic structure.

### RK-G11 — Desktop control is overprivileged
Closure: typed Kernux grants; no ambient full-computer permission for ordinary tests.

### RK-G12 — Cleanup ignored
Closure: cleanup is part of the test contract; required cleanup failure is visible.

### RK-G13 — Reality testing too slow
Closure: risk-based REAL_QUICK, REAL_STANDARD, REAL_RELEASE profiles and explicit budgets.

### RK-G14 — Kernux capability not implemented yet
Closure: availability is explicit; planned Kernux features never become fabricated Ascout evidence.

## 31. Implementation-program amendment

Add logical units after core assurance contracts exist:

```text
UA-KR01 Kernux source/protocol/admission map
UA-KR02 RealityTestPlan and RealityRun contracts
UA-KR03 Kernux engine adapter and capability discovery
UA-KR04 real web/browser bridge
UA-KR05 real local app/process/files/PTY bridge
UA-KR06 lab manifest + isolated runtime bridge
UA-KR07 real API/service journeys
UA-KR08 install/upgrade/recovery journeys
UA-KR09 runtime security verification
UA-KR10 SSH/remote-runtime qualification
UA-KR11 cross-app journey orchestration
UA-KR12 real-release assurance profile and benchmark
```

Exact numbering must be reconciled with the active Ascout frontier before implementation.

## 32. First Reality Verification benchmark

The first owned benchmark should use a small complete application with seeded defects: web frontend, API service, state fixture, download/export, local file consumer, authentication fixture, and background process.

Seed failures:

1. unit tests green but service fails on clean start;
2. UI shows success but API returns error;
3. duplicate submit creates two records;
4. auth state leaks between browser contexts;
5. download filename is correct but bytes are corrupted;
6. app writes outside granted directory;
7. background process survives stop;
8. migration fails on fresh install;
9. remote disconnect occurs while process continues;
10. visual button exists but deterministic/accessibility action cannot resolve;
11. synthetic secret appears in a log;
12. cleanup leaves a service or listener alive.

The benchmark succeeds only if Ascout/Kernux detect seeded defects honestly and preserve evidence.

## 33. Completion definition

Reality Verification is complete only when Ascout can, for an exact candidate:

- build a real artifact;
- choose a qualified Kernux runtime;
- create a bounded grant/effect envelope;
- launch a real web/app/API target;
- execute a real user journey;
- capture browser/computer/process/network/filesystem evidence;
- use a clean isolated lab when required;
- preserve exact source/build/runtime identity;
- safely use an authorized remote runtime when required;
- execute cleanup and record cleanup result;
- reconcile the evidence through Ascout;
- refuse the claim when a required real substrate was unavailable or substituted by mocks.

```text
KERNUX_REALITY_FABRIC_INTEGRATED = NO
ASCOUT_REALITY_VERIFICATION_COMPLETE = NO
REAL_RELEASE_ASSURANCE_COMPLETE = NO
```

## 34. Final product direction

The desired request is simple:

**Test this code for real.**

Ascout should interpret that as:

```text
review exact code
-> choose required code tests
-> build it
-> create the right Kernux runtime/lab
-> run the real product
-> use the real web/app/API surfaces
-> challenge required security properties
-> observe actual effects
-> preserve proof
-> report what is supported and what remains unknown
```

This is the difference between a test runner and an engineering assurance system.