# Ascout Local Zero-Cost Verification OS — Master Plan

**Status:** PLANNING_ONLY / NO_NEW_IMPLEMENTATION_AUTHORITY  
**Date:** 2026-09-22  
**Planning base:** 25c6dcbd75d62d6e1422bb7681f29c5b2381e5ad  
**Existing program:** Unified Assurance UA-P03 through UA-P18 remains the canonical product roadmap.  
**Existing mobile program:** ARTEMIS A0 through A13 remains separately governed by its merged authorization and effectiveness gate.  
**Founder direction:** Ascout must remain local-first and must not create operator-paid runtime infrastructure cost. The commercial model is a monthly subscription; transaction/payment/business overhead is outside this runtime-cost invariant.

## 1. Executive decision

Ascout becomes a local verification operating system for AI-built software.

It is not a hosted testing SaaS, model gateway, cloud browser farm, device farm, managed build service, or centralized evidence database.

The product thesis is:

> Give Ascout a repository, change, application, browser, computer, mobile device, or AI-agent-produced candidate. Ascout determines the minimum sufficient verification plan, executes only qualified and authorized local/user-owned capabilities, preserves what passed, failed, was blocked, stayed unknown, or was never checked, and produces evidence-bound claims without requiring Ascout-operated compute or storage.

The governing architecture is:

Human / IDE / CI / MCP
  -> Assurance Intent
  -> Target + Policy + Cost/Privacy Budget
  -> Deterministic Assurance Planner
  -> Qualified Capability Fabric
  -> Local/User-Owned Execution Fabric
  -> Evidence / Findings / Coverage / Omissions
  -> Reconciliation + Challenge Graph
  -> Claim Assessment
  -> Terminal / JSON / UI / GitHub / MCP

Ascout is the final claim authority. Engines, agents, models, scanners, browsers, mobile runtimes, and external services produce observations and actions only.

## 2. Non-negotiable founder invariants

These constraints are architectural, not packaging preferences.

| Invariant | Required state |
|---|---|
| Mandatory Ascout cloud backend | NO |
| Ascout-hosted model inference | NO |
| Ascout-hosted GPU/CPU execution | NO |
| Ascout-hosted browser runtime | NO |
| Ascout-hosted mobile/device farm | NO |
| Ascout-hosted test worker fleet | NO |
| Ascout-hosted queue | NO |
| Ascout-hosted primary database | NO |
| Ascout-hosted vector database | NO |
| Ascout-hosted artifact/object storage | NO |
| Mandatory Ascout account for core runtime | NO |
| Mandatory telemetry | NO |
| Silent paid provider fallback | NO |
| Operator-funded third-party API calls | NO |
| User-owned compute/storage | YES |
| Offline-useful core | YES |
| BYOK/BYO infrastructure | OPTIONAL / USER-FUNDED |
| Local evidence store | DEFAULT |
| Local models | DEFAULT FOR MODEL-DEPENDENT LOCAL FEATURES |
| Explicit external egress | REQUIRED FOR EVERY REMOTE PROVIDER |

The technical target is:

OPERATOR_VARIABLE_RUNTIME_INFRASTRUCTURE_COST_PER_USER = 0

Payment processor fees, taxes, domains, code signing, support, legal/accounting, and other ordinary business overhead are not runtime infrastructure and are explicitly outside this technical invariant.

## 3. What the subscription sells

The subscription sells software value, not hosted compute.

Permitted subscription value includes:

- advanced local workflows;
- advanced verification packs;
- policy packs;
- enterprise/offline policy controls;
- advanced UI and local Watch workflows;
- premium local adapters and orchestration;
- local reporting/export capability;
- organization policy bundles;
- signed release/update channels;
- support and maintenance;
- optional commercial modules that execute locally.

Subscription state must not alter truth semantics.

If a capability is unavailable because the current edition does not include it, the result is explicit NOT_RUN / UNAVAILABLE / INCOMPLETE where that capability is mandatory. It must never become PASS.

The trust kernel, evidence semantics, source binding, and claim semantics must not depend on contacting a licensing server during normal verification.

An offline-verifiable signed entitlement is the preferred commercial entitlement design. The exact commercial licensing split is a separate legal/product packaging decision and does not change this architecture.

## 4. Core architecture

### 4.1 Assurance authority plane

Ascout owns:

- AssuranceTarget;
- AssuranceIntent;
- AssurancePolicySnapshot;
- effect classes and effect ceilings;
- privacy/data-egress policy;
- cost policy;
- engine/capability registry;
- availability and qualification;
- planner determinism;
- Evidence and EvidenceRef;
- Findings;
- Coverage;
- Omissions;
- Contradictions;
- Freshness;
- Reverification;
- ClaimAssessment;
- publication intent/effect authority.

No donor engine may bypass this plane.

### 4.2 Capability Fabric

Extend the current engine registry concept without replacing it.

Each capability must have a deterministic descriptor containing at least:

- capability identity;
- implementation identity;
- exact version/source revision;
- configuration identity;
- runtime identity;
- supported operations;
- input/output contracts;
- effect classes;
- network requirements;
- credential requirements;
- local/remote location;
- data-egress classes;
- expected monetary cost class;
- user-resource cost class;
- expected latency class;
- sandbox/isolation requirements;
- qualification evidence;
- platform matrix;
- known limitations;
- authority ceiling.

The planner asks for a capability, not a vendor.

Example request:

- capability: WEB_INTERACTION
- privacy: LOCAL_ONLY
- external monetary cost: ZERO
- allowed effects: BROWSER_READ + BROWSER_INPUT
- required evidence: DOM + SCREENSHOT + TRACE
- platform: Windows x64

Candidate engines may include Playwright, AgentQL-derived local capability, TinyFish-derived local capability, or another admitted implementation. Selection is based on qualification and policy, never marketing preference.

### 4.3 Decision Fabric

Decision models are a separate capability family from deterministic verification.

Required hierarchy:

1. deterministic code when the question is exactly computable;
2. local typed decision engine for fuzzy classification/routing;
3. stronger local typed/evidence judge when the first local engine is below a calibrated threshold;
4. explicit INCONCLUSIVE / HUMAN_REVIEW when uncertainty remains;
5. optional remote provider only when the user explicitly authorizes the provider, network, data egress, and user-funded cost.

Initial candidates:

- Decider: fast local typed classification/routing;
- SemIf: portable local typed probability runtime across CPU/GPU/Apple/browser-capable paths where admitted;
- Bespoke Nimble 9B: optional stronger local evidence-grounded choice/boolean/rubric judge, subject to exact model/license/runtime qualification;
- Jev: optional remote typed decision provider, never mandatory and never a code-review replacement.

Models may classify, rank, triage, or propose.

Models may not:

- grant permission;
- create deterministic facts;
- suppress valid deterministic findings;
- erase Coverage gaps;
- widen effect authority;
- mark missing mandatory evidence complete;
- self-qualify;
- silently select a paid provider;
- make RELEASE_READY true by themselves.

Every material model-assisted decision preserves provider/model/runtime identity, decision-contract identity, policy identity, confidence/probabilities where available, thresholds, and request/response digests or privacy-safe equivalents.

### 4.4 Reality Fabric

Reality verification is multi-substrate and local/user-owned by default.

Web:
- direct HTTP/API/schema evidence where sufficient;
- Playwright deterministic browser substrate first;
- semantic/local selectors and AgentQL-style capability second;
- TinyFish-derived resilient local capability after measured deterministic misses;
- local vision/model escalation only when policy permits;
- optional user-funded hosted browser/agent provider only by explicit opt-in.

Computer:
- Ascout-owned effect authority;
- selectively adapted Desktop Commander primitives for files, search, PTY, processes, documents, and remote-device mechanics;
- Kernux as runtime/capability architecture reference or qualified adapter, not Ascout's identity;
- user-owned machine/runtime only.

Mobile:
- the separately governed ARTEMIS program;
- user emulator/physical device;
- isolated sidecar;
- explicit ADB effects;
- evidence-bound screenshots, hierarchy, Logcat, video/replay.

Processes/API/services:
- Winds-derived independent candidate/worktree/process truth;
- local services and ports;
- qualified isolation/Lab when required.

Security:
- Sentrdel as the principal deterministic security companion initially;
- Cloudflare-derived deep audit method under the existing UA program;
- dynamic cyber remains separately authorized and bounded.

### 4.5 Watch and event plane

Adapt Laya's strongest local-first orchestration patterns without turning Ascout into a notification product.

Introduce a local Assurance Event Bus and Watch mode that may observe:

- repository changes;
- branch/head changes;
- local agent run completion;
- local test/build failure;
- CI metadata when the user connects a forge;
- dependency/lockfile changes;
- MCP/tool/harness changes;
- security findings;
- stale evidence;
- mobile/browser/runtime evidence completion.

Events produce Assurance Cards, not automatic truth.

An Assurance Card may show:

- exact target/source identity;
- changed risk;
- required claim obligations;
- completed verification;
- missing verification;
- blocked effects;
- current ClaimAssessment;
- actions such as Explain, Verify Deeper, Reproduce, Retest, or Run Missing Evidence.

No central Ascout ingestion service is required. Local polling, local forge adapters, local webhooks, or user-owned automation may feed the event plane.

### 4.6 Agent Assurance

HarnessMind-derived capability becomes a dedicated assurance dimension for AI agent production.

Where observable, Ascout may record:

- agent/runtime identity;
- loaded instruction provenance;
- skills;
- MCP/tool surface;
- permissions;
- model identity;
- relevant harness/configuration digest;
- working-directory/repository identity;
- harness drift from a previously accepted state.

Unknown observability remains UNKNOWN.

Agent-harness evidence may increase required independent verification but cannot alone prove causation.

### 4.7 Failure Intelligence

Ascout should not stop at TEST_FAILED.

A bounded failure pipeline may:

- reproduce;
- classify;
- minimize;
- localize;
- correlate related historical evidence;
- propose root-cause hypotheses;
- challenge hypotheses with independent evidence;
- produce a smallest useful reproducer where possible;
- record regression obligations.

Probabilistic classifications remain probabilistic evidence.

Original failure evidence is immutable and is never replaced by a later successful retry.

### 4.8 Challenge Graph

Ascout must represent composite claims as a dependency graph rather than an opaque quality score.

Example:

RELEASE_READY
  -> SOURCE_BOUND
  -> BUILD
  -> BEHAVIOR
     -> unit
     -> integration
     -> browser
  -> SECURITY
     -> static
     -> invariants
  -> MOBILE where applicable
  -> PROVENANCE
  -> PLATFORM

Each edge/node resolves to a typed state such as:

- SUPPORTED;
- CONTRADICTED;
- BLOCKED;
- INCOMPLETE;
- INCONCLUSIVE;
- STALE;
- REFUSED;
- NOT_RUN;
- UNKNOWN;
- NOT_APPLICABLE with evidence-backed rationale.

No score may override a mandatory failure, contradiction, missing required class, stale required evidence, or unresolved material finding.

### 4.9 Evidence Memory

Evidence Memory is local and bounded.

Default storage is local SQLite/filesystem owned by the user.

Potential contents:

- previous findings;
- reproductions;
- test usefulness history;
- flake history;
- engine qualification history;
- model calibration observations;
- locator/browser history;
- security invariant history;
- accepted-risk events;
- agent-harness snapshots;
- artifact identities.

Every memory item must carry:

- scope;
- source/target identity;
- provenance;
- authority class;
- freshness;
- creation time;
- expiry/invalidators where relevant;
- confidence when probabilistic.

Memory accelerates decisions and proposes context. Memory never grants PASS.

## 5. Local credential architecture

Ascout must not require a central credential vault.

Preferred local credential hierarchy:

- OS-native secure credential store where qualified;
- environment/process-scoped secrets for explicit runs;
- qualified encrypted local fallback only where necessary;
- no plaintext credential persistence in receipts;
- no secret values in evidence artifacts.

Credentials are capabilities, not ambient environment inheritance.

A tool request should follow:

Agent/Planner
  -> Ascout policy/effect decision
  -> scoped credential capability
  -> exact engine invocation

The engine receives only credentials required for the authorized action.

Remote providers remain BYOK/user-owned.

## 6. Network and data-egress architecture

Every network effect is explicit.

Required policy classes include:

- DENY_ALL;
- LOCALHOST_ONLY;
- USER_OWNED_NETWORK_TARGETS;
- ALLOWLIST;
- PROVIDER_SPECIFIC;
- UNRESTRICTED_EXPLICIT.

Every provider integration declares:

- destination/origin;
- data classes leaving the machine;
- credential source;
- external monetary cost ownership;
- retention assumptions if known;
- timeout/retry policy;
- fallback policy.

No hidden remote fallback exists.

If a local engine is unavailable and remote execution is not authorized, the result is UNAVAILABLE/INCOMPLETE, not an automatic cloud call.

## 7. Cost architecture

Cost is a first-class planner constraint.

Every capability descriptor should expose or derive:

- operator monetary cost;
- user external monetary cost;
- local compute class;
- local memory/VRAM class;
- disk/artifact class;
- expected latency;
- network requirement.

Default policies:

- OPERATOR_EXTERNAL_COST_ALLOWED = 0
- USER_EXTERNAL_COST_ALLOWED = 0
- REMOTE_PROVIDER_FALLBACK = DENY

The user may explicitly change their own budget.

Ascout never spends from an Ascout-owned provider account to complete customer verification.

## 8. Local model and hardware strategy

Ascout Doctor should produce a local execution profile from observable machine facts:

- OS/architecture;
- CPU;
- RAM;
- GPU;
- VRAM;
- CUDA availability;
- Metal/MPS availability;
- free disk;
- browser availability;
- Android/ADB availability;
- Docker/container availability;
- WSL/runtime availability.

Profiles may include:

- LOCAL_MINIMAL;
- LOCAL_CPU;
- LOCAL_GPU;
- LOCAL_APPLE;
- LOCAL_HIGH_END;
- OFFLINE_STRICT.

The planner must not select a model/runtime that the qualified hardware profile cannot support.

Model identity is not a model name alone. Qualification binds:

- model repository;
- exact revision;
- weight digest;
- adapter/LoRA revision where applicable;
- quantization;
- tokenizer;
- runtime;
- decision contract;
- calibration profile.

Source-code permission, model-weight permission, dataset permission, commercial-use permission, and redistribution permission are tracked separately.

## 9. Packaging and updates without an Ascout backend

Normal product operation must not depend on an Ascout control plane.

Preferred distribution/update pattern:

- GitHub Releases or another static release channel;
- signed manifest;
- checksums;
- provenance/attestation;
- platform-specific artifacts;
- local verification before install;
- local rollback.

Commercial entitlement validation should be offline-verifiable using a signed entitlement/public-key design where commercially appropriate.

An optional convenience activation service may exist in the future only if:
- runtime remains functional without continuous access;
- verification does not route through it;
- its outage cannot convert local evidence into failure;
- its infrastructure cost is not required for core execution.

## 10. Telemetry and support

Default telemetry state: OFF.

Ascout must not require remote analytics to function or qualify a run.

Preferred support workflow:

- local diagnostics collection;
- explicit redaction;
- user-reviewed support bundle;
- explicit user export/share action.

No source code, screenshots, logs, paths, credentials, or private repository content are uploaded automatically.

## 11. Donor integration modes

Permission to copy does not imply wholesale import.

Every source receives one of these dispositions:

- NATIVE: small Ascout-owned implementation;
- ADAPTER: qualified external binary/library/service interface;
- COMPANION: isolated local process with versioned protocol;
- VENDORED_DONOR: exact immutable source snapshot under provenance controls;
- SELECTIVE_PORT: path-level copied/adapted code with characterization tests;
- REFERENCE_ONLY: design input, no copied runtime code;
- REJECTED: not admitted, with reason.

No donor may be copied to src/ merely because permission exists.

Every copied/adapted source requires:
- exact source revision;
- path-level provenance;
- license and additional-term review;
- founder-supplied permission record where applicable;
- attribution/notices;
- security review;
- dependency review;
- characterization/parity evidence where behavior is retained;
- update policy;
- rollback/disposition.

See the companion donor/admission matrix.

## 12. Role of key source systems

The intended roles are:

- Treg: Capability Fabric patterns, registry/discovery, credential injection concepts, tool health/audit; no central paid proxy dependency.
- Laya: local event pipeline, cards/workspaces, agent-session timeline, budgets, local-first UX patterns; no mandatory n8n/ChromaDB adoption without evidence.
- SemIf: local typed semantic decisions.
- Decider: fast local typed System-1 decisions.
- Bespoke Nimble 9B: optional stronger local evidence judge.
- Jev: optional remote typed decision provider.
- TinyFish/AgentQL: web semantic and resilient browser capability; local path preferred.
- Desktop Commander: computer/process/filesystem primitive donor; Ascout owns policy/security authority.
- ARTEMIS: mobile Reality engine under its existing program.
- Sentrdel: security evidence/invariant engine.
- Kodac: review/workflow/publication qualification patterns.
- Winds: independent candidate/process execution truth.
- HarnessMind: AI-agent harness observability and drift.
- Kernux: runtime/capability architecture and optional bridge, not Ascout's identity.
- SpecGrain: bounded delivery governance.
- Diffcipline: proof-before-done methodology.

## 13. Relationship to Unified Assurance UA-P03 through UA-P18

This plan does not create a competing roadmap.

Every capability must map into the existing phase graph.

High-level mapping:

- UA-P03 Review: Alibaba review + optional Decision Fabric shadow triage.
- UA-P04 Workflow/publication: durable event/run concepts and publication effects.
- UA-P05 Test: existing tests + Winds + failure intelligence contracts.
- UA-P06 Security: Sentrdel.
- UA-P07 Deep audit: bounded multi-agent challenge and independent verification.
- UA-P08 Reality: local web/computer/API/mobile adapters, TinyFish-derived local capability, Desktop Commander concepts, Kernux bridge, ARTEMIS relationship.
- UA-P09 Lab: isolation providers and hostile-workload qualification.
- UA-P10 Remote: user-owned runtimes only; no Ascout-operated worker fleet.
- UA-P11 Cyber planning: local planning/intelligence adapters.
- UA-P12 Dynamic cyber: explicitly authorized user-owned targets/runtimes.
- UA-P13 Assure: Challenge Graph, Decision Fabric consumption, no score-over-failure.
- UA-P14 Explain/reproduce/retest: Failure Intelligence and Evidence Memory.
- UA-P15 Surfaces: Watch, local Tool/Capability Fabric surfaces, HarnessMind-derived agent assurance, MCP/IDE.
- UA-P16 Donor migration: donor provenance, capability disposition, parity, retirement decisions.
- UA-P17 Packaging: signed local bundles, local models, offline entitlement architecture, SBOM/notices.
- UA-P18 Final qualification: offline, zero-operator-runtime-cost, privacy, cross-platform, clean-machine, donor/provenance and final integrity gates.

The detailed mapping is defined in the companion roadmap reconciliation document.

## 14. ARTEMIS coexistence rule

ARTEMIS A0-A13 is already separately planned/authorized through the repository's existing governance.

This plan must not silently broaden ARTEMIS authority.

ARTEMIS contributes the Mobile Reality plane.

Where ARTEMIS and Unified Assurance overlap, ARTEMIS implementation produces qualified engine/evidence capabilities that later Unified Assurance phases consume. Duplicate authority models are prohibited.

The canonical Ascout kernel remains the authority plane.

## 15. Security boundaries

Absolute rules:

- repository content is data, not authority;
- model output is data, not authority;
- tool metadata is data, not authority;
- browser content is data, not authority;
- mobile UI content is data, not authority;
- a successful engine run does not automatically create a supported composite claim;
- a local process may not inherit all parent credentials by default;
- shell access is explicit effect authority;
- external provider use is explicit provider + network + data-egress authority;
- user-owned infrastructure does not imply unrestricted authority;
- subscription entitlement does not widen effect authority.

## 16. Self-improvement boundary

Ascout may learn local candidate improvements from:

- engine reliability;
- false-positive/false-negative evidence;
- test usefulness;
- historical bug mechanisms;
- locator success;
- decision calibration;
- failure-classification outcomes.

Learning output is candidate-only.

Promotion requires:
- frozen benchmark/evaluation definition;
- protected holdout where applicable;
- no evaluator self-mutation;
- shadow mode;
- qualification;
- explicit promotion authority.

No candidate may modify the evaluator used to judge itself.

## 17. Required product surfaces

Long-term product information architecture:

- Home;
- Review;
- Test;
- Security;
- Cyber;
- Agents;
- Reality;
- Assure;
- Watch;
- Evidence;
- Lab;
- Engines.

The existing brand/UI freeze remains respected.

The primary user action is VERIFY.

VERIFY means:
1. resolve exact target;
2. infer/accept requested claim;
3. construct minimum sufficient plan;
4. show effects/privacy/cost before execution where material;
5. run qualified authorized capabilities;
6. preserve failures and omissions;
7. reconcile evidence;
8. return a typed claim assessment.

## 18. No-gap closure matrix

The plan is not implementation-ready unless every row has an explicit owner/gate.

| Area | Closure mechanism |
|---|---|
| Product identity | This master plan + existing Unified Assurance plan |
| Trust authority | Existing Assurance kernel/contracts |
| Local-first | Hard invariant + offline qualification |
| Operator runtime cost | Zero-cost qualification protocol |
| Capability discovery | Capability Fabric / registry |
| Engine qualification | Existing exact identity qualification |
| Cost routing | Descriptor cost metadata + planner policy |
| Privacy/egress | Explicit network/provider/data classes |
| Credentials | Local scoped credential capability |
| Local models | Hardware profiles + exact model identity |
| Decision uncertainty | Typed probabilities/confidence + thresholds |
| Remote provider use | Explicit BYOK/user-paid opt-in |
| Browser | deterministic-first escalation |
| Computer | Ascout authority over adapted primitives |
| Mobile | ARTEMIS program |
| Security | Sentrdel + existing security phases |
| Agent verification | Harness observability plane |
| Failure diagnosis | Failure Intelligence |
| Composite claims | Challenge Graph |
| Historical learning | Evidence Memory, non-authoritative |
| Watch/orchestration | local event bus/cards |
| Donor provenance | Donor registry + path-level records |
| Model licensing | separate code/weights/data/redistribution records |
| Supply chain | exact binaries/models/SBOM/digests |
| Updates | signed static release channel |
| Subscription | local/offline-verifiable entitlement architecture |
| Telemetry | OFF default; explicit support export |
| Cross-platform | Linux/macOS/Windows evidence matrix |
| Offline | clean-machine network-denied qualification |
| Release integrity | UA-P18 + added zero-cost/privacy/offline gates |

## 19. Plan-level definitions of done

This planning package is complete when the repository contains:

- this master plan;
- donor/capability admission matrix;
- roadmap reconciliation mapping all new capability families into existing UA phases;
- zero-operator-runtime-cost qualification protocol;
- a planning ledger/PR that explicitly states no runtime authority is granted by planning.

Implementation is not authorized merely because these documents exist.

## 20. Final architecture statement

Ascout should be able to serve one user or one million users without requiring a proportional Ascout-operated compute, browser, device, model, worker, database, vector-store, or artifact-storage bill.

Users may voluntarily connect their own infrastructure and providers.

Ascout sells the verification product and subscription entitlement.

The user's machine and user-owned infrastructure perform the work.

The evidence stays local by default.

The truth model remains Ascout-owned and evidence-bound.
