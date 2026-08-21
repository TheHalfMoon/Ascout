# 001 — Planned M1 Quickstart

**Status:** Design example only. Product implementation is not authorized or present.

## Prerequisites

- Your own trusted local Git repository.
- Node.js 22 or 24 LTS.
- Project dependencies installed explicitly by you.
- Supported JS/TS project for first-class exercise reporting.

Ascout never installs project dependencies implicitly.

## 1. Initialize minimal policy

```bash
ascout init
```

Planned effect:

- create minimal tracked `ascout.config.json` if absent;
- config only overrides fixed tasks: `typecheck`, `lint`, `test`, `pytestBasic`;
- ensure `.ascout/` is ignored;
- no project package installation;
- no host-level hooks or persistent command trust grant.

## 2. Inspect discovery without execution

```bash
ascout doctor
```

`doctor` explains privacy-safe repository identity, package/tool discovery, command authority/config sources, missing tools, selection/coverage capability, and unsupported M1 traits. Limitations are output.

## 3. Run normal verification

```bash
ascout check
```

If command surfaces are unchanged, Ascout may run applicable tasks.

Illustrative receipt where selected tests pass but changed executable gaps remain:

```text
SOURCE  repo=remote:9d3f...  portable=true  HEAD=abc123  tree=4f8...
SCOPE   staged + unstaged + all non-gitignored untracked vs HEAD

TASKS
TYPECHECK     PASS
LINT          PASS
UNIT          PASS        selected=23  deselected=340

CHANGED       86 executable lines
EXERCISED     61
NOT EXERCISED 19
UNRESOLVED     6

SELECTION native_related; widened=false
TREE      STABLE
RESULT    materially incomplete: exercise gaps remain
EXIT      4
```

All selected tests passing is not green while material changed executable lines remain unexercised/unresolved.

Each `UNRESOLVED` line in the machine receipt carries a non-empty mapping reason.

## 4. Changed command surface: default refusal

Suppose the AI also changed a command/config source Ascout would load:

```text
M package.json                 (test script changed)
M vitest.config.ts             (test config changed)
```

Ordinary check MUST NOT merely print a warning and continue. The affected task is refused:

```text
UNIT  NOT_RUN(command_surface_changed)
REASON effective test command/config changed in current diff
AUTHORITY_CHANGED
  package.json
  vitest.config.ts
ADMISSION refused_changed_surface
RESULT materially incomplete
EXIT   4
```

The developer reviews those changes first.

If the human decides the changed command/config surface is trusted for this run only:

```bash
ascout check --allow-changed-command-surface
```

The receipt records:

```text
ADMISSION explicit_changed_surface_override
AUTHORITY_CHANGED package.json, vitest.config.ts
```

This flag is **per invocation**. It is not written to config, remembered across runs, or silently supplied by agent instructions/hooks.

The same rule applies to effective pytest configuration when the `pytestBasic` task is used.

## 5. Exit semantics

```text
0 = stable + complete + no finding/flake/error
1 = repository/test finding or flaky outcome
2 = usage/config/internal/task-execution integrity error
3 = source tree drifted (unless higher-precedence integrity error)
4 = stable but materially incomplete/gapped verification
```

Exit `0` requires at least one material verification task to execute, no applicable task omission/admission refusal, valid selection/widening, and no remaining material changed executable exercise gap.

## 6. Machine and agent receipts

```bash
ascout check --format json
ascout check --format agent
```

JSON follows receipt v1 and includes a root `evidence[]` collection. Every task/finding `evidence_id` resolves to current-run evidence before emission. Schema validation plus semantic receipt validation rejects dangling/cross-run/cross-task evidence references and inconsistent stability/completeness/exit summaries.

Agent output uses the same validated truth and stays within the default 16 KiB UTF-8 budget. Both preserve admission state and changed authority paths.

## 7. Identity/privacy

- Remote identity is `remote:<sha256(normalized-credential-free-remote)>` with `portable=true`; raw origin is never persisted.
- No-remote local identity is `local:<sha256(canonical-real-path)>` with `portable=false`; raw absolute path is never persisted.
- Persisted/rendered argv and captured output redact recognized secret-bearing environment values.
- Raw secret-bearing argv exists transiently for launch only.

## 8. Missing dependency/config

```text
UNIT  NOT_RUN(tool_missing)  Project Vitest is not installed.
```

`NOT_RUN`, `BLOCKED`, and `ERROR` always carry non-empty reason code/text. A non-executed task may have empty persisted argv/null tool identity if no safe runnable command was resolved. Installation suggestions may be printed but never executed implicitly.

## 9. Drift

Any tracked or included non-gitignored untracked change outside `.ascout/` during the run:

```text
TREE  DRIFTED
EXIT  3
```

If integrity failure prevents end digest, stability is `unknown` and exit `2` dominates.

## 10. Reproduction / flake

One failure without safe targeted rerun:

```text
UNIT FAIL  runs=1 failures=1 reproduced=unknown
```

Contradictory bounded observations:

```text
UNIT FLAKY  runs=3 failures=1 reproduced=false
```

## 11. M1 deliberate non-goals

No code/test generation, arbitrary config workflow graph, browser/security/adversarial suite, untrusted PR sandbox, semantic graph, required AI, cloud upload, or correctness claim from coverage.

M1 proves what it actually verified, refuses changed execution authority by default, requires resolvable current-run evidence, and refuses green while material changed code remains unchecked.
