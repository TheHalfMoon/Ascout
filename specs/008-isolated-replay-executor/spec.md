# Specification 008 — Minimal Isolated Replay Executor

## Status

`SPEC_008 = PLANNING_ONLY / NOT_IMPLEMENTATION_AUTHORIZED`

## Problem

Specification 007 T111 cannot execute in the currently available authorized environment. The benchmark harness already exists and the Jotai/Immer cases are frozen, but there is no authorized executor that provides Linux, exact Node `v24.15.0`, Yarn Classic `1.22.22`, public donor/dependency acquisition, bounded execution, and durable evidence capture.

A manual `workflow_dispatch`-only route is insufficient for the current connected execution authority because no workflow-dispatch action is exposed. The executor therefore needs a bounded GitHub event that the existing Git ref authority can trigger without adding arbitrary command or repository input.

## Goal

Provide the smallest repository-hosted execution route that can run the existing `benchmarks/run.mjs` harness unchanged for only the frozen Specification 007 Jotai and Immer qualification cases.

## Non-goals

This specification does not authorize or design:

- product, selector, receipt, schema, CLI, or package changes;
- benchmark harness changes;
- manifest or historical-result changes;
- a generalized benchmark framework;
- arbitrary shell execution;
- arbitrary repository, SHA, runtime, package-manager, or command inputs;
- reusable workflow infrastructure;
- daemon, service, container platform, cloud control plane, or scheduler;
- release, tag, npm publication, or product CI expansion.

## Proposed bounded surface

If separately implementation-authorized after planning closes, the repository mutation surface is exactly one new workflow:

- `.github/workflows/spec-007-isolated-replay.yml`

The execution-control surface is limited to creating one of these exact Git branches from the then-canonical `main` commit:

- `run/spec007-t111-jotai`
- `run/spec007-t112-immer`

Those run refs are task-scoped control refs. They MUST be newly created only after the corresponding task becomes eligible, MUST point exactly to the verified canonical `main` SHA, and MUST NOT be repointed, reused, deleted/recreated, or otherwise manipulated to manufacture another attempt.

No other path or execution ref is in scope.

## Required behavior

The workflow MUST:

1. run only from GitHub's `create` event;
2. admit replay work only when `github.run_attempt == '1'`;
3. perform replay work only when the created ref is a branch named exactly `run/spec007-t111-jotai` or `run/spec007-t112-immer`;
4. ensure any later GitHub re-run attempt performs no checkout, install, build, donor acquisition, oracle, comparator, or harness execution;
5. map the fixed branch names internally to exactly `jotai-splitatom-identical-write` or `immer-draftmap-iterator-compatibility`;
6. use the event's exact commit SHA and guard checkout against that SHA before execution;
7. use exact Node `24.15.0`;
8. make Yarn Classic `1.22.22` available and verify `yarn --version` before replay;
9. install Ascout's own exact lockfile without changing repository source;
10. build the exact Ascout source before replay;
11. invoke only the existing `benchmarks/run.mjs` with the canonical manifest, mapped case, a run ID derived from immutable GitHub run metadata, and exactly two repetitions;
12. preserve the harness's existing donor clone, byte verification, reconstruction anti-leakage, sanitized environment, source-stability, membership, determinism, and integrity checks unchanged;
13. upload the exact replay result as a bounded retained artifact when available;
14. expose failure as failure; no rerun-until-green policy is authorized;
15. use least privilege with repository contents read-only and no secrets required.

## GitHub event and attempt boundary

Official GitHub Actions semantics define the `create` event as running when a Git branch or tag reference is created, including references created through the Git references API. Spec 008 uses that event because the connected repository authority can create an exact branch ref while it cannot dispatch a manual workflow.

GitHub also permits a workflow run/job to be re-run. A re-run retains the original event source/ref but increments `github.run_attempt`. Therefore the future workflow MUST fail closed at job admission unless `github.run_attempt == '1'`. The task ledger and evidence reconciliation MUST record the attempt number and MUST reject every attempt other than `1` for qualification, regardless of its eventual conclusion.

The workflow file must already be canonical on the default branch before any authorized run ref is created. Creating the workflow implementation branch or merging the workflow itself MUST NOT qualify as T111/T112 execution.

## Network boundary

The existing harness explicitly records that runner network is available for public acquisition/dependency reconstruction and does not claim network isolation. Spec 008 MUST NOT strengthen that claim falsely. The workflow may provide runner network needed for public Git clone and frozen dependency installation, but the measured oracle must continue to require no credentials, mutable hosted service, or undeclared external state. Any observed external dependency that violates the frozen case contract is a qualification failure.

## Inputs

There are no user-provided workflow inputs. Case identity comes only from the two exact run-branch names. Repetitions are fixed at `2`. Runtime, package manager, manifest path, donor repository, and harness command are fixed by canonical source and the workflow implementation.

## Outputs

The workflow must preserve:

- the JSON result written by `benchmarks/run.mjs` when available;
- job outcome and GitHub run/job identity;
- `github.run_id` and `github.run_attempt`;
- exact event/source SHA;
- mapped case ID and repetition count.

The workflow itself MUST NOT translate a failing replay into `BENCHMARK_ACTIVE`; only the unchanged harness may emit that lifecycle result.

## Security and trust constraints

- `permissions: contents: read` only unless GitHub requires an additional non-write permission for artifact upload;
- `persist-credentials: false` on checkout;
- no repository/environment secrets;
- no `pull_request_target`, untrusted PR branch execution, or dynamic donor repository input;
- no shell interpolation of user-controlled command text;
- exact branch-name allowlist and `run_attempt == 1` checked before any install/build/donor execution;
- exact event SHA checkout and guard;
- timeout bounded at job level;
- artifact retention bounded;
- no cache whose contents become benchmark evidence.

## Acceptance criteria

Planning is complete only when the canonical plan proves that a one-workflow plus two fixed task-run refs solution is sufficient and a fresh independent exact-head audit finds no material trust, scope, licensing, evidence-integrity, rerun-admission, or complexity issue.

Implementation remains forbidden until a separate explicit implementation authorization becomes canonical.