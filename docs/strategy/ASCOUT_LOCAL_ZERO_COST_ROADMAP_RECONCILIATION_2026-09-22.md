# Ascout Local Zero-Cost Roadmap Reconciliation

**Status:** PLANNING_ONLY / NO_IMPLEMENTATION_AUTHORITY  
**Date:** 2026-09-22  
**Planning base:** 25c6dcbd75d62d6e1422bb7681f29c5b2381e5ad  
**Canonical roadmap preserved:** Unified Assurance UA-P03 through UA-P18.  
**Separate existing program preserved:** ARTEMIS A0 through A13.

## 1. Purpose

This document maps the Local Zero-Cost Verification OS architecture into the existing Unified Assurance task graph.

It explicitly rejects a second competing roadmap.

No task in this document becomes executable until the applicable repository authorization/compatibility gate is canonically effective.

## 2. Reconciliation principles

1. Existing UA phase order remains authoritative.
2. Existing ARTEMIS authorization remains authoritative for mobile work.
3. Planning documents do not grant source mutation authority.
4. Cross-cutting cost/privacy/locality requirements must be frozen before provider-dependent execution expands.
5. No phase may introduce Ascout-operated customer runtime infrastructure.
6. No later phase may silently invent a missing predecessor capability.
7. Optional engines must fail visibly when absent.
8. No remote/provider capability is mandatory for an Ascout core claim unless policy explicitly requests that provider-specific evidence.
9. Subscription packaging never changes evidence truth.
10. All new donor source admission follows the donor matrix and CODE_PROVENANCE policy.

## 3. Required pre-P03 reconciliation gate

The current UA-P01 contracts and UA-P02 registry/planner are already canonical. Before introducing new local/remote engines, perform one bounded compatibility decision.

Planning identifier: LZ-G01

Goal:

Determine whether the current canonical contracts can represent the following as deterministic supplementary policy/descriptor metadata without mutating UA-P01 contracts:

- execution location: LOCAL / USER_REMOTE / EXTERNAL_PROVIDER;
- operator monetary cost class;
- user external monetary cost class;
- data-egress class;
- network requirement;
- credential requirement;
- hardware requirement;
- artifact sensitivity;
- local/offline availability;
- runtime isolation requirement.

Possible outcomes:

A. COMPATIBLE_WITH_SUPPLEMENTAL_METADATA  
Use an Ascout-owned side registry/policy projection without changing frozen contract semantics.

B. CONTRACT_AMENDMENT_REQUIRED  
Stop and create a separately reviewed compatibility/authorization amendment before any mutation.

C. DEFERRED  
No provider-dependent engine may be admitted until resolved.

Hard rule:

Do not mutate canonical UA-P01 contracts opportunistically inside P03/P05/P06.

LZ-G01 should be effect-free planning/compatibility work.

## 4. Cross-cutting local-zero-cost requirements

Every later phase authorization must preserve:

- no Ascout-hosted worker requirement;
- no Ascout-owned paid provider credential;
- no mandatory Ascout API;
- no mandatory central database;
- no mandatory cloud storage;
- no silent remote fallback;
- no provider call without explicit network/provider/data-egress authority;
- no provider call funded by Ascout;
- explicit local absence/unsupported states;
- telemetry off by default;
- local evidence retention by default.

## 5. UA-P03 — Unified Review profile

Existing purpose remains: qualified review engines and Ascout-owned finding normalization.

Reconciled additions:

### P03 decision support

Decision Fabric may enter P03 only in SHADOW mode for:
- finding category;
- duplicate-likelihood hints;
- evidence relevance;
- escalation hints.

Deterministic/source-bound review evidence remains authoritative.

Preferred initial engine:
- local Decider or SemIf adapter.

Nimble/Jev:
- deferred until exact model/provider qualification;
- Jev remote path requires explicit user provider/network/egress authority.

Hard rules:
- Alibaba Open Code Review remains the requested primary AI review engine where applicable;
- Decision Fabric does not replace Alibaba review;
- a model cannot suppress a valid review observation;
- low-confidence routing produces more evidence or human review, not PASS.

Proposed acceptance additions for P03 qualification:
- no remote decision call under default policy;
- shadow decisions cannot alter canonical finding lifecycle;
- missing Decision Fabric does not break review;
- exact decision engine identity appears in evidence when used.

## 6. UA-P04 — Workflow and GitHub publication convergence

Existing purpose remains durable review workflow and publication effects.

Reconciled additions:

Adapt selected Laya-style concepts:
- local event normalization;
- durable run/stage timeline;
- rules/firing audit semantics;
- agent workspace timeline concepts.

Do not adopt:
- general-purpose notification command center;
- mandatory n8n;
- mandatory ChromaDB;
- broad communication egress.

P04 should establish reusable durable stage/attempt/event semantics that P15 Watch can consume.

Hard rule:
GitHub publication remains a separate effect. A local Watch event never implies publication authority.

## 7. UA-P05 — Unified Test profile

Existing purpose remains unified deterministic/qualified testing.

Reconciled additions:

### Winds integration
Use Winds-derived or qualified companion capability for:
- exact candidate/worktree verification;
- process/check truth;
- candidate isolation semantics;
- evidence-bound retry/recheck.

### Failure Intelligence foundation
P05 may introduce contracts/observations for:
- reproduced;
- contradictory/flaky;
- environment failure;
- harness failure;
- product regression;
- unknown.

Do not make root-cause probabilities canonical facts.

### Decision Fabric test triage
Local typed decisions may classify:
- likely failure family;
- likely next evidence action;
- relevance of a candidate reproducer.

Shadow first.

Acceptance additions:
- optional local decision engine absence does not hide test failures;
- retry success does not erase original failure;
- environment/harness failure remains distinguishable from product PASS;
- no external provider is required by default.

## 8. UA-P06 — Sentrdel Security integration

No structural change to the existing plan.

Reconciled additions:

- preserve Sentrdel's deterministic Evidence/Coverage/UNKNOWN semantics;
- permit Decision Fabric only for bounded candidate triage/classification;
- no probabilistic model may downgrade deterministic severity/coverage requirements automatically;
- no remote model required for ordinary local security verification.

Cost/privacy gate:
Sentrdel/default security path must remain locally useful with external cost zero.

## 9. UA-P07 — Cloudflare-derived deep audit

Reconciled additions:

- bounded local multi-agent challenge may use user-installed agent CLIs/subscriptions;
- any cloud model path is BYOK/user-funded and explicit;
- no Ascout-operated inference gateway;
- agent consensus is never finding validation;
- local Decision Fabric may prioritize candidate verification but cannot promote a candidate to VALIDATED.

Budget evidence should include:
- local agent/provider identity;
- whether execution consumed local compute or user provider quota;
- explicit NOT_RUN when the configured user budget is exhausted.

## 10. UA-P08 — Reality local bridge

P08 becomes the principal convergence point for local Reality.

### Web Reality

Order:

1. direct API/HTTP/schema where sufficient;
2. Playwright deterministic browser;
3. semantic local resolver/AgentQL-derived capability;
4. TinyFish-derived resilient local browser capability after measured misses;
5. local vision/model escalation;
6. explicit user-funded remote provider only if authorized.

No managed Ascout browser.

### Computer Reality

Integrate:
- Ascout-owned effect model;
- selected Desktop Commander-derived primitives;
- Kernux runtime/capability discovery bridge if separately qualified;
- local process/filesystem/PTY evidence.

Desktop Commander policy is never inherited as Ascout security authority.

### Mobile Reality

Consume ARTEMIS capabilities only after the applicable ARTEMIS phases are canonically qualified.

P08 must not duplicate ARTEMIS authority contracts.

Relationship:
- ARTEMIS owns mobile adapter implementation work under its own authorization.
- P08 consumes a qualified Ascout mobile engine/evidence boundary.
- Ascout Unified Assurance owns composite target/claim planning.

### Acceptance additions

- local Reality works without Ascout cloud;
- no hidden mock substitution;
- no hidden managed browser fallback;
- external provider unavailability remains explicit;
- exact execution location is evidence-bound.

## 11. UA-P09 — Isolated Lab and provider qualification

P09 is the primary containment qualification phase.

Local-zero-cost requirement:

At least one supported Lab path must use user-owned/local infrastructure without Ascout-operated compute.

Candidates:
- local containers;
- WSL;
- user-owned VM/microVM;
- user-owned sandbox provider.

Cloud sandboxes may exist only as optional BYOK/user-owned infrastructure adapters.

Qualification must distinguish:
- LOCAL;
- USER_REMOTE;
- EXTERNAL_PROVIDER.

Do not market filesystem/worktree isolation as a security sandbox.

## 12. UA-P10 — Remote runtime

Remote means user-owned or user-selected infrastructure.

Supported examples may include:
- SSH;
- user's VM;
- user's workstation;
- user's server;
- paired device;
- user's Kubernetes runtime where later justified.

Forbidden base architecture:
- Ascout-operated worker fleet;
- Ascout-paid compute;
- Ascout-managed customer execution cloud.

Controller/host policy intersection remains mandatory.

Disconnect never equals process exit.

## 13. UA-P11 — Cyber planning and threat intelligence

Local-first requirement:

- threat modeling local;
- project correlation local;
- static supply-chain planning local;
- cached/local intelligence supported where possible.

Optional external threat-intelligence adapters:
- explicit network;
- user credentials;
- source/freshness identity;
- user-funded service if paid.

Threat intel alone cannot create a verified finding.

## 14. UA-P12 — Dynamic authorized security verification

Dynamic Cyber remains the highest-effect surface.

Reconciled zero-cost rule:

Targets/runtimes belong to or are explicitly authorized by the user. Ascout does not provide a hosted scanner fleet.

External scanners/services:
- optional;
- BYOK/user-funded;
- no operator-funded credit pool;
- exact plugin/template/provider identity.

All original scope/redirect/credential/rate/time/cleanup gates remain mandatory.

## 15. UA-P13 — Assure composite claims

P13 becomes the primary Challenge Graph phase.

Required additions:

- explicit claim dependency graph;
- mandatory-vs-optional evidence edges;
- omission impact;
- stale evidence propagation;
- contradiction propagation;
- independence requirements;
- location/cost/privacy evidence where claim policy requires it.

Decision Fabric may assist semantic claim/evidence matching in SHADOW/ASSISTIVE modes after qualification.

Hard rule:
No probabilistic score can override:
- deterministic failure;
- missing mandatory evidence;
- contradiction;
- stale mandatory evidence;
- unresolved material finding;
- required engine NOT_RUN.

Suggested Challenge Graph node states:
- SUPPORTED;
- CONTRADICTED;
- BLOCKED;
- INCOMPLETE;
- INCONCLUSIVE;
- STALE;
- REFUSED;
- NOT_RUN;
- UNKNOWN;
- NOT_APPLICABLE.

## 16. UA-P14 — Explain, reproduce, retest

P14 becomes the main Failure Intelligence and Evidence Memory convergence point.

### Failure Intelligence

Implement bounded:
- reproduce;
- minimize;
- classify;
- localize;
- correlate;
- hypothesis;
- challenge;
- retest;
- regression obligation.

### Evidence Memory

Local only by default.

Memory is advisory/context acceleration and cannot:
- create PASS;
- suppress findings automatically;
- bypass freshness;
- bypass qualification.

Every memory item is source/scope/freshness/authority bound.

Acceptance additions:
- stale memory cannot satisfy current evidence;
- deleting memory cannot make a claim more supported;
- probabilistic root-cause classification is visibly probabilistic;
- support bundle/export is explicit.

## 17. UA-P15 — IDE, MCP, GitHub and local product surfaces

P15 becomes the convergence phase for Capability Fabric product UX, Watch, and Agent Assurance.

### Engines surface

Expose:
- available;
- qualified;
- location;
- external cost class;
- privacy/egress;
- platform;
- known limitations.

### Watch

Local daemon/service optional.

Watch may:
- observe local repo/agent/tool events;
- generate Assurance Events/Cards;
- schedule already-authorized local verification;
- never widen effects by event arrival alone.

### Agent Assurance

Integrate HarnessMind-derived capability:
- agent/runtime identity;
- instruction/tool/MCP/permission observability;
- harness/config drift;
- explicit UNKNOWN where vendor observability is absent.

### MCP/IDE

All surfaces share the same intent/policy/effect path.

No UI/MCP fast-path privilege.

## 18. UA-P16 — Donor migration and parity

Expand P16 donor accounting to include the new source matrix.

Required before P16 closure:

- disposition for every selected Treg subsystem;
- disposition for every selected Laya subsystem;
- SemIf source/runtime disposition;
- Decider source/weight disposition;
- Nimble model artifact disposition;
- TinyFish/AgentQL repository/path dispositions;
- Desktop Commander selected path dispositions;
- HarnessMind selected path dispositions;
- Kernux reference/adapter disposition;
- ARTEMIS provenance remains separately reconciled;
- no unknown copied source path.

P16 must prove that copied donor code is neither untracked nor an accidental second authority.

## 19. UA-P17 — Packaging, supply chain and release engineering

P17 owns productization of local zero-cost architecture.

Required additions:

### Local model packaging strategy
- models may be separately installed rather than bundled;
- exact revision/digest verification;
- no implicit download during offline verification;
- no Ascout-hosted model CDN required.

### Entitlement architecture
Preferred:
- signed entitlement;
- public verification key in client;
- local verification;
- expiry/features encoded;
- no continuous license-server dependency.

Entitlement may control product features but not rewrite evidence truth.

### Updates
- static signed release manifests;
- checksums;
- attestation;
- rollback;
- no mandatory update service.

### Credential integration
- OS keychain/qualified local store;
- no central Ascout credential vault.

### Offline installer
Enterprise/offline packaging should be possible without an Ascout backend.

## 20. UA-P18 — Final qualification and canonical closeout

P18 receives new absolute release gates.

Existing integrity gates remain.

Add:

1. ZERO_OPERATOR_RUNTIME_COST_GATE
2. OFFLINE_CORE_GATE
3. NO_MANDATORY_ASCOUT_BACKEND_GATE
4. NO_SILENT_PAID_FALLBACK_GATE
5. TELEMETRY_OFF_DEFAULT_GATE
6. LOCAL_ARTIFACT_GATE
7. EXPLICIT_DATA_EGRESS_GATE
8. OPTIONAL_ENGINE_ABSENCE_GATE
9. ENTITLEMENT_TRUTH_INDEPENDENCE_GATE
10. MODEL_SOURCE_AND_WEIGHT_PROVENANCE_GATE
11. DONOR_PERMISSION_AND_NOTICE_GATE
12. CLEAN_MACHINE_LOCAL_EXECUTION_GATE

The companion qualification document defines these in detail.

No final completion claim is valid without these gates.

## 21. ARTEMIS dependency mapping

ARTEMIS may progress under its own canonical authorization when effective.

Unified Assurance consumption dependencies:

- ARTEMIS A0-A2: source/sidecar foundations, not yet Reality claim evidence.
- ARTEMIS A3: read-only mobile evidence becomes consumable by planning/qualification work.
- ARTEMIS A4-A8: bounded mobile Reality execution/evidence.
- ARTEMIS A9-A10: product surface work must reconcile with UA-P15/product UI authority before duplicate public surfaces are finalized.
- ARTEMIS A11-A13: hardening/qualification required before strong mobile support claims.

Where task ownership conflicts, stop and reconcile; do not create duplicate CLI/MCP/claim authorities.

## 22. Decision Fabric sequencing

Proposed sequence, mapped into existing phases rather than standalone product phases:

DF-0 — contract compatibility under LZ-G01  
DF-1 — local engine availability/identity adapter  
DF-2 — typed decision contracts  
DF-3 — shadow evidence capture  
DF-4 — calibration corpus  
DF-5 — bounded assistive routing  
DF-6 — optional stronger local judge  
DF-7 — optional Jev provider adapter  
DF-8 — cross-workflow qualification  
DF-9 — release hardening

Execution locations:
- DF-1..DF-4: attach to the first applicable UA phase authorization after compatibility.
- DF-5+: only after benchmark evidence.
- Jev remains remote optional and user-funded.

## 23. Capability Fabric sequencing

CF-0 — LZ-G01 compatibility decision  
CF-1 — supplemental cost/privacy/location metadata if compatible  
CF-2 — local capability discovery  
CF-3 — health/availability  
CF-4 — credential requirement declaration  
CF-5 — hardware requirement declaration  
CF-6 — cost policy  
CF-7 — privacy/egress policy  
CF-8 — local credential broker  
CF-9 — engine UX in P15  
CF-10 — final P18 economics/privacy qualification

No central registry server is required.

## 24. Watch sequencing

Watch is not allowed to become an alternative authority system.

W-0 — event contract  
W-1 — local event journal  
W-2 — repository/agent/CI metadata adapters  
W-3 — Assurance Card projection  
W-4 — rule evaluation  
W-5 — schedule already-authorized work only  
W-6 — local notification  
W-7 — P15 UI/MCP integration  
W-8 — retention/privacy qualification

Effects remain governed by the same Assurance Intent/Policy path.

## 25. Agent Assurance sequencing

AA-0 — observable-capability matrix by agent  
AA-1 — read-only harness snapshot  
AA-2 — provenance/unknown semantics  
AA-3 — drift comparison  
AA-4 — risk/verification-plan input  
AA-5 — evidence UI  
AA-6 — benchmark/adversarial qualification

No claim that an instruction was "used" is allowed merely because it loaded.

## 26. Dependency graph summary

Canonical backbone remains:

P03 -> P04
P05
P06 -> P07
P08 -> P09 -> P10
P06 -> P11
P09 + P11 -> P12
P03 + P05 + P06 -> P13
P13 -> P14 -> P15
P04 + P06 -> P16
P13 -> P17
P16 + P17 + required prior phases -> P18

Local-zero-cost additions:

LZ-G01 -> first new engine/provider metadata work
LZ-G01 -> Decision Fabric adapters
LZ-G01 -> Capability Fabric cost/privacy/location projection
ARTEMIS qualified mobile engine -> P08/P13 mobile claim consumption
P14 -> Evidence Memory
P15 -> Watch/Agent Assurance product surfaces
P17 -> offline entitlement/model/update packaging
P18 -> economics/offline/privacy final proof

## 27. Parallelism rules

Allowed:
- P03 Review, P05 Test, and P06 Security according to the existing roadmap after predecessor gates;
- ARTEMIS implementation under its separate authorization when effective;
- documentation/research that grants no runtime authority.

Disallowed:
- copying additional donor source into runtime paths without source-admission authority;
- P15 product surfaces that bypass P13 truth semantics;
- P17 commercial entitlement logic that changes evidence results;
- remote provider use before cost/privacy/network/provider authority;
- P18 completion before donor provenance and economics gates.

## 28. Implementation handoff rule

When Muse or another executor continues this plan:

1. reverify live main and active authorization;
2. identify the next canonical existing UA/ARTEMIS leaf;
3. determine whether this reconciliation adds an acceptance requirement to that leaf;
4. if the current authorization does not permit that requirement, create a bounded authorization/compatibility amendment rather than mutating out of scope;
5. implement one legal leaf;
6. qualify exact head;
7. review;
8. forward-fix;
9. merge guarded where required;
10. verify fresh main;
11. continue.

Do not use this planning document as a shortcut around repository governance.

## 29. Reconciliation completeness statement

ROADMAP_DUPLICATION = NO  
UA_P03_TO_P18_PRESERVED = YES  
ARTEMIS_PROGRAM_PRESERVED = YES  
LOCAL_ZERO_COST_REQUIREMENTS_MAPPED = YES  
CAPABILITY_FABRIC_MAPPED = YES  
DECISION_FABRIC_MAPPED = YES  
REALITY_FABRIC_MAPPED = YES  
WATCH_MAPPED = YES  
AGENT_ASSURANCE_MAPPED = YES  
FAILURE_INTELLIGENCE_MAPPED = YES  
EVIDENCE_MEMORY_MAPPED = YES  
SUBSCRIPTION_RUNTIME_MODEL_MAPPED = YES  
OFFLINE_RELEASE_GATES_MAPPED = YES  
IMPLEMENTATION_AUTHORITY_GRANTED_BY_THIS_DOCUMENT = NO
