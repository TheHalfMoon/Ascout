# Spec 016 Technical Plan — Browser and Agentic Verification Foundation

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #342
**Planning base:** `506bd09e7e6fbc0ce5cc080ed55eb7a34aa4644e`

## 1. Architecture thesis

Ascout remains the verification authority. Browser runners, agents and models are subordinate evidence producers.

```text
Requirement / Risk / Change
        |
        v
Test Obligation + Oracle Policy          [Spec 015]
        |
        v
IntentTest IR                            [Spec 016]
        |
        +------------------------------+
        |                              |
        v                              v
Deterministic Resolver              Agent Proposal Layer
        |                              |
        +---------------+--------------+
                        v
                BrowserExecutor
                        |
                        v
              Playwright Adapter
                        |
        +---------------+-----------------------------+
        |               |             |               |
        v               v             v               v
   DOM/A11y         Network        Console         Trace/Media
        \               |             |               /
         +--------------+-------------+--------------+
                        v
                 Evidence Fusion
                        |
                        v
        Recovery / Stability / Discrimination
                        |
                        v
       Journey Evidence + Defect / Residual Risk
```

## 2. Component boundaries

### Verification authority

Reuse existing Spec 015 primitives wherever possible:

- `TestObligation`
- `Oracle`
- `RequirementConflict`
- gap detection
- stability classification
- discrimination proof
- candidate admission
- failure reproduction/minimization evidence
- defect/regression records
- residual-risk rendering

Spec 016 must not create a competing verdict system.

### Intent layer

New internal components:

```text
IntentTest
IntentPrecondition
IntentAction
IntentExpectedOutcome
IntentOraclePolicy
IntentRecoveryPolicy
IntentTarget
IntentDigest
```

Intent is deterministic data, not executable authority by itself.

### Browser execution layer

New internal contracts:

```text
BrowserExecutor
BrowserSession
BrowserAction
BrowserAssertion
BrowserArtifactRef
BrowserEnvironmentIdentity
BrowserExecutionResult
```

First implementation:

```text
PlaywrightBrowserExecutor
```

Playwright remains replaceable behind the internal contract, but Ascout must not build a public plugin SDK merely for theoretical optionality.

### Evidence layer

New evidence types:

```text
BrowserActionEvidence
LocatorResolutionEvidence
DomObservationEvidence
AccessibilityObservationEvidence
NetworkObservationEvidence
ConsoleObservationEvidence
PageErrorEvidence
ScreenshotArtifactEvidence
TraceArtifactEvidence
RecoveryEvidence
JourneyObservationEvidence
BrowserOracleEvidence
```

All material evidence binds to run, task/test, exact Ascout source identity, browser/environment identity and artifact digest where applicable.

### Recovery layer

Three explicit classes:

```text
resolver_recovery
execution_recovery
semantic_recovery
```

`semantic_recovery` never silently preserves ordinary PASS authority. It requires obligation revalidation or produces an incomplete/blocked browser verdict.

### Journey layer

Minimal deterministic structures first:

```text
Journey
JourneyState
JourneyTransition
JourneyVariant
JourneyEvidenceLink
```

No graph database. Use deterministic maps/arrays plus stable IDs and source/provenance links until benchmark query pressure proves insufficiency.

## 3. Dependency strategy

### Playwright

Default: consume a qualified exact Playwright package version as a dependency/dev dependency only when Spec 016 implementation is separately authorized.

Do not fork Playwright initially.

Fork/selective source reuse is permitted only if all are true:

1. a required Ascout evidence or authority guarantee cannot be achieved through stable public APIs;
2. the missing capability is demonstrated by benchmark/implementation evidence;
3. the exact component is pinned and audited;
4. Apache-2.0 attribution, modified-file notices and NOTICE obligations are preserved;
5. maintenance cost is explicitly accepted.

### Momentic

No package/source import in the first deterministic browser wedge.

Momentic contributes design patterns for intent execution, multi-modal resolution, step caching, recovery, AI assertions, MCP and mobile. Selective reuse may be considered only after the founder-provided permission artifact and exact source snapshot are persisted and component provenance is complete.

## 4. Execution model

### Trusted-local first

Spec 016 v1 browser execution is limited to developer-owned/trusted local projects and explicitly configured application origins.

Ascout does not claim network isolation. It records relevant origin/network observations and may later gain bounded network policy under separate authorization.

### BrowserContext isolation

Each qualifying browser execution uses a fresh isolated context by default. Reused authentication/storage state is explicit input and must be identified and treated as potentially sensitive.

### Source binding

A browser run binds at minimum:

```text
repository_identity
source_tree_identity
intent_digest
test_definition_digest
ascout_version
browser_executor_version
playwright_version
browser_engine
browser_version
browser_project/config_digest
relevant_environment_fingerprint
start/end source drift
```

Evidence from a different identity cannot close the current obligation.

## 5. Locator strategy

### Stage A — deterministic resolution

Use Playwright user-facing locators first:

1. role + accessible name;
2. label;
3. text;
4. placeholder;
5. alt text;
6. title;
7. explicit test id;
8. bounded structural fallback only when required.

Selected strategy and target facts are evidence.

### Stage B — multi-modal resolver

Only after benchmark signal justifies it, introduce a model-assisted resolver using DOM, accessibility and screenshot context.

The resolver produces a proposal plus evidence, not invisible certainty.

### Cache policy

A future resolver cache key includes:

```text
intent_digest
source/application identity
browser engine/version class
page/state fingerprint
resolver version
```

Cache hits are acceleration, not truth. A stale or mismatched cache triggers fresh resolution and records `cache_miss_reason`.

## 6. Recovery semantics

### Resolver recovery

Examples: locator drift, accessible-name change, moved element.

Allowed to recover automatically only when target equivalence remains demonstrable under policy. Recovery remains visible.

### Execution recovery

Examples: transient overlay, late navigation, bounded temporary network delay.

May perform explicitly bounded corrective actions. All corrective actions are evidence. Retry budget is fixed and visible.

### Semantic recovery

Examples: checkout flow materially changes, a required review step disappears, an alternate control performs a different business operation.

Automatic green is forbidden. Ascout records semantic drift and requires obligation/intent revalidation.

## 7. Oracle mesh

Oracle classes are mapped onto existing Spec 015 authority semantics.

Initial browser oracle families:

```text
dom_deterministic
accessibility_deterministic
network_deterministic
console_error_deterministic
state_deterministic
visual_golden_deterministic
visual_semantic_model
semantic_model
human
```

Model-based oracles remain advisory unless separately calibrated and authorized. Even calibrated model oracles retain their class; they never masquerade as deterministic assertions.

## 8. Trace and artifact policy

Playwright traces, screenshots and videos are potentially sensitive.

Ascout stores only bounded artifact references plus digests/metadata in its receipt truth. Raw artifacts remain in ignored/bounded artifact storage. The implementation must define redaction capability/limitations honestly; unsupported payload-level redaction remains visible rather than claimed.

Trace ingestion extracts only facts needed for Ascout claims. Do not duplicate the full Playwright Trace Viewer.

## 9. Agentic layer roadmap

Agentic capability begins only after deterministic executor/evidence qualification.

Planned agents:

```text
JourneyPlanner
ChangeJourneyExplorer
BrowserTestGenerator
ResolverAgent
RecoveryAgent
FailureTriageAgent
RootCauseHypothesisAgent
```

Authority rules:

- planner/explorer output = proposal;
- generator output = candidate test proposal;
- resolver output = target proposal;
- recovery output = corrective-action proposal/evidence;
- triage/root-cause output = hypothesis;
- none grants PASS or merge authority.

Generated/healed browser tests enter the existing Spec 015 stability, discrimination and admission pipeline.

## 10. Journey evidence model

Join four truth planes without creating four verdict systems:

```text
Static Source Facts
Requirement / Obligation Facts
Observed Browser Journey Facts
Execution / Defect Evidence
```

Representative links:

```text
requirement -> requires -> obligation
source_symbol -> implements -> requirement
journey -> exercises -> obligation
journey_transition -> observed_network -> endpoint
browser_test -> covers -> journey
execution -> observed -> journey_variant
execution -> produced -> evidence
defect -> violates -> obligation
```

Every learned/observed edge identifies source, run and provenance class. Inference edges cannot silently become proof edges.

## 11. CLI/MCP sequencing

Do not design public UX before core semantics stabilize.

Sequence:

1. internal contracts;
2. library-level tests;
3. Playwright adapter;
4. synthetic benchmark;
5. receipt/evidence integration;
6. only then CLI surface;
7. only then MCP/agent skills.

Preferred UX should extend existing Ascout semantics rather than create a generic workflow language. Exact flags/verbs remain an implementation decision after benchmark and command-surface analysis.

## 12. Phase plan

### Phase 0 — Close predecessor

Spec 015 first wedge closes canonically. No browser dependency before this.

### Phase 1 — Deterministic browser substrate

Intent IR + BrowserExecutor + Playwright adapter + evidence binding + deterministic locators + artifacts.

### Phase 2 — Truthful recovery

Explicit recovery events, retry budgets, semantic-drift blocker, trace ingestion.

### Phase 3 — Journey intelligence

Minimal journey evidence graph, source/obligation linking, coverage/reporting.

### Phase 4 — Agentic proposals

Explore/generate/resolve/recovery agents, all proposal-only, integrated with Spec 015 admission.

### Phase 5 — Comparative proof

Owned synthetic benchmark against native Playwright and permitted Momentic comparison. Expand only after evidence.

### Later separately authorized tracks

- API contract verification derived from observed journeys;
- mobile iOS/Android;
- accessibility auditing;
- security/DAST;
- performance/resilience;
- AI-system testing;
- hosted/remote execution.

## 13. Implementation style

Prefer additive modules and narrow adapters. Do not prematurely refactor stable M1/M2/Spec 015 code. Integration occurs through explicit contracts and evidence adapters.

Each implementation slice must be independently understandable, testable and benchmarkable. No broad framework rewrite is authorized by this plan.

```text
ARCHITECTURE = VERIFICATION_AUTHORITY_OVER_EXECUTION_SUBSTRATE
FIRST_EXECUTOR = PLAYWRIGHT
AGENT_AUTHORITY = PROPOSAL_ONLY
SILENT_SEMANTIC_HEAL = FORBIDDEN
GRAPH_DB = NOT_AUTHORIZED
```