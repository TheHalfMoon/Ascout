# Spec 016 Architecture Decisions

**Status:** `PLANNING_ONLY`

## AD-016-01 — Ascout owns verification authority

**Decision:** Browser runners and agents produce evidence; Ascout owns source binding, obligation coverage, oracle authority, recovery semantics, residual risk and release-decision truth.

**Rejected:** treating runner/model final status as Ascout truth.

## AD-016-02 — Playwright first, no browser reimplementation

**Decision:** use Playwright as first browser execution substrate through an internal adapter.

**Reason:** mature browser protocol, context isolation, locator, trace and cross-browser capability already exists.

**Rejected:** proprietary Chromium automation stack; immediate Playwright fork.

## AD-016-03 — Portable Intent IR above scripts/prompts

**Decision:** canonical intent is deterministic structured data linked to obligations, risks and oracle policy.

**Rejected:** Playwright TypeScript as the only canonical test representation; free-form prompt as canonical truth.

## AD-016-04 — Deterministic resolution before AI resolution

**Decision:** user-facing Playwright locator semantics first. Add multi-modal AI resolver only after measured misses.

**Rejected:** model call on every element lookup.

## AD-016-05 — Recovery is evidence

**Decision:** all recovery events are append-only evidence; final success never erases the initial failure.

**Rejected:** retry/heal to final Boolean status.

## AD-016-06 — Semantic healing cannot silently pass

**Decision:** recovery that changes business-flow meaning requires obligation/intent revalidation and blocks ordinary clean PASS.

**Rejected:** agent self-certification that a materially different flow is equivalent.

## AD-016-07 — Cache is acceleration, never authority

**Decision:** cached locator/step resolution is source/environment/version bound and can only accelerate resolution.

**Rejected:** cache entry as proof that an element/flow remains correct.

## AD-016-08 — Browser evidence is multi-channel and typed

**Decision:** DOM/a11y, network, console/page-error, visual/trace and state evidence remain separate typed facts with oracle classification.

**Rejected:** one opaque "AI browser result" blob.

## AD-016-09 — Model oracles remain visibly model oracles

**Decision:** model assertions may be useful but never masquerade as deterministic assertions. Calibration/authority is explicit.

## AD-016-10 — Journey graph uses simple deterministic storage first

**Decision:** stable IDs + maps/arrays/edges. No graph DB until benchmark/query evidence proves need.

## AD-016-11 — Agents are proposal-only

**Decision:** planner/explorer/generator/resolver/recovery/triage/root-cause agents cannot directly grant PASS, admit tests or merge code.

## AD-016-12 — Reuse Spec 015 admission gates

**Decision:** browser-generated/healed candidates reuse stability, discrimination and admission concepts rather than inventing browser-specific truth.

## AD-016-13 — Trusted-local browser scope first

**Decision:** developer-owned apps/repositories only. Arbitrary third-party browsing/untrusted PR execution requires separate sandbox authority.

## AD-016-14 — Browser artifacts are sensitive

**Decision:** screenshots, traces, storage state, network and console evidence get bounded retention and explicit sensitivity limitations.

## AD-016-15 — No wholesale donor import

**Decision:** dependency -> adapter -> selective reuse -> fork, in that order. Permission alone does not justify maintenance burden.

## AD-016-16 — Momentic is a donor/reference, not the product model

**Decision:** adopt strong patterns such as intent, multi-modal cache, failure recovery and MCP where they improve Ascout, but preserve Ascout's stricter evidence/recovery semantics and local-first architecture.

## AD-016-17 — Benchmark before agentic expansion

**Decision:** deterministic browser substrate must pass owned synthetic integrity benchmarks before model resolver/explorer/healer implementation.

## AD-016-18 — Browser truth before public UX

**Decision:** internal contracts and benchmarks precede CLI/MCP design. Avoid freezing weak semantics into public interfaces.

## AD-016-19 — No score over failure

**Decision:** browser quality scores may summarize only later; they can never override deterministic failures, unresolved semantic drift, missing required browser runs or material residual risk.

## AD-016-20 — Cross-browser absence is visible

**Decision:** once multiple engines are declared required, an unavailable/unrun required engine is visible incomplete evidence, not implicit PASS.

```text
DECISIONS_FROZEN_FOR_PLANNING = YES
IMPLEMENTATION_AUTHORITY = NO
```