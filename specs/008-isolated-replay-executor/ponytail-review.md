# Specification 008 — Ponytail / YAGNI Review

## Decision

`PASS_WITH_REDUCTIONS`

The recovery problem is execution availability, not missing benchmark semantics. The design must therefore add the least possible execution surface and reuse all existing benchmark logic unchanged.

## Retained

- one GitHub Actions workflow;
- Linux only;
- GitHub `create` event only;
- exactly two fixed task-run branch names;
- replay admission only on `github.run_attempt == '1'`;
- exact event/source SHA guard;
- exact Node `24.15.0` and Yarn `1.22.22` verification;
- existing `benchmarks/run.mjs` invocation;
- exactly two repetitions;
- read-only repository permission;
- bounded job timeout and artifact retention.

## Removed or rejected

- changes to Project CI or Self Verification;
- manual-dispatch-only dependency that the connected execution surface cannot exercise;
- GitHub re-run as a permitted qualification path;
- reusable workflow abstraction;
- matrices over arbitrary cases/runtimes;
- scheduler or automatic nightly benchmark runs;
- generalized donor-repository input;
- arbitrary shell/command/SHA/runtime/package-manager input;
- Docker image or custom action;
- cache service or persistent donor mirror;
- benchmark harness refactor;
- new JavaScript wrapper around the harness;
- new schema/result format;
- automatic issue updates from workflow credentials;
- product or release integration;
- cloud executor outside GitHub Actions;
- multi-OS support;
- wildcard execution branches.

## Why this is the minimum

The canonical harness already performs acquisition, identity verification, frozen install, reconstruction, oracle proof, comparator execution, determinism checking, and evidence serialization. Duplicating any of those concerns in a new script would create a second evidence authority.

The connected GitHub authority can create an exact branch ref but cannot dispatch a workflow. GitHub's `create` event supplies the missing deterministic trigger without free-form inputs. Two exact task branches correspond one-to-one with the only two authorized successor replays. The `run_attempt == 1` gate closes GitHub's native rerun path without adding another subsystem.

## Complexity verdict

One bounded workflow, two one-shot task refs, and one native attempt-number guard are proportional to the observed blocker. Any design requiring a new runtime service, framework, wrapper program, cache protocol, wildcard branch family, or product API is overdesigned for Spec 008 and must return to planning.