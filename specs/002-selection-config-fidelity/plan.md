# Implementation Plan: Selection Configuration Fidelity

**Spec:** 002  
**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED  
**Constitution:** 1.0.0  
**Target milestone:** M2 selection hardening

## Constitution check

- Evidence Before Claims: PASS — benchmark replay is required before completion.
- No Green by Omission: PASS — multiple nested configs fail closed.
- Source-Bound Truth: PASS — config remains canonical repository-relative source authority.
- Trusted Local Scope / Explicit Authority: PASS — selected nested config participates in changed-command-surface admission.
- Native Capability Before Invention: PASS — uses existing recognized Jest/Vitest config files and runner argv.
- Conservative Affected Verification: PASS — ambiguity is non-execution, not guessed selection.
- Bounded / Read-Only / Private Execution: PASS — no new execution surface or source mutation.
- Provenance / Benchmark-Gated Growth: PASS — scope is justified by the published M1 selector miss.

No constitutional amendment is required.

## Technical approach

### 1. Reuse the existing filesystem traversal

`collectFiles()` already recursively discovers recognized Jest/Vitest config filenames while excluding `.git`, `.ascout`, and dependency-tree traversal except required local executables.

Spec 002 must not add another filesystem traversal.

### 2. Change only runner-config candidate filtering

Current `configPaths()` filters all config kinds to `roots.includes(dirname(path))`.

Refine only Jest/Vitest behavior:

- TypeScript and ESLint remain root-only exactly as M1.
- For Jest/Vitest, first compute the existing root-level candidates.
- For Jest, root `package.json` with a `jest` field remains a root-level candidate.
- If root-level candidates exist, return them unchanged; nested configs are not effective authority.
- If no root-level candidate exists and workspace kind is `single`, return all recognized nested candidates for that runner under the repository root.
- If workspace kind is `basic`, retain current root-only behavior; no nested fallback.

This makes command-authority classification naturally include the nested candidate only when it can actually become effective.

### 3. Planner selection rule

Update Jest/Vitest `configAtScope()` logic without changing public receipt types:

- existing direct-at-scope candidate selection remains first;
- for `scopeRoot === ""`, if no direct candidate exists:
  - one nested candidate => select it;
  - more than one nested candidate => `ambiguous`;
  - none => `null`;
- non-root/basic-workspace scopes retain existing direct-at-scope behavior.

The selected nested path is passed using the existing explicit `--config` argv construction.

### 4. Authority/admission

No new admission model is introduced.

Because the effective nested path is present in runner `configPaths`, existing `classifyCommandSurfaces()` and changed-authority intersection must classify it as test authority. Contract/integration tests must prove ordinary changed-config execution is refused and explicit per-run admission remains non-persistent.

If implementation reveals that this propagation is incomplete, repair it in the smallest existing authority path; do not create a parallel authority model.

### 5. Benchmark replay

Reuse the frozen founding benchmark case and existing isolated harness.

Required replay target:

`react-hook-form-value-as-date@2`

Required post-repair facts:

- project-native related comparator remains a hit;
- Ascout comparator becomes a hit for the frozen oracle test;
- no unavailable outcome is coerced into a hit/miss;
- all T077 absolute integrity assertions remain zero.

Before milestone closeout, replay the full current selection-case set so the repair cannot hide a regression in another frozen selection case.

Do not overwrite the historical T078 publication. Record M2 qualification as a new result/evidence artifact bound to the exact candidate and fresh benchmark run.

## Expected product files

Likely product mutation:

- `src/discovery.ts`
- `src/tools/jest.ts`
- `src/tools/vitest.ts`

Likely tests:

- `tests/discovery-production.contract.test.ts`
- `tests/jest-task.contract.test.ts`
- `tests/vitest-task.contract.test.ts`
- `tests/command-surface.contract.test.ts`
- one focused check/admission integration test if existing coverage is insufficient.

Benchmark evidence may add a new file under `benchmarks/results/` but must not modify historical T078 bytes.

## Data model / API impact

None expected.

Existing fields already represent:

- runner config path;
- command authority paths;
- admission state;
- selection mode/pass accounting;
- evidence references.

A new receipt schema/version is prohibited by this plan unless planning is reopened.

## Dependency impact

None.

No new product or development dependency is planned.

## Security / trust impact

The selected nested config is executable configuration loaded by the test runner, so it must be classified as command authority. This increases honesty of the existing trust boundary; it does not create sandboxing.

No new shell execution, network promise, implicit install, or persistent trust grant is introduced.

## Test strategy

### Unit/contract

- root config precedence;
- exactly one nested Jest fallback;
- exactly one nested Vitest fallback;
- multiple nested candidate ambiguity;
- basic workspace does not gain nested fallback;
- deterministic candidate ordering;
- explicit runner argv includes nested config;
- changed nested config is test authority.

### Integration

- ordinary invocation refuses changed selected nested config;
- explicit per-invocation admission permits only that invocation;
- next ordinary invocation refuses again;
- receipt/evidence/selection semantics remain valid.

### Cross-platform

Every task candidate must run Project CI on Ubuntu/macOS/Windows × Node 22/24.

### Benchmark

- focused React Hook Form replay while iterating;
- full frozen selection corpus before M2 closeout;
- T077 absolute integrity assertions remain zero;
- new M2 result records exact source/run bindings.

## Task decomposition

- T089 — implement nested runner-config candidate discovery/planner fallback with contract tests.
- T090 — prove and repair command-authority/admission integration for the selected nested config.
- T091 — replay the frozen selection benchmark, publish exact M2 selector-fidelity evidence, and repair only Spec 002 defects revealed by replay.
- T092 — run final clean cross-platform qualification, reconcile documentation/status, and close M2 without publication/release.

Each task uses one task-scoped branch/PR, exact-head qualification/review, guarded merge, post-merge proof, and canonical reread before the next task.

## Stop conditions

Return to planning instead of expanding implementation if the repair requires any of the following:

- shell/package-script parsing or arbitrary package-script execution;
- a second product runtime dependency;
- workspace nested-config ownership semantics;
- a dependency/import graph;
- receipt schema changes;
- new task/status vocabulary;
- persistent trust/admission state;
- more than the existing bounded widening model;
- untrusted repository execution.

## Implementation authorization

This plan does not authorize implementation.

Authorization must be recorded durably after all planning gates, fresh exact-head review, and canonical planning merge. The authorization record must bind the exact canonical planning commit and the T089–T092 task scope before any product/test implementation mutation begins.
