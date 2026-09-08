# R007-11 — T113 Terminal Disposition Under the Current Specification

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #248  
**Publication ledger:** Issue #208  
**Governance remediation ledger:** Issue #249  
**Canonical planning base:** `5c44a3dd5c9b8ec927690349d1b3a55e1de52dea`  
**Canonical planning-base tree:** `3a8d5bfd99df59b44d21cddc94d873ec29c44ccb`

## Decision

The evidence-backed planning candidate is:

`R007-11 = PLANNING_CANDIDATE / TERMINAL_DISPOSITION`

`ROOT_CAUSE = UNPROVEN`

`T113 = NO_GO / TERMINAL_UNDER_CURRENT_SPEC`

`T114 = BLOCKED_BY_T113`

`SPEC_007 = NO_GO / TERMINAL_UNDER_CURRENT_SPEC`

This is a terminal disposition under the current Specification 007 evidence and authority model. It is not a claim that the historical production cause has been discovered. It is not a claim that the underlying software can never be investigated under a future separately reviewed specification amendment.

The current specification has exhausted the bounded recovery routes supported by deterministic repository evidence. Continuing now would require at least one unsupported expansion such as:

- consuming another remote T113 execution as a diagnostic experiment;
- changing or adding a workflow merely to observe the failure;
- adding or provisioning a diagnostic dependency/toolchain surface in ordinary repository CI;
- widening into proxy/preload/harness/workflow paths without deterministic evidence implicating them;
- changing comparator, membership, result, or publication semantics;
- guessing another cache/runtime-state cause.

Those continuations are forbidden by the canonical recovery plan or unsupported by current evidence.

## Authority and precedence

Read this plan with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Specification 007 `spec.md`, `plan.md`, and `tasks.md`;
4. `T113_R2_REPORTER_DIAGNOSTIC_RECOVERY_PLAN.md`;
5. canonical R007-09/R007-10 planning and authorization artifacts;
6. Issue #208 live durable disposition;
7. Issue #248;
8. immutable r1/r2 workflow evidence;
9. Issue #249 remediation record only for the direct-main governance incident.

Live repository and GitHub truth override stale historical status text.

This plan grants no implementation, workflow, execution-ref, result, publication, T114, selector, product, schema, dependency, runtime, donor, oracle, replay, release, or deployment authority.

## Governance-remediation boundary

An earlier copy of this planning document was accidentally written directly to `main` in unqualified commit:

`5e4583940d755629cc39a2080abce72033f491f0`

That commit did not pass the required PR/CI/review/guarded-merge qualification and MUST NOT be treated as R007-11 authority or qualification evidence.

Issue #249 and PR #250 remediated that incident forward-only:

- remediation exact qualified head: `0a9cf0677df635e45874aa9797232dde3844fd71`;
- Self Verification run `34227207742`: success;
- Project CI run `34227207813`: original attempt, six of six required lanes success;
- independent exact-head CodeRabbit review run `40be4ffe-95cc-4333-9eac-c0c122853e77`: no actionable comments;
- unresolved review threads: zero;
- remediation merge/current planning base: `5c44a3dd5c9b8ec927690349d1b3a55e1de52dea`;
- remediation merge tree: `3a8d5bfd99df59b44d21cddc94d873ec29c44ccb`;
- merge signature: GitHub verified/valid;
- pre-incident canonical `a0e3316a73463714b9b3fea48a4dd0a98ee5659c` to remediation head `0a9cf0677df635e45874aa9797232dde3844fd71`: two commits ahead, zero file differences.

The direct-main incident remains visible in history. No reset, rebase, force-push, ref rewind, or destructive history rewrite occurred.

This R007-11 candidate starts independently from the post-remediation canonical `main` and must qualify from scratch.

## Canonical state entering R007-11

Canonical `main` at planning start:

`5c44a3dd5c9b8ec927690349d1b3a55e1de52dea`

Canonical tree:

`3a8d5bfd99df59b44d21cddc94d873ec29c44ccb`

R007-10 is closed canonical and qualified:

- implementation base: `9985a4bce9c2aa771f89f8bb467e9c7d686960b7`;
- exact qualified head: `e015967b5c91c9f401fa0dd02175e90c7e0eaaf0`;
- implementation PR: #247;
- merge: `a0e3316a73463714b9b3fea48a4dd0a98ee5659c`;
- merge/reviewed-head tree: `3a8d5bfd99df59b44d21cddc94d873ec29c44ccb`;
- canonical delta: exactly `tests/benchmark-metrics.test.ts`, net `+19/-0`;
- Self Verification `34223980678`: success;
- Project CI `34223980701`: original attempt 1, all six required OS/Node lanes success;
- independent exact-head CodeRabbit review run `49ccc06f-7249-4123-8f37-79387cef172b`: no actionable comments;
- unresolved review threads: zero;
- merge signature: GitHub verified/valid;
- Issue #246: closed canonical/qualified.

R007-10 closes the post-R007-09 malformed-wrapper qualification gap. It does not prove the historical production root cause.

## Immutable T113 failure evidence

### Consumed r1

- ref: `run/spec007-t113-metrics-r1`;
- run: `34130848099`;
- run attempt: `1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- conclusion: `failure`;
- failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- no T113 candidate artifact.

### Consumed r2

- ref: `run/spec007-t113-metrics-r2`;
- run: `34158105972`;
- run attempt: `1`;
- source/workflow SHA: `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`;
- conclusion: `failure`;
- failing stage: first Jotai T076 project-native full-suite membership proof;
- failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- T077 skipped;
- candidate construction skipped;
- artifact upload skipped;
- artifact inventory empty.

Both runs are immutable final evidence. They MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, substituted, or reclassified.

## Recovery evidence exhausted before R007-11

### R007-07 — cache preparation

R007-07 canonically added the bounded managed-runner cache preparation required before T076 membership proof.

The subsequent r2 execution still failed with the same missing-report condition.

Therefore:

`R007_07_CODE_QUALIFIED = YES`

`R007_07_CACHE_CAUSAL_HYPOTHESIS = INSUFFICIENT`

No additional cache may be guessed merely because r2 failed.

### R007-09 — bounded diagnostics and wrapper/process lifecycle

R007-09 canonically established:

- bounded missing-report diagnostics in T076;
- a deterministic package-script wrapper fixture using command text `yarn test:ci --run`;
- cold comparator execution;
- warm comparator execution;
- source restoration through the existing helper lifecycle;
- managed-cache preparation before proof;
- proof execution through the same wrapper command;
- genuine structured external JSON on the positive path;
- report-only oracle membership truth;
- controlled no-report hard failure;
- wrong-identity non-promotion.

Causal result:

`EXACT_WRAPPER_LIFECYCLE_VALID_PATH = PASS`

`HISTORICAL_MISSING_REPORT_LOCALLY_REPRODUCED = NO`

`ROOT_CAUSE = UNPROVEN`

The fixture produces the expected structured report under current code unless a controlled failure mode is intentionally selected.

### R007-10 — malformed wrapper qualification correction

R007-10 canonically proves through the same wrapper lifecycle that:

- cold comparator succeeds;
- warm comparator succeeds;
- the fixture switches to malformed mode only after timed collection;
- membership proof executes through `yarn test:ci --run`;
- malformed external JSON is rejected as `SyntaxError`;
- no membership result is produced;
- lifecycle is exactly `comparator:cold`, `comparator:warm`, `proof`.

R007-10 closes a qualification-contract gap. It adds no production causal evidence.

## Shared T075/T076 instrumentation facts

The read-only R007-11 audit reverified current code rather than assuming an implementation difference.

T075 and T076 both use canonical `membershipProofCommand(...)` from `benchmarks/harness-lib.mjs`.

For Jotai `yarn test:ci --run`, the command routes through the same `benchmarks/membership-proxy.mjs` mechanism. The proxy:

- runs as Node;
- receives the reviewed command unchanged after `--`;
- sets `NODE_OPTIONS` to require `membership-preload.cjs`;
- sets `ASCOUT_MEMBERSHIP_KIND` and `ASCOUT_MEMBERSHIP_OUTPUT`;
- spawns the reviewed command with `shell: false` and inherited sanitized environment;
- returns the reviewed command exit code.

The preload:

- recognizes the target project-local Vitest/Jest entry;
- refuses to overwrite existing reporter/output authority;
- injects Vitest `--reporter=json` and a unique sidecar `--outputFile=<proof>.<pid>.json` only at the target runner process;
- marks instrumentation through `ASCOUT_MEMBERSHIP_INSTRUMENTED=1`.

No current static evidence identifies a T075/T076 difference in this shared proxy/preload/reporter transformation that explains r1/r2.

The canonical recovery analysis also established that T075 `runBounded(...)` and T076 `runProcess(...)` both use bounded non-shell spawning, close-based completion, bounded output capture, and bounded termination semantics. No current evidence supports treating the process-runner implementation as causal.

T075 and T076 also construct sanitized donor environments with bounded controller-owned `HOME`, temporary directory, `XDG_CACHE_HOME`, npm cache, Corepack cache, and `NX_SOCKET_DIR`. No current environment delta proves the historical missing report.

## Actual Yarn Classic evidence

The R007-09/R007-10 local wrapper intentionally models command shape and process inheritance rather than claiming Yarn Classic semantic equivalence.

That limitation does not establish a Yarn defect because independently qualified T111 provides stronger real-toolchain evidence.

Qualified T111 Jotai run `33991920845` used:

- Linux x64;
- Node `24.15.0`;
- Yarn Classic `1.22.22`;
- donor `test:ci = vitest`;
- targeted command `yarn test:ci tests/react/vanilla-utils/splitAtom.test.tsx --run`;
- project-native full-suite/reference command `yarn test:ci --run`;
- plain-project comparator `yarn test:ci --run`;
- runner-native related selector `yarn vitest related src/vanilla/utils/splitAtom.ts --run`;
- two valid observations.

Within each canonical T075 selection observation, the harness performs multiple reviewed-command and proof chains, including the project-native full-suite command and its membership proof. For Jotai, project-native full-suite and plain-project command text are both exactly `yarn test:ci --run`.

Therefore actual Yarn Classic/Vitest is not evidenced only by a single isolated successful invocation. Qualified T075 exercised multiple sequential real-toolchain invocations and produced genuine required project-native full-suite JSON in both observations.

This evidence does not prove that the exact T076 `cold -> warm -> proof` ordering could never expose a distinct host-specific defect. It proves that no current repository evidence supports treating Yarn Classic, the reviewed command, or repeated invocation itself as the cause.

## Why a new exact-real-Yarn diagnostic is not admissible now

Ordinary Project CI is npm-based and the Ascout root does not pin Yarn as a dependency or devDependency.

Yarn Classic `1.22.22` is provisioned on separately governed isolated-replay/T113 benchmark execution surfaces through Corepack.

A new ordinary-CI regression requiring real Yarn Classic would therefore require a new CI/toolchain provisioning surface, package/dependency mutation, or reliance on runner-global state. None is currently authorized as a diagnostic route.

Running the exact real-Yarn ordering remotely instead would create or consume another benchmark execution surface as a diagnostic experiment without a proven causal basis.

The canonical recovery plan forbids a successor T113 execution merely to discover the cause remotely and forbids a new dependency/service/plugin merely to diagnose the failure.

Accordingly, the exact-ordering distinction remains an unproven hypothesis with no admissible current-spec experiment, not evidence for another recovery implementation.

## Exhaustion test

A remaining candidate cause would need to satisfy all of the following before another recovery unit is justified:

1. supported by deterministic repository evidence now;
2. reproducible without a new speculative T113 execution;
3. testable without widening evidence semantics;
4. testable without a new diagnostic dependency/service/toolchain surface;
5. attributable to an already authorized bounded implementation surface;
6. repairable without changing comparator command, membership truth, result meaning, or historical evidence;
7. able to justify a before/after regression rather than an inferred fix.

Current answer:

`NO`

The remaining possibilities—real-host process ordering, preload reachability under an unobserved host-specific condition, output-path behavior under an unobserved host-specific condition, or another unknown bounded runtime interaction—do not satisfy the deterministic-evidence prerequisite.

Continuing from those possibilities would be speculation, not evidence-driven recovery.

## Terminal meaning

`T113 = NO_GO / TERMINAL_UNDER_CURRENT_SPEC` means:

- T113 did not produce an acceptable expanded-corpus publication;
- the historical production cause remains unknown;
- r1/r2 remain immutable failed attempts;
- current Specification 007 grants no further recovery implementation or execution route;
- no T113 result file may be fabricated or synthesized;
- T114 cannot reconcile final eight-case publication facts because T113 publication never qualified;
- Specification 007 cannot close `GO` under its current acceptance contract.

It does not mean:

- the missing-report condition has a known cause;
- Yarn Classic or Vitest is defective;
- the proxy/preload mechanism is defective;
- T076 is generally incapable of producing reports;
- a future amended specification may never authorize new evidence collection;
- historical qualified T091/T111/T112/T078/T095 evidence is invalid.

## T114 disposition

Canonical `tasks.md` requires T114 to record final T113/eight-case publication facts and allows `SPEC_007 = CLOSED_CANONICAL / GO` only if all acceptance is proven.

No accepted T113 publication evidence exists.

Therefore:

`T114 = BLOCKED_BY_T113`

R007-11 does not check off T114, invent final eight-case metrics, or claim `T114 = CLOSED_CANONICAL`.

The Spec 007 disposition is instead:

`SPEC_007 = NO_GO / TERMINAL_UNDER_CURRENT_SPEC`

This preserves the failed dependency honestly rather than using governance-only reconciliation to simulate successful benchmark completion.

## Future reopening boundary

No successor R007 implementation unit is authorized by this plan.

No `run/spec007-t113-metrics-r3` name is reserved or authorized.

No future T113 execution may rely on general founder approval alone to bypass the canonical evidence gate.

T113 may be reopened only if one of the following becomes canonical after this terminal disposition:

1. genuinely new deterministic repository evidence establishes a bounded causal mechanism and a separately reviewed specification/governance amendment authorizes investigation; or
2. a separately reviewed Specification 007 amendment intentionally defines a new evidence-collection route while preserving no-fabrication, structured-membership, provenance, historical-immutability, and no-post-data-threshold invariants.

Any reopening must start from then-live repository truth and must not reuse r1/r2 as mutable attempts.

## Hard prohibitions after terminal closeout

- no rerun or failed-job rerun of r1/r2;
- no movement, deletion/recreation, force-update, reuse, substitution, or reclassification of r1/r2 refs;
- no successor T113 execution ref under current Spec 007;
- no speculative workflow dispatch/create event for diagnosis;
- no fabricated/synthesized/inferred runner JSON or membership;
- no stdout/stderr promotion into membership evidence;
- no comparator-command rewrite merely to obtain a report;
- no membership-policy weakening;
- no result/metric/assertion weakening;
- no guessed cache expansion;
- no new dependency/service/plugin/toolchain provisioning merely to diagnose;
- no workflow mutation merely to observe the failure;
- no T113 result publication from r1/r2, fixtures, diagnostics, partial output, or inferred equivalence;
- no T114 GO closeout without genuine accepted T113 evidence;
- no historical result rewrite;
- no force-push/rebase/destructive history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated root cause, qualification, closure, readiness, or completion.

## Exact planned tracked mutation

This R007-11 planning unit changes exactly one path:

- `specs/007-historical-benchmark-corpus-expansion/R007_11_T113_TERMINAL_DISPOSITION_PLAN.md`

No second tracked path is planned.

If qualification requires any product, test, workflow, dependency, result, manifest, task-ledger, current-view, or other path mutation, this candidate is `NO_GO / RETURN_TO_PLANNING`. It MUST NOT widen itself.

## Qualification gate

Before this terminal planning decision may become canonical, the following are required:

1. exact one-path planning purity;
2. exact final head/tree verification;
3. exact-head Self Verification success;
4. original-attempt exact-head Project CI success across all six required OS/Node lanes;
5. fresh independent substantive exact-head correctness/evidence/governance review;
6. reconciliation of every material current-head finding;
7. zero unresolved material review threads;
8. live ruleset/observable protection verification;
9. unchanged canonical `main` and exact PR head immediately before merge;
10. guarded normal merge with exact `expected_head_sha`;
11. post-merge ordered-parent/tree/signature/PR/main/path proof;
12. durable Issue #248 closeout;
13. durable Issue #208 publication-ledger terminal disposition.

Any head mutation invalidates prior exact-head CI/review qualification.

## Allowed closeout

If this exact planning candidate qualifies and merges canonically, close Issue #248 as:

`R007-11 = CLOSED_CANONICAL / TERMINAL_DISPOSITION`

and record in Issue #208:

`ROOT_CAUSE = UNPROVEN`

`T113 = NO_GO / TERMINAL_UNDER_CURRENT_SPEC`

`T114 = BLOCKED_BY_T113`

`SPEC_007 = NO_GO / TERMINAL_UNDER_CURRENT_SPEC`

No implementation authorization follows this closeout under the current specification.
