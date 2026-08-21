# Implementation Plan: Changed-Code Verification Receipt

**Branch**: `planning/000-ascout-foundation` | **Date**: 2026-08-21 | **Spec**: `specs/001-changed-code-verification-receipt/spec.md`

**Input**: Feature specification from `specs/001-changed-code-verification-receipt/spec.md`

**Status**: Plan candidate. No implementation is authorized by this document.

## Summary

Build the smallest local CLI that turns an AI coding change into an honest source-bound verification receipt. M1 will reuse Git and existing project verification tools rather than build a semantic index: discover the trusted local repository and concrete project tools, bind a run to the exact changed source state, execute typecheck/lint/test tasks with bounded process control, use native Vitest/Jest related selection plus conservative widening, collect line coverage into an Ascout-owned run directory, intersect that evidence with changed executable lines, report factual test changes, detect source drift, and emit one truth model as human, JSON, and bounded-agent receipts.

The reference implementation is TypeScript on supported Node LTS releases. The planned product runtime dependency budget is one dependency (`cross-spawn`) for secure/correct Windows command-shim launching; all other M1 mechanics use Node/Git/project-native capabilities unless implementation evidence forces a reviewed plan delta.

## Technical Context

**Language/Version**: TypeScript 6.x; Node.js >=22. Primary development/reference Node 24 LTS; CI verifies Node 22 + Node 24.

**Primary Dependencies**: Node standard library; Git CLI; planned runtime `cross-spawn` only. Project-native TypeScript/ESLint/Vitest/Jest/pytest are executed as external repository tools when present/configured, not bundled by Ascout.

**Storage**: Local files only. Tracked `ascout.config.json`; ignored `.ascout/` runtime directory containing lock and bounded run artifacts. No database.

**Testing**: Deterministic unit tests for parsers/classifiers/serialization; contract tests for config/receipt schemas; integration tests using temporary real Git repositories and concrete/fake tool fixtures; OS-matrix GitHub Actions on Windows, macOS, Linux. Benchmark corpus is separate from ordinary unit fixtures.

**Target Platform**: Developer CLI on Windows 11/PowerShell or compatible terminal, macOS, and Linux. v0.x operates only in the developer's own trusted local Git repository.

**Project Type**: Single npm CLI package with a `ascout` bin entry. Self-contained native binaries deferred.

**Performance Goals**: On warm supported fixtures, Ascout orchestration overhead excluding child verification runtime SHOULD stay below 10% of the selected underlying verification time and SHOULD NOT dominate sub-second tool runs. Time-to-signal is benchmarked against plain project test commands and full-suite execution; correctness/honesty wins over speed when widening is required.

**Constraints**:
- no implicit dependency installation;
- no repository upload/account/SaaS/model requirement;
- no claim that child processes are offline;
- no silent product-source mutation;
- no old evidence reused as current evidence;
- no deselected test represented as passed;
- no shell-string execution for discovered commands;
- bounded task runtime and retained output;
- no untrusted-repository promise;
- no semantic graph/database/plugin SDK in M1.

**Scale/Scope**: Single-package repositories and basic npm/pnpm/yarn workspaces; JS/TS first-class; basic configured pytest task only. The design MUST remain streaming/bounded enough that ordinary repository size does not require loading raw command output or entire file contents into a single unbounded in-memory report.

## Constitution Check

*GATE: Must pass before implementation. Re-check after Phase 1 design.*

| Constitutional gate | Plan evidence | Result |
|---|---|---|
| Evidence before claims | One run model; task/evidence references; no universal proof ladder | PASS |
| No green by omission | Seven task statuses + reason-coded non-run; selected/deselected accounting | PASS |
| Source-bound truth | Start source identity, config digest, end drift digest; evidence IDs run-bound | PASS |
| Trusted local scope / explicit authority | Own trusted repo only; command provenance; changed command-surface warning; no implicit installs | PASS |
| Native capability before invention | Git + Vitest/Jest + LCOV; no custom graph or diff engine | PASS |
| Conservative affected verification | Explicit widening rules and post-run no-relationship widening | PASS |
| Minimal core | No DB/daemon/server/Rust/plugin SDK/AI; one planned runtime dependency | PASS |
| Bounded/read-only/private execution | Task timeout, run lock, output caps/retention, redaction, drift detects tracked mutation | PASS |
| Provenance/licensing | Pinned Spec Kit provenance; donor code not imported; dependency review gate | PASS |
| Benchmark-gated expansion | M1 benchmark measures binding, false-PASS, selection recall, gap accuracy, timing | PASS |

**Post-design re-check**: PASS. The concrete structure below does not add a semantic index, persistence service, generic adapter framework, or cloud component.

## Architecture: Minimum Concrete Slice

No generic plugin/adapter API is defined. M1 uses concrete modules for the handful of real tool integrations. Shared interfaces MAY be extracted only where two or more concrete implementations demonstrate identical behavior.

### Run flow

```text
CLI parse
  ↓
repository + config discovery
  ↓
run lock
  ↓
source identity START
  ↓
changed-scope + command-surface inspection
  ↓
task planning + widening decision
  ↓
bounded concrete task execution
  ↓
test result + LCOV normalization
  ↓
changed-line exercise intersection
  ↓
test-change facts
  ↓
source identity END / drift check
  ↓
current-run receipt model
  ├─ terminal
  ├─ JSON
  └─ bounded agent
```

### Trust boundary

M1 assumes the repository is the user's own trusted local repository, but the *current diff* may have changed the commands/config Ascout is about to run. Before executing a repo-derived command, planning records its provenance and checks whether its command-surface source changed. The receipt/warning MUST name that changed source. Host-level automatic hooks remain opt-in.

The plan does not add `.ascout/trust.json`, VM/container sandboxing, or an untrusted mode.

## Source Identity Contract

### Repository identity

1. If a normalized Git remote origin exists, derive `repo_id` from that normalized origin.
2. Otherwise derive a `local:` identity from the canonical real repository path and mark it `portable: false`.

### HEAD metadata

Record HEAD SHA when resolvable plus detached/shallow flags. A missing initial commit is unsupported for M1 check execution and produces a clear configuration/usage error rather than invented comparison semantics.

### Tree digest v1

`tree_digest_v1` is a documented canonical SHA-256 digest over:

1. format marker `ascout-tree-v1`;
2. HEAD SHA;
3. sorted Git index entries (mode + object id + stage + repo-relative path);
4. sorted unstaged tracked paths with state marker and SHA-256 of current file bytes/symlink target, or deletion marker;
5. sorted relevant untracked non-gitignored paths with type/mode marker and SHA-256 of bytes/symlink target.

Ascout-owned/tool-owned **untracked** artifacts declared as non-source output MAY be excluded. A tracked file is never excluded solely because a tool may rewrite it.

The exact byte framing uses length-prefixed UTF-8 path/metadata fields, not ambiguous delimiter concatenation. The serializer has golden-vector tests.

### Drift

Compute the same digest before and after verification. A mismatch yields `TREE_DRIFTED`, annotates every receipt format as unstable, and selects drift exit semantics even if tasks otherwise passed.

### Configuration identity

`config_digest_v1` is SHA-256 over the exact tracked `ascout.config.json` bytes (or an explicit `NO_CONFIG` marker) plus the effective Ascout schema version. Discovered repository command/config files remain part of the tree digest and each task's provenance.

## Changed Scope

Use Git as the only changed-state engine.

- Tracked staged + unstaged comparison: `HEAD` vs current tree.
- Parse zero-context unified diff to obtain new-file changed line ranges.
- Relevant untracked text source files are wholly changed.
- Binary/non-line-oriented changed files are reported at file level and never given fabricated line coverage.
- Rename metadata is retained where Git provides it; M1 finding fingerprints are still allowed to change across a path rename.

Default comparison is local changes versus HEAD. `--base` is not required in the first implementation slice; the data model reserves an explicit comparison descriptor so a later committed-range mode does not change receipt semantics.

## Configuration Contract

Tracked file: `ascout.config.json`.

Minimum v1 shape:

```json
{
  "version": 1,
  "tasks": {},
  "timeouts": {},
  "budgetMs": null,
  "workspace": {},
  "redactEnv": []
}
```

Rules:

- Unknown top-level keys fail closed as configuration error in v1 unless explicitly reserved.
- Task disablement requires a non-empty reason.
- Command overrides are argv arrays (`[executable, ...args]`), never shell strings.
- Config can narrow/override discovery but cannot suppress the receipt's disclosure that a task was disabled.
- No arbitrary dependency graph or workflow-expression language.

`ascout init` creates the minimal config only when requested and ensures `.ascout/` is ignored; it does not install project dependencies.

## Discovery and Concrete Tasks

### Package manager

Order of evidence:

1. valid root `packageManager` declaration;
2. unambiguous lockfile;
3. otherwise explicit configuration required.

Multiple conflicting package-manager signals are an `ERROR(config/discovery)` rather than a guess.

### TypeScript

Prefer an explicit Ascout override; otherwise prefer an existing project `typecheck` script. Direct `tsc` discovery is permitted only when a project TypeScript installation/config makes the invocation unambiguous; otherwise `doctor` reports the gap instead of inventing flags.

### ESLint

Prefer explicit override. When a project-local ESLint and recognized configuration are present, lint the changed supported source files directly to avoid executing unrelated work. If only a project `lint` script is safely discoverable, run that script and disclose its scope.

### Vitest

Use the project-local Vitest version/config. For affected verification use native `related`/changed semantics rather than an Ascout graph. Force non-watch run behavior. Request machine-readable test output plus line coverage into the current run's artifact directory. Record the actual runner version and effective selection mode.

### Jest

Use project-local Jest. Use `--findRelatedTests` with changed source files for affected selection. Request machine-readable test output plus line coverage into the run artifact directory.

### pytest basic tier

Only execute an explicitly configured or clearly discoverable pytest task and record pass/fail/error. No M1 Python affected selection, coverage-to-diff claim, virtual-environment chooser, or testmon state.

## Conservative Widening

Before test execution, widen to the affected package/workspace full test scope when the changed set includes a declared high-risk selection surface such as:

- lockfile;
- package dependency fields;
- package-manager configuration;
- compiler/path-alias configuration;
- test-runner configuration;
- root workspace configuration;
- relevant executable/data/template/config inputs that the native static selector cannot relate safely.

After a narrowed run, if changed production code has no usable coverage relationship, perform one bounded second pass widened to that package's full configured test scope. The receipt records both passes and the trigger. No recursive widening loop.

For workspace-root changes whose safe package impact cannot be narrowed without a dependency graph, widen to the entire basic workspace test scope.

## Coverage Normalization

Use LCOV line data generated into `.ascout/runs/<run-id>/raw/<task-id>/coverage/`.

Normalize only what M1 needs:

```text
repo-relative source path
line number
execution count
mapping state: resolved | unresolved
```

For changed executable source files, configure the runner coverage collection so an untouched changed source can be represented when the runner/provider supports it. A changed line is:

- `EXERCISED` only when resolved line count > 0;
- `NOT_EXERCISED` when resolved line count = 0;
- `UNRESOLVED` when coverage/source mapping cannot establish the line reliably.

Never coerce `UNRESOLVED` to exercised.

LCOV parsing is small Ascout-owned code with strict malformed-input handling and golden fixtures; no coverage database or Istanbul API dependency is required.

## Test Result / Flake Handling

Prefer runner JSON output to identify failing test cases and aggregate outcomes. Raw stdout/stderr remain bounded artifacts.

Default retry behavior:

- successful tasks: no retry;
- deterministic compiler/lint failure: no automatic retry;
- failing test case: if the runner provides a safe exact test/file selector, rerun only the failing unit up to **two** additional observations;
- if exact targeted rerun cannot be formed safely, keep one observation and `reproduced=false` rather than rerunning the entire suite merely to label confidence.

`FLAKY` requires contradictory pass/fail observations. Preserve `{runs, failures}`.

## Process Control

Use `cross-spawn` without `shell: true` for executable/argv launch. Project scripts are invoked through the detected package-manager executable and argument array.

Timeout behavior:

- one wrapper owns launch, bounded stdout/stderr capture, timeout, termination, and normalized execution result;
- POSIX: child gets its own process group and timeout termination targets the group with graceful-then-force escalation;
- Windows: use platform-native tree termination for the spawned process tree; do not assume killing the parent PID kills descendants;
- termination failure is an Ascout `ERROR`, not repository `FAIL`.

Exact grace constants are implementation constants covered on each OS.

## Run Lock and Artifacts

Runtime root: `.ascout/` (ignored by default).

```text
.ascout/
├── run.lock
└── runs/
    └── <run-id>/
        ├── manifest.json
        ├── receipt.json
        └── raw/
            └── <task-id>/
```

Acquire `run.lock` atomically. Store PID/start/repo identity. If the owning PID is verifiably dead, replace the stale lock and record that recovery; otherwise refuse the new run.

Default retention: keep the **20 most recent completed runs** and never delete the active run. Raw stdout/stderr capture is bounded per stream; truncation is explicit in manifest metadata. Retention limits are configuration-adjustable but cannot become unbounded through a missing value.

## Redaction

Before persisted stdout/stderr or agent output is written, redact exact values of environment variables whose names match a documented secret-bearing pattern (token/key/secret/password/credential/auth/cookie/session families) plus user-specified `redactEnv` names. Ignore empty/very-short values that would destroy output utility. Redaction affects stored/rendered evidence, not the child's environment in M1.

The receipt declares that redaction is best-effort and not a guarantee that arbitrary secrets absent from known environment values cannot appear in project logs.

## Receipt Contract

One internal receipt model feeds every output surface.

Required top-level domains:

```text
schema_version
run
source
comparison
selection
tasks
changed_code
exercise
test_changes
findings
artifacts
stability
summary
```

### Finding semantics

No proof ladder. A finding records producer/task, rule/test identity when available, message/location, normalized severity if supplied by producer, current-run evidence IDs, `in_changed_lines`, observations, determinism/reproduction fields, `introduced_by_change` (M1 default `unknown`), and optional `fingerprint_v1`.

`fingerprint_v1 = SHA-256(version + task identity + repo-relative path + normalized message)` with length-prefixed fields. It is weak/versioned and never a merge key.

### Output surfaces

- Terminal: concise receipt with identity, task matrix, selection accounting, exercise gap, material test changes, findings/errors, stability.
- JSON: full versioned receipt, deterministic key/value semantics; no raw unbounded logs embedded.
- Agent: same run truth, hard maximum **16 KiB UTF-8** by default; rank failures/errors/gaps first, include totals for omitted detail, never truncate identity/status semantics.

## Exit Semantics

Exact M1 numeric contract:

- `0` — stable receipt, at least one applicable verification task executed, no repository finding/flake/error, and no material applicable verification left `NOT_RUN`/`BLOCKED`.
- `1` — current-run repository/test finding or flaky verification outcome exists; source remained stable and no higher-precedence Ascout error occurred.
- `2` — Ascout usage/config/internal/task-execution error prevents a trustworthy normal receipt; a partial diagnostic receipt MAY still be emitted.
- `3` — source tree drifted during the run; caller MUST NOT treat results as stable even if tasks otherwise passed or found failures.
- `4` — stable but materially incomplete verification: no repository finding/internal error, yet applicable verification is `NOT_RUN`/`BLOCKED` or nothing material could execute.

Precedence: `2` internal/usage integrity error > `3` drift > `1` repository finding/flake > `4` incomplete > `0` clean.

This prevents automation from treating omission as a green exit.

## Test-Change Facts

M1 derives only factual diff-level signals:

- test file changed/deleted based on runner/common filename conventions plus discovered test files;
- tracked snapshot file changed/deleted;
- counts/paths.

Skip/disable/assertion weakening analysis is **not required in the first implementation slice**. It may be added only with a detector that can make the claim reliably without a speculative AST subsystem.

## Development Quality Strategy

### Unit tests

- canonical tree/config/fingerprint serializers;
- Git diff hunk parser;
- LCOV parser and unresolved mapping;
- status/exit precedence;
- redaction;
- config validation;
- receipt serialization and agent budget.

### Integration tests

Temporary real Git repositories cover:

- staged + unstaged + untracked combinations;
- tracked deletion/rename;
- tracked snapshot mutation;
- command-surface change warning;
- start/end drift;
- stale/current run lock;
- task timeout/tree termination;
- Vitest affected + full widening fixture;
- Jest related + full widening fixture;
- missing dependency/non-run;
- basic pytest task;
- secret redaction in captured output.

### Contract tests

Schemas under `specs/001-changed-code-verification-receipt/contracts/` become design contracts. Implementation tests validate emitted config/receipt examples against the canonical v1 contract semantics.

### OS matrix

Development CI runs Windows, macOS, Linux across Node 22 and Node 24 where practical. Process-control and path-normalization behavior MUST have native Windows coverage before M1 is considered releasable.

## Benchmark Plan

Keep benchmark logic independent from product correctness tests.

### Selection corpus

Start with 5–6 real JS/TS repositories/commits where a historical fix and regression test provide ground truth. Construct a reverted-fix candidate that the full suite catches. Record:

- full-suite detection;
- native selector detection;
- Ascout selection/widening detection;
- false-PASS;
- cold/warm time.

### Gap corpus

Start with 3–4 real historical fixes. Apply production-code change without its new regression test and compare changed-line exercise against full-run coverage. Record false exercise claims and unresolved mapping explicitly.

### Absolute gates

- cross-tree evidence leakage = 0;
- binding-integrity violations = 0.

No pre-data 98% threshold. Publish every selection miss and use evidence to set M2 hardening criteria.

## Project Structure

### Documentation

```text
specs/001-changed-code-verification-receipt/
├── spec.md
├── YAGNI_REVIEW.md
├── research.md
├── plan.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ascout-config-v1.schema.json
│   └── receipt-v1.schema.json
├── checklists/
│   └── requirements.md
├── tasks.md
└── analysis.md
```

### Source Code

```text
package.json
tsconfig.json
LICENSE
src/
├── cli.ts
├── config.ts
├── discovery.ts
├── git.ts
├── process.ts
├── lock.ts
├── redact.ts
├── check.ts
├── coverage/
│   └── lcov.ts
├── tools/
│   ├── typescript.ts
│   ├── eslint.ts
│   ├── vitest.ts
│   ├── jest.ts
│   └── pytest.ts
└── receipt/
    ├── model.ts
    ├── terminal.ts
    ├── json.ts
    └── agent.ts

tests/
├── unit/
├── integration/
├── contract/
└── fixtures/

benchmarks/
├── README.md
├── manifest.json
└── harness/
```

**Structure Decision**: One npm CLI package. Concrete tool modules, no public/generic adapter SDK. The folder structure reflects real M1 responsibilities and may be collapsed during implementation if files remain trivial; adding layers beyond this tree requires a demonstrated need.

## Complexity Tracking

No constitutional violation is accepted by this plan.

| Potential complexity | Decision | Simpler rule |
|---|---|---|
| Generic plugin/adapter interface | Rejected for M1 | Keep concrete Vitest/Jest/etc. modules; extract only proven common code |
| Persistent DB | Rejected | Run files only |
| Semantic dependency graph | Rejected | Native selectors + widening |
| Full AST test weakening analysis | Rejected | Factual diff signals only |
| Native executable distribution | Deferred | npm package first |
| Untrusted sandbox | Deferred | Trusted local repository boundary |
