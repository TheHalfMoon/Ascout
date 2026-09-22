# Ascout Donor and Capability Admission Matrix

**Status:** PLANNING_ONLY / NO_SOURCE_ADMISSION_BY_THIS_DOCUMENT  
**Date:** 2026-09-22  
**Planning base:** 25c6dcbd75d62d6e1422bb7681f29c5b2381e5ad  
**Companion plan:** ASCOUT_LOCAL_ZERO_COST_VERIFICATION_OS_MASTER_PLAN_2026-09-22.md

## 1. Purpose

This document prevents two failure modes:

1. useful upstream code is copied without an exact provenance/security/maintenance boundary;
2. useful upstream ideas are ignored because wholesale import would be too expensive to maintain.

Founder permission to copy/adapt a source is an input to admission, not a substitute for exact revision binding, license/additional-term review, attribution, security review, dependency review, characterization, or qualification.

No source is admitted merely because it appears in this matrix.

## 2. Admission dispositions

Every external or founder-owned source must receive exactly one runtime disposition before product use:

| Disposition | Meaning |
|---|---|
| NATIVE | Reimplement a small Ascout-owned capability without copied source. |
| ADAPTER | Integrate an external qualified library/binary/service through an Ascout contract. |
| COMPANION | Run an isolated local process behind a versioned protocol. |
| VENDORED_DONOR | Copy an immutable exact source snapshot into an explicit vendor boundary. |
| SELECTIVE_PORT | Copy/adapt exact paths with path-level provenance and characterization tests. |
| REFERENCE_ONLY | Use design/method ideas only; no copied runtime source. |
| REJECTED | Deliberately not used; preserve the reason. |

A source may have multiple dispositions by subsystem, but each copied path must have one explicit disposition.

## 3. Mandatory source-admission record

Before copied/adapted source reaches a production-capable path, record:

- upstream repository/artifact;
- exact immutable revision;
- exact tree or content digest where meaningful;
- source paths;
- destination paths;
- public license identity;
- additional terms;
- founder-supplied permission record where applicable;
- commercial-distribution status;
- attribution/NOTICE obligations;
- copied/adapted/reference classification;
- modifications;
- dependency graph;
- privileged install/build scripts;
- network/telemetry behavior;
- credential behavior;
- security findings;
- characterization tests;
- qualification evidence;
- update policy;
- rollback/removal plan;
- reviewer.

Unknown legal/source identity fails closed.

## 4. Founder-permission semantics

The founder has stated that permission exists to copy/adapt the source requested for this program, including Treg, Laya, SemIf, Decider, TinyFish source, Desktop Commander, and founder-owned GitHub sources.

Repository records must describe this accurately as founder-supplied authorization.

For a source whose public license has additional restrictions, such as Treg, distribution admission must also preserve a durable record of the separate permission relied on. This planning document does not independently verify the legal scope of that external permission.

## 5. External source matrix

### 5.1 Treg

Planning reference:

- repository: https://github.com/superdesigndev/treg
- observed planning revision: 6e667a4c6f7c70c448ea6574c5a038ba8f14bc5f
- public license file: Apache-2.0 text plus additional hosted/managed/embedded commercial-service restriction
- founder states separate permission to copy/use

Desired Ascout role:

- Capability Fabric architecture;
- capability/tool catalog;
- tool discovery;
- health/availability patterns;
- MCP/CLI/tool schema ideas;
- local credential injection/broker patterns;
- audit/history concepts;
- cost metadata and provider metadata.

Preferred disposition:

- REFERENCE_ONLY for hosted marketplace/billing architecture;
- SELECTIVE_PORT for local registry/discovery/credential/audit primitives only when characterization proves value;
- NATIVE for Ascout-specific cost/privacy/effect-aware descriptor logic.

Explicitly rejected as mandatory architecture:

- Ascout-owned central tool proxy;
- Ascout-funded provider balances;
- Ascout-hosted secret store;
- mandatory server-held credentials;
- mandatory SaaS registry;
- silent provider selection;
- hosted Treg economics.

Admission gate:

- record the founder-supplied commercial permission before distributed copied Treg source;
- pin exact selected paths/revision;
- verify no hosted-service restriction is being relied on solely through the public license;
- remove/disable upstream telemetry unless separately admitted;
- preserve credential isolation without introducing an Ascout backend.

### 5.2 Laya

Planning reference:

- repository: https://github.com/aayushch/laya
- observed planning revision: 5970a114241ee09cec09d571acf9ba52d27ae612
- observed public license: Apache-2.0
- founder states permission to copy/adapt

Desired Ascout role:

- local event pipeline;
- Assurance Cards;
- agent-session workspace/timeline patterns;
- local-first desktop orchestration;
- local SQLite/search patterns;
- explicit budgets;
- rules/firing audit;
- local MCP scope concepts;
- local keychain patterns;
- user-owned local model/CLI-agent quota patterns.

Preferred disposition:

- REFERENCE_ONLY for product areas unrelated to engineering assurance;
- SELECTIVE_PORT for proven local event/workspace/keychain/budget primitives;
- NATIVE for AssuranceEvent, AssuranceCard, Watch, and claim-aware orchestration.

Do not inherit by default:

- n8n as a mandatory runtime;
- ChromaDB as a mandatory dependency;
- six-persona product model;
- general email/Slack/Jira command center scope;
- automatic egress actions;
- hosted/cloud provider defaults.

Admission gate:

- prove each selected subsystem reduces implementation/maintenance risk;
- keep all normal Watch/event processing local;
- maintain Ascout effect authority for outbound actions;
- no remote dependency required for Watch.

### 5.3 SemIf

Planning reference:

- repository: https://github.com/TheoLeeCJ/SemIf
- observed planning revision: 1f2dea3e25379f9dfc98cb83c324f00ab5deda37
- observed public license: MIT
- founder states permission to copy/adapt

Desired Ascout role:

- local typed semantic decisions;
- option probabilities;
- shared-state/prefix-reuse patterns;
- CPU/llama.cpp fallback;
- Apple Silicon/MLX/MPS paths;
- calibration methodology;
- decision benchmark methodology.

Preferred disposition:

- COMPANION or ADAPTER first;
- SELECTIVE_PORT only after stable Ascout decision contracts and measured packaging/runtime benefit.

Authority ceiling:

- probabilistic observation only;
- never deterministic fact;
- never effect authorization;
- never claim authority.

Admission gate:

- exact runtime/model/tokenizer/calibration identity;
- calibration benchmark on Ascout-owned workloads;
- local-only qualification;
- failure semantics;
- no hidden model download during a verification run unless explicitly authorized.

### 5.4 Decider

Planning reference:

- repository: https://github.com/Mapika/decider
- observed planning revision: c710686795cf0c6fdb31f39fa63e6a5d5bd59ebd
- observed public license: Apache-2.0
- founder states permission to copy/adapt

Desired Ascout role:

- fast local typed routing;
- classification;
- option probability distributions;
- low-latency System-1 decision layer.

Preferred disposition:

- COMPANION / ADAPTER;
- model weights admitted separately from source code.

Authority ceiling:

- routing/classification/triage only unless a separately qualified Ascout decision contract authorizes bounded assistive use.

Admission gate:

- separate source license from model-weight license;
- exact weight revision/digest;
- quantization/runtime binding;
- per-workload calibration;
- hardware profile;
- shadow-mode benchmark before material decision influence.

### 5.5 Bespoke Nimble 9B

Planning reference:

- artifact: https://huggingface.co/bespokelabs/Bespoke-Nimble-9B
- user supplied discussion: https://huggingface.co/bespokelabs/Bespoke-Nimble-9B/discussions/1
- observed public model-card license: Apache-2.0
- exact model revision/digests: MUST_BE_PINNED_AT_INTAKE

Desired Ascout role:

- optional stronger local evidence-grounded typed judge;
- choice/boolean/rubric classification;
- challenge/claim-evidence semantic assessment.

Preferred disposition:

- ADAPTER / LOCAL_MODEL;
- do not vendor model weights into Ascout source control.

Admission gate:

- base model and adapter/LoRA identity;
- exact revisions;
- weight/tokenizer digests;
- commercial/redistribution review for every underlying artifact;
- local hardware qualification;
- calibrated Ascout benchmark;
- no automatic download in offline mode.

### 5.6 Jev / TypeSafe

Classification:

- external provider capability, not a copied donor in this plan.

Desired Ascout role:

- optional remote typed decision provider;
- comparison/benchmark reference where permitted.

Preferred disposition:

- ADAPTER;
- USER_OPT_IN;
- BYOK / user-funded only.

Hard rule:

- Jev must never replace Alibaba Open Code Review;
- Jev must never be mandatory for core verification;
- no silent fallback from local Decision Fabric to Jev.

### 5.7 TinyFish / AgentQL

Representative planning reference:

- repository: https://github.com/tinyfish-io/agentql
- observed planning revision: 418ba8ad1c69dfac134a6833369a01dfba5a24a7
- observed public license for AgentQL: MIT
- founder states broader TinyFish source permission
- broader TinyFish repositories/source: MUST_BE_INVENTORIED_AND_PINNED_PER_SUBSYSTEM

Desired Ascout role:

- semantic browser element/data resolution;
- resilient web interaction;
- browser-agent recovery patterns;
- MCP/browser integration patterns;
- structured web evidence.

Preferred disposition:

- ADAPTER / SELECTIVE_PORT for AgentQL/local primitives;
- COMPANION for broader local TinyFish-derived browser capability when source and dependencies are admitted;
- hosted TinyFish remains optional BYOK/user-funded only.

Hard rule:

- Playwright remains deterministic-first browser substrate;
- TinyFish does not become mandatory cloud infrastructure;
- no Ascout-funded managed browser or proxy fleet.

Admission gate:

- per-repository exact pin;
- distinguish open-source/local source from hosted service functionality;
- network/proxy/stealth behavior must be explicit;
- external anti-bot/proxy providers may not create operator cost;
- credentials/session data remain local unless explicitly authorized.

### 5.8 Desktop Commander

Planning reference:

- repository: https://github.com/wonderwhy-er/DesktopCommanderMCP
- observed planning revision: 07ead6324ab82b058aa71e04273c8588363e0057
- observed public license: MIT
- founder states permission to copy/adapt

Desired Ascout role:

- filesystem primitives;
- bounded editing;
- file search;
- PTY/process lifecycle;
- long-running process interaction;
- document operations;
- remote-device/runtime patterns.

Preferred disposition:

- REFERENCE_ONLY for broad unrestricted terminal product behavior;
- SELECTIVE_PORT for exact local primitives with Ascout-owned policy;
- COMPANION/ADAPTER only if the qualified boundary is stronger than selective port.

Hard rule:

Desktop Commander security restrictions are not Ascout authority. Ascout must enforce its own effect and containment rules.

Admission gate:

- characterize path/command boundary behavior;
- remove telemetry by default;
- explicit environment/credential scrubbing;
- explicit subprocess ownership;
- sandbox/containment claims must be independently qualified.

### 5.9 Google ARTEMIS

Canonical existing binding:

- repository: https://github.com/google/artemis
- exact donor SHA: 371aa6df56880643da57b30da936e9812fb0ec66
- exact tree: 697c3fe48b51b8453938989f383b4a8471a4f5a1
- license: Apache-2.0
- source admission ledger: Issue #438
- implementation authorization: specs/017-unified-assurance/ARTEMIS_IMPLEMENTATION_AUTHORIZATION.md

Desired Ascout role:

- Mobile Reality engine.

Disposition:

- VENDORED_DONOR + isolated Python sidecar + Ascout adapter.

This matrix does not change ARTEMIS authority or sequencing.

## 6. Founder-owned GitHub source matrix

Founder-owned repositories are not automatically imported into Ascout merely because the founder owns or has permission to use them.

Relevant capability donors include:

### Sentrdel

Role:
- deterministic security evidence;
- Coverage/UNKNOWN semantics;
- SAST/invariants/reachability;
- secrets/SCA/CI posture;
- finding reconciliation patterns.

Disposition:
- COMPANION first;
- SELECTIVE_PORT only under UA-P16 parity/provenance work.

### Kodac

Role:
- review/workflow qualification;
- exact-head freshness;
- publication admission;
- resumability/idempotency;
- Done/proof discipline.

Disposition:
- SELECTIVE_PORT / REFERENCE_ONLY according to existing Unified Assurance plan.

### Winds

Role:
- independent candidate verification;
- detached worktree/candidate identity;
- process/terminal execution truth;
- explicit promotion/evidence patterns.

Disposition:
- COMPANION / SELECTIVE_PORT where the UA Test/Reality phases prove value.

### HarnessMind

Role:
- agent instruction/tool/MCP/permission/harness observability;
- unknown-stays-unknown semantics;
- harness drift.

Disposition:
- COMPANION initially;
- SELECTIVE_PORT for stable discovery/normalization primitives.

### Kernux

Role:
- capability/runtime architecture;
- local/remote runtime contracts;
- context/evidence/replay patterns.

Disposition:
- REFERENCE_ONLY and ADAPTER;
- do not merge Kernux product identity into Ascout.

### SpecGrain

Role:
- development governance;
- bounded Grains/WorkPackets;
- explicit readiness/evidence.

Disposition:
- METHODOLOGY / TOOLING;
- not a runtime truth authority inside Ascout unless separately integrated.

### Diffcipline

Role:
- proof-before-done development discipline;
- exact-change completion checks.

Disposition:
- METHODOLOGY / TOOLING;
- not a substitute for Ascout product verification.

### Other founder-owned repositories

All other TheHalfMoon/private/public repositories are eligible research/donor candidates only after:

1. capability relevance is identified;
2. exact repository/revision is pinned;
3. source provenance and license/permission are recorded;
4. a disposition is assigned;
5. duplication with an existing Ascout capability is assessed;
6. maintenance benefit exceeds integration cost.

There is no blanket "copy every founder repository" task.

## 7. Capability-family source mapping

| Capability family | Primary source candidates | Ascout ownership |
|---|---|---|
| Trust/claims/evidence | Ascout native | Full |
| Review | Alibaba Open Code Review + Kodac | Ascout normalizes/claims |
| Test | Ascout native + Winds | Ascout plans/claims |
| Security | Sentrdel | Ascout plans/claims |
| Deep audit | Cloudflare method + qualified agents | Ascout validates/claims |
| Web | Playwright + AgentQL/TinyFish-derived local | Ascout policy/evidence |
| Computer | Ascout + Desktop Commander-derived primitives + Kernux references | Ascout effect authority |
| Mobile | ARTEMIS | Ascout effect/claim authority |
| Agent assurance | HarnessMind-derived capability | Ascout claim authority |
| Capability registry | Ascout native informed by Treg | Ascout native |
| Watch/events | Ascout native informed by Laya | Ascout native |
| Local decisions | Decider/SemIf/Nimble | Ascout policy/claims |
| Remote decisions | Jev optional | Ascout policy/claims |
| Development governance | SpecGrain/Diffcipline | Repository process |

## 8. Dependency restraint

No donor may introduce a large dependency tree solely for convenience.

Before adopting a runtime dependency or companion:

- measure package/install size;
- enumerate transitive dependencies;
- identify install-time code execution;
- identify native/proc-macro/build-script surfaces;
- identify network behavior;
- identify telemetry;
- identify credential access;
- identify update mechanism;
- identify supported platforms;
- prove graceful absence behavior.

Optional capabilities must remain optional.

A broken optional donor engine must not break native Ascout verification.

## 9. Update policy

Pinned donor revisions do not float.

Updating a donor requires:

- explicit old/new revision;
- source diff review;
- license/additional-term diff;
- dependency diff;
- security diff;
- behavior/parity replay;
- qualification replay;
- provenance update;
- release-notice update.

No "latest" dependency is accepted as provenance for copied source or qualification-critical binaries/models.

## 10. Completion gate

This matrix is complete as planning when:

- every named source has a role;
- every named source has an intended disposition;
- public license/additional-term observations are captured where available;
- founder-permission status is explicit;
- unpinned sources are explicitly blocked from source admission until pinned;
- model weights are separated from source-code licensing;
- no source is treated as authority merely because it is copied.

Runtime admission remains separately authorized.
