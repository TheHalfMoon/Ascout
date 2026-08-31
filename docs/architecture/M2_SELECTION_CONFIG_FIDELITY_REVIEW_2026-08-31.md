# M2 Architecture / Gap Review — Selection Configuration Fidelity

**Date:** 2026-08-31  
**Canonical base:** `f5d335a9f77cc0fed5328622180929a364066e84`  
**Status:** REVIEWED_FOR_SPECIFICATION_ONLY  
**Sources:** Constitution, Master Plan v1, Spec 001, founding benchmark, Issue #75, Issue #6

## Purpose

This review satisfies the post-M1 promotion gate requiring a focused architecture/gap review before any research or roadmap item becomes canonical implementation work.

It does not authorize implementation. It identifies the smallest evidence-backed post-M1 product gap that is justified for a new Spec Kit authority chain.

## Live baseline

Founding M1 is `IMPLEMENTED / QUALIFIED / FOUNDER_RATIFIED` and the canonical T001–T088 execution plan is complete.

The founding benchmark publishes one observed Ascout selector miss:

- case: `react-hook-form-value-as-date@2`
- changed production path: `src/logic/validateField.ts`
- oracle regression path: `src/__tests__/logic/validateField.test.tsx`
- oracle test: `validateField > should return min error when the field value is already a Date object (valueAsDate)`
- project-native related command requires `--config ./scripts/jest/jest.config.js`
- project-native related comparator contains the oracle test
- Ascout comparator misses the oracle test

The current source explains a concrete configuration-fidelity gap:

1. discovery recursively collects recognized `jest.config.*` and `vitest.config.*` files;
2. `configPaths()` retains only configs whose direct directory is exactly a package/workspace root;
3. `planJestTask()` / `planVitestTask()` therefore cannot select a recognized config nested below a single-package root;
4. when no root-level config is selected, the runner is invoked without that project-specific config;
5. a repository whose authoritative runner behavior depends on one nested recognized config can therefore produce different native related selection under Ascout than the project-native comparator.

This is an evidence-backed selection-fidelity defect, not a reason to add a generic dependency graph, shell parser, agent runtime, sandbox, database, or new model dependency.

## Constitutional fit

The smallest repair follows the existing constitutional principles:

- **Evidence Before Claims:** the solution must be benchmarked against the published selector miss.
- **No Green by Omission:** ambiguous nested configs must fail closed; Ascout must not guess.
- **Source-Bound Truth:** config paths remain source-bound repository-relative authority.
- **Trusted Local Scope / Explicit Authority:** the selected nested config becomes an effective command/config authority path and changed-surface admission still applies.
- **Native Capability Before Invention:** use recognized native Jest/Vitest config files; do not build a general shell or dependency parser.
- **Conservative Affected Verification:** ambiguity widens to non-execution rather than silently choosing a config.
- **Benchmark-Gated Growth:** the existing published selector miss is the authorization signal for this scope.

No constitutional amendment is required.

## Candidate solution

For **single-package JavaScript/TypeScript projects only**:

1. retain current root-level config behavior unchanged;
2. if no root-level Jest/Vitest config is available, consider recognized nested runner config files under the repository root;
3. if exactly one nested recognized config exists for the resolved runner, use it as the effective runner config;
4. if more than one candidate exists, return fail-closed `config_ambiguous` / `NOT_RUN` rather than guess;
5. pass the selected config explicitly to the runner using the existing argv-based `shell:false` process path;
6. include the selected nested config in command-surface authority so changing it requires normal per-invocation admission;
7. preserve all existing receipt, evidence, selection, coverage, widening, and exit semantics.

Basic-workspace nested-config resolution is deliberately deferred. It requires package ownership/disambiguation rules that are not needed to repair the measured single-package miss.

## Explicit non-solutions

This review rejects the following for Spec 002:

- parsing arbitrary package-manager shell script strings;
- executing package scripts solely to discover configuration;
- a custom JS/TS import/dependency graph;
- tree-sitter/SCIP/Kythe or another code-intelligence subsystem;
- a second product runtime dependency;
- first-class Python affected verification;
- binary packaging changes;
- untrusted-repository sandboxing;
- agent behavior, memory, retrieval, or external-world verification;
- browser/API/security-suite expansion;
- new receipt schema/version.

Those remain roadmap/research candidates until benchmark, adoption, or operational evidence justifies a separate Spec Kit chain.

## Success evidence

Spec 002 must prove at minimum:

1. root-level config behavior is unchanged;
2. a single-package project with exactly one nested recognized Jest config uses it explicitly;
3. the analogous Vitest path is covered if the same discovery rule is shared;
4. multiple nested configs fail closed rather than choose by traversal order;
5. the selected nested config is an effective command authority and changed-config admission is enforced;
6. cross-platform project CI remains green on Ubuntu/macOS/Windows with Node 22/24;
7. replay of `react-hook-form-value-as-date@2` changes the Ascout selector outcome from miss to hit while retaining all absolute integrity gates at zero;
8. no new selector miss or false-PASS is hidden by the repair.

## Promotion decision

**PROMOTE:** one new Spec Kit chain for benchmark-backed single-package nested Jest/Vitest configuration fidelity and selector hardening.

**DO NOT PROMOTE:** Issue #6 memory learning or the broad Issue #75 agent/sandbox/evidence-platform domains. They remain research-only.

The next canonical artifact is `specs/002-selection-config-fidelity/spec.md`.
