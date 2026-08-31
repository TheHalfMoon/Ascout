# Implementation Plan: Changed-Code Verification Receipt

**Branch**: `planning/000-ascout-foundation` | **Date**: 2026-08-21  
**Spec**: `specs/001-changed-code-verification-receipt/spec.md`  
**Status**: M1 IMPLEMENTED / QUALIFIED / FOUNDER_RATIFIED — governance reconciled 2026-08-31

> Governance note: this plan was originally a pre-implementation candidate and did not itself authorize product mutation. M1 was subsequently implemented and qualified, but the repository did not retain a durable pre-T001 implementation-authorization artifact. Current founder ratification and the forward-only reconciliation are recorded in Issue #93 and `docs/founding/M1_GOVERNANCE_RECONCILIATION_2026-08-31.md`; no retroactive authorization event is claimed. The architecture and constraints below remain the normative founding M1 design contract.

## Summary

Build the smallest local CLI that turns an AI coding change into an honest source-bound verification receipt. M1 reuses Git and project-native verification rather than building a semantic index: bind a run to exact local source state, enforce a narrow command-admission boundary, execute fixed `typecheck`/`lint`/`test`/`pytestBasic` categories with bounded process control, use native Vitest/Jest related selection plus conservative widening, normalize line coverage, intersect it with changed executable lines, expose factual test/snapshot changes, detect drift, and render one semantically validated truth model as terminal/JSON/bounded-agent receipts.

Reference implementation: TypeScript 6.x on Node.js >=22. Planned product runtime dependency budget: one reviewed `cross-spawn` dependency; all other M1 mechanics use Node/Git/project-native capabilities unless evidence forces a reviewed plan delta.

## Technical Context

- **Runtime**: Node 22/24 LTS; Node 24 primary development reference.
- **Language**: TypeScript 6.x.
- **Storage**: tracked `ascout.config.json`; ignored `.ascout/` runtime evidence/lock; no DB.
- **Project type**: one npm CLI package exposing `ascout`.
- **Supported platform**: Windows 11, macOS, Linux.
- **Repository trust**: developer's own trusted local Git repository only.
- **First-class M1 ecosystem**: JS/TS, npm/pnpm/yarn, basic workspaces, TypeScript/ESLint, Vitest or Jest; configured pytest basic pass/fail/error only.

## Constitution Check

| Gate | Result |
|---|---|
| Evidence before claims | PASS — current-run evidence collection + resolvable evidence refs; no confidence ladder |
| No green by omission | PASS — task omissions + exercise gaps block clean success |
| Source-bound truth | PASS — privacy-safe hashed repository identity, canonical start/end digest, no evidence transfer |
| Explicit authority | PASS — changed effective command surfaces are refused by default and require per-run human admission |
| Native capability first | PASS — Git/Vitest/Jest/LCOV, no custom impact graph |
| Conservative affected verification | PASS — finite pre-run triggers + one bounded post-run widening |
| Minimal core | PASS — no DB/daemon/server/Rust/plugin SDK/AI/cloud; one planned runtime dependency |
| Bounded/read-only/private | PASS — timeouts/tree-kill/lock/retention; origin/path/output/argv privacy |
| Provenance/licensing | PASS — pinned Spec Kit provenance; exact dependency review gate |
| Benchmark-gated growth | PASS — Ascout-specific false-PASS/gap/binding/timing metrics |

## Minimum Architecture

```text
CLI parse
  ↓
repo/config discovery
  ↓
run lock
  ↓
source identity START
  ↓
changed scope + effective command-surface inspection
  ↓
fixed task planning + admission decision + widening
  ↓
bounded concrete execution
  ↓
test result + LCOV normalization
  ↓
changed-line exercise intersection
  ↓
test/snapshot facts
  ↓
source identity END / drift
  ↓
one receipt model + semantic invariant validation
  ├─ terminal
  ├─ JSON
  └─ bounded agent
```

No generic adapter/plugin hierarchy is defined.

## Trust and Command Admission

M1 trusts the repository as the developer's own local repository, but **does not automatically trust command/config surfaces the AI just changed**.

For each planned task, compute its effective authority/config sources, for example:

- tracked `ascout.config.json` command override;
- `package.json` script used to launch it;
- effective TypeScript configuration/extends sources loaded by `tsc` where discoverable;
- ESLint config selected for the task;
- Vitest/Jest config selected for the JS test task;
- effective pytest configuration used by `pytestBasic`, including applicable `pytest.ini`, `pyproject.toml`, `setup.cfg`, or `tox.ini` when that source is actually loaded.

If the current changed scope touches an effective command/config source that would be evaluated/loaded for a task:

1. default ordinary `ascout check` does **not** launch that task;
2. task becomes `NOT_RUN(command_surface_changed)`;
3. receipt records the changed authority paths and `execution_admission=refused_changed_surface`;
4. the overall run is materially incomplete (exit `4` absent higher-precedence finding/error/drift);
5. terminal/agent output shows an explicit command to rerun only after human review, using `--allow-changed-command-surface`.

A human may explicitly use:

```text
ascout check --allow-changed-command-surface
```

This is a **per-invocation** admission only. It is not stored in `ascout.config.json`, not remembered between runs, and agent instructions/hooks MUST NOT add it automatically. When used, each affected task records `execution_admission=explicit_changed_surface_override` plus changed authority paths.

Admission invariants are strict:

- `command_surface_changed=false` ⇒ `execution_admission=normal` and no changed authority paths;
- `command_surface_changed=true` ⇒ at least one changed authority path and admission is either `refused_changed_surface` or `explicit_changed_surface_override`; it can never remain `normal`.

This is the smallest defensible admission boundary for M1; no trust database, VM/container sandbox, or untrusted mode is added.

## Source Identity

### Repository identity

M1 persists only opaque schema-enforceable repository IDs:

- remote present: `repository_id = remote:<sha256(normalized-credential-free-remote-identity)>`, `portable=true`;
- no remote: `repository_id = local:<sha256(canonical-real-repository-path)>`, `portable=false`.

Raw origins, URL/scp userinfo/credentials/query/fragment material, and raw absolute local paths are never persisted/rendered.

### HEAD

Record HEAD SHA plus detached/shallow flags. No-initial-commit repository is unsupported for M1 `check` and returns usage/config error.

### `tree_digest_v1`

SHA-256 over length-prefixed canonical fields:

1. marker `ascout-tree-v1`;
2. HEAD SHA;
3. sorted index entries: mode + object id + stage + path;
4. sorted unstaged tracked paths: state + current worktree type/mode + content/symlink digest or deletion marker;
5. sorted **all non-gitignored untracked paths except `.ascout/`**: type/mode + content/symlink digest.

No heuristic “relevant untracked” omission list. Tracked files are never excluded merely because a tool may rewrite them.

Start/end:

- same valid digest → `stable`;
- different valid digest → `tree_drifted`;
- integrity failure prevents comparison → `unknown`, exit `2` dominates.

## Changed Scope

Git is the changed-state engine:

- staged + unstaged tracked changes vs HEAD;
- zero-context diff for new-line ranges;
- all non-gitignored untracked files except `.ascout/` included;
- untracked text files may be treated wholly changed for line ranges;
- binary/non-line inputs are file-level only;
- rename/type metadata retained.

Rename representation is strict: `change_kind=renamed` requires `previous_path`; other change kinds do not carry `previous_path`.

Committed `--base` comparison is deferred.

## Persisted Path Contract

Receipt paths are canonical data, not host-path strings.

- repository-bearing paths (`changedFile.path`, rename `previous_path`, package scope, task `source_path`, `changed_authority_paths`, exercise paths, test-change paths, finding paths) are slash-separated and relative to the repository root;
- `artifact.relative_run_path` uses the same canonical relative shape but is relative to `.ascout/runs/<run-id>/`;
- raw absolute paths may exist only transiently while Git/tools are resolved and MUST NOT be persisted/rendered.

Host/tool paths may be resolved transiently into a repository-relative or run-relative **receipt candidate**. Once that candidate string exists, validation is fail-closed on the candidate's **original spelling before any lossy normalization, separator collapse, trailing-separator removal, or dot-segment resolution**. JSON Schema rejects noncanonical raw spellings, and the semantic validator MUST apply the same raw-form rejection before any operation that could erase evidence of invalid syntax. It MUST NOT repair, collapse, or rewrite an invalid receipt candidate into a valid-looking path.

The original candidate is rejected if it is POSIX-absolute, Windows drive-absolute, UNC, URI-absolute, contains a backslash, contains `.` / `..` path segments, contains an empty path segment such as `src//file.ts`, or has a trailing separator such as `src/`. Only after raw-form rejection passes may internal non-lossy comparison/containment logic operate on the already-canonical candidate. Namespace containment/canonicality is then verified; any candidate that would escape its declared repository/run namespace is rejected rather than rewritten.

This is one receipt invariant, not a virtual filesystem or path-policy subsystem.

## Config v1

Tracked non-executable JSON. Fixed task override keys only:

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

Per task: enable/disable + required disable reason, argv-array override, timeout. Globals: default timeout/termination grace, overall budget, extra env redaction names.

No arbitrary task names, prerequisites, workflow edges, workspace orchestration expressions, hooks, or persistent command-surface trust grant. Internal task ordering is product logic.

## Fixed Task Discovery

### Package manager

1. valid root `packageManager` declaration;
2. otherwise unambiguous lockfile;
3. otherwise explicit task command override or honest ambiguity/unsupported state.

### Typecheck

Explicit override → existing `typecheck` script → unambiguous local `tsc` only.

### Lint

Explicit override → local ESLint/config. Prefer changed supported files when safe; project script is allowed with scope disclosed.

### JS test

Resolve one supported runner per scope. Ambiguous Vitest/Jest discovery fails closed rather than implicitly creating two workflows.

- Vitest: project-local native related/changed behavior, non-watch, JSON results, LCOV into `.ascout/`.
- Jest: project-local `--findRelatedTests`, JSON results, LCOV into `.ascout/`.

### pytest basic

Explicit/clearly discoverable pytest only; no Python environment chooser, affected selection, testmon, or exercise-coverage claim. Effective pytest config used by the invocation participates in command-surface admission.

## Task Contract

Fixed task types use the same canonical identifiers in config v1, receipt v1, data model, and implementation:

```text
typecheck
lint
test
pytestBasic
```

Task categories are independent by default. `BLOCKED` is used only where a real validity dependency exists; typecheck/lint failure does not automatically block independent tests.

Receipt task records include:

- task id/type;
- provenance/source path;
- redacted persisted argv and `argv_redacted`;
- tool/version when resolved;
- status/reasons/timing/observations/cache/evidence/artifacts;
- `command_surface_changed`;
- `changed_authority_paths[]`;
- `execution_admission: normal | refused_changed_surface | explicit_changed_surface_override`.

`NOT_RUN`, `BLOCKED`, and `ERROR` MUST carry non-empty `reason_code` and `reason_text`. Non-executed tasks may have empty argv/null tool identity if resolution never occurred. Raw argv is transient launch input only.

Deselected tests are SelectionAccount data, not task-level `NOT_RUN`.

## Conservative Widening and Selection

Pre-run widening to package/workspace full scope on dependency/package-manager/compiler/path/test/workspace/non-source relation-risk surfaces. After narrowed test execution, if changed production code has no usable coverage relationship, perform at most **one** second pass widened to package/workspace full configured test scope. No recursion.

Selection receipt contains strict repository/package scope, mode, known/null selected/deselected/total counts, limitations, widen triggers, and at most two pass records. Valid deselection alone does not make the task incomplete; unsafe/unexplainable selection must widen or become incomplete.

## Coverage and Changed-Code Exercise

Normalize line-level LCOV into:

```text
repo-relative path
line
execution count
mapping state
```

For changed executable/instrumentable lines:

- `EXERCISED`: resolved integer execution count > 0;
- `NOT_EXERCISED`: resolved execution count = 0;
- `UNRESOLVED`: execution count is null and a non-empty reason explains why executable/source relation cannot be established reliably.

Coverage is observed execution, not correctness.

After permitted widening, **any remaining material changed executable `NOT_EXERCISED` or `UNRESOLVED` line prevents exit `0`** and makes the stable run exit `4`.

## Flake / Reproduction

- success: no retry;
- deterministic compiler/lint failure: no retry experiment required;
- failing test with safe exact selector: at most two additional observations;
- no safe targeted rerun or rerun error before valid second observation: `reproduced=unknown`;
- repeated consistent failure: true;
- contradictory valid pass/fail observations: `FLAKY`, stable-failure reproduction false.

Preserve `{runs, failures}`.

## Process Control

Use `cross-spawn` without arbitrary `shell: true`. One wrapper owns bounded stdout/stderr, timeout, tree termination, normalized result.

- POSIX: dedicated process group; graceful then forceful group termination.
- Windows: native process-tree termination; killing parent PID alone is insufficient.
- termination failure → `ERROR`, never repository `FAIL`.

## Lock / Artifacts / Privacy

```text
.ascout/
├── run.lock
└── runs/<run-id>/
    ├── manifest.json
    ├── receipt.json
    └── raw/<task-id>/
```

Atomic lock; verified dead-owner recovery only; otherwise refuse concurrency.

Default retention: 20 completed runs, never active run. Captured streams bounded/truncation explicit.

Before persistence/agent rendering, exact recognized/user-specified secret env values are redacted from stdout/stderr, argv, and matching rendered evidence. Raw origin, raw absolute local path, noncanonical/escaping persisted path forms, and raw secret-bearing argv are never persisted. Redaction is best-effort, not universal secret detection.

## Receipt v1

One internal model feeds terminal/JSON/agent.

Top-level domains:

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
evidence
artifacts
stability
summary
```

### Evidence collection

Each `evidence[]` entry contains current-run evidence ID, run ID, task ID, sequence, kind, SHA-256 digest, optional artifact link, and redaction/truncation flags.

Task and finding `evidence_ids` are references into this collection; they are never free-floating claims.

### Semantic receipt validator

JSON Schema validates field shapes. Before receipt emission, one Ascout-owned pure semantic validator additionally verifies:

- every persisted path candidate is first checked **as originally spelled** and rejected before any lossy normalization/collapse if it is absolute/drive/UNC/URI, contains backslashes, dot segments, duplicate separators, or a trailing separator; the validator never repairs an invalid spelling;
- after raw-form rejection passes, every persisted path is verified canonical and contained in its declared repository/run namespace;
- evidence IDs, task IDs, artifact IDs, and references are unique/resolvable;
- evidence `run_id` equals receipt `run.run_id`;
- evidence task links resolve to current receipt tasks;
- task/finding evidence refs resolve to current-run evidence;
- non-null evidence artifact refs resolve;
- source start/end and `stability` agree;
- task status/reason/admission invariants agree;
- exercise records and aggregate counts agree;
- task-status/finding summary counts agree;
- completeness and exit-code precedence agree with underlying state.

Any internal/future receipt acceptance path reuses this same validator. This is a pure invariant function, not a service/database/subsystem.

Receipt contract also fixes task types, strict repository/package selection scope, at most two selection passes, changed-file rename identity, exercise state/count/reason invariants, path containment, and admission fields. No proof ladder. Weak fingerprint remains optional current-run matching aid only.

Agent output default max: 16 KiB UTF-8, prioritizing errors/findings/admission refusals/exercise gaps, preserving identity/status/totals.

## Completeness / Exit

`complete` requires:

1. at least one material applicable verification task executed;
2. every applicable planned task executed to an outcome or legitimately `NOT_APPLICABLE`;
3. no applicable `NOT_RUN`/`BLOCKED`, including admission-refused tasks;
4. selection/widening policy satisfied;
5. no remaining changed executable `NOT_EXERCISED`/`UNRESOLVED` lines.

`materially_incomplete`: applicable omission/block/admission refusal, nothing material executed, unsafe selection, or remaining exercise gap.

`unknown_due_to_error`: integrity/internal error prevents completeness determination.

Exit codes:

```text
0 stable + complete + no finding/flake/error
1 repository/test finding or flake
2 usage/config/internal/task-execution integrity error
3 tree drift (absent higher-precedence integrity error)
4 stable materially incomplete/gapped
```

Precedence: `2 > 3 > 1 > 4 > 0`.

## Test-Change Facts

Git-derived changed/deleted test files and tracked snapshots only. No semantic weakening/AST assertion system in first slice.

## Development Quality

Required tests cover:

- config/receipt contracts, including canonical task identifier parity;
- evidence collection/reference integrity and semantic receipt validation;
- privacy-safe `remote:<sha256>` / `local:<sha256>` repository IDs;
- raw persisted-path spelling rejection **before any lossy normalization**, plus canonical path containment across repo/run path fields, including POSIX absolute, Windows drive/UNC, URI, backslash, dot-segment, duplicate-separator (`src//file.ts`), and trailing-separator (`src/`) cases;
- rename `previous_path` invariant;
- task reason invariants for `NOT_RUN`/`BLOCKED`/`ERROR`;
- exercise state/count/reason invariants;
- tree digest including mode/untracked state;
- changed-command default refusal + explicit per-run admission + agent non-escalation, including `pytestBasic` authority/config fixtures;
- Git diff/LCOV/exercise states;
- selection/widening;
- task/error/completeness/exit precedence;
- output/argv redaction;
- lock/timeout/tree cleanup;
- Vitest/Jest integration;
- drift/flake;
- cross-format consistency.

Development CI: Windows/macOS/Linux, Node 22/24. Native Windows process cleanup is a release gate.

## Benchmark

Selection corpus: 5–6 reviewed real JS/TS historical fix + regression-test cases. Compare full suite, plain project test, native related selector, Ascout.

Gap corpus: 3–4 historical production fixes with regression-test change withheld; compare Ascout exercise state to independent full-run coverage ground truth.

Measure false-PASS, selection recall, gap accuracy, unresolved rate, cold/warm time, drift/determinism/flake. Absolute gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

The benchmark harness explicitly asserts that a stable run with remaining material `NOT_EXERCISED` or `UNRESOLVED` lines returns exit `4` absent a higher-precedence condition.

No invented pre-data 98% threshold.

## Structure / Complexity

One npm CLI package; concrete modules only. Upper-bound source tree may collapse during implementation.

Rejected M1 complexity:

- arbitrary config workflow/prerequisite graph;
- generic plugin interface;
- DB/daemon;
- semantic dependency index;
- recursive widening;
- AST weakening analyzer;
- schema-generation/type-sharing subsystem solely for contracts;
- path/virtual-filesystem policy subsystem;
- native binary distribution;
- untrusted sandbox.

## Stop Conditions

Return to planning if implementation requires a second product runtime dependency, DB/daemon, generic plugin SDK, semantic graph, arbitrary config workflow, automatic untrusted execution, shell-string repo commands, recursive widening, persistent changed-surface trust grants, automatic agent admission escalation, a path-policy/virtual-filesystem subsystem, or any exit/report behavior hiding material task/exercise/admission/evidence gaps behind success.