# Specification: Selection Configuration Fidelity

**Spec ID:** 002  
**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED  
**Milestone:** M2 — Selection hardening  
**Canonical planning base:** `f5d335a9f77cc0fed5328622180929a364066e84`

## Problem

Ascout M1 can discover and execute project-local Jest/Vitest runners, but current runner-config discovery only treats a recognized config as effective when the config file is located directly at a package/workspace root.

The founding benchmark contains a concrete counterexample. In `react-hook-form-value-as-date@2`, the authoritative project-native Jest related-selection command requires `scripts/jest/jest.config.js`. The project-native related comparator executes the frozen oracle test, while the Ascout comparator misses it.

Ascout must not silently run the right runner with the wrong effective configuration and then describe that execution as faithful affected verification.

## Goal

For a single-package JavaScript/TypeScript repository, Ascout must preserve recognized Jest/Vitest configuration fidelity when the effective runner config is nested below the repository root, without introducing shell parsing, arbitrary package-script execution, a dependency graph, a new runtime dependency, or a new receipt schema.

## User stories

### US1 — Faithful nested config selection

As a developer whose project keeps its Jest or Vitest configuration under a nested repository path, I want Ascout to invoke the resolved local runner with that effective config so related-test selection matches the project's native runner semantics.

### US2 — Honest ambiguity

As a developer with multiple candidate nested configs, I want Ascout to refuse to guess which one is authoritative so a wrong config cannot create false confidence.

### US3 — Admission remains authoritative

As a developer changing the effective nested runner config in the same diff, I want Ascout to treat that file as command/config authority and refuse the affected task by default until I explicitly admit the changed surface for that invocation.

### US4 — Benchmark-backed regression proof

As an Ascout maintainer, I want the published founding selector miss to be replayed after the repair so the product change is justified by measured evidence rather than implementation intuition.

## Functional requirements

### FR-001 — Scope

Spec 002 applies only when all of the following are true:

- the discovered workspace kind is `single`;
- the JavaScript test runner resolves unambiguously to Jest or Vitest;
- the runner is project-local and already satisfies the M1 executable/version contract;
- the task is not replaced by an arbitrary configured test command.

Basic-workspace nested-config resolution is outside this spec.

### FR-002 — Preserve root config precedence

Existing M1 root-level runner-config behavior must remain unchanged.

A recognized root-level config or supported root `package.json` Jest configuration remains the effective config candidate under the existing rules.

Spec 002 must not replace an already-unambiguous root-level configuration with a nested candidate.

### FR-003 — Single nested candidate

When no root-level effective config exists for a single-package project, discovery/planning may use a nested recognized config only when exactly one candidate exists for the resolved runner under the repository root.

Recognized file shapes remain the existing M1 shapes:

- Jest: `jest.config.js|mjs|cjs|ts|json`
- Vitest: `vitest.config.js|mjs|cjs|ts|mts|cts`

The chosen path must remain canonical repository-relative data.

### FR-004 — Ambiguity fails closed

If more than one nested candidate exists for the resolved runner and no existing root-level rule resolves the effective config, the test task must not execute.

It must return an explicit non-empty `NOT_RUN` reason using the existing configuration-ambiguity semantics. Traversal order, lexical order, shortest path, newest file, package script text, or prior runs must not be used as an implicit tie-breaker.

### FR-005 — Explicit runner argv

When a nested config is selected, Ascout must pass it explicitly through the existing Jest/Vitest argv planning path.

No `shell:true`, shell-string command construction, package-script execution, or implicit dependency installation may be added.

### FR-006 — Command authority

The selected nested config is an effective command/config authority path.

If the current source diff changes that path, the test task must follow the existing M1 admission contract:

- default: `NOT_RUN(command_surface_changed)`;
- explicit human per-invocation admission may allow execution;
- admission is receipt-visible and never persisted or auto-added.

### FR-007 — Source/evidence semantics unchanged

Spec 002 must not change:

- source identity or tree digest semantics;
- receipt schema/version;
- task/status vocabulary;
- selection-account shape;
- changed-code exercise semantics;
- widening maximums;
- evidence-reference rules;
- exit-code precedence;
- run retention/privacy rules.

### FR-008 — Benchmark replay

The frozen `react-hook-form-value-as-date@2` selection case must be replayed under the existing isolated benchmark protocol.

The post-repair Ascout comparator must execute the frozen oracle test under the exact benchmark source/toolchain contract.

The benchmark must continue to preserve unavailable evidence as unavailable and must not invent a recall threshold.

### FR-009 — Integrity gates remain absolute

The following acceptable counts remain zero:

- cross-tree evidence leakage;
- source/binding integrity violations;
- stable material exercise gaps returning exit `0`.

A selector improvement cannot compensate for an integrity violation.

### FR-010 — Cross-platform compatibility

All implementation tasks must preserve project qualification on:

- Ubuntu 24.04 / Node 22 and 24;
- macOS 14 / Node 22 and 24;
- Windows Server 2025 / Node 22 and 24.

## Non-functional requirements

### NFR-001 — No new product runtime dependency

Spec 002 must be implemented with the existing Node/runtime stack.

### NFR-002 — Bounded discovery

Nested config consideration must reuse the existing bounded repository discovery traversal and file-name recognition. It must not introduce an unbounded second filesystem crawl.

### NFR-003 — Determinism

Candidate selection and ambiguity outcomes must be deterministic from the same source tree and discovery inputs.

### NFR-004 — Backward compatibility

Repositories with the existing supported root-level config layout must retain the same effective config, runner argv semantics, admission behavior, and receipt contract.

## Acceptance scenarios

1. **Root Jest config:** root `jest.config.js` remains selected; nested unrelated config does not replace it.
2. **Root Vitest config:** root `vitest.config.ts` remains selected.
3. **Single nested Jest config:** `scripts/jest/jest.config.js` is selected and emitted in Jest argv.
4. **Single nested Vitest config:** one nested recognized Vitest config is selected and emitted in Vitest argv.
5. **Two nested Jest configs:** task fails closed as config ambiguous.
6. **Two nested Vitest configs:** task fails closed as config ambiguous.
7. **Changed selected nested config:** ordinary check refuses test execution with `command_surface_changed`.
8. **Explicit admission:** the same changed nested config may execute only for the admitted invocation and receipt records the admission.
9. **Founding miss replay:** `react-hook-form-value-as-date@2` Ascout membership changes from miss to hit.
10. **Existing benchmark integrity:** absolute integrity counts remain zero.

## Success criteria

Spec 002 is complete only when:

- SC-001: all acceptance scenarios are covered by automated tests;
- SC-002: exact-head six-lane Project CI is green;
- SC-003: the frozen founding selector case is replayed successfully with Ascout membership hit for its oracle test;
- SC-004: no new hidden selector miss/false-PASS is created by suppressing, skipping, or weakening evidence;
- SC-005: exact-head review finds no unresolved material finding;
- SC-006: every task is merged/closed with post-merge canonical verification;
- SC-007: no receipt schema/version, dependency, publication, or release mutation occurs unless a later separately authorized task explicitly adds it.

## Explicit non-goals

Spec 002 does not implement:

- arbitrary package-script parsing/execution;
- generic test-command inference;
- JS/TS import/dependency graphs;
- basic-workspace nested-config ownership;
- first-class Python affected verification;
- untrusted sandboxing;
- agent/memory/retrieval verification;
- browser/API/security verification;
- binary/package publication;
- a new receipt version.

## Governance

This specification defines requirements only. It does not authorize implementation.

Implementation may begin only after clarification, YAGNI review, technical plan, second YAGNI review, tasks, checklist, analysis, independent final audit, fresh exact-HEAD cross-artifact/branch-purity review, planning merge, and a durable explicit implementation-authorization record bound to the resulting canonical planning state.
