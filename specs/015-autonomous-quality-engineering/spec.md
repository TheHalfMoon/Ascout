# Specification 015 — Autonomous Quality Engineering

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #318
**Canonical base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`
**Spec 013:** `T128 CLOSED_CANONICAL`, `v0.1.0` released

This specification defines the first canonical product slice for evidence-grounded autonomous software testing and quality engineering. It does not authorize implementation, donor import, dependency adoption, service addition, or Constitution amendment. All work remains planning until a separate implementation authorization completes the constitutional chain.

## 1. Problem

Ascout M1/M2 proves what selected project checks observed on changed code with explicit omission visibility. It does not derive what should have been tested from requirements, change risk, and structural context. It does not propose candidate tests with independent oracle provenance. It does not evaluate candidate stability and defect-discriminating power in isolation. It does not produce a Quality Plan, Unit Test Plan, debugging proof, or residual-risk decision. These are measured gaps in `GAP_EVIDENCE.md`, not marketing claims.

## 2. Goal

First-slice requirement:

> Given a supported JavaScript/TypeScript change in a trusted developer-owned repository, Ascout derives explicit source-bound test obligations from requirements, change, and risk context, identifies unit-test evidence gaps, proposes candidate tests with independent oracle provenance, evaluates their stability and defect-discriminating power in an isolated candidate worktree, and emits an evidence-bound Quality Plan, Unit Test Plan, defect-debugging, and residual-risk result without silently modifying product source or manufacturing PASS from missing evidence.

## 3. Non-goals

First slice does not implement a graph database, persistent memory server, public plugin SDK, hosted control plane, browser farm, generalized untrusted-repository platform, every testing domain at once, organization dashboards, automatic source merge authority, single-model lock-in, or proprietary replacement for mature project-native runners. Browser, security, performance, accessibility, AI-system, and runtime integration remain deferred unless a first-slice benchmark justifies pulling one dependency earlier with separate qualification.

## 4. Functional requirements

- `REQ-INTENT`: requirement sources with explicit provenance and conflict states when PRD, tests, and code disagree. Conflicts never resolve silently to code.
- `REQ-RISK`: transparent risk decomposition with factors, weights, and traceability to obligations. No hidden scoring.
- `REQ-TOG`: Test Obligation Graph with typed nodes and edges, source and run and provenance identity, and truth classes. Minimal deterministic serializable storage first; graph database not authorized by abstraction alone.
- `REQ-ORACLE`: oracle class hierarchy, provenance requirements, independence classification, circular-oracle detection, differential lineage disclosure, historical and withheld isolation, model-judge calibration, human-review semantics, unresolved-oracle fail-closed behavior.
- `REQ-TESTPLAN`: Quality Plan and Unit Test Plan contracts with obligation to evidence to verdict traceability.
- `REQ-GENERATION`: candidate test generation only where a concrete gap exists, with write isolation to a disposable candidate worktree. Core product source remains read-only during generation and evaluation.
- `REQ-ADMISSION`: generated-test lifecycle from proposal to stability gate to discrimination gate to human admission. No auto-merge into developer branches. Discrimination requires mutant, revert, property, differential, or withheld evidence where applicable.
- `REQ-EXECUTION`: authority, environment, and source binding for every candidate execution. Isolated worktree identity, dependency closure, and drift detection required.
- `REQ-DATA`: test-data privacy and provenance, production-data redaction, credential handling, synthetic-data disclosure.
- `REQ-DEBUG`: reproduction, minimization, fault localization ensemble, root-cause proof contract, repair-candidate verification without claiming causality beyond comparative evidence.
- `REQ-FLAKE`: stable, flaky, and test-defect classification with bounded reruns, quarantine visibility, and no rerun-to-green. Retry budgets explicit.
- `REQ-BUDGET`: conservative scheduler with verification budgets and visible omission as `NOT_RUN(budget_*)`, never silent green.
- `REQ-STAT`: statistical and probabilistic evidence policy with sample sizes, confidence, and nondeterminism handling.
- `REQ-MEMORY`: learned-memory non-authority with poisoning controls, expiry, contradiction preservation, and provenance. Memory never becomes proof.
- `REQ-SUPPLY`: artifact and dependency provenance inputs including SBOM awareness where available, without mandating a new supply-chain service in the first slice.
- `REQ-REPORT`: traceability and residual-risk and release-decision rendering with explicit incompleteness. No score-over-failure. Release decision enumeration only.
- `REQ-BENCH`: comparative and holdout benchmark requirement with contamination partitions, corpus qualification, and absolute integrity gates.

## 5. Success criteria

Planning succeeds only when gap evidence, normative requirements, clarifications, complexity reduction, technical plan, tasks, benchmark design, provenance review, Constitution delta, and independent audits are frozen, exact-head reviewed with zero unresolved material threads, and merged without implementation. Implementation succeeds only under a later authorization with benchmark-gated expansion proof.

## 6. Constitutional alignment

Evidence before claims, no green by omission, source-bound truth, explicit authority, native capability first, minimal core, provenance and licensing, benchmark-gated growth. All preserved. No amendment ratified here.

```text
SPEC_015_PLANNING = FOUNDER_AUTHORIZED / IMPLEMENTATION_NOT_AUTHORIZED
IMPLEMENTATION_AUTHORITY = NO
DONOR_IMPORT = NOT_AUTHORIZED
```
