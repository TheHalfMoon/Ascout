# Spec 011 Ponytail / YAGNI Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Purpose

Reduce the explicit test-script authority candidate to the smallest evidence-producing slice consistent with the Constitution, measured gap, and Issue #277 planning authority.

## Candidate expansions reviewed and rejected

### 1. Execute arbitrary package scripts to infer the runner

**Rejected.** Running untrusted script text to observe behavior would expand the executable surface, require sandbox reasoning, and violate explicit command authority. Authority must come from exact-string recognition, not execution.

### 2. Parse shell grammar to recognize composed commands

**Rejected.** Shell parsing adds a parser, operator taxonomy, quoting rules, and escape handling for no measured benefit. The observed Ascout case needs no parser. Composite scripts remain fail-closed without analysis.

### 3. Support package-manager executors (`npx`, `npm exec`, `yarn dlx`, `pnpm dlx`)

**Rejected.** Executor resolution requires install, version, network, and registry reasoning plus implicit-install risk. Indirect scripts remain fail-closed.

### 4. Support flags and arguments (`vitest run --coverage`, `jest --ci --json`)

**Rejected.** Argument tolerance requires a per-runner argument-safety model. The measured case uses bare commands. Flagged scripts remain fail-closed until a future measurement justifies a separately reviewed argument grammar.

### 5. Consult nested workspace test scripts

**Rejected.** Nested scripts have separate package scope under Spec 002. Global authority from nested scripts risks misattribution across basic workspaces. Root-only is the smallest correct scope.

### 6. Infer the runner from lockfiles, binary presence, or config files

**Rejected.** Lockfiles prove package-manager state, binary presence proves installation, and config files prove configuration — none proves which runner the project explicitly selects when both are declared. Declaration plus explicit script is the narrowest sufficient signal.

### 7. Add a new Ascout config key for runner preference

**Rejected.** A persistent preference would create a trust grant and contradict per-invocation admission discipline. Discovery must derive authority from repository evidence, not from a new override surface.

### 8. Add a CLI flag to force the runner

**Rejected.** A force flag would bypass fail-closed ambiguity for convenience and weaken no-green-by-omission. The allowlist resolves only safely recognizable cases; everything else stays unavailable with reasons.

### 9. Change `absent` or `unsupported` outcomes

**Rejected.** Creating a runner where none is declared, or repairing an invalid declaration from script text, would manufacture evidence. Only ambiguous coexistence is eligible.

### 10. Override a single declared runner with a contradictory script

**Rejected.** That would substitute one evidence source for another without a measured contradiction case. Single-runner outcomes are unchanged.

### 11. Change changed-surface admission

**Rejected.** Authority resolution must not remove authority paths or suppress `command_surface_changed`. Admission remains human, per invocation, and receipt-visible.

### 12. Change Receipt v1, selector, widening, coverage, or exit codes

**Rejected.** Runner resolution only determines which planner may proceed. All downstream verification, exercise, evidence-reference, completeness, and exit semantics remain unchanged.

### 13. Change the selector-shadow reference command or timeout

**Rejected.** The shadow harness already has a frozen exact command and 10-minute timeout. Broadening it would mix discovery fidelity work with shadow execution work. The shadow contract is reused unchanged.

### 14. Add a database, trend store, dashboard, or telemetry

**Rejected.** Per-run deterministic discovery plus focused contracts is sufficient to prove the rule. Aggregation is future work only if retained observations demonstrate need.

### 15. Add new dependencies, actions, services, or donor code

**Rejected.** The rule is independently written minimal TypeScript over already-collected discovery inputs. No new runtime surface is required.

## Minimal retained design

```text
in-scope manifests
  -> ambiguous {jest, vitest} ?
    -> root scripts.test exactly "vitest run" ? resolve vitest (explicit)
    -> root scripts.test exactly "jest" ? resolve jest (explicit)
    -> otherwise preserve ambiguous(js_test_runner_ambiguous)
  -> single/absent/unsupported unchanged
-> Vitest/Jest planners consume resolved runner unchanged otherwise
-> changed-surface admission unchanged
-> unavailable remains unavailable with reasons
```

## Retained implementation surfaces

T120:

- `src/discovery.ts`
- `src/tools/vitest.ts`
- `src/tools/jest.ts`
- `tests/t120-explicit-script-authority.contract.test.ts`

T121:

- ledger/governance only by default.
