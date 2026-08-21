# Implementation Plan: Changed-Code Verification Receipt

**Branch**: `planning/000-ascout-foundation` | **Date**: 2026-08-21 | **Spec**: `specs/001-changed-code-verification-receipt/spec.md`

**Status**: Plan candidate. No implementation is authorized by this document.

## Summary

Build the smallest local CLI that turns an AI coding change into an honest source-bound verification receipt. M1 reuses Git and project-native verification rather than building a semantic index: bind a run to the exact local source state, execute fixed typecheck/lint/test task categories with bounded process control, use native Vitest/Jest related selection plus conservative widening, normalize line coverage, intersect coverage with changed executable lines, expose factual test/snapshot changes, detect source drift, and render one run truth as terminal, JSON, and bounded-agent receipts.

The reference implementation is TypeScript on Node.js >=22. The planned product runtime dependency budget is one reviewed dependency (`cross-spawn`) for Windows command-shim launch behavior; all other M1 mechanics use Node/Git/project-native capabilities unless implementation evidence forces a reviewed plan delta.

## Technical Context

**Language/Version**: TypeScript 6.x; Node.js >=22. Primary development Node 24 LTS; development CI covers Node 22 + 24.

**Primary Dependencies**: Node standard library; Git CLI; planned runtime `cross-spawn` only. Project TypeScript/ESLint/Vitest/Jest/pytest remain external repository tools.

**Storage**: tracked `ascout.config.json`; ignored `.ascout/` lock/run artifacts; no database.

**Testing**: deterministic unit/contract/integration tests using temporary Git repositories and concrete/fake tool fixtures; native Windows/macOS/Linux development CI. Benchmark corpus remains separate from ordinary fixtures.

**Target Platform**: Windows 11, macOS, Linux developer CLI. v0.x assumes the developer's own trusted local Git repository only.

**Project Type**: one npm CLI package with `ascout` bin entry. Native binaries deferred.

**Constraints**:
- no implicit project dependency installation;
- no account/upload/SaaS/model requirement;
- no claim that child processes are offline;
- no silent tracked-source mutation;
- no cross-run evidence reuse;
- no deselected test represented as passed;
- no arbitrary shell-string execution;
- bounded task/runtime artifacts;
- no untrusted-repository promise;
- no DB/daemon/semantic graph/public plugin SDK;
- no user-defined workflow/task dependency graph in config v1.

## Constitution Check

| Gate | Result |
|---|---|
| Evidence before claims | PASS — one run/evidence truth, no proof ladder |
| No green by omission | PASS — explicit task states, selection disclosure, exercise gaps block exit 0 |
| Source-bound truth | PASS — secret-safe repo identity, canonical start/end tree digest, no evidence transfer |
| Trusted local scope / authority | PASS — own trusted repo only, provenance, command-surface warning, no implicit installs |
| Native capability first | PASS — Git + Vitest/Jest + LCOV; no custom impact graph |
| Conservative affected verification | PASS — finite pre-run triggers + one post-run widening pass |
| Minimal core | PASS — one CLI package, one planned runtime dependency, no speculative layers |
| Bounded/read-only/private | PASS — timeout, process-tree cleanup, lock, bounded artifacts, argv/output redaction |
| Provenance/licensing | PASS — pinned workflow provenance, donor code excluded, exact dependency review gate |
| Benchmark-gated growth | PASS — binding/false-PASS/gap/timing metrics measure Ascout itself |

## Architecture: Minimum Concrete Slice

No public or generic adapter hierarchy is defined. M1 has concrete tool modules and extracts shared behavior only after repetition proves it.

```text
CLI parse
  ↓
repository + config discovery
  ↓
run lock
  ↓
source identity START
  ↓
changed scope + command-surface inspection
  ↓
fixed task planning + conservative widening
  ↓
bounded concrete execution
  ↓
test-result + LCOV normalization
  ↓
changed-line exercise intersection
  ↓
test/snapshot change facts
  ↓
source identity END / drift
  ↓
one receipt model
  ├─ terminal
  ├─ JSON
  └─ bounded agent
```

## Trust Boundary

M1 assumes the repository is the user's own trusted local repository. The current diff may nevertheless have changed command/config files Ascout is about to use. Every executed task records provenance and the source path that authorized/defined it when one exists; changed command surfaces are named before execution.

M1 does not add `.ascout/trust.json`, sandboxing, static-only untrusted mode, or automatic untrusted-PR execution. Host-level automatic hooks remain opt-in.

## Source Identity Contract

### Secret-safe repository identity

1. Resolve configured Git origin when present.
2. Never persist/render the raw origin string.
3. Normalize to a credential-free stable host/path identity by stripping URL/scp userinfo, credentials, query parameters, fragments, and equivalent credential-bearing material.
4. If the remote cannot be normalized safely, persist a one-way SHA-256 identifier derived from the raw origin rather than the raw string.
5. Without a remote, derive a `local:` identity from the canonical real repository path and set `portable=false`.

Golden tests include HTTPS credentials, SSH/scp userinfo, query/fragment material, and local-only repositories.

### HEAD metadata

Record HEAD SHA plus detached/shallow flags. A repository with no initial commit is unsupported for M1 `check` and returns a usage/config error rather than invented comparison semantics.

### `tree_digest_v1`

Canonical SHA-256 input:

1. format marker `ascout-tree-v1`;
2. HEAD SHA;
3. sorted Git index entries: mode + object id + stage + repo-relative path;
4. sorted unstaged tracked paths: state marker + **current worktree type/mode** + SHA-256 of current bytes/symlink target, or deletion marker;
5. sorted **all non-gitignored untracked paths except `.ascout/`**: type/mode + SHA-256 of bytes/symlink target.

There is no heuristic “relevant untracked” exclusion list in M1. If a tool writes a non-gitignored untracked file outside `.ascout/`, the conservative result is tree drift. Tracked files are never excluded merely because a tool may rewrite them.

Byte framing is length-prefixed and has golden-vector tests.

### Drift

Compute the same digest before and after verification.

- both computed and equal → `stability=stable`;
- both computed and different → `stability=tree_drifted`;
- an integrity error prevents comparison → `stability=unknown` and exit semantics are dominated by internal error.

Task execution errors do not themselves change source stability if start/end comparison remains valid.

### Configuration identity

`config_digest_v1` hashes the exact tracked `ascout.config.json` bytes (or `NO_CONFIG`) plus effective schema version. Repo command/config sources remain source-tree inputs and are recorded per task.

## Changed Scope

Use Git as the changed-state engine.

- staged + unstaged tracked change relative to HEAD;
- zero-context diff for new-line ranges;
- all non-gitignored untracked files except `.ascout/` participate in source identity and changed-file accounting;
- untracked text files can be treated as wholly changed for line ranges;
- binary/non-line files are file-level only;
- rename metadata retained when available.

Default comparison is current local state vs HEAD. Committed `--base` range semantics are deferred.

## Configuration Contract

Tracked file: `ascout.config.json`.

Config v1 is deliberately **not** a task-runner/workflow DSL. It can only override fixed M1 task categories:

```json
{
  "version": 1,
  "tasks": {
    "typecheck": {},
    "lint": {},
    "test": {},
    "pytestBasic": {}
  },
  "timeouts": {},
  "budgetMs": null,
  "redactEnv": []
}
```

For each fixed category config may set:

- `enabled`;
- required `disabledReason` when disabled;
- argv-array `command` override;
- `timeoutMs`.

Global config may set default timeout/termination grace, overall budget, and extra redaction env names.

M1 config cannot define arbitrary task names, custom prerequisite graphs, arbitrary workspace orchestration, expressions, hooks, or workflow steps. Internal prerequisite ordering among fixed product tasks is Ascout implementation logic and remains visible through task states.

`ascout init` creates only this minimal tracked policy and ensures `.ascout/` is ignored; it never installs project dependencies or host hooks implicitly.

## Discovery and Concrete Tasks

### Package manager

Evidence order:

1. valid root `packageManager` declaration;
2. unambiguous lockfile;
3. otherwise explicit task command override or unsupported/ambiguous result.

Conflicting signals are an honest config/discovery error.

### Typecheck

Prefer explicit fixed-task command override; else existing project `typecheck` script; direct project-local `tsc` only when project config/install makes invocation unambiguous.

### Lint

Prefer explicit override; else project-local ESLint/config. Lint changed supported files directly when safely possible; if only project script is discoverable, run it and disclose broader scope.

### JavaScript test task

Resolve one supported project test integration per scope (Vitest or Jest) through explicit override/discovery. Ambiguous competing runners fail closed rather than both becoming an implicit workflow.

- Vitest: use project-local native related/changed semantics, force non-watch, request machine-readable results and line coverage into `.ascout/`.
- Jest: use project-local `--findRelatedTests`, JSON results, and line coverage into `.ascout/`.

### pytest basic

Only execute an explicit or clearly discoverable configured pytest task. Pass/fail/error only; no Python affected selection, environment chooser, testmon, or Python exercise-coverage claim.

## Task Result Contract

A semantic task can exist before a runnable command/tool is resolved. Therefore non-executed states MUST NOT fabricate command details.

- attempted/executed `PASS | FAIL | FLAKY | ERROR` process tasks have resolved tool identity/argv;
- `BLOCKED | NOT_APPLICABLE | NOT_RUN` may have empty argv and null tool identity when resolution never occurred;
- every executed task records `authorized_by` and source path when one exists;
- persisted/rendered argv is redacted; raw argv exists only transiently for launch.

Deselected tests are **SelectionAccount data**, not task-level `NOT_RUN`. An affected test task can be complete while disclosing deselected tests if selection/widening policy was valid.

## Conservative Widening

Before test execution, widen to package/workspace full scope on declared high-risk surfaces such as:

- lockfile/dependency/package-manager config;
- compiler/path-alias config;
- test-runner config;
- root workspace config;
- non-source executable/data/template/config input for which the native selector has no safe relation.

After a narrowed run, if changed production code has no usable coverage relationship, perform at most one second pass widened to package/workspace full configured test scope. No recursion.

If safe package impact of a workspace-root change cannot be narrowed without a graph, widen to the whole basic workspace scope.

## Selection Accounting

Receipt records:

- selection mode;
- selected/deselected/total counts where runner can establish them;
- null counts plus explicit limitation where it cannot;
- widening triggers;
- at most two passes.

Deselection alone does not make a run incomplete. Unsafe/unexplainable selection must widen or become incomplete.

## Coverage and Changed-Code Exercise

Use line-level LCOV generated into the current `.ascout/runs/<run-id>/raw/<task-id>/coverage/` path.

Normalize only:

```text
repo-relative path
line
execution count
mapping state
```

A changed executable line is considered in the exercise universe when the coverage provider can resolve it as executable/instrumentable. Configure supported providers to include changed production files where possible so untouched executable lines can appear with count zero.

States:

- `EXERCISED`: resolved count > 0;
- `NOT_EXERCISED`: resolved count = 0;
- `UNRESOLVED`: executable relationship/source mapping cannot be established reliably.

Coverage never proves correctness.

After the permitted widening pass, **any remaining `NOT_EXERCISED` or `UNRESOLVED` changed executable line is a material verification gap and prevents exit `0`.**

## Flake / Reproduction Semantics

- successful task: no retry;
- deterministic compiler/lint failure: no automatic retry experiment required;
- failing test: if safe exact targeted selection exists, run at most two additional observations;
- no safe targeted rerun: keep one observation and `reproduced=unknown`;
- consistent repeated failures: `reproduced=true`;
- contradictory pass/fail observations: `FLAKY`, stable-failure `reproduced=false`;
- rerun execution error before a valid second observation: `reproduced=unknown`.

Always preserve `{runs, failures}`.

## Process Control

Use `cross-spawn` without `shell: true` for executable/argv launch. Project scripts run through detected package-manager executable + argv.

One wrapper owns bounded stdout/stderr, timeout, termination, and normalized process result.

- POSIX: dedicated process group, graceful then forceful group termination.
- Windows: platform-native process-tree termination; parent-PID kill is not assumed sufficient.
- termination failure: Ascout `ERROR`, never repository `FAIL`.

## Run Lock, Artifacts, Retention

```text
.ascout/
├── run.lock
└── runs/<run-id>/
    ├── manifest.json
    ├── receipt.json
    └── raw/<task-id>/
```

Acquire lock atomically. Store PID/start/repository identity. Replace only a verifiably stale dead-owner lock; otherwise refuse concurrent run.

Default retention: 20 most recent completed runs, active run never removed. Captured streams are bounded and truncation explicit.

## Redaction

Before persistence or agent rendering, redact exact values of recognized secret-bearing environment variables plus configured `redactEnv` names from:

- stdout/stderr;
- persisted/rendered argv;
- other rendered evidence fields where exact matching applies.

Ignore empty/very-short values that would destroy output utility. Redaction is best-effort, not a universal secret detector. Raw argv is not persisted.

Repository identity independently strips raw remote credentials/userinfo/query/fragment before rendering.

## Receipt Contract

One internal model feeds all formats. Required domains:

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

No proof ladder. Findings carry current-run evidence references, location, severity when safely normalized, observations, `in_changed_lines`, `introduced_by_change` (M1 default unknown), reproduction/determinism fields, and optional weak `fingerprint_v1`.

### Output surfaces

- Terminal: concise identity/task/selection/exercise/test-change/finding/stability/completeness receipt.
- JSON: full v1 contract; no unbounded raw logs inline.
- Agent: same truth, default hard maximum 16 KiB UTF-8; material errors/findings/gaps first, explicit omitted-detail totals, never omit identity/status semantics.

## Completeness and Exit Semantics

`complete` requires:

1. at least one material applicable verification task executed;
2. every applicable planned semantic task is executed to an outcome or legitimately `NOT_APPLICABLE`;
3. no task remains `NOT_RUN`/`BLOCKED`;
4. selection/widening policy is satisfied;
5. no changed executable line remains `NOT_EXERCISED` or `UNRESOLVED` after permitted widening.

`materially_incomplete` applies when a known applicable task is `NOT_RUN`/`BLOCKED`, nothing material executes, selection cannot be justified, or an exercise gap remains.

`unknown_due_to_error` applies when an integrity/internal error prevents completeness from being established.

Exit contract:

- `0` — stable + complete + no finding/flake/error.
- `1` — current-run repository/test finding or flake; no higher-precedence condition.
- `2` — usage/config/internal/task-execution integrity error prevents trustworthy normal result.
- `3` — tree drift; no higher-precedence integrity error.
- `4` — stable but materially incomplete/gapped; no finding/internal error.

Precedence: `2 > 3 > 1 > 4 > 0`.

A run with all selected tests passing but any remaining material exercise gap is therefore exit `4`, never `0`.

## Test-Change Facts

First slice reports only factual Git-derived:

- test file changed/deleted;
- tracked snapshot changed/deleted.

Semantic test weakening/AST assertion analysis is not required.

## Development Quality Strategy

### Unit/contract tests

Cover tree/config/fingerprint serializers, secret-safe remote normalization, Git diff parsing, LCOV parsing, status/exit/completeness, redaction including argv, config/receipt schemas, and agent budget.

### Integration tests

Temporary real Git repositories cover staged/unstaged/untracked state, mode changes, credentialed origins, tracked/untracked drift, command-surface warning, lock behavior, timeout/process-tree cleanup, Vitest/Jest selection+widening+coverage, missing tools, basic pytest, and redaction.

### OS matrix

Development CI covers Windows/macOS/Linux and supported Node LTS lines. Native Windows process cleanup is a release gate.

## Benchmark Plan

### Selection corpus

5–6 reviewed JS/TS historical fix+regression-test cases. Compare full suite, plain project test command, native related selector, and Ascout. Measure selection recall, false-PASS, and cold/warm time.

### Gap corpus

3–4 reviewed historical production fixes with the new regression-test change withheld. Compare Ascout changed-line exercise state against independently established full-run coverage ground truth. Measure false exercise claims and unresolved mapping.

### Absolute integrity gates

- cross-tree evidence leakage = 0;
- binding-integrity violations = 0.

No invented pre-data 98% threshold. Publish every miss.

## Project Structure

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
├── coverage/lcov.ts
├── tools/{typescript,eslint,vitest,jest,pytest}.ts
└── receipt/{model,terminal,json,agent}.ts

tests/{unit,integration,contract,fixtures}/
benchmarks/{README.md,manifest.json,harness/}
```

This is an upper bound; adjacent modules SHOULD collapse when trivial.

## Complexity Tracking

| Potential complexity | Decision | Simpler rule |
|---|---|---|
| Arbitrary config tasks/prerequisite graph | Rejected | Fixed semantic task categories + internal ordering |
| Generic adapter/plugin interface | Rejected | Concrete integrations only |
| Persistent DB | Rejected | Run files only |
| Semantic dependency graph | Rejected | Native selectors + widening |
| Recursive widening | Rejected | One bounded second pass |
| AST test weakening analyzer | Rejected | Factual Git signals only |
| Native binary distribution | Deferred | npm first |
| Untrusted sandbox | Deferred | trusted-local boundary |

## Stop Conditions

Implementation returns to plan review if it requires:

- a second product runtime dependency beyond reviewed `cross-spawn`;
- a database/daemon;
- generic plugin SDK;
- semantic dependency graph/index;
- arbitrary config-defined tasks/workflow edges;
- automatic untrusted-repository execution;
- shell-string repo command execution;
- recursive widening;
- any exit/report behavior that can hide material task or exercise gaps behind success.
