# T113 r2 Reporter-Diagnostic Recovery Plan

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #230  
**Publication ledger:** Issue #208  
**Canonical planning base:** `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`  
**Canonical planning-base tree:** `21ca5805a7426dd32e020dfef43df24f73e617d4`

## Purpose

Define the smallest evidence-preserving recovery after both consumed T113 execution bindings (`r1` and `r2`) failed in the first Jotai T076 required project-native full-suite membership proof with no accepted runner JSON report.

This artifact is planning only. It grants no benchmark-code, test, workflow, execution-ref, result, product, selector, schema, dependency, runtime, donor, oracle, manifest, replay, historical-result, release, or publication authority.

Implementation may begin only after this exact final planning head is independently qualified, canonically merged, post-merge verified, Issue #230 is durably closed as `T113_RECOVERY_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`, and a separate implementation-authorization artifact becomes canonical and effective.

Live repository and GitHub truth override stale status text in historical artifacts.

## Canonical authority chain

Read this plan with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and implementation authorization;
4. the canonical T113 recovery artifacts already merged before `r1` and `r2`;
5. Issue #208;
6. Issue #230;
7. immutable `r1` and `r2` workflow evidence.

The previous `T113_T076_MEMBERSHIP_RECOVERY_PLAN.md` is historical recovery evidence. Its cache-preparation hypothesis was implemented and qualified, but the subsequent `r2` execution failed with the same missing-report condition. Therefore that plan is insufficient as authority for another repair.

## Immutable failed execution evidence

### Consumed r1

- ref: `run/spec007-t113-metrics-r1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- source tree: `821db43ba09624e05b8d29f1ab9541f786481354`;
- run: `34130848099`;
- attempt: `1`;
- job: `101770327800`;
- conclusion: `failure`;
- failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- no T113 candidate artifact.

### Consumed r2

- ref: `run/spec007-t113-metrics-r2`;
- source/workflow SHA: `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`;
- source tree: `21ca5805a7426dd32e020dfef43df24f73e617d4`;
- run: `34158105972`;
- attempt: `1`;
- job: `101854028688`;
- conclusion: `failure`;
- stage: first Jotai T076 project-native full-suite membership audit;
- failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- T077 skipped;
- T113 candidate construction skipped;
- artifact upload skipped;
- run artifact inventory empty.

Both refs/runs are immutable failure evidence. They MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, substituted, or reclassified.

Current truthful disposition:

`T113_R2_EXECUTION = FINAL_FAILURE`

`T113 = NO_GO / RETURN_TO_PLANNING`

`T114 = BLOCKED_BY_T113`

## What remains qualified

The two failed T113 execution bindings do not invalidate:

- T091 historical six-case aggregate evidence;
- T111 Jotai qualification;
- T112 Immer qualification;
- the frozen T111 revision-12-to-13 Jotai compatibility proof;
- R007-05 qualified replay admission/materialization semantics;
- R007-07 cache-preparation implementation as code qualification evidence;
- R007-08 single-use execution-binding qualification;
- T076 metric formulas;
- T077 assertion formulas;
- selector/product behavior;
- donor/oracle identities;
- frozen T078/T091/T095 published-result bytes.

R007-07 being code-qualified does not mean its causal hypothesis is proven. `r2` is direct evidence that its cache preparation was insufficient to produce the required T076 runner report in the real T113 lifecycle.

## Exact evidence-backed failure model

### Proven same-command capability in T075

Qualified T111 run `33991920845` used:

- case `jotai-splitatom-identical-write@1`;
- Linux x64;
- Node `24.15.0`;
- Yarn Classic `1.22.22`;
- exact project-native full-suite command `yarn test:ci --run`;
- donor package script `test:ci = vitest`.

Both qualified T111 observations produced genuine external runner JSON for the required project-native full-suite membership proof, with one report per observation and `oracle_membership = true`.

Therefore the reviewed `yarn test:ci --run` wrapper chain is demonstrably capable of producing valid structured membership evidence under the canonical T075 harness. No plan may claim that Yarn, the script wrapper, Vitest, or the reviewed command is inherently incapable of producing a report.

### Proven T076 failure semantics

Current canonical T076 `membershipAudit(...)`:

1. restores the measured source;
2. clears the four canonical managed ignored runner-cache paths;
3. constructs an absolute proof path;
4. derives the existing `membershipProofCommand(...)` variant;
5. constructs the sanitized runtime environment;
6. executes the proof process;
7. requires normal process exit;
8. requires the proof exit code to equal the already observed timed-comparator exit code;
9. only then calls `collectProofReports(...)`.

Both `r1` and `r2` failed inside report collection, not process admission and not exit-code equality. Therefore the proof process exited normally with the expected comparator exit code but no file matching the accepted proof-report path contract was found.

This proves a runner-report production/collection mismatch. It does not prove whether the immediate cause is preload reachability, runner-argument instrumentation, runner output behavior, path creation, child-process shape, lifecycle state, or another bounded implementation detail.

### Diagnostic asymmetry is proven

Canonical T075 `runMembershipProof(...)` preserves bounded proof stdout/stderr in its no-report failure message before failing closed.

Canonical T076 `collectProofReports(...)` currently throws only:

`membership audit did not produce a runner JSON report`

The T076 failure path therefore discards the already captured proof stdout/stderr and its exact process digest at the point where those bytes are most useful for distinguishing reporter-production failure from report-collection failure.

The immutable `r1`/`r2` logs consequently do not reveal whether `membership-preload.cjs` reached the target Vitest entry, whether it emitted the existing controlled-reporter warning, whether the runner emitted a reporter/output diagnostic, or whether the reviewed command completed as an uninstrumented normal run.

This is a bounded observability defect in the T076 failure path. Fixing that diagnostic defect MUST NOT make missing membership evidence successful.

### Existing R007-07 regression coverage is narrower than the failed production lifecycle

The R007-07 local positive/adversarial fixture calls a synthetic local runner directly through a command shaped as:

`./node_modules/.bin/vitest`

The real failed Jotai command is:

`yarn test:ci --run`

with `test:ci = vitest`.

The fixture proves the proxy/preload/report contract for a direct local-bin entry. It does not prove the exact package-manager-script process chain used by `r1`/`r2`, and it does not reproduce the complete T076 sequence of cold timed execution, warm timed execution, source restoration, cache preparation, then required membership proof.

That test-coverage gap explains why the R007-07 implementation could be locally qualified without reproducing the exact T113 failure lifecycle. It does not by itself prove the production root cause.

### Cache hypothesis is exhausted

R007-07 now clears exactly the same four managed ignored runner-cache paths immediately before T076 membership instrumentation. `r2` still failed with the same no-report condition.

No further cache path may be guessed or added merely because `r2` failed. Any broader cache claim requires deterministic evidence first.

### Process-runner equivalence

The relevant T075 `runBounded(...)` and T076 `runProcess(...)` paths both use non-shell `spawn`, detached process groups on non-Windows, bounded stdout/stderr capture, close-based completion, and bounded timeout termination. No current evidence supports replacing the process runner or treating that implementation difference as causal.

### Materialization cleanup is not a proven cause

Qualified materialization retains the bounded controller root when `--keep-temp` is used. Its finalizer removes the T075 short NX socket directory, while T076 creates its own bounded NX socket directory before comparator execution.

Jotai's reviewed full command is Vitest-based and not Nx-based. No current evidence supports treating the NX socket transition as causal or broadening recovery around it.

## Classification

The observed condition remains an **implementation/evidence-observability defect**, not a benchmark-semantic or membership-policy defect.

Required project-native full-suite membership remains structured-report-only. Missing required runner JSON remains a hard failure. No policy weakening is needed or permitted to continue diagnosis.

The exact production cause beyond the proven diagnostic and regression-parity gaps remains unproven. The next implementation unit must establish that cause deterministically or stop; it MUST NOT consume another execution ref as a speculative diagnostic experiment.

## Invariants

All recovery work MUST preserve:

1. required project-native full-suite membership as genuine structured runner-report evidence;
2. no synthetic report, assertion, execution, membership, hit, miss, availability, or success fact;
3. exact reviewed comparator command text;
4. existing restricted-command parsing;
5. existing `membershipProofCommand(...)` authority model;
6. existing proxy/preload reporter-only evidence model unless a later separately planned repair proves that component itself is defective;
7. existing expected-exit equality requirement;
8. existing cold/warm timing observations and cache semantics;
9. existing source restoration and measured-path validation;
10. fail-closed missing/empty/oversized/malformed/structurally invalid membership evidence;
11. T111/T112 replay evidence and qualification;
12. R007-05 replay/materialization identity gates;
13. T076 metric formulas and output meaning;
14. T077 assertion formulas and output meaning;
15. product/selector/receipt/schema/CLI behavior;
16. frozen T078/T091/T095 bytes;
17. `no_pre_data_recall_threshold = true`;
18. no post-data universal acceptance threshold;
19. no direct publication from a diagnostic or execution workflow;
20. immutable `r1` and `r2` failure evidence.

## R007-09 — T076 reporter-diagnostic parity and exact wrapper-lifecycle reproduction

R007-09 is implementation-ineligible until a separate implementation authorization becomes canonical and effective.

### Prospective exact tracked mutation surface

Exactly:

- `benchmarks/metrics.mjs`;
- `tests/benchmark-metrics.test.ts`.

No other tracked path is planned.

If deterministic evidence requires `benchmarks/harness-lib.mjs`, `benchmarks/membership-proxy.mjs`, `benchmarks/membership-preload.cjs`, `benchmarks/run.mjs`, a workflow, a dependency, donor code, manifest changes, comparator-command changes, membership-policy changes, metric/assertion changes, product/selector/schema/CLI changes, or a new generalized framework, R007-09 is `NO_GO / RETURN_TO_PLANNING`. It MUST NOT widen itself.

### Required diagnostic behavior

R007-09 MAY improve only the missing-report failure diagnostics in T076. It MUST:

1. retain the same success criteria and report collector;
2. retain the same proof process, command, runner kind, reporter/output contract, expected-exit check, and report validation;
3. on missing report only, expose a bounded diagnostic derived from the already captured proof result;
4. include enough bounded evidence to distinguish at least normal uninstrumented output, preload-controlled-reporter warning, runner/reporter setup failure, and silent no-report completion where those bytes are actually present;
5. preserve output truncation state and process outcome/exit code;
6. avoid secrets and raw controller environment values;
7. never persist arbitrary donor output into canonical result JSON;
8. never convert a diagnostic signature into membership evidence;
9. never downgrade no-report from failure;
10. never add retry or fallback.

The preferred implementation is to pass the already captured proof result into the existing report-collection failure boundary and include a bounded text projection plus the existing process-output digest in the thrown failure. No new persisted schema is planned.

### Required exact-lifecycle regression fixture

Tests MUST add a deterministic local fixture that mirrors the real Jotai command chain rather than invoking the fake runner only as a direct binary.

The fixture MUST include:

- an exact command shape `yarn test:ci --run`;
- a fixture `package.json` whose `scripts.test:ci` resolves to a local Vitest-shaped runner;
- the existing membership proxy/preload mechanism, unchanged;
- two ordinary comparator executions representing T076 cold and warm observations;
- source restoration between the ordinary executions as applicable to the existing T076 helper under test;
- existing managed-cache preparation immediately before membership proof;
- the required membership proof as the third comparator execution;
- an actual external JSON report for the positive path;
- actual report-based oracle-id membership, not a synthesized return value.

The fixture MUST also deterministically exercise no-report and malformed-report modes through the same `yarn test:ci --run` wrapper lifecycle and prove that both remain hard failures.

### Required causal gate

R007-09 is not permitted to guess a production repair.

Before any non-diagnostic behavioral change inside its two-path surface, focused tests must reproduce a concrete failure mechanism that is materially equivalent to the immutable T113 condition:

- reviewed-command wrapper process exits normally;
- exit code equals the ordinary comparator exit code;
- required external runner JSON is absent;
- failure occurs after the cold/warm/proof sequence;
- the reproduced cause is attributable to code already inside the two-path R007-09 boundary.

Only if that deterministic reproduction identifies a bounded defect inside `benchmarks/metrics.mjs` may the same R007-09 implementation repair it, with a before/after regression proving genuine external JSON is restored without weakening any gate.

If the exact wrapper-lifecycle fixture produces valid JSON under current code and cannot reproduce a bounded metrics-layer cause, R007-09 MUST stop after diagnostic-parity work and return to planning. No successor T113 execution ref may be created merely to discover the cause remotely.

### Focused regression requirements

At minimum, exact-head tests must prove:

1. the `yarn test:ci --run` wrapper-chain positive case produces genuine external runner JSON;
2. the positive case proves the reviewed oracle id only from that report;
3. cold/warm ordinary executions precede proof without changing timing semantics;
4. managed-cache preparation still occurs only after timed collection;
5. no-report remains a hard `oracle_membership` failure;
6. no-report failure includes bounded non-secret proof diagnostics;
7. malformed JSON remains a hard failure;
8. missing `testResults` remains a hard failure;
9. report-size and aggregate-size caps remain enforced;
10. instrumentation exit-code mismatch remains a hard failure;
11. source-restoration and measured-path rules remain unchanged;
12. existing direct-bin fixture behavior remains valid;
13. existing qualified replay/materialization tests remain green;
14. existing aggregate/metric/assertion tests remain green;
15. no product/public API or persisted-result contract changes.

### R007-09 qualification

Before canonical merge require:

- exact two-path purity;
- focused positive/adversarial exact-lifecycle tests;
- applicable typecheck/test/build;
- exact-head Self Verification;
- original-attempt exact-head six-lane Project CI success;
- fresh independent substantive exact-head correctness/security/governance review;
- reconciliation of every material current-head finding;
- zero unresolved material review threads;
- current ruleset/observable protection verification;
- unchanged expected canonical `main` and exact PR head immediately before merge;
- guarded normal merge with `expected_head_sha`;
- post-merge ordered-parent/tree/signature/PR/main/path proof;
- durable closeout stating whether a bounded metrics-layer cause was proven and repaired or whether diagnosis remains incomplete.

Any head mutation invalidates prior CI/review qualification.

## Successor execution authority

This plan authorizes no successor execution ref.

`run/spec007-t113-metrics-r1` and `run/spec007-t113-metrics-r2` are permanently consumed.

A future execution ref may be named only after:

1. this planning artifact is canonically qualified and merged;
2. separate R007-09 implementation authorization becomes effective;
3. R007-09 implementation is canonically qualified and closed;
4. R007-09 proves and repairs a bounded cause rather than only improving diagnostics;
5. a separate prospective workflow/execution authorization explicitly names one never-before-created successor ref;
6. the workflow binding is separately qualified and merged if a binding mutation is required;
7. a mandatory fresh preflight passes immediately before ref creation.

Candidate naming, if later authorized, should continue monotonically (for example `run/spec007-t113-metrics-r3`), but this planning artifact does not reserve or authorize that name.

No speculative execution may be used as a diagnostic test.

## Future mandatory fresh preflight

Any later authorized successor execution must freshly prove, from then-live truth:

- exact then-current canonical main/tree and all new recovery merge identities;
- exact T091 run/artifact availability and approved archive digest;
- exact T111/T112 run/artifact availability and replay/evidence hashes;
- exact historical/current T111 manifest/Jotai compatibility;
- exact current manifest/case identities;
- exact frozen T078/T091/T095 blobs;
- immutable existence and identities of consumed r1/r2 refs/runs;
- absence of the newly authorized successor ref;
- absence of any prior T113 executor create-run for that successor ref;
- exact workflow event/ref/attempt/source/toolchain/least-privilege constraints;
- no newly introduced retry, wildcard, arbitrary input, or direct publication route.

Any failed gate returns to planning before ref creation.

## T113 publication remains blocked

`benchmarks/results/t113-historical-corpus-expansion.json` MUST NOT be created from `r1`, `r2`, diagnostics, partial T076 output, historical T075 membership, inferred equivalence, or synthesized data.

T113 publication becomes eligible only after a genuine future authorized attempt-1 execution produces a bounded candidate artifact that passes all canonical identity, availability, assertion, and provenance checks.

Publication remains exactly one additive path and must preserve `hit | miss | unavailable`, explicit availability counts, `no_pre_data_recall_threshold = true`, absolute assertions, frozen historical result bytes, and exact machinery/run/artifact provenance.

## T114 remains blocked

T114 remains blocked until T113 is canonically closed with genuine accepted evidence.

If recovery cannot establish a valid T113 execution route without weakening evidence semantics, Spec 007 must eventually close honestly as `NO_GO / RETURN_TO_PLANNING` or a stronger terminal verdict supported by then-current governance. It must not be converted to GO by omission.

## Hard prohibitions

- no rerun/job rerun of `r1` or `r2`;
- no move/delete/recreate/reuse of either consumed ref;
- no substitute execution ref before new prospective authority;
- no missing-report fallback;
- no synthetic runner JSON;
- no stdout/stderr interpretation as membership evidence;
- no comparator-command rewrite merely to obtain a report;
- no membership-policy weakening;
- no metric/assertion weakening;
- no product/selector/schema/receipt/CLI mutation;
- no T111/T112 replay rerun or rewrite;
- no donor/oracle/runtime substitution;
- no historical-result rewrite;
- no post-data acceptance threshold;
- no guessed cache expansion;
- no generalized instrumentation framework;
- no new dependency/service/plugin merely to diagnose the failure;
- no force-push/rebase/destructive history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated CI, review, authority, evidence, qualification, mergeability, readiness, or completion.

## Exact-head planning audit checklist

A fresh independent reviewer MUST answer YES to all of the following:

1. Are `r1` and `r2` preserved as immutable final failure evidence?
2. Does the plan state that R007-07 cache preparation was insufficient without falsely declaring another cache cause?
3. Does it preserve structured-report-only required membership?
4. Does it distinguish the proven T076 diagnostic asymmetry from the still-unproven production root cause?
5. Does it bind the real Jotai command to `yarn test:ci --run` and the donor script to `vitest`?
6. Does it acknowledge that T075 produced genuine required full-suite JSON twice through the same reviewed command?
7. Does it identify the existing direct-bin R007-07 fixture as narrower than the failed package-manager-script lifecycle?
8. Is R007-09 prospectively limited to `benchmarks/metrics.mjs` and `tests/benchmark-metrics.test.ts`?
9. Must R007-09 stop rather than widen if the cause lies in proxy/preload/harness/workflow/dependencies or another path?
10. Must diagnostics remain bounded, non-secret, and non-evidentiary?
11. Does no-report remain a hard failure?
12. Must a deterministic exact-wrapper lifecycle reproduce a bounded cause before any behavioral repair?
13. Is another execution ref forbidden unless R007-09 proves and repairs a cause and separate prospective authority later names a fresh ref?
14. Are T091/T111/T112, T078/T091/T095, metric/assertion semantics, product behavior, and threshold policy frozen?
15. Does this artifact grant zero implementation, execution, or publication authority?

Any NO answer is a material planning finding.

## Planning qualification and closeout

This planning PR requires:

1. exact one-path planning purity;
2. exact final head/tree verification;
3. applicable exact-head repository checks;
4. exact-head Self Verification;
5. original-attempt exact-head Project CI six-lane success;
6. fresh independent substantive exact-head planning/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. unchanged expected canonical `main` and exact PR head before merge;
11. guarded normal merge with `expected_head_sha`;
12. post-merge ordered-parent/tree/signature/PR/main/path verification;
13. durable Issue #230 closeout as:

`T113_RECOVERY_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`

After that closeout, create a separate implementation-authorization artifact. Do not implement R007-09 from planning authority.