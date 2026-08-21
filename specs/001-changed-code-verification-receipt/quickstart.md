# 001 — Planned M1 Quickstart

**Status:** Design example only. The commands below describe the intended M1 user contract; product implementation is not yet authorized or present.

## Prerequisites

- Your own trusted local Git repository.
- Node.js 22 or 24 LTS for the first M1 distribution target.
- Project dependencies already installed by you.
- A supported JS/TS project for first-class changed-code exercise reporting (Vitest or Jest where configured).

Ascout does not silently install project dependencies.

## 1. Initialize Ascout policy

```bash
ascout init
```

Expected effect, after implementation:

- create a minimal tracked `ascout.config.json` if it does not exist;
- ensure `.ascout/` run artifacts are ignored by Git;
- do not alter product source code;
- do not install project packages;
- do not enable host-level automatic hooks without explicit opt-in.

## 2. Inspect discovery before executing checks

```bash
ascout doctor
```

Expected output explains:

- repository/source state;
- detected package manager/workspace scope;
- discovered typecheck/lint/test capabilities;
- command provenance;
- missing tools/config;
- affected-selection capability;
- coverage capability;
- unsupported M1 characteristics.

`doctor` is a trust-building command: limitations are part of the result.

## 3. Let the coding agent change code

Example local state:

```text
src/auth/session.ts           modified
src/billing/proration.ts      modified
tests/auth/session.test.ts    modified
```

No commit is required for the default interactive check.

## 4. Run the verification receipt

```bash
ascout check
```

Illustrative terminal receipt:

```text
ASCOUT  run 01...
SOURCE  origin=https://github.com/example/repo  HEAD=abc123  tree=4f8...
SCOPE   working tree + staged + relevant untracked vs HEAD

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
RESULT    materially complete; no repository finding
```

The exact visual layout may evolve; the semantics above are contractual.

## 5. Interpret exit semantics

```text
0 = stable, materially complete planned verification, no finding/flake/error
1 = repository/test finding or flaky outcome
2 = Ascout usage/config/internal/task-execution integrity error
3 = source tree drifted during verification
4 = stable but materially incomplete verification
```

An exit code `0` must never mean “nothing ran.”

## 6. Machine receipt

Planned machine output:

```bash
ascout check --format json
```

The JSON conforms to the feature's versioned receipt contract and contains no unbounded raw logs inline. Evidence artifacts remain under the current `.ascout/runs/<run-id>/` directory.

## 7. Agent receipt

Planned bounded agent output:

```bash
ascout check --format agent
```

The agent representation uses the same run truth as human/JSON output, with failures/errors/gaps first and explicit totals when details are omitted to honor the output budget.

## 8. Changed command surface

If the agent changed a file that defines a command/config Ascout is about to execute, such as `package.json` scripts or relevant test/compiler configuration, Ascout must warn **before** launching the repo-derived task and name the changed source of authority.

v0.x assumes this is still your own trusted local repository. It does not claim arbitrary untrusted-PR safety.

## 9. Missing dependency

If Vitest/Jest/TypeScript/other configured project tooling is missing:

```text
UNIT  NOT_RUN(tool_missing)  Project Vitest is not installed.
```

Ascout may print an actionable install command, but it does not execute installation implicitly.

## 10. Drift during the run

If a developer/agent/tool modifies tracked source while Ascout is running:

```text
TREE  DRIFTED
EXIT  3
```

The task observations may still be preserved for debugging, but the caller is explicitly told not to treat the receipt as stable evidence for an unchanged source tree.

## 11. Flaky failure

If a failing test supports a safe targeted retry and observations disagree:

```text
UNIT  FLAKY  runs=3 failures=1
```

A one-off failure is not silently promoted to “reproduced.”

## 12. What M1 deliberately does not do

Do not expect the first feature to:

- generate or fix tests/code;
- run a browser/DAST/fuzz/load suite;
- inspect untrusted PR branches safely;
- provide a semantic repository graph;
- require an AI model;
- upload the repository to an Ascout cloud service;
- prove that executed coverage means the changed behavior is correct.

The first release proves what it actually verified and exposes what it did not.
