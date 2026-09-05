# Specification 008 — Ponytail / YAGNI Review

## Decision

`PASS_WITH_REDUCTIONS`

The recovery problem is execution availability, not missing benchmark semantics. The design must therefore add the least possible execution surface and reuse all existing benchmark logic unchanged.

## Retained

- one GitHub Actions workflow;
- Linux only;
- manual dispatch only;
- exact Ascout SHA input and guard;
- two-case closed enum;
- exact Node `24.15.0` and Yarn `1.22.22` verification;
- existing `benchmarks/run.mjs` invocation;
- 2–3 repetitions only;
- read-only repository permission;
- bounded job timeout and artifact retention.

## Removed or rejected

- changes to Project CI or Self Verification;
- reusable workflow abstraction;
- matrix over arbitrary cases/runtimes;
- scheduler or automatic nightly benchmark runs;
- generalized donor-repository input;
- arbitrary shell/command input;
- Docker image or custom action;
- cache service or persistent donor mirror;
- benchmark harness refactor;
- new JavaScript wrapper around the harness;
- new schema/result format;
- automatic issue updates from workflow credentials;
- product or release integration;
- cloud executor outside GitHub Actions;
- multi-OS support.

## Why a workflow is the minimum

The canonical harness already performs acquisition, identity verification, frozen install, reconstruction, oracle proof, comparator execution, determinism checking, and evidence serialization. Duplicating any of those concerns in a new script would create a second evidence authority. A thin workflow only supplies the missing runtime and durable execution envelope.

## Complexity verdict

One bounded workflow is proportional to the observed blocker. Any design requiring a new runtime service, framework, wrapper program, cache protocol, or product API is overdesigned for Spec 008 and must return to planning.