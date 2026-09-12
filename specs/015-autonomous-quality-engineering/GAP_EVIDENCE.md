# Spec 015 Gap Evidence — Autonomous Quality Engineering

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #318
**Canonical base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`
**Canonical tree:** `fdea11390e376cad1fdf36a91e20b0c4f5390412`
**Release:** `v0.1.0`, `Ascout v0.1.0`, asset `thehalfmoon-ascout-0.1.0.tgz` (92852 bytes, SHA-256 `0d2e6dd35cd1661c57a4765de9a732b4a8339f98072485eef2bf1c3295c17cd5`)
**Spec 013:** `T128 CLOSED_CANONICAL` (Issues #319, #327, #328 closed completed)

This file binds founder direction, hardening review, current M1/M2 truth, measured gaps, native insufficiency, benchmark signals, and product/research/deferred split. It grants no implementation authority. Donor import, dependency adoption, service addition, and Constitution amendment remain blocked pending full planning chain.

## 1. Founder direction binding

Source: Issue #318 body plus comments `5641009281` (Research Registry v1), `5641133681` (Architecture Draft v1), `5641262262` (Plan Hardening v2), `5641270060` (Canonical materialization package v1).

Target quoted from Issue #318:

> The Founder directs Ascout to evolve from an evidence-bound changed-code verification receipt into the best evidence-grounded autonomous software testing and quality engineering system we can objectively demonstrate.

Engineering objective: maximize defect discovery and minimize false-negative confidence while making residual risk, untested behavior, uncertainty, and unavailable verification explicit. Long-term identity preserved:

> **Ascout — Verify everything AI ships.**
> **Know exactly what passed, failed, and was never checked.**

Core invariant:

> **Models propose. Deterministic or explicitly classified evaluators observe. Bound evidence decides.**

Nine-plane target from Issue #318: Repository Intelligence, Quality Strategy, Unit Test Intelligence, Multi-Method Bug Discovery, Sandbox and Authority, Debugging and Root Cause, Quality Memory, AI and Agent Testing, QE Deliverables.

Governance from Issue #318: planning direction only until Spec 013 T128. No source/spec/workflow/test/benchmark dependency mutation on `main`, no donor import, no new runtime dependency/service/sandbox/database/browser/tool/model/memory/graph, no Constitution amendment, no implementation authority effective until full chain completes. Spec 014 remains separate and must be reconciled to one evidence architecture, not two competing verdict systems.

## 2. Hardening v2 binding

Source: comment `5641262262` (`PLAN_GAPS_IDENTIFIED=20`, `FIRST_WEDGE=NARROWED_AND_STRENGTHENED`, `IMPLEMENTATION_AUTHORITY=NO`).

Twenty gap decisions preserved as planning constraints: requirement source and conflict, oracle class and independence, test data and environment identity, combinatorial design, flake retry and quarantine anti-green discipline, transparent risk factors, verification budget and scheduler with `NOT_RUN(budget_*)`, statistical evidence policy, contamination partitions, corpus portfolio qualification, competitor baseline protocol with `COMPARISON_UNAVAILABLE` when terms bar automation, supply-chain provenance, internal adapter contract with JavaScript/TypeScript first and no public SDK, write authority in isolated worktree with read-only core, multi-service bounds, memory poisoning and expiry, triage suppression visibility, release decision enumeration without score-over-failure, human review as evaluator, anti-self-confirmation and independence.

Hardened first wedge: requirement/change/risk to conflict-aware intent to minimal structural map to obligation plan to oracle classification to unit gap to candidate generation in isolated worktree to stability and binding to discrimination to reproduction and minimization to defect report to regression obligation to residual-risk and release output. JavaScript/TypeScript first. No graph database, memory service, control plane, or browser farm by default.

## 3. Current M1/M2 capabilities at post-T128 source

Pinned to `55688b5bca22f2e9979b71739bb6802c652bda9d`:

- Identity and release: `package.json` name `@thehalfmoon/ascout`, version `0.1.0`, `private: true`, `files: ["dist"]`, `bin.ascout: ./dist/cli.js`, `engines.node >=22`, single runtime dependency `cross-spawn 7.0.6`. `README.md` status states M1 hardening and M2 fidelity complete, version `0.1.0`, `private: true`, not published to npm, GitHub Release separate.
- M1 contract: `specs/001-changed-code-verification-receipt/spec.md`. Fixed tasks for TypeScript, ESLint, Vitest, Jest, basic pytest via `src/discovery.ts` and `src/tools/`. CLI surface `ascout init`, `ascout doctor`, `ascout check [--allow-changed-command-surface] [--format json|agent]`.
- Source binding: exact full Git object ID, deterministic tree digest including tracked and nonignored untracked state excluding `.ascout/`, start/end drift detection, canonical paths, rename preservation. See `src/git.ts`, `src/run.ts`, `src/check.ts`, `src/receipt/model.ts`. Constitution III.
- Trust and admission: changed effective command/config surface refused by default as `NOT_RUN(command_surface_changed)` until explicit per-invocation human admission, recorded in receipt, never persisted. See `src/config.ts`, `src/selection.ts`. Constitution IV.
- Selection: native related-test selection where supported, at most one bounded widening pass, visible selected/deselected accounting. Constitution V/VI.
- Exercise: LCOV normalization to `EXERCISED`, `NOT_EXERCISED`, `UNRESOLVED`, material gap maps to exit `4`, never clean `0`. See `src/coverage/lcov.ts`, `src/exercise.ts`. Constitution II.
- Reproduction and flake: bounded exact reruns distinguishing reproduced, contradictory/flaky, and unknown. See `src/test-reproduction.ts`, `src/tools/jest-rerun.ts`, `src/tools/vitest-rerun.ts`.
- Receipts and artifacts: single validated truth model to terminal, JSON, bounded agent receipts, `.ascout/` bounded retention with redaction and truncation facts, concurrent runs refused. See `src/receipt/`, `src/redact.ts`, `src/lock.ts`, `src/process.ts`, `src/environment.ts`. Constitution VII.
- M2 delta: single-package nested Jest/Vitest config authority only when exactly one candidate exists and no root config is effective, root precedence, multiple candidates fail closed, changed nested config still requires admission. See `specs/002-selection-config-fidelity/spec.md`. No new runtime dependency, receipt version, or publication.
- Explicit non-claims: no untrusted sandbox, network isolation, installer, CI service, plugin SDK, database, code graph, model reviewer, totality proof, causality proof, universal secrets, or published package. See `README.md`.

## 4. Measured gaps

| Target obligation | Current state | Class |
|---|---|---|
| Requirement source, conflict semantics | None; code assumed without requirement ingestion | PRODUCT_GAP |
| Transparent risk decomposition, traceability, residual-risk register | None beyond changed lines | PRODUCT_GAP |
| Structural graph, blast radius, test-to-code edges | Filename and surface heuristics only | PRODUCT_GAP, donor REFERENCE_ONLY |
| Obligation taxonomy, Quality Plan, Unit Test Plan artifacts | None | PRODUCT_GAP |
| Oracle class, provenance, independence | Pass/fail plus counts only | PRODUCT_GAP |
| Candidate generation, isolated worktree, discrimination via mutant/revert/property/differential/withheld | None | PRODUCT_GAP |
| Debug pipeline reproduce, minimize, localize, prove, repair-verify, regression record | Single rerun plus unknown only | PRODUCT_GAP |
| Scheduler, budgets, flake quarantine, data and environment identity, statistical policy | None | PRODUCT_GAP |
| Sandbox authority classes beyond trusted local | Trusted local only, explicitly not isolation | PRODUCT_GAP plus DEFERRED |
| Quality memory, bug-mechanism library | None | RESEARCH and DEFERRED, non-authority invariant |
| Browser, API contract, security, performance, accessibility, AI-system, runtime tracks | Only JS runners plus basic pytest | DEFERRED unless benchmark pulls one |
| Supply-chain SBOM, signing, scorecard provenance | Files allowlist plus provenance docs only | RESEARCH |

No competitor marketing claim is used as a measured Ascout defect.

## 5. Why native is insufficient for first wedge

First-wedge requirement from materialization package: given a supported JavaScript/TypeScript change in a trusted repository, derive source-bound obligations, find unit gaps, propose candidates with oracle provenance, evaluate stability and discriminating power in an isolated worktree, emit Quality Plan, Unit Test Plan, debugging, and residual-risk without mutating source or manufacturing PASS.

Native covers project runners, related selection, LCOV exercise, single rerun, admission, drift, and binding. Native lacks requirement ingestion and conflict handling, risk decomposition, structure-to-obligation mapping beyond heuristics, oracle classification, gap analysis, worktree-isolated generation, stability and discrimination gates, minimizer and localizer and proof contracts, regression obligation recording, and residual-risk rendering. Each maps to one wedge step and cannot be met by widening existing tasks.

## 6. Benchmark signals

Constitution VIII requires benchmark-gated growth measuring Ascout claims, preserving unavailable evidence, publishing misses, with zero tolerance for leakage, binding violations, and false PASS.

Current signals:

- `benchmarks/manifest.json` revision tracking with integrity gates for leakage, binding, and gap exit mapping.
- `benchmarks/results/t078-selector-misses.json`: founding `react-hook-form-value-as-date@2` selector miss motivating M2 narrow repair; unavailable evidence preserved, not converted to green.
- `benchmarks/results/t091-m2-selection-replay.json`: M2 replay qualified with membership proof, zero published misses, narrow scope justified, broader discovery left unjustified without new tracks.
- `benchmarks/results/t095-branch-exercise-qualification.json`: exercise boundary evidence.
- External research (coverage and mutation context dependence, weak-oracle bottleneck, historical-mechanism synthesis, evolution brittleness) treated as method input, not as Ascout defect claims.
- Contamination partitions and multi-track benchmark families (bug discovery, test generation, debugging, integrity, cost, evolution, later security, performance, accessibility, AI-system, runtime) with absolute gates for leakage, false PASS, binding, secrets, escalation, and memory PASS remain required before expansion.

No new expansion is justified without a fresh benchmark-backed signal under this policy.

## 7. Product, research, deferred split

- `PRODUCT_GAP` (first-slice candidates, benchmark-gated): intent and conflict, risk, minimal Test Obligation Graph, oracle policy, gap analysis, worktree generation, admission and discrimination, reproducer and minimizer and localization ensemble and proof, flake and budget and data and statistics governance, traceability and residual-risk rendering.
- `RESEARCH` (reference only, no import): donor internals, ISTQB and OWASP and NIST and SLSA and Sigstore and Scorecard and OpenTelemetry mappings, combinatorial design, corpus qualification (Defects4J, BugsJS, BugsInPy, TestGenEval with non-commercial restriction noted, SWE-bench), arxiv studies, competitor public-capability matrix with `COMPARISON_UNAVAILABLE` when barred. Never vendor syllabus or ISO text. Never reverse-engineer or abuse terms.
- `DEFERRED` (explicit non-first-slice): graph database, persistent memory service, public plugin SDK, hosted control plane, browser farm, generalized untrusted platform, all domains at once, dashboards, auto-merge, single-model lock-in, sandbox dependency, Spec 014 runtime bridge beyond reconciliation contract.

```text
GAP_EVIDENCE = FROZEN_AS_PLANNING_INPUT
IMPLEMENTATION_AUTHORITY = NO
DONOR_IMPORT = NOT_AUTHORIZED
```
