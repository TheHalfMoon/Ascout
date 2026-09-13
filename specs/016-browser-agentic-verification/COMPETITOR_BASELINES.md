# Spec 016 Competitor / Reference Baselines

**Status:** `PLANNING_ONLY`

## Purpose

This document defines capability baselines for design and benchmarking. It does not claim competitor defects and does not authorize source import.

## Playwright baseline

Observed public capabilities relevant to Ascout planning:

- Chromium, Firefox and WebKit automation;
- BrowserContext isolation;
- user-facing locators and auto-wait/actionability;
- network interception/mocking;
- screenshots, video and trace artifacts;
- retries and flaky classification;
- projects, devices, parallelism and sharding;
- planner/generator/healer test agents;
- OpenCode/Codex/Claude/VS Code agent definitions.

Ascout should NOT compete by rebuilding these primitives.

Ascout differentiation target:

```text
requirement/obligation traceability
source-bound evidence authority
oracle independence/classification
discrimination proof
recovery truth
semantic-drift safety
residual-risk decision
```

## Momentic baseline

Observed public capabilities relevant to Ascout planning:

- natural-language browser/mobile tests;
- DOM + accessibility + screenshot context;
- multi-modal step cache;
- auto-heal and failure recovery;
- agentic goal execution with pre/post-condition guards;
- AI assertions and screenshot-only visual assertions;
- failure classification/triage;
- quarantine;
- local/CI CLI;
- MCP for coding agents;
- web, iOS and Android support;
- videos/traces/network/recovery visibility;
- managed execution and dashboard surfaces.

Ascout should adopt useful patterns only where they preserve local-first evidence authority.

Ascout differentiation target:

```text
no silent heal
recovery remains evidence
semantic recovery cannot self-certify PASS
cache never grants proof
models remain proposal/advisory unless explicitly classified
candidate tests require stability + discrimination + admission
exact source/browser/environment binding
```

## Comparative benchmark hypotheses

These are hypotheses, not current claims:

1. Ascout can reduce false PASS from missing/hidden browser verification by preserving obligation and NOT_RUN semantics.
2. Ascout can make recovery safer by detecting and blocking semantic drift rather than optimizing only for green execution.
3. Ascout can distinguish test survivability from test usefulness through discrimination proof.
4. Ascout can produce more reconstructable evidence than a runner-only pass/fail result.
5. Ascout can use Playwright native strengths while keeping browser execution replaceable behind internal contracts.

Each hypothesis must be tested. If evidence does not support it, the claim must be withdrawn or narrowed.

## Feature adoption rule

Do not copy a competitor feature merely because it exists. Every proposed capability must map to at least one of:

```text
measured Ascout gap
benchmark miss
material adoption friction
truth/integrity requirement
```

If it maps to none, defer it.

## Explicit non-goal

Feature-count parity is not the objective. Ascout may intentionally have fewer authoring/dashboard conveniences if its verification truth is materially stronger.

```text
COMPETITOR_RESEARCH = DESIGN_INPUT
COMPETITOR_MARKETING = NOT_EVIDENCE
FEATURE_PARITY = NOT_THE_GOAL
```