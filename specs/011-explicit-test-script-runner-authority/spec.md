# Specification 011 — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #277
**Canonical base:** `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`
**Milestone:** M1.2 — Evidence fidelity hardening (bounded)

## Problem

Ascout discovery resolves the JavaScript test runner only from declared dependency coexistence. When both `vitest` and `jest` are declared in the same project scope, discovery reports `ambiguous(js_test_runner_ambiguous)` and both Vitest and Jest planners return `NOT_RUN` with that reason, even when the repository root contains an explicit, safely recognizable direct test command that selects exactly one runner.

On Ascout itself this produces a stable incompleteness: root `scripts.test` is exactly `vitest run` with an installed local Vitest runtime, yet the bound Ascout test task is `NOT_RUN(js_test_runner_ambiguous)`. The first live T118 selector-shadow observation therefore correctly classified the comparison `UNAVAILABLE_ASCOUT_TASK_STATE` and published no selector misses. The unavailable outcome is correct fail-closed behavior under current rules, but it withholds stronger runner-authority evidence that already exists in the explicit command.

## Trust scope

Spec 011 inherits all existing trust boundaries:

- trusted local repository only; no untrusted-repository sandbox claim;
- no implicit dependency installation;
- no changed-command-surface auto-admission;
- no persistent or agent-injected admission;
- source-bound truth and exact path integrity preserved;
- privacy-safe evidence only;
- deterministic evidence where promised;
- no required cloud, model, account, or network acquisition.

Spec 011 does not change the command-surface admission contract. A changed `package.json` test authority still requires explicit per-invocation human admission before execution, even when explicit script authority resolves the runner.

## Identity model

For one discovery evaluation:

- `D` — exact in-scope declared runner set derived from in-scope `package.json` dependency sections;
- `S` — exact root `package.json` `scripts.test` string value when present, otherwise absent;
- `A` — explicit script authority derived only from a strict exact-string allowlist, otherwise absent;
- `R` — final runner resolution consumed by Vitest/Jest planners.

Spec 011 changes `R` only in the narrow case where `D` is exactly the ambiguous `{jest, vitest}` coexistence and `A` selects exactly one member of `D`. All other discovery states are unchanged.

## Acceptance stories

### 1. Resolve Ascout's own ambiguous runner from its explicit command

For a single-package repository whose in-scope declarations contain exactly both `vitest` and `jest` from the same root `package.json`, and whose root `scripts.test` is exactly `vitest run`, discovery must resolve the runner to `vitest` with explicit script authority instead of reporting `ambiguous`.

The Vitest planner must then proceed to its existing scope, config, local-runtime, and coverage-provider checks rather than stopping at `js_test_runner_ambiguous`. The Jest planner must report `not_applicable(runner_not_jest)` for the same input, as it already does for a resolved non-Jest runner.

### 2. Fail closed on every non-allowlisted script

Discovery must preserve the current `ambiguous(js_test_runner_ambiguous)` outcome, with identical reason code, reason text, candidates, and source paths, whenever the root test script is:

- missing or not a string;
- empty or whitespace-only;
- not exactly equal to an allowlisted entry (including leading/trailing whitespace, quoting, or case differences);
- composite (command chaining, sequencing, piping, substitution, redirection, globbing, or multiple commands);
- indirect (package-manager executors, `npx`/`npm exec`/`yarn dlx`/`pnpm dlx`, `node`/`bun`/`deno` wrappers, binary-path indirection, or environment-variable expansion);
- unsupported (any runner or harness outside the existing Vitest/Jest vocabulary);
- unsafe (absolute path, parent traversal, NUL, newline, control character, credential-bearing or otherwise non-canonical material).

No alternate command may be inferred in these cases.

### 3. Preserve single, absent, and unsupported states

Explicit script authority must never change a runner state that is already `resolved`, `absent`, or `unsupported`. It applies only as a bounded ambiguous-coexistence resolver. A single declared runner with a contradictory script, a repository with no declared runner, and an invalid package-manager or workspace declaration all retain their current outcomes.

### 4. Preserve explicit command admission

Resolving the runner from an explicit script does not admit execution. If the current diff changes any effective test command authority path (including root `package.json` when it owns `scripts.test`, the resolved runner declaration path, the resolved runner config path, or the Ascout config override path), the test task remains refused by default as `NOT_RUN(command_surface_changed)` until explicit per-invocation human admission is recorded. Explicit runner authority and execution admission remain separate facts.

### 5. Preserve no-green-by-omission

A test task that remains `NOT_RUN(js_test_runner_ambiguous)` after explicit-authority evaluation must retain its non-empty machine reason code and human reason text. Reports must not present that task as passed, and incompleteness must continue to prevent clean success exit `0` under the existing exit-code contract.

A newly resolved runner does not create a passing claim by itself; it only allows the existing planner, executor, coverage, exercise, and receipt machinery to observe and report what actually ran.

### 6. Preserve source binding and determinism

Explicit script authority must be a pure deterministic function of already-collected discovery inputs (in-scope manifests and root script string). It must not read additional files, invoke processes, access the network, depend on timestamps, depend on environment, or depend on tool output. The same discovery file map must always produce the same authority outcome.

## Functional Requirements

### FR-011-001 — Root-only script source

Read only the repository root `package.json` `scripts.test` value from the already-collected discovery file map. Nested `package.json` test scripts, workspace member scripts, and non-JSON script sources confer no explicit runner authority.

### FR-011-002 — Strict exact-string allowlist

Accept only exact string equality against a frozen allowlist with no trimming, case folding, quote stripping, argument parsing, or shell interpretation. The initial allowlist is exactly:

```text
"vitest run" -> vitest
"jest" -> jest
```

Any other value, including values that contain an allowlisted substring plus additional characters, operators, flags, paths, or wrappers, confers no authority.

### FR-011-003 — Ambiguous-only application

Apply explicit authority only when `jsTestRunner` would otherwise be `ambiguous` with exactly candidates `{jest, vitest}` in the same discovered scope and with ambiguous `sourcePaths` exactly `["package.json"]`, meaning both runner declarations are in the root manifest. If the allowlisted root script selects exactly one of those two candidates, resolve to that runner and record explicit script authority with source path `package.json`. Otherwise preserve the existing outcome byte-for-byte, including candidates, reason code, reason text, and source paths; a root allowlisted script with nested runner declarations therefore remains ambiguous and discards no declaration provenance.

### FR-011-004 — No state expansion

`absent(js_test_runner_not_discovered)`, `unsupported`, and already-`resolved` outcomes are unchanged by Spec 011. Explicit script authority must not create a runner where none is declared, must not repair an unsupported declaration, and must not override a single declared runner.

### FR-011-005 — Authority provenance

When explicit authority resolves the runner, the resolved outcome must expose that it was derived from the explicit root test script and not merely from declaration coexistence. The provenance must identify `package.json` as the authority source without persisting raw credential-bearing, absolute-path, or secret material. When no authority applies, no new provenance field may manufacture a resolved identity.

### FR-011-006 — Planner integration

Vitest and Jest planners must consume the post-authority runner resolution without duplicating script parsing. Vitest plans when the resolved runner is `vitest`; Jest plans when the resolved runner is `jest`. The existing `runner_not_vitest` / `runner_not_jest` `not_applicable` paths, the existing `ambiguous`/`unsupported` `not_run` paths, and all existing scope, config-ambiguity, local-runtime, coverage-provider, and run-id checks remain unchanged.

### FR-011-007 — Changed-surface admission unchanged

The existing `classifyCommandSurfaces` test authority set, including root `package.json` ownership of `scripts.test`, runner declaration paths, and resolved runner config paths, is unchanged. Explicit runner resolution does not remove any authority path, does not suppress `command_surface_changed`, and does not create persistent trust.

### FR-011-008 — Fail-closed script taxonomy

Planning must freeze an exhaustive fail-closed taxonomy covering at minimum: missing script, non-string script, empty script, whitespace-padded script, composite script, indirect executor script, unsupported runner script, unsafe path/character script, and contradictory single-runner script. Each category must preserve the existing discovery outcome without inferring a runner: when discovery already reports exactly `{jest, vitest}` ambiguous, preserve that ambiguous outcome byte-for-byte; for `absent`, `unsupported`, already-`resolved`, or any other existing state, preserve that existing state unchanged.

### FR-011-009 — Determinism and purity

Explicit authority evaluation must be synchronous, total, and deterministic over its inputs, with no I/O, no process launch, no network, no clock, no randomness, and no environment read. Identical discovery file maps must produce identical authority outcomes and identical resolved runner outcomes.

### FR-011-010 — Privacy and path integrity

Explicit authority must handle only canonical repository-relative paths and the exact root script string. It must not persist raw absolute local paths, raw credential-bearing origins, secret-bearing argv, environment dumps, or repository URLs. Invalid path spellings continue to be rejected before lossy normalization.

### FR-011-011 — No product-core expansion

Spec 011 must not change Receipt v1 schema, model, validator, or exit-code precedence; must not change selector, widening, coverage, exercise, or finding semantics; must not add a CLI flag, config key, workflow, action, permission, secret, service, database, telemetry backend, plugin framework, generic script runner, or new runtime dependency; must not change Spec 007 terminal disposition, consumed Spec 007 attempts, historical benchmark results, or release state.

### FR-011-012 — Selector-shadow contract unchanged

The existing selector-shadow frozen contract requiring root `scripts.test` to equal exactly `vitest run` remains unchanged. Spec 011 does not authorize an alternate shadow reference command, a second shadow runner, or a shadow timeout change.

### FR-011-013 — Qualification

Each implementation task requires exact-head focused proof, full repository tests/typecheck/build as applicable, six-lane Project CI on the original qualifying attempt, applicable Self Verification evidence, fresh independent substantive exact-head review, zero unresolved material review threads, branch-purity proof, live rules/protection revalidation, guarded expected-head merge, and post-merge ordered-parent/tree/signature/PR/main proof.

## Planned task order

`T120 -> T121`

- T120: discovery explicit script authority plus Vitest/Jest planner integration plus focused deterministic contracts only.
- T121: ledger/governance reconciliation and Spec 011 closeout by default.

T121 must not begin before T120 is canonically closed. No successor task beyond T121 is planned by this specification.

## Non-goals

No arbitrary script execution, shell parsing, package-manager executor support, nested-script authority, additional runner vocabularies, argument-tolerant matching, fuzzy command recognition, config-file runner inference, lockfile runner inference, binary-presence runner inference, new Ascout config surface, persistent trust grant, agent-injected admission, selector repair, widening change, receipt change, benchmark replay, donor execution, new dependency/action/workflow/service/database/dashboard, release, tag, or publication.

## Success Criteria

Spec 011 may close `GO` only when exact evidence proves:

1. Ascout-shaped ambiguous input with root `scripts.test == "vitest run"` resolves to `vitest` with explicit script authority;
2. allowlisted `jest` input resolves symmetrically where the ambiguous set contains `jest`;
3. every non-allowlisted script category preserves byte-identical ambiguous fail-closed behavior;
4. single, absent, and unsupported runner states are unchanged;
5. planner integration preserves all existing scope, config, runtime, coverage, and run-id gates;
6. changed-surface admission is unchanged and still requires per-invocation human admission;
7. no-green-by-omission is preserved for remaining ambiguous outcomes;
8. authority evaluation is deterministic and pure over discovery inputs;
9. privacy and path-integrity boundaries are preserved;
10. no product-core, receipt, selector, benchmark-result, Spec 007, dependency, workflow-permission, or release mutation occurs;
11. focused contracts cover the frozen allowlist and the exhaustive fail-closed taxonomy;
12. exact-head Project CI, Self Verification, independent review, guarded merge, and post-merge proof close each implementation task canonically.

## Governance

Planning artifacts do not authorize implementation. T120 requires this planning package to merge canonically and a separate durable implementation-authorization artifact/ledger bound to the exact planning merge.
