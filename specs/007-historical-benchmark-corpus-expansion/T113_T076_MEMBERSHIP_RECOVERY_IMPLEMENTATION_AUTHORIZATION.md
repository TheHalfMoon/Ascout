# T113 T076 Membership-Recovery Implementation Authorization

**Spec:** 007  
**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #219  
**Planning ledger:** Issue #217 (`CLOSED / COMPLETED`)  
**T113 publication ledger:** Issue #208  
**Canonical authorization base:** `4719d159ac7aa2b1fcd8e4d73bd37c82f7db6cfa`  
**Canonical authorization-base tree:** `d81dfb82ac2f42c976d08eed7435000ee6d562a4`

## Purpose

Prospectively authorize only R007-07, the bounded T076 required-membership proof-parity implementation defined by the canonical recovery plan.

This artifact becomes effective only after its exact final head is independently qualified, guarded-merged, post-merge verified, and Issue #219 is durably closed as:

`R007-07_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Before that closeout it authorizes no implementation.

## Canonical authority chain

Read this authorization with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and implementation authority;
4. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_PLAN.md`;
5. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_IMPLEMENTATION_AUTHORIZATION.md`;
6. `specs/007-historical-benchmark-corpus-expansion/T113_T076_MEMBERSHIP_RECOVERY_PLAN.md`;
7. Issue #208;
8. Issue #217 canonical closeout;
9. Issue #219;
10. immutable failed T113 run `34130848099`, attempt `1`, job `101770327800`.

Live repository/GitHub truth overrides stale status text in historical artifacts.

## Canonical planning binding

The recovery plan is canonically qualified and merged as:

- planning PR: #218;
- planning final head: `f3a23cc57c854807d2120c73c7bd34a9a6b32a96`;
- planning final head tree: `d81dfb82ac2f42c976d08eed7435000ee6d562a4`;
- planning merge: `4719d159ac7aa2b1fcd8e4d73bd37c82f7db6cfa`;
- planning merge tree: `d81dfb82ac2f42c976d08eed7435000ee6d562a4`;
- ordered parents:
  1. `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
  2. `f3a23cc57c854807d2120c73c7bd34a9a6b32a96`;
- GitHub merge verification: `verified=true`, `reason=valid`;
- exact-head Self Verification: run `34134368106`, attempt `1`, SUCCESS;
- exact-head Project CI: run `34134368177`, attempt `1`, six required lanes SUCCESS;
- independent exact-head review: no remaining material findings;
- planning ledger: Issue #217, CLOSED / COMPLETED.

Any implementation that diverges from the canonical recovery plan requires a new prospective planning/authority amendment before mutation.

## Immutable trigger evidence

The consumed first T113 execution remains final failure evidence:

- ref: `run/spec007-t113-metrics-r1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- source tree: `821db43ba09624e05b8d29f1ab9541f786481354`;
- run: `34130848099`;
- attempt: `1`;
- job: `101770327800`;
- conclusion: `failure`;
- failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- stage: Jotai T076 project-native full-suite membership audit;
- no T113 candidate artifact produced.

The `r1` ref/run MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, or reclassified as successful publication evidence.

## Authorized unit

Exactly:

`R007-07 — T076 required-membership proof parity`

No successor unit becomes authorized by implication.

## Exact tracked mutation surface

Exactly:

- `benchmarks/metrics.mjs`;
- `tests/benchmark-metrics.test.ts`.

No other tracked path is authorized under R007-07.

## Authorized implementation behavior

R007-07 MAY implement only the following bounded change, and only if deterministic focused tests prove it:

1. reuse the existing `MANAGED_RUNNER_CACHE_PATHS` set already defined in `benchmarks/metrics.mjs` exactly as currently defined:
   - `.nx/cache`;
   - `.nx/workspace-data`;
   - `.cache`;
   - `node_modules/.cache`;
2. reuse the existing ignored-path validation/removal behavior rather than adding a new cache taxonomy or shared framework;
3. prepare those managed ignored runner-cache paths after cold/warm timed comparator collection and immediately before T076 membership-proof instrumentation;
4. preserve existing cold/warm timing measurements and cache-class meaning;
5. preserve tracked-source restoration, measured path-set validation, replay/materialization binding, runtime/toolchain equality, dependency/lockfile verification, anti-leakage, and source-state stability;
6. execute the existing membership proof exactly once with the same reviewed comparator command, expected exit code, runner kind, environment sanitation, reporter/proxy/preload instrumentation, and output-path contract;
7. preserve project-native full-suite membership as required structured-report evidence;
8. require at least one valid external runner JSON report for required full-suite membership;
9. preserve current report-size limits, JSON parsing/structure checks, assertion matching, and observed oracle-test-id semantics;
10. preserve fail-closed behavior for missing, empty, oversized, malformed, structurally invalid, exit-mismatched, or oracle-mismatched evidence;
11. add focused positive/adversarial tests inside `tests/benchmark-metrics.test.ts` only;
12. add an internal benchmark-module export only if needed for deterministic testability, without creating a public product API or persisted contract.

## Mandatory focused evidence

Before R007-07 may be proposed for merge, deterministic local tests MUST prove at least:

1. T076 membership audit prepares exactly the existing managed ignored runner-cache paths immediately before proof execution;
2. cleanup remains path-contained;
3. cleanup rejects a managed path when donor Git does not classify it as ignored;
4. a local fixture representing stale ignored runner-cache state can exercise the repaired path without donor-network or GitHub-artifact access;
5. the positive case yields genuine structured runner JSON and required oracle membership only from the actual report;
6. no-report remains a hard failure;
7. malformed JSON remains rejected;
8. a report lacking `testResults` remains rejected;
9. instrumentation exit-code mismatch remains rejected;
10. existing valid structured-report/oracle-id matching behavior remains unchanged;
11. existing qualified replay/materialization and aggregate/metric tests remain green.

The implementation MUST NOT use a successor T113 workflow execution as its diagnostic test.

## Frozen semantics and evidence

R007-07 MUST preserve unchanged:

- comparator commands and restricted-command parsing;
- membership policy and required/observed meaning;
- oracle identities and oracle-test matching;
- T076 metric formulas and result shape;
- T077 assertion formulas;
- T111/T112 qualified replay evidence and identities;
- R007-05 qualified replay admission/materialization semantics;
- T091 six-case aggregate inputs;
- T078/T091/T095 published result blobs;
- product/selector/receipt/schema/CLI behavior;
- donor source/oracle/runtime identities;
- manifest and dependency set.

## Explicitly unauthorized under R007-07

The following are not authorized:

- `benchmarks/run.mjs`;
- `benchmarks/harness-lib.mjs`;
- `benchmarks/metrics-lib.mjs`;
- `benchmarks/assertions-lib.mjs`;
- `.github/workflows/**`;
- any execution ref mutation or creation;
- `run/spec007-t113-metrics-r2`;
- any T113 workflow execution;
- T113 result publication;
- `benchmarks/results/t113-historical-corpus-expansion.json`;
- manifest changes;
- dependency changes;
- comparator-command rewrites;
- reporter/proxy/preload semantic changes;
- membership-policy changes;
- retry/fallback behavior;
- synthetic or inferred runner evidence;
- metric/assertion weakening;
- selector/product/schema/receipt/CLI changes;
- donor/oracle/runtime substitution;
- T111/T112 replay reruns or rewrites;
- T078/T091/T095 rewrites;
- generalized benchmark frameworks, adapters, plugins, services, or arbitrary workflow input.

If the exact two-path surface is insufficient, R007-07 is:

`NO_GO / RETURN_TO_PLANNING`

It MUST NOT widen itself.

## Dependency order after R007-07

This authorization does not authorize successor implementation, but fixes the required sequence:

`R007-07 qualified closeout -> separate R007-08 authorization -> exact workflow amendment -> fresh mandatory preflight -> one exact successor create-event ref/run attempt -> conditional T113 publication -> T114`

A future R007-08 authorization must separately and explicitly name any successor ref. The candidate named by the canonical plan is `run/spec007-t113-metrics-r2`, but this artifact grants zero authority to create, move, execute, or admit that ref.

## R007-07 qualification and closeout

Before R007-07 implementation may merge, require:

- exact two-path purity;
- mandatory focused positive/adversarial evidence above;
- applicable typecheck/test/build;
- exact-head Self Verification;
- original-attempt exact-head Project CI six-lane success;
- fresh independent substantive exact-head correctness/security/governance review;
- reconciliation of every material finding, with any head mutation invalidating prior CI/review evidence;
- zero unresolved material review threads;
- current ruleset/observable protection verification;
- unchanged expected canonical `main` and exact PR head immediately before guarded merge;
- guarded merge with `expected_head_sha`;
- post-merge ordered-parent/tree/signature/PR/main/path verification;
- durable `R007-07 = CLOSED_CANONICAL / QUALIFIED` before any successor authorization or workflow mutation.

## Authorization qualification and effectivity

This authorization artifact itself may become effective only after:

1. exact one-path authorization-artifact purity;
2. exact final authorization head/tree verification;
3. applicable exact-head repository checks;
4. exact-head Self Verification;
5. original-attempt exact-head Project CI six-lane success;
6. fresh independent substantive exact-head authorization/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. unchanged expected canonical `main` and exact authorization PR head immediately before guarded merge;
11. guarded merge with `expected_head_sha`;
12. post-merge ordered-parent/tree/signature/PR/main/path verification;
13. durable Issue #219 closeout as `R007-07_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Any authorization-head mutation invalidates prior CI/review qualification.

## Hard prohibitions

- no implementation before this authorization is effective;
- no mutation beyond the exact two tracked paths;
- no rerun/move/delete/recreate/reuse of `r1` or run `34130848099`;
- no required-membership fallback or synthetic evidence;
- no comparator-command rewrite to obtain a report;
- no timing/cache-class reinterpretation;
- no metric/assertion weakening;
- no selector/product/schema/receipt/CLI mutation;
- no donor/oracle/runtime substitution;
- no replay or historical-result rewrite;
- no workflow/ref/publication mutation;
- no force-push/rebase/destructive history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated CI, review, authority, evidence, qualification, mergeability, or completion.
