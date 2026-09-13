# Spec 016 Implementation Handoff

**Status:** `READY_AS_PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #342
**Planning branch:** `plan/016-browser-agentic-verification`
**Planning base:** `506bd09e7e6fbc0ce5cc080ed55eb7a34aa4644e`

## 1. When this handoff becomes actionable

Do NOT implement from this file until all are true:

1. Spec 015 first wedge is canonically closed or explicitly reaches a boundary authorizing successor planning/implementation;
2. this Spec 016 planning package is reconciled to current `main` and canonically merged;
3. exact-head planning qualification passes;
4. a separate Spec 016 implementation-authorization artifact closes `CLOSED_CANONICAL / EFFECTIVE`.

## 2. What the implementation agent should not redesign

The following planning decisions are frozen unless live evidence proves a material contradiction:

- Ascout remains verification authority.
- Playwright is the first browser execution substrate.
- No browser protocol reimplementation.
- No Playwright fork in the first wedge.
- `IntentTest` IR exists above runner code/prompts.
- deterministic locators precede model/multimodal resolution.
- recovery is visible append-only evidence.
- semantic recovery cannot silently clean-pass.
- browser-generated/healed tests reuse Spec 015 stability/discrimination/admission.
- journey model uses deterministic storage first, not a graph DB.
- agent/model outputs are proposals.
- deterministic browser benchmark precedes agentic expansion.
- Momentic source import remains blocked until exact source + permission/provenance evidence is present.

## 3. First implementation authorization scope

The recommended first authorization should cover only P016-02 through P016-09:

```text
Intent IR
BrowserExecutor contract
Playwright adapter
browser evidence
 deterministic locator policy
recovery semantics
trace/artifact ingestion
synthetic browser benchmark v1
```

Do NOT authorize P016-10+ merely because they are planned. Journey intelligence and agentic proposals should be authorized after deterministic browser benchmark evidence.

## 4. Suggested implementation slices

### Slice B1 — Intent IR

Pure deterministic domain types, validation, JSON/digest tests. No Playwright dependency.

### Slice B2 — BrowserExecutor contract

Internal interfaces and evidence identity types. No browser launch.

### Slice B3 — Playwright adapter foundation

Qualified exact dependency, fresh BrowserContext, basic navigation/action primitives, bounded lifecycle, synthetic integration fixture.

### Slice B4 — Browser evidence

Action attempts, locator evidence, console/page errors, network metadata, screenshot/trace refs, exact source/environment binding.

### Slice B5 — Deterministic locator policy

Role/name -> label -> text -> placeholder -> alt/title -> test-id -> bounded explicit fallback. Ambiguity fails closed.

### Slice B6 — Recovery evidence semantics

Resolver/execution/semantic recovery data and verdict integration. No autonomous recovery agent yet.

### Slice B7 — Trace/artifact ingestion

Bounded refs/digests/retention; native Trace Viewer remains deep inspector.

### Slice B8 — Synthetic browser benchmark v1

Owned fixture apps and seeded cases. Prove zero integrity violations before expansion.

## 5. Implementation PR loop

For every slice:

```text
reverify live authority
-> create task branch
-> implement smallest coherent delta
-> focused tests
-> relevant integration tests
-> benchmark case where claim-bearing
-> exact lockfile/typecheck/build
-> exact-head Project CI
-> Self Verification where applicable
-> exact-head maintainer verification
-> zero unresolved material threads
-> pre-merge main/ruleset/protection/head revalidation
-> guarded expected-head merge
-> post-merge main/tree/CI proof
-> next authorized slice
```

No routine founder approval between already authorized slices.

## 6. Playwright qualification checklist before dependency adoption

At actual implementation time reverify:

```text
exact package version
package integrity/lockfile
repository/source pin
license
NOTICE
Node engine compatibility
transitive dependency inventory
browser download behavior
CI/browser cache behavior
security advisories if available
required browser binaries
artifact size impact
```

Do not pin implementation to the research-time repository head from this plan.

## 7. Momentic reuse checklist

Before any tracked Momentic-derived source enters Ascout:

```text
written permission artifact stored/referenced
exact source snapshot/version
component selected
why public API/design adaptation is insufficient
copyright inventory
third-party license inventory
NOTICE/attribution obligations
dependency inventory
security review
provenance mapping file-by-file or component-by-component
benchmark need
separate implementation authorization
```

If source is unavailable to the implementation agent, stay design-reference-only.

## 8. Benchmark gate for agentic phase

Do not authorize multi-modal resolver/explore/heal agents until deterministic browser baseline proves:

- zero cross-tree leakage;
- zero fabricated pass;
- zero hidden applicable NOT_RUN;
- zero silent semantic heal;
- zero cache authority escalation;
- zero Ascout-owned secret leakage;
- reproducible handling of locator drift, overlay, latency, console error, duplicate submit, semantic flow change and source mismatch.

## 9. Agentic phase after benchmark

Recommended second authorization scope:

```text
Journey Evidence Model
Change-to-Journey Mapping
Explore/Planner Agent
Generated Browser Test Admission
Multi-modal Resolver + Cache
Recovery Agent
Browser Failure Science
Cross-browser Matrix
CLI/MCP Surface
Comparative Benchmark
```

Each agent remains proposal-only and cannot bypass Spec 015 admission/evidence rules.

## 10. Completion definition

`SPEC_016_DETERMINISTIC_BROWSER_FOUNDATION_COMPLETE` means:

- deterministic browser intent executes through qualified Playwright adapter;
- evidence is source/browser/environment bound;
- recovery and failed attempts remain visible;
- semantic recovery cannot ordinary-pass;
- required synthetic benchmark cases execute reproducibly;
- absolute integrity gates are zero;
- no unauthorized donor source/cloud/mobile scope entered.

`SPEC_016_AGENTIC_BROWSER_COMPLETE` additionally requires agentic proposal/resolution/recovery capabilities to pass their comparative benchmark without weakening the deterministic truth contract.

Neither state means the entire Ascout project is complete.

## 11. Final execution instruction

When canonical authority becomes effective, execute dependency order automatically. Do not stop after each slice to ask for routine approval. Do not substitute planning for implementation. Preserve failed attempts and exact evidence.

```text
PLANNING_READY = YES
FIRST_IMPLEMENTATION_WEDGE_DEFINED = YES
IMPLEMENTATION_AUTHORITY_NOW = NO
```