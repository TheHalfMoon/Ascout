# Spec 016 Tasks — Browser and Agentic Verification Foundation

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #342
**Planning base:** `506bd09e7e6fbc0ce5cc080ed55eb7a34aa4644e`

## Global execution rules

1. Do not begin Spec 016 implementation until Spec 015 first wedge closes canonically and a separate Spec 016 implementation-authorization gate becomes effective.
2. Reverify live `main`, open PRs, active ledgers, rulesets, branch protection, exact source tree and donor provenance before each implementation slice.
3. No external/independent-human review is required unless later canonical governance explicitly reintroduces it. Exact-head maintainer verification and zero unresolved material threads remain required.
4. No force-push, shared-history rewrite, rerun-to-green evidence laundering or silent gate weakening.
5. Playwright dependency/source and Momentic source reuse require exact component/version provenance at implementation time.
6. Every slice must preserve source-bound truth, no green by omission and zero cross-tree evidence leakage.
7. Agents/models are proposal-only unless an oracle is explicitly classified and authorized.
8. Prefer native Playwright capability over proprietary browser reimplementation.
9. Do not create a graph database, cloud service, public plugin SDK or browser farm under this plan.
10. `P016-00 PREDECESSOR_CLOSEOUT` is a hard predecessor gate. `P016-01` MUST cite its durable closeout evidence before it can become effective.

## Dependency order

```text
P016-00 PREDECESSOR_CLOSEOUT
-> P016-01 IMPLEMENTATION_AUTHORIZATION
-> P016-02 INTENT_IR
-> P016-03 BROWSER_EXECUTOR_CONTRACT
-> P016-04 PLAYWRIGHT_ADAPTER
-> P016-05 BROWSER_EVIDENCE
-> P016-06 DETERMINISTIC_LOCATOR_POLICY
-> P016-07 RECOVERY_SEMANTICS
-> P016-08 TRACE_ARTIFACT_INGESTION
-> P016-09 SYNTHETIC_BROWSER_BENCHMARK_V1
-> P016-10 JOURNEY_EVIDENCE_MODEL
-> P016-11 CHANGE_TO_JOURNEY_MAPPING
-> P016-12 AGENTIC_PROPOSAL_AUTHORIZATION
-> P016-13 EXPLORE_PLANNER
-> P016-14 GENERATED_BROWSER_TEST_ADMISSION
-> P016-15 MULTIMODAL_RESOLVER_CACHE
-> P016-16 RECOVERY_AGENT
-> P016-17 BROWSER_FAILURE_SCIENCE
-> P016-18 CROSS_BROWSER_MATRIX
-> P016-19 CLI_MCP_SURFACE
-> P016-20 COMPARATIVE_BENCHMARK_AND_CLOSEOUT
```

## P016-00 — Predecessor closeout

Preconditions:

- Spec 015 first wedge is canonically closed or explicitly declares the boundary from which Spec 016 may proceed;
- no conflicting implementation PR chain exists;
- residual-risk/release-decision semantics needed by browser work are canonical;
- first-wedge benchmark/integrity evidence is preserved.

Deliverable: one durable closeout reference in the Spec 016 authorization artifact. No code change.

## P016-01 — Separate implementation authorization

Create a bounded authorization artifact that freezes:

- durable evidence proving `P016-00 PREDECESSOR_CLOSEOUT` is satisfied;
- first browser wedge scope;
- exact Playwright dependency/version strategy;
- no Momentic source import in deterministic first wedge unless separately qualified;
- allowed tracked paths;
- benchmark targets;
- security/privacy constraints;
- no cloud/mobile/browser-farm scope;
- exact-head qualification and guarded merge requirements;
- canonical nine-gate benchmark-integrity vocabulary from `spec.md` / `BENCHMARK_DESIGN.md`;
- explicit requirement ownership declaring `REQ-ORACLE-MESH` acceptance authority at P016-05, with P016-02 carrying policy references and P016-09 benchmark validation only.

No product mutation until this gate closes `CLOSED_CANONICAL / EFFECTIVE`.

## P016-02 — Intent IR

Implement deterministic `IntentTest` domain types and validators.

Minimum fields:

```text
intent_id
requirement_refs
obligation_refs
risk_refs
goal
preconditions[]
actions[]
expected_outcomes[]
oracle_policy[]
recovery_policy
target_surface
source_identity
metadata/provenance
```

Acceptance:

- strict validation;
- deterministic serialization/digest;
- dangling obligation refs fail closed;
- natural-language text remains data, not executable authority;
- oracle policy references are represented but do not yet constitute browser oracle evidence;
- no browser dependency yet.

## P016-03 — BrowserExecutor contract

Define internal execution types without coupling callers to Playwright.

Acceptance:

- session/environment identity;
- action/assertion request/response contracts;
- artifact refs;
- bounded timeout/cancellation contract;
- no public plugin SDK;
- no browser launched in this slice.

## P016-04 — Qualified Playwright adapter

After exact package/version provenance and license review, add the first Playwright-backed executor.

First supported surface:

- Chromium only if benchmark/YAGNI favors one engine initially, otherwise browser engine parameter with Chromium as qualification target;
- fresh BrowserContext by default;
- explicit configured app origin;
- navigation, click, fill/type, press, select, basic wait/navigation and deterministic assertions;
- no agent/model calls.

Acceptance:

- no shell command construction from test text;
- exact browser/playwright versions captured;
- browser context disposed reliably;
- process cleanup bounded;
- no core source mutation;
- synthetic integration tests.

## P016-05 — Browser evidence binding and oracle-record authority

Emit Ascout-owned evidence for browser execution. This task owns the first concrete acceptance surface for `REQ-ORACLE-MESH`; P016-02 only carries oracle policy references and P016-09 later validates the behavior in benchmarks.

Acceptance:

- action attempts preserve order and failure;
- DOM/accessibility facts source-bound;
- network request/response metadata captured under explicit privacy policy;
- console/page errors captured;
- screenshot/trace references use content digests where available;
- source drift checked before final verdict;
- cross-tree evidence rejection tests;
- every browser assertion emits or references an explicit oracle record;
- oracle records classify type, authority, provenance, source binding and evidence refs;
- deterministic state/network/accessibility oracles remain distinguishable from visual/model/human oracles;
- model output cannot silently acquire deterministic PASS authority;
- malformed, dangling or contradictory oracle records fail closed.

## P016-06 — Deterministic locator policy

Implement policy over Playwright user-facing locators.

Priority:

1. role/name;
2. label;
3. text;
4. placeholder;
5. alt text;
6. title;
7. test id;
8. explicitly declared structural fallback.

Acceptance:

- selected strategy recorded;
- ambiguous matches fail closed or require explicit disambiguation;
- no invisible AI locator resolution;
- locator drift is distinguishable from product assertion failure.

## P016-07 — Recovery semantics

Implement recovery evidence model before autonomous recovery.

Minimum classes:

```text
resolver_recovery
execution_recovery
semantic_recovery
```

Acceptance:

- append-only attempt history;
- original failure preserved;
- retry budgets visible;
- semantic recovery blocks ordinary PASS;
- no final-state-only truth collapse;
- recovery serialization/digest tests;
- `recovery_history_erasure = 0` remains an explicit integrity condition.

## P016-08 — Trace/artifact ingestion

Integrate bounded Playwright trace/screenshot artifact references.

Acceptance:

- no need to duplicate Trace Viewer;
- artifact digest/size/kind/path-safe ref;
- retention policy documented;
- sensitivity/redaction limitations visible;
- trace facts do not override Ascout execution evidence.

## P016-09 — Synthetic browser benchmark v1

Create owned minimal web fixtures for:

- stable happy path;
- locator rename with semantic equivalence;
- ambiguous locator drift;
- transient overlay;
- delayed navigation/network;
- console exception despite visually successful flow;
- duplicate-submit defect;
- removed required step / semantic drift;
- source-tree mismatch attempt;
- sensitive input/trace fixture.

Gate deterministic browser expansion on benchmark integrity.

Acceptance includes all nine canonical hard gates from `BENCHMARK_DESIGN.md` / `spec.md`, including `recovery_history_erasure = 0` and `unqualified_model_only_pass = 0`.

## P016-10 — Journey evidence model

Implement minimal deterministic journey structures linking browser observations to obligations.

Acceptance:

- no graph DB;
- stable IDs;
- observed vs inferred edges explicit;
- run/source/provenance on material links;
- deterministic serialization;
- journey coverage cannot become PASS without obligation/oracle evidence.

## P016-11 — Change-to-journey mapping

Map exact changed source facts to potentially affected browser journeys conservatively.

Acceptance:

- uncertainty widens selection;
- inferred mappings remain inferred;
- unknown relation never silently deselects relevant journeys;
- selection accounting visible.

## P016-12 — Agentic proposal authorization

Before model-based browser agents, create a separate bounded authorization proving:

- model/provider policy;
- privacy/data handling;
- prompt/tool authority;
- deterministic fallbacks;
- budgets;
- benchmark need;
- no PASS/merge authority for agents.

## P016-13 — Explore / planner agent

Agent reads requirements, diff, journey evidence and browser state to propose missing journeys/tests.

Acceptance:

- output is structured proposal only;
- every proposal cites inputs;
- no direct canonical test mutation;
- budget exhaustion visible;
- uncertainty preserved.

## P016-14 — Generated browser test admission

Compile approved intent/candidate proposals to Playwright-backed candidate tests in isolated worktrees and feed results through Spec 015 gates.

Acceptance:

- proposal -> stability -> discrimination -> human/maintainer admission;
- a merely passing generated test remains unproven;
- no auto-merge;
- source/test identity binding preserved.

## P016-15 — Multi-modal resolver and cache

Only after benchmark signal.

Inputs may include DOM, accessibility and screenshot context.

Acceptance:

- resolver output records model/version/prompt-tool provenance;
- cache key binds intent/source/environment/resolver version;
- stale cache cannot grant PASS;
- cache miss/heal events visible;
- deterministic locators remain preferred when sufficient.

## P016-16 — Recovery agent

Agent may propose bounded corrective steps for recoverable browser failures.

Acceptance:

- recovery category declared;
- all corrective steps logged;
- semantic recovery cannot self-certify equivalence;
- recovered PASS remains visibly recovered;
- no retry-until-green loop beyond explicit budget.

## P016-17 — Browser failure science

Integrate browser failures with Spec 015 reproduction/minimization/defect pipeline.

Acceptance:

- reproducible browser failure signature;
- sequence/state minimization where safe;
- network/console/DOM/trace evidence retained;
- root-cause statements separate observed fact from hypothesis;
- regression obligation recorded after confirmed defect.

## P016-18 — Cross-browser matrix

Expand qualified execution to Firefox/WebKit after Chromium truth contract passes.

Acceptance:

- engine-specific evidence;
- environment-sensitive classifications;
- no generic PASS if one required engine is not run;
- selection/budget omissions visible.

## P016-19 — CLI/MCP surface

Expose proven browser capability to developers and coding agents.

Acceptance:

- preserve existing Ascout command philosophy;
- no generic arbitrary workflow DSL;
- MCP tools cannot bypass changed-command admission or source binding;
- agent-triggered execution records authority;
- local-first operation retained.

## P016-20 — Comparative benchmark and closeout

Compare, where legally/operationally permitted:

- hand-authored/native Playwright baseline;
- Playwright planner/generator/healer flow;
- Momentic baseline under permitted access;
- Ascout deterministic and agentic browser flows.

Close only when Ascout claims are supported by measured evidence and absolute integrity gates remain zero.

## Later separately planned work

```text
Spec 017 candidate: autonomous journey intelligence / broader exploration
Spec 018 candidate: mobile + API cross-surface verification
Later: security, accessibility, performance/resilience, AI-system testing
```

```text
TASKS_READY_FOR_IMPLEMENTATION_AFTER_AUTHORIZATION = YES
CURRENT_IMPLEMENTATION_AUTHORITY = NO
```