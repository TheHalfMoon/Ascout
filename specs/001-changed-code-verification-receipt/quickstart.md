# 001 — Planned M1 Quickstart

**Status:** Design example only. Product implementation is not authorized or present.

## Prerequisites

- Your own trusted local Git repository.
- Node.js 22 or 24 LTS for the first distribution target.
- Project dependencies already installed explicitly by you.
- Supported JS/TS project for first-class changed-code exercise reporting (Vitest or Jest where configured).

Ascout never installs project dependencies implicitly.

## 1. Initialize minimal policy

```bash
ascout init
```

Planned effect:

- create minimal tracked `ascout.config.json` if absent;
- config only overrides fixed M1 task categories (`typecheck`, `lint`, `test`, `pytestBasic`);
- ensure `.ascout/` is ignored;
- do not install project packages;
- do not enable host-level automatic hooks without explicit opt-in.

Config v1 is not a workflow/task graph language.

## 2. Inspect discovery without executing verification

```bash
ascout doctor
```

Planned output explains repository/source state, detected package manager/basic workspace scope, fixed task capabilities, command provenance, missing tools/config, affected-selection/coverage capability, and unsupported M1 traits.

`doctor` is a trust-building command: limitations are output.

## 3. Let the coding agent change code

Example local state:

```text
src/auth/session.ts           modified
src/billing/proration.ts      modified
tests/auth/session.test.ts    modified
```

No commit is required for the default interactive check.

All non-gitignored untracked files except `.ascout/` participate in M1 source identity; Ascout does not maintain a heuristic hidden list of "relevant" untracked source.

## 4. Run the verification receipt

```bash
ascout check
```

Illustrative receipt when selected tests pass but gaps remain:

```text
ASCOUT  run 01...
SOURCE  repo=github.com/example/repo  HEAD=abc123  tree=4f8...
SCOPE   working tree + staged + all non-gitignored untracked vs HEAD

TASKS
TYPECHECK     PASS
LINT          PASS
UNIT          PASS        selected=23  deselected=340

CHANGED       3 files / 86 executable lines
EXERCISED     61 changed lines
NOT EXERCISED 19 changed lines
UNRESOLVED     6 changed lines

GAPS
src/billing/proration.ts:44-61   NOT EXERCISED
src/auth/session.ts:88-93        UNRESOLVED (coverage mapping)

TEST CHANGES
M tests/auth/session.test.ts

SELECTION native_related; widened=false
TREE      STABLE
RESULT    materially incomplete: exercise gaps remain
EXIT      4
```

The exact visual layout may evolve; these semantics are contractual.

**Important:** all selected tests passing does not make this run green while material changed executable lines remain unexercised or unresolved.

## 5. Exit semantics

```text
0 = stable + materially complete + no finding/flake/error
1 = repository/test finding or flaky outcome
2 = Ascout usage/config/internal/task-execution integrity error
3 = source tree drifted (unless a higher-precedence integrity error exists)
4 = stable but materially incomplete/gapped verification
```

Exit `0` requires at least one material verification task to execute and no applicable task or changed executable exercise gap to remain incomplete.

Valid affected selection may still disclose deselected tests; deselection is SelectionAccount data, not task-level `NOT_RUN`. Unsafe selection must widen or become incomplete.

## 6. Machine receipt

```bash
ascout check --format json
```

JSON conforms to receipt v1 and embeds no unbounded raw logs. Evidence artifacts remain under `.ascout/runs/<run-id>/`.

Non-executed tasks do not fabricate argv/tool identity just to satisfy the schema.

## 7. Agent receipt

```bash
ascout check --format agent
```

Agent output uses the same run truth, stays within the default 16 KiB UTF-8 budget, prioritizes errors/findings/exercise gaps, and preserves omitted-detail totals.

## 8. Repository identity and secrets

A configured remote such as a credential-bearing HTTPS URL or `user@host:path` SSH/scp form is never persisted raw. Receipt identity strips credential/userinfo/query/fragment material or uses a one-way identifier if safe normalization fails.

Likewise, persisted/rendered command argv and captured output redact exact recognized secret-bearing environment values. Raw argv is transient launch input only.

## 9. Changed command surface

If the change modifies `package.json` scripts or relevant Ascout/compiler/lint/test configuration that defines a command Ascout is about to run, Ascout warns **before** launch and names the changed authority source.

v0.x still assumes the developer's own trusted local repository; this is not arbitrary untrusted-PR sandboxing.

## 10. Missing dependency/config

Example:

```text
UNIT  NOT_RUN(tool_missing)  Project Vitest is not installed.
```

The task may have empty persisted argv/null tool identity if a runnable command was never safely resolved. Ascout may print an install suggestion but never executes installation implicitly.

## 11. Drift during the run

If tracked source or any included non-gitignored untracked file outside `.ascout/` changes during verification:

```text
TREE  DRIFTED
EXIT  3
```

Task observations may remain for debugging, but the run is not stable evidence for an unchanged source tree.

If an integrity error prevents the end digest from being computed, stability is `unknown` and exit `2` dominates.

## 12. Flaky/reproduction semantics

One failure with no safe targeted rerun:

```text
UNIT  FAIL   runs=1 failures=1 reproduced=unknown
```

Contradictory bounded observations:

```text
UNIT  FLAKY  runs=3 failures=1 reproduced=false
```

A single observation is never mislabeled as reproduced or as disproven reproduction.

## 13. What M1 deliberately does not do

Do not expect the first feature to:

- generate/fix tests or code;
- accept arbitrary custom task/workflow graphs in config;
- run browser/DAST/fuzz/load/security suites;
- inspect untrusted PR branches safely;
- provide a semantic repository graph;
- require an AI model;
- upload the repository to an Ascout cloud service;
- prove that execution coverage means behavior is correct.

The first release proves what it actually verified and refuses green when material changed executable code remains unchecked.
