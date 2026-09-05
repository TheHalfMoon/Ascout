# Specification 008 — Minimal Isolated Replay Executor

## Status

`SPEC_008 = PLANNING_ONLY / NOT_IMPLEMENTATION_AUTHORIZED`

## Problem

Specification 007 T111 cannot execute in the currently available authorized environment. The benchmark harness already exists and the Jotai/Immer cases are frozen, but there is no authorized executor that provides Linux, exact Node `v24.15.0`, Yarn Classic `1.22.22`, public donor/dependency acquisition, bounded execution, and durable evidence capture.

## Goal

Provide the smallest repository-hosted execution route that can run the existing `benchmarks/run.mjs` harness unchanged for only the frozen Specification 007 Jotai and Immer qualification cases.

## Non-goals

This specification does not authorize or design:

- product, selector, receipt, schema, CLI, or package changes;
- benchmark harness changes;
- manifest or historical-result changes;
- a generalized benchmark framework;
- arbitrary shell execution;
- reusable workflow infrastructure;
- daemon, service, container platform, cloud control plane, or scheduler;
- release, tag, npm publication, or product CI expansion.

## Proposed bounded surface

If separately implementation-authorized after planning closes, the repository mutation surface is exactly one new workflow:

- `.github/workflows/spec-007-isolated-replay.yml`

No other path is in scope.

## Required behavior

The workflow MUST:

1. run only on Linux;
2. require an explicit manual `workflow_dispatch` case choice restricted to exactly `jotai-splitatom-identical-write` or `immer-draftmap-iterator-compatibility`;
3. check out an explicitly supplied canonical Ascout commit and guard that exact SHA before execution;
4. use exact Node `24.15.0`;
5. make Yarn Classic `1.22.22` available and verify `yarn --version` before replay;
6. install Ascout's own exact lockfile without changing repository source;
7. build the exact Ascout source before replay;
8. invoke only the existing `benchmarks/run.mjs` with the canonical manifest, the selected case, a run ID derived from immutable GitHub run metadata, and at least two repetitions;
9. preserve the harness's existing donor clone, byte verification, reconstruction anti-leakage, sanitized environment, source-stability, membership, determinism, and integrity checks unchanged;
10. upload the exact replay result as a bounded retained artifact even when the replay fails after producing an output file;
11. expose failure as failure; no rerun-until-green policy is authorized;
12. use least privilege with repository contents read-only and no secrets required.

## Network boundary

The existing harness explicitly records that runner network is available for public acquisition/dependency reconstruction and does not claim network isolation. Spec 008 MUST NOT strengthen that claim falsely. The workflow may provide runner network needed for public Git clone and frozen dependency installation, but the measured oracle must continue to require no credentials, mutable hosted service, or undeclared external state. Any observed external dependency that violates the frozen case contract is a qualification failure.

## Inputs

The workflow may accept only:

- `case_id`: enum of the two frozen Spec 007 cases;
- `ascout_sha`: exact 40-character commit SHA expected to equal the intended canonical source;
- `repetitions`: restricted to `2` or `3`, default `2`.

No free-form command, repository URL, manifest path, package manager, Node version, or arbitrary argument input is permitted.

## Outputs

The workflow must preserve:

- the JSON result written by `benchmarks/run.mjs` when available;
- job outcome and GitHub run/job identity;
- exact Ascout SHA;
- case ID and repetition count.

The workflow itself MUST NOT translate a failing replay into `BENCHMARK_ACTIVE`; only the unchanged harness may emit that lifecycle result.

## Security and trust constraints

- `permissions: contents: read` only unless GitHub requires an additional non-write permission for artifact upload;
- `persist-credentials: false` on checkout;
- no repository/environment secrets;
- no `pull_request_target`, untrusted PR branch execution, or dynamic repository input;
- no shell interpolation of user-controlled command text;
- timeout bounded at job level;
- artifact retention bounded;
- no cache whose contents become benchmark evidence.

## Acceptance criteria

Planning is complete only when the canonical plan proves that a one-workflow solution is sufficient and a fresh independent exact-head audit finds no material trust, scope, licensing, evidence-integrity, or complexity issue.

Implementation remains forbidden until a separate explicit implementation authorization becomes canonical.