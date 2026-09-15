# Spec 016 Gap Evidence — Browser and Agentic Verification

**Status:** `PLANNING_ONLY`
**Planning ledger:** Issue #342
**Planning base:** `506bd09e7e6fbc0ce5cc080ed55eb7a34aa4644e`
**Reconciled canonical main:** `d3e79aa59149b13f7f2ae85f6295ea7da9a52bfa` (forward merge `d2f310045915582f7ca91e41e62371f8995f30e4`, Spec 015 first wedge `CLOSED_CANONICAL / COMPLETE`, Issue #318 closed)

## 1. Current Ascout truth

At the original planning base, Spec 015 first-wedge implementation had established evidence-bound quality primitives through nine merged slices; PR #341 (residual-risk/release-decision) was the active tenth slice. At the reconciled canonical main, all ten slices are merged: obligation/oracle modeling, deterministic gap detection, stability classification, candidate proposals, isolated candidate worktrees, discrimination proof, admission decisions, failure reproduction/minimization, defect/regression records, and residual-risk/release-decision rendering (PR #341 merged at `d3e79aa59149b13f7f2ae85f6295ea7da9a52bfa`, post-merge Project CI run 34940899817 6/6 SUCCESS). The Spec 015 first wedge is `CLOSED_CANONICAL / COMPLETE` (Issue #318 closed 2026-09-15) and its residual-risk/release-decision semantics are canonical.

This gives Ascout a verification brain but not a browser execution surface.

## 2. Measured product gap

Current Ascout does not natively:

- launch or isolate a real browser context;
- observe DOM/accessibility state as browser evidence;
- capture browser network/console/page-error evidence;
- preserve browser screenshots/traces as source-bound verification artifacts;
- express a portable user-journey intent above runner-specific code;
- map browser journeys to obligations and exact source state;
- distinguish locator drift from execution recovery from semantic recovery;
- detect silent semantic healing;
- perform cross-browser verification;
- evaluate browser-generated tests through the Spec 015 admission pipeline;
- compare deterministic browser assertions with model-assisted visual/semantic oracles.

These are product gaps, not claims that existing browser products are defective.

## 3. Why mature native capability is required

The Constitution requires native capability before invention. Playwright already provides mature browser automation across Chromium, Firefox and WebKit, browser-context isolation, user-facing locators, retryable actionability semantics, tracing, screenshots, network control, test projects, parallelism and browser tooling. Reimplementing browser protocols would add major maintenance risk without improving Ascout's core differentiator.

Therefore the default architectural decision is:

> Ascout owns verification authority and evidence semantics; Playwright owns browser execution.

Forking or copying Playwright internals is a last-resort, benchmark-justified decision, not the starting point.

## 4. Playwright research signals

Playwright public documentation and repository demonstrate capabilities relevant to Spec 016:

- browser contexts for isolated browser state;
- locators centered on role, text, label, placeholder, alt text, title and test id;
- traces that retain action timing, locators and DOM snapshots and can be inspected after CI;
- retries where fail-then-pass is classified as flaky rather than ordinary pass;
- test agents: planner, generator and healer, including OpenCode agent-loop definitions;
- current public repository under Apache-2.0 with a NOTICE declaring Puppeteer-derived code under Apache-2.0.

These features are design and execution inputs, not Ascout proof.

## 5. Momentic research signals

Public Momentic documentation demonstrates several agentic-testing patterns relevant to the next Ascout layer:

- natural-language intent controlling a real browser/emulator;
- DOM + accessibility tree + screenshot context for element resolution;
- per-step caches that replay resolved locators and can heal when the UI drifts;
- AI Action V3 planning flows up front with pre/post-condition guards;
- failure recovery that inspects browser state, performs bounded corrective steps and retries the failed operation;
- AI assertions over DOM/accessibility/screenshot and visual-only assertions;
- failure classification and triage;
- web + iOS + Android surfaces;
- CLI and MCP integration;
- traces/videos/network/recovery visibility.

The founder states permission exists to copy Momentic source code. However the exact source snapshot and written permission artifact are not available in the current repository evidence set, so source-level claims/import remain unqualified. Public docs are sufficient for architectural comparison and benchmark design.

## 6. Opportunity beyond existing tools

Ascout can differentiate by making recovery and agentic execution evidence-bearing rather than merely reliability-oriented.

### Existing-tool pattern

```text
intent -> agent/locator -> action -> recovery/heal -> final pass/fail
```

### Ascout target

```text
requirement/risk
-> obligation
-> IntentTest
-> exact source + browser identity
-> action attempt evidence
-> locator evidence
-> recovery evidence
-> oracle evidence
-> stability
-> discrimination
-> semantic-drift decision
-> defect/reproduction evidence
-> residual risk
-> release decision
```

The final green state is only one observation in the chain.

## 7. Critical gaps to solve

| Gap | Current Ascout | Spec 016 target |
|---|---|---|
| Browser execution | none | Playwright-backed internal executor |
| User-journey intent | none | deterministic `IntentTest` IR |
| Locator truth | none | visible deterministic resolution first |
| Multi-modal resolution | none | later benchmark-gated resolver |
| Recovery semantics | generic test rerun only | resolver/execution/semantic recovery classes |
| Silent healing protection | none | semantic recovery blocks ordinary PASS |
| Browser evidence | none | DOM/a11y/network/console/screenshot/trace refs |
| Journey coverage | none | source-bound journey evidence model |
| Browser generation | none | proposal-only agent output |
| Browser admission | Spec 015 generic primitives | reuse stability/discrimination/admission |
| Cross-browser | none | engine/environment matrix after first executor |
| Browser benchmark | none | owned synthetic defect/drift corpus |

## 8. Why not copy all donor code

Permission does not make indiscriminate copying technically desirable. Playwright contains a large browser-maintenance surface. Momentic publicly presents managed-platform behaviors that may include infrastructure inappropriate for Ascout's local-first core.

Spec 016 therefore uses this donor rule:

1. **depend** when a stable public API already provides the capability;
2. **adapt** when Ascout needs its own evidence contract around the capability;
3. **selectively reuse** a donor component only after a measured gap proves public APIs insufficient;
4. **fork** only when the capability is strategically core and maintenance cost is justified by benchmark evidence.

## 9. Benchmark signal required before agentic expansion

The deterministic browser substrate must first prove:

- exact source/browser/environment binding;
- no cross-tree evidence leakage;
- reconstructable browser evidence;
- no hidden retry/recovery;
- correct handling of locator drift and transient overlays;
- stable detection of seeded browser defects;
- bounded artifact retention with no Ascout-caused secret leakage.

Only after this baseline is qualified may model-based resolver, explore/generate/heal agents, journey selection and mobile expansion become implementation candidates.

```text
BROWSER_GAP = PRESENT
NATIVE_BROWSER_REIMPLEMENTATION = REJECTED_BY_DEFAULT
PLAYWRIGHT = PREFERRED_EXECUTION_SUBSTRATE
MOMENTIC = DESIGN_AND_AUTHORIZED_DONOR_PENDING_PROVENANCE
AGENTIC_EXPANSION = BENCHMARK_GATED
```