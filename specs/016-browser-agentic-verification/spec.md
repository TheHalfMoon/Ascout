# Specification 016 — Browser and Agentic Verification Foundation

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #342
**Planning base:** `506bd09e7e6fbc0ce5cc080ed55eb7a34aa4644e`
**Reconciled canonical main:** `d3e79aa59149b13f7f2ae85f6295ea7da9a52bfa` (forward merge `d2f310045915582f7ca91e41e62371f8995f30e4`, Spec 015 first wedge `CLOSED_CANONICAL / COMPLETE`, Issue #318 closed)
**Predecessor:** Spec 015 first wedge must close canonically before Spec 016 implementation authorization

## 1. Product objective

Ascout evolves from evidence-grounded unit-test quality intelligence into an evidence-grounded browser and agentic verification system without surrendering source binding, no-green-by-omission, or explicit authority.

The target is not "Playwright plus AI" and not a clone of any managed testing platform. The target is a verification intelligence layer that can use mature execution engines while preserving a stronger truth contract:

> Models propose. Explicitly classified evaluators observe. Bound evidence decides.

Given a supported developer-owned web application and exact source state, Ascout must be able to derive or accept source-bound verification intent, execute browser verification through a qualified browser substrate, capture reconstructable evidence, classify recovery and semantic drift, connect observed journeys to obligations, and render residual risk without silently converting healing, retries, model judgment, or missing work into PASS.

## 2. First implementation wedge

The first Spec 016 implementation wedge is intentionally narrower than the full browser roadmap. It covers:

1. a `BrowserExecutor` contract with Playwright as the first qualified implementation;
2. exact source/application/browser/environment identity;
3. deterministic browser evidence capture for actions, DOM/accessibility observations, network, console/page errors, screenshots and trace references;
4. a portable `IntentTest` intermediate representation bound to requirements, obligations, risks and oracles;
5. deterministic locator resolution first using accessible/user-facing semantics;
6. explicit recovery events with no silent semantic healing;
7. trace/evidence ingestion into Ascout's existing evidence discipline;
8. owned synthetic browser benchmark cases proving truthfulness before agentic expansion.

The first wedge does NOT require model-based element resolution, autonomous exploration, mobile, a graph database, hosted infrastructure, a browser farm, or donor source copying.

## 3. Functional requirements

### REQ-BROWSER-EXECUTOR
Ascout MUST define an internal browser-execution contract independent of Playwright-specific APIs. The first implementation SHOULD adapt Playwright rather than reimplement browser protocols. Browser engine/version, Playwright version, browser context identity, test identity, application origin policy, source tree and environment fingerprint MUST be recorded for material browser evidence.

### REQ-INTENT-IR
Ascout MUST define a deterministic, serializable `IntentTest` representation above runner scripts. An intent binds a goal to requirement/obligation/risk provenance, preconditions, actions, expected outcomes, oracle policy, allowed recovery policy and target surface. Natural language MAY populate fields but does not itself become proof.

### REQ-BROWSER-EVIDENCE
Each browser action/assertion MUST be capable of emitting source-bound evidence with stable IDs and explicit provenance. Evidence families include action attempts, locator resolution, DOM/accessibility observations, network observations, console/page errors, screenshots, trace artifacts, deterministic assertions, recovery events and final execution state.

### REQ-LOCATOR
The first implementation MUST prefer deterministic user-facing locators such as accessible role/name, label, text, title, alt text and explicit test IDs before CSS/XPath-style fallback. Resolution strategy and selected locator MUST remain visible evidence. Model-based resolution is deferred until benchmark need is proven.

### REQ-ORACLE-MESH
Browser assertions MUST be classified by oracle type and authority. Deterministic state/network/accessibility assertions MUST remain distinguishable from visual or model-assisted semantic assertions. Model output MUST NOT silently become deterministic PASS authority.

### REQ-RECOVERY
Recovery MUST be represented explicitly, not hidden. At minimum Ascout distinguishes `resolver_recovery`, `execution_recovery`, and `semantic_recovery`. Any semantic recovery that changes the meaning or path of the intended behavior MUST block ordinary PASS until the relevant obligation is revalidated. Recovery history is append-only evidence.

### REQ-NO-SILENT-HEAL
A final successful browser state MUST NOT erase failed action attempts, locator drift, retries, recovery steps, changed semantics, unavailable assertions or skipped work. Reports MUST support states such as `PASS_WITH_RECOVERY` or equivalent structured facts without weakening the constitutional task-status vocabulary.

### REQ-CACHE
Any locator/step cache introduced later MUST be advisory acceleration only. Cache entries MUST bind to intent digest, application/source identity, environment/browser identity and evidence provenance. Cache mismatch or stale source identity MUST fail closed to fresh resolution, never transfer PASS authority.

### REQ-JOURNEY
Ascout MUST define a minimal deterministic journey-evidence representation capable of linking requirements, obligations, source facts, browser states/actions, tests, executions and defects. A graph database is not authorized by this abstraction.

### REQ-AGENT-BOUNDARY
Planner, explorer, generator, healer, triage and root-cause agents MAY be added after deterministic browser evidence is qualified. Agent outputs are proposals. They MUST NOT directly grant PASS, alter canonical product source, auto-admit generated tests, or auto-merge changes.

### REQ-ADMISSION
Generated or healed browser tests MUST reuse the Spec 015 stability, discrimination and admission semantics where applicable. A generated test that merely passes is not proven useful. A healed test that merely reaches green is not proven semantically equivalent.

### REQ-LOCAL-FIRST
The first browser wedge MUST remain developer-owned/trusted-local. No Ascout account, hosted service or cloud control plane is required. Browser processes may use the network only according to explicit test/application behavior; Ascout must not falsely claim network isolation.

### REQ-PRIVACY
Browser traces, screenshots, storage state, network payloads and console output are potentially sensitive. Retention MUST be bounded, artifact references MUST expose redaction/truncation state where applicable, and recognized secrets/credentials MUST not be persisted in clear text by Ascout-owned artifacts.

### REQ-BENCHMARK
Browser expansion MUST be justified by Ascout-owned benchmarks measuring Ascout claims: defect recall, false PASS, semantic-drift detection, recovery safety, stability classification, source binding, evidence completeness and cost. Donor feature presence alone is not benchmark success.

## 4. Hard invariants

The canonical benchmark-integrity vocabulary is shared verbatim with `BENCHMARK_DESIGN.md`. The following counts must remain zero in qualifying benchmarks:

```text
fabricated_pass = 0
hidden_applicable_not_run = 0
cross_tree_evidence_leakage = 0
source_binding_violation = 0
silent_semantic_heal = 0
cache_authority_escalation = 0
secret_leakage_from_ascout_owned_artifacts = 0
unqualified_model_only_pass = 0
recovery_history_erasure = 0
```

A planning or implementation artifact that uses a different name for one of these gates MUST map it explicitly to this canonical vocabulary rather than creating a second integrity taxonomy.

## 5. Explicit non-goals for the first wedge

- browser protocol/browser-engine reimplementation;
- Playwright fork by default;
- Momentic source import by default;
- cloud runner/control plane;
- browser farm;
- generalized arbitrary internet agent;
- mobile/iOS/Android;
- API contract generation from journeys;
- security/DAST orchestration;
- load/performance testing;
- accessibility auditing beyond evidence primitives;
- persistent memory service;
- graph database;
- public plugin SDK;
- automatic source/test merge;
- npm publication or release action.

## 6. Success criteria

Spec 016 planning is ready only when architecture contracts, provenance, benchmark design, decision log, task order and implementation handoff agree on one bounded first wedge.

Spec 016 implementation is successful only when an explicitly authorized successor chain proves, on owned synthetic applications first, that Ascout can execute and reconstruct browser verification without hidden recovery, false PASS, cross-tree leakage, source-binding violations or secret leakage.

```text
SPEC_016_PLANNING = AUTHORIZED_BY_ISSUE_342
SPEC_016_IMPLEMENTATION = NOT_AUTHORIZED
SPEC_015_EXECUTION = UNCHANGED
```