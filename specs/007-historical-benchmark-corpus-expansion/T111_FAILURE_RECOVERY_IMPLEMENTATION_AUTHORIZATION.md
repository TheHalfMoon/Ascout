# Spec 007 T111 Failure Recovery Implementation Authorization

**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #187  
**Canonical base:** `8c6fe65d711c70c5e1454bd004cf2ad9ed0a9c8f`  
**Canonical planning merge:** `8c6fe65d711c70c5e1454bd004cf2ad9ed0a9c8f`

## Purpose

Prospectively authorize the smallest recovery sequence needed to address the genuine first-attempt T111 Jotai replay failure recorded by run `33984116443`, without retroactively changing that failure, weakening required membership proof, widening benchmark infrastructure, or unblocking later tasks early.

This file is not effective merely because it exists on a branch. It becomes effective only after this exact authorization head is independently qualified, guarded-merged into canonical `main`, post-merge verified, and Issue #187 is durably closed as `CLOSED_CANONICAL / EFFECTIVE`.

## Authority chain

This authorization binds, in order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. the effective Spec 007 implementation authorization and Issue #157;
4. `specs/007-historical-benchmark-corpus-expansion/spec.md`;
5. `specs/007-historical-benchmark-corpus-expansion/plan.md`;
6. `specs/007-historical-benchmark-corpus-expansion/tasks.md`;
7. `specs/007-historical-benchmark-corpus-expansion/T111_FAILURE_RECOVERY_PLAN.md`;
8. `specs/007-historical-benchmark-corpus-expansion/T111_FAILURE_RECOVERY_AUDIT.md`;
9. Issue #170 original T111 failure closeout;
10. Issue #171 recovery-planning closeout;
11. PR #184 canonical planning amendment;
12. Issue #187 recovery implementation-authorization ledger.

Live canonical repository truth overrides stale summaries or handoffs.

## Canonical prerequisite binding

The recovery planning amendment is canonical at:

- merge SHA: `8c6fe65d711c70c5e1454bd004cf2ad9ed0a9c8f`;
- merge tree: `e477f32c7501e6c91686da70d05369da4e5e4b9e`;
- ordered parent 1: `004dc9f0d40c8d61e8c7b48cc4350010b5490340`;
- ordered parent 2: `317936da8cf68bbac33910ba2d04013fb2f30328`;
- GitHub signature: `verified=true`, `reason=valid`;
- PR #184: `MERGED / CLOSED`;
- exact-head Self Verification: run `33986192715`, success;
- exact-head Project CI: run `33986192722`, all six lanes success, `run_attempt=1`;
- fresh exact-head independent review: `No material findings`;
- unresolved review threads: `0`.

The original T111 execution remains immutable failure evidence:

- branch: `run/spec007-t111-jotai`;
- workflow run: `33984116443`;
- job: `101354420297`;
- observed result: runner-native related selection produced `No test files found, exiting with code 0`, no external JSON membership report, and the unchanged harness failed closed;
- durable disposition: `T111 = NO_GO / RETURN_TO_PLANNING`.

Nothing in this authorization reclassifies, retries, deletes, moves, recreates, or erases that evidence.

## Exact authorized sequence

After this authorization becomes `CLOSED_CANONICAL / EFFECTIVE`, the only authorized recovery sequence is:

`R007-01 -> R007-02 -> T111-R2`

The successor dependency order remains:

`T111-R2 -> T112 -> T113 -> T114`

No successor may begin before its predecessor is canonically closed in the required state.

## R007-01 — Observed-membership compatibility

### Exact repository mutation surface

Exactly:

- `benchmarks/harness-lib.mjs`;
- `benchmarks/run.mjs`;
- `tests/benchmark-membership-proof.test.ts`.

No other tracked path is authorized under R007-01.

### Required semantic behavior

R007-01 may introduce only a narrowly scoped benchmark compatibility rule for runner-native membership policy `observed`.

A membership-proof execution that produces no JSON report may yield factual `membership=false` only when every condition below is proven:

1. membership policy is exactly `observed`;
2. the proof process exits normally;
3. proof exit code exactly equals the already-observed comparator exit code;
4. that exit code is exactly `0`;
5. stdout and stderr are bounded and non-truncated;
6. no external JSON membership report exists;
7. the bound runner kind is explicitly supported by the narrow compatibility rule;
8. captured output matches an exact reviewed runner-native no-tests signature for that runner;
9. captured output contains no independent command/config/module/resolve/setup failure evidence;
10. independent source-state identity remains stable through the comparator and membership-proof executions;
11. evidence records the actual process outcome, exit code, stdout/stderr SHA-256 digests, truncation facts, and an explicit no-tests evidence kind;
12. no synthetic JSON report, synthetic assertion, synthetic executed test, or inferred oracle evidence is created.

The resulting value is only factual comparator membership `false`. It is not oracle success, not a hit, not `unavailable`, and not an acceptance override.

### Required fail-closed boundaries

Existing strict behavior must remain when any of these conditions applies:

- policy is `required` or `none`;
- abnormal process outcome;
- comparator/proof exit mismatch;
- nonzero exit;
- stdout or stderr truncation;
- a JSON report exists but is malformed, oversized, ambiguous, or invalid;
- command/config/module/resolve/setup failure evidence is present;
- source-state drift occurs;
- runner kind is unsupported;
- no-tests signature is absent or ambiguous.

Every `required` membership path, including pre-fix oracle, fixed oracle, and project-native full-suite proof, remains structured-report-only and fail-closed.

### Required focused tests

At minimum, exact tests must prove:

1. `observed + exit 0 + exact reviewed Vitest no-tests output + no report` yields `membership=false` with explicit no-tests evidence;
2. the same no-report evidence under `required` fails closed;
3. nonzero no-tests output fails closed;
4. changed proof exit code fails closed;
5. truncated output fails closed;
6. setup/config/module/resolve error output cannot qualify;
7. malformed, oversized, or ambiguous JSON remains fail-closed;
8. report-producing `observed` membership retains existing structured-report behavior;
9. report-producing `required` membership retains existing strict behavior;
10. current membership-proof and benchmark-harness tests remain green.

### R007-01 non-goals

No product or `src/**` mutation, selector change, receipt/schema/CLI change, manifest change, result publication, workflow change, dependency change, donor/oracle substitution, runtime substitution, historical-result rewrite, generalized runner adapter, framework refactor, release, or publication is authorized.

## R007-01 qualification and closeout

R007-01 requires before merge:

- exact three-path purity;
- focused tests for the positive and adversarial boundaries above;
- applicable repository typecheck/test/build;
- exact-head Self Verification where applicable;
- exact-head Project CI success across all six required lanes;
- fresh independent substantive semantic/security review of the exact final head;
- reconciliation of every material finding by forward-only commits;
- zero unresolved material review threads;
- current ruleset / observable branch-protection verification;
- unchanged final head and canonical base immediately before merge;
- guarded merge using canonical merge-commit method and exact expected head SHA;
- post-merge verification of merge SHA, ordered parents, tree, GitHub signature state, PR state, canonical `main`, and exact changed paths;
- durable `R007-01 = CLOSED_CANONICAL` before R007-02 begins.

## R007-02 — Single-use T111 recovery binding

R007-02 becomes eligible only after R007-01 is canonically closed.

### Exact repository mutation surface

Exactly:

- `.github/workflows/spec-007-isolated-replay.yml`.

### Required workflow change

Add exactly one recovery branch mapping:

`run/spec007-t111-jotai-r2` -> `jotai-splitatom-identical-write`

The implementation must preserve all existing executor controls, including:

- create-event-only execution route;
- exact branch-name allowlist;
- `github.run_attempt == '1'` qualification boundary;
- exact event source and workflow revision binding, including `github.sha == github.workflow_sha` where currently required;
- checkout bound to the reviewed controller revision and post-checkout HEAD equality checks;
- least permissions and no controller secrets in the donor execution environment;
- exact Node `24.15.0`;
- Yarn Classic `1.22.22` availability and verification;
- bounded timeout;
- direct unchanged canonical harness entry;
- deterministic artifact retention behavior;
- later rerun attempts performing no qualifying replay work.

No wildcard branch, workflow dispatch/input surface, arbitrary case selection, arbitrary repository/command/runtime/package-manager/SHA input, reusable generalized task executor, or early T112 branch is authorized.

## R007-02 qualification and closeout

R007-02 independently requires exact one-path scope, exact-head Self Verification, Project CI 6/6 where applicable, fresh independent substantive workflow/security review, zero unresolved material threads, current ruleset/protection verification, guarded expected-head merge, full post-merge identity verification, and durable `R007-02 = CLOSED_CANONICAL` before any T111-R2 ref is created.

## T111-R2 — Single recovery replay

T111-R2 has no repository mutation by default. It becomes eligible only after R007-01 and R007-02 are canonically closed.

Before ref creation, reverify:

- exact canonical `main`;
- exact merged R007-01 benchmark-code identities;
- exact merged R007-02 workflow identity;
- current Spec 007 task/authority state;
- original `run/spec007-t111-jotai` remains unchanged;
- `run/spec007-t111-jotai-r2` does not exist;
- `run/spec007-t112-immer` does not exist.

Then create exactly once:

`run/spec007-t111-jotai-r2`

from the exact canonical revision containing both recovery units.

The first create-event workflow attempt is the only qualifying attempt. A failed attempt must not be rerun merely to obtain green status.

T111-R2 must still satisfy the frozen Jotai identity, production-fix reconstruction and oracle anti-leakage requirements, immutable dependency installation, exact Node/Yarn route, hermetic measured oracle, at least two bounded repetitions, independent oracle proof, comparator membership classification, source stability, deterministic observations, and every existing absolute integrity gate.

Only a genuine qualifying replay may establish:

`T111 = CLOSED_CANONICAL / QUALIFIED`

Any failure records the exact evidence and returns to planning again.

## T112 / T113 / T114 preservation

- T112 remains blocked until T111 is durably qualified through T111-R2.
- T112 retains the exact pinned Node `24.15.0` Iterator-capability gate.
- No polyfill, shim, source rewrite, compatibility workaround, alternate runtime, or oracle weakening is authorized for T112.
- T113 remains blocked until both T111 and T112 are canonically qualified.
- T113 may publish only the additive `benchmarks/results/t113-historical-corpus-expansion.json` result already authorized by Spec 007, preserving historical result bytes.
- T114 remains blocked until T113 is canonically closed and is governance/ledger reconciliation only by default.

## Universal execution discipline

For every repository-mutating recovery unit:

1. branch from exact canonical `main` only after predecessor closeout;
2. keep exact authorized-path purity;
3. use forward-only repairs only; no force-push/rebase/destructive rewrite;
4. never reuse CI/review evidence after a changed head;
5. never rerun a failed exact-head CI merely to obtain green status; preserve the failure and follow prospective repair governance;
6. require fresh exact-head CI and independent substantive review;
7. guard merges with the exact expected head SHA;
8. post-merge verify ordered parents, tree, GitHub verification/signature state, PR state, canonical `main`, and changed artifacts;
9. durably close the unit before successor execution.

## Hard prohibitions

This authorization does not permit:

- mutation outside the exact R007-01/R007-02 surfaces;
- product or selector behavior changes;
- receipt/schema/CLI changes;
- dependency additions;
- donor or oracle replacement;
- runtime substitution;
- synthetic comparator evidence;
- historical-result rewrites;
- post-data score/recall thresholds;
- generalized benchmark infrastructure;
- moving, recreating, reusing, or rerunning the original T111 ref/run;
- early T112 execution;
- release, Git tag, GitHub Release, or npm publication;
- fabricated CI, review, evidence, authority, runtime capability, hashes, signatures, mergeability, qualification, or completion.

## Authorization qualification

This authorization PR itself must:

1. contain exactly this one added governance artifact;
2. be based on exact canonical `main` `8c6fe65d711c70c5e1454bd004cf2ad9ed0a9c8f`;
3. receive Self Verification success on its exact final head;
4. receive Project CI six-lane success on its exact final head;
5. receive a fresh independent substantive exact-head governance/security review with no material findings;
6. have zero unresolved material review threads;
7. remain unchanged after final qualification/review;
8. reverify current rulesets / observable branch protection and unchanged canonical base immediately before merge;
9. use guarded expected-head merge with the repository's canonical merge-commit method;
10. receive post-merge verification of SHA, ordered parents, tree, GitHub signature state, PR state, canonical `main`, and exact artifact bytes;
11. close Issue #187 durably as `SPEC_007_T111_RECOVERY_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Until all criteria are satisfied:

`SPEC_007_T111_RECOVERY_AUTHORIZATION = PENDING / NOT_EFFECTIVE`
