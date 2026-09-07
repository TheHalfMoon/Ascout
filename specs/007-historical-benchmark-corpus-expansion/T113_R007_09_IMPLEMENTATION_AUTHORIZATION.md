# T113 R007-09 Implementation Authorization

**Status:** `IMPLEMENTATION_AUTHORIZATION_CANDIDATE / NOT_EFFECTIVE_UNTIL_CANONICAL_MERGE`  
**Authorization ledger:** Issue #234  
**Publication ledger:** Issue #208  
**Canonical authorization base:** `137d6cf04802c5a596327cd19511dd7ce8328e3f`  
**Canonical authorization-base tree:** `479f7beba838e176eca7bd3d6750f8315e0a82d1`

## Purpose

Prospectively authorize one bounded implementation unit, R007-09, to diagnose the proven T076 missing-runner-report observability gap, reproduce the failed production process topology deterministically, and repair runtime behavior only if focused evidence attributes a bounded cause inside the exact authorized implementation surface.

This document is an authorization candidate only. It becomes effective only after its exact final head is independently qualified, guarded-merged to canonical `main`, post-merge identity is mechanically verified, and Issue #234 is durably closed with:

`R007-09_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Until all of those conditions are true, no implementation mutation is authorized.

Live repository and GitHub truth override stale status text in this artifact.

## Canonical authority chain

Read this authorization with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and prior implementation-authorization artifacts;
4. `specs/007-historical-benchmark-corpus-expansion/T113_R2_REPORTER_DIAGNOSTIC_RECOVERY_PLAN.md`;
5. Issue #208;
6. closed planning ledger #230;
7. authorization ledger #234;
8. immutable r1/r2 execution evidence.

The research-only source study merged through PR #233 is useful future strategy evidence but is explicitly non-authoritative for this unit. It grants no security-integration authority and MUST NOT widen R007-09.

## Canonical predecessor

The recovery planning predecessor is canonically complete:

- planning PR: #232;
- planning head: `7af5ae217ee5710ba4c01d93b7c0e54d3d26caec`;
- planning merge: `f1d6866b54d06322a1a606a0aba4676b37e54c8d`;
- planning merge tree: `13695524c38d6ddc995986429d54d92299ec5305`;
- planning ledger #230: `T113_RECOVERY_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`.

The current authorization base additionally contains only the separately qualified research-only source study from PR #233:

- source-study head: `c4b0819d363f13d26d11082143585efedb0b8439`;
- source-study merge: `137d6cf04802c5a596327cd19511dd7ce8328e3f`;
- source-study merge tree: `479f7beba838e176eca7bd3d6750f8315e0a82d1`;
- source-study status: `RESEARCH_ONLY / NON_AUTHORITATIVE / IMPLEMENTATION_NOT_AUTHORIZED`.

This authorization does not adopt any source-study implementation scope.

## Immutable failed execution evidence

### Consumed r1

- ref: `run/spec007-t113-metrics-r1`;
- run: `34130848099`;
- attempt: `1`;
- job: `101770327800`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- conclusion: `failure`;
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- T113 candidate artifact: none.

### Consumed r2

- ref: `run/spec007-t113-metrics-r2`;
- run: `34158105972`;
- attempt: `1`;
- job: `101854028688`;
- source/workflow SHA: `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`;
- source tree: `21ca5805a7426dd32e020dfef43df24f73e617d4`;
- conclusion: `failure`;
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- T077: skipped;
- candidate construction: skipped;
- candidate upload: skipped;
- workflow artifact inventory: empty.

Both executions are immutable failure evidence. They MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, substituted, or reclassified.

## Proven diagnostic facts

The following facts are already supported by canonical code and immutable execution evidence.

### The failure occurs after process and comparator admission

Current T076 `membershipAudit(...)` performs:

1. measured-source restoration;
2. canonical managed runner-cache preparation;
3. proof-path creation;
4. membership command construction;
5. sanitized runtime-environment construction;
6. proof execution;
7. normal-exit validation;
8. proof/comparator exit-code equality validation;
9. structured report collection.

Both r1 and r2 failed at structured report collection. Therefore the proof process had already exited normally with the expected comparator exit code.

### T075 proves the reviewed wrapper can produce real runner JSON

Qualified T111 used:

- `yarn test:ci --run`;
- donor script `test:ci = vitest`;
- Linux x64;
- Node `24.15.0`;
- Yarn Classic `1.22.22`.

Both qualified T111 observations produced genuine required full-suite runner JSON. R007-09 therefore MUST NOT classify Yarn, the package script, Vitest, or the reviewed command as inherently incapable of structured membership proof.

### Diagnostic asymmetry is proven

Canonical T075 preserves bounded proof stdout/stderr in its no-report failure path. Current T076 report collection throws only:

`membership audit did not produce a runner JSON report`

The T076 failure path therefore hides already captured proof output that could distinguish reporter-production failure from collection failure. Restoring bounded diagnostic parity is independently justified and MUST NOT weaken membership requirements.

### Existing R007-07 regression topology is narrower than production

The R007-07 fixture invokes a synthetic direct local runner shaped as:

`./node_modules/.bin/vitest`

The failed production command is:

`yarn test:ci --run`

with `test:ci = vitest`.

The prior fixture does not model the package-manager-script process boundary or the complete cold comparator -> warm comparator -> restoration -> cache preparation -> membership proof topology.

### Cache expansion is not justified

R007-07 already clears exactly the canonical four ignored repository cache paths immediately before T076 proof:

- `.nx/cache`;
- `.nx/workspace-data`;
- `.cache`;
- `node_modules/.cache`.

r2 still failed. No additional cache path may be guessed or added without deterministic focused evidence.

### Materialization/proxy/preload mutation is not currently justified

Read-only analysis found no current evidence that qualified materialization cleanup caused the failure. The measured repo, reconstructed dependency state, and controller root remain retained under the relevant materialization mode; only bounded Nx socket cleanup occurs.

T075 and T076 also share the existing `membershipProofCommand(...)` proxy/preload instrumentation primitives. No current evidence justifies mutating `benchmarks/harness-lib.mjs`, `benchmarks/membership-proxy.mjs`, `benchmarks/membership-preload.cjs`, or `benchmarks/run.mjs`.

## Root-cause state

Current truthful state:

`ROOT_CAUSE = UNPROVEN`

`DIAGNOSTIC_PARITY_NEED = PROVEN`

`EXACT_WRAPPER_LIFECYCLE_TEST_GAP = PROVEN`

`CACHE_EXPANSION_JUSTIFIED = NO`

`PROXY_PRELOAD_MUTATION_JUSTIFIED = NO`

`MATERIALIZATION_MUTATION_JUSTIFIED = NO`

`SUCCESSOR_EXECUTION_AUTHORIZED = NO`

A material remaining hypothesis class is residual runtime state after the T076 cold/warm comparator sequence and before the proof. That is a hypothesis class only. The implementation unit must reproduce and attribute a bounded cause before repairing behavior.

## Exact authorized implementation surface

After this authorization becomes effective, R007-09 may mutate exactly these two tracked paths:

1. `benchmarks/metrics.mjs`
2. `tests/benchmark-metrics.test.ts`

No other tracked path is authorized.

If deterministic evidence indicates that a correct repair requires any other tracked path, R007-09 MUST stop and return to planning.

## Authorized objective A — T076 no-report diagnostic parity

R007-09 MAY change the T076 no-report failure path inside `benchmarks/metrics.mjs` so that a missing accepted structured runner JSON report includes bounded diagnostic context derived from the already captured proof execution.

Required properties:

- missing required structured runner JSON remains a hard failure;
- stdout/stderr never satisfies membership;
- textual test-name parsing never becomes membership evidence;
- synthetic JSON is forbidden;
- successful structured-report behavior remains semantically unchanged;
- proof normal-exit requirement remains unchanged;
- proof/comparator exit-code equality remains unchanged;
- report path/size/JSON/runner validation remains fail-closed;
- diagnostic output is bounded;
- tests assert deterministic bounded behavior without storing secrets or uncontrolled unbounded output.

A conforming diagnostic may include bounded stdout/stderr excerpts and/or the already computed proof output digest. It MUST remain diagnostic metadata only.

## Authorized objective B — exact wrapper/process-topology regression fixture

R007-09 MUST add deterministic focused coverage in `tests/benchmark-metrics.test.ts` that represents the materially different production topology.

The fixture must represent the reviewed command shape:

`yarn test:ci --run`

with a fixture manifest containing a script equivalent to:

`test:ci = vitest`

The fixture must exercise the relevant T076 sequence:

1. cold timed comparator execution;
2. warm timed comparator execution;
3. measured-source restoration;
4. canonical four-path managed cache preparation;
5. required membership-proof instrumentation;
6. structured report production/collection;
7. proof/comparator exit-code equality;
8. accepted proof or fail-closed no-report disposition.

Required cases include:

- positive structured-report production and accepted membership;
- no-report failure with bounded diagnostics;
- malformed-report failure that remains fail-closed;
- proof/comparator exit mismatch remains fail-closed if applicable to the fixture.

## Fixture portability constraint

Canonical Project CI installs Ascout with npm and does not explicitly provision Yarn. R007-09 MUST NOT introduce:

- a new dependency;
- a workflow step;
- an implicit install;
- reliance on an undeclared GitHub-runner global Yarn installation.

The fixture must preserve the package-manager-script process boundary deterministically inside the authorized test file. If necessary, it may construct a bounded test-only launcher named `yarn` on the fixture `PATH` that performs only the package-script dispatch needed to model:

`parent process -> yarn-shaped launcher -> test:ci script -> local Vitest-shaped child`

Such test machinery is not evidence about Yarn Classic semantics and MUST NOT be represented as such. Genuine Yarn Classic capability remains grounded in qualified T111 evidence.

Markers:

`CI_TOOLCHAIN_EXPANSION_AUTHORIZED = NO`

`NEW_DEPENDENCY_AUTHORIZED = NO`

`AMBIENT_YARN_ASSUMPTION_ALLOWED = NO`

`EXACT_WRAPPER_PROCESS_TOPOLOGY_REQUIRED = YES`

## Causal gate for behavioral repair

Diagnostic parity and exact lifecycle regression coverage are authorized.

A behavioral runtime repair beyond diagnostic parity is authorized only if focused deterministic evidence:

1. reproduces a materially equivalent missing-report condition through the exact wrapper/lifecycle fixture;
2. distinguishes report production from report collection failure;
3. attributes the cause to implementation behavior inside `benchmarks/metrics.mjs`;
4. demonstrates that the proposed bounded change eliminates the reproduced cause;
5. preserves structured-report-only membership semantics and all existing adversarial fail-closed cases.

If these conditions are not proven, R007-09 MUST NOT invent a repair.

Required disposition in that case:

`R007-09 = NO_GO / RETURN_TO_PLANNING`

A remote successor execution MUST NOT be consumed merely to discover the cause.

## Preserved evidence and semantics

R007-09 MUST preserve without substitute regeneration:

- T091 six-case aggregate evidence;
- T111 Jotai qualification;
- T112 Immer qualification;
- frozen T111 revision-12-to-13 Jotai compatibility proof;
- frozen T078/T091/T095 published result bytes;
- R007-05 replay admission/materialization semantics;
- R007-07 qualification evidence as historical implementation evidence;
- R007-08 qualification evidence as historical single-use binding evidence;
- T076 metric formulas;
- T077 assertion formulas;
- selector/product behavior;
- donor/oracle identities;
- `no_pre_data_recall_threshold = true`.

R007-07 being qualified code evidence does not prove its original causal hypothesis; r2 already disproved sufficiency of that hypothesis in the real T113 lifecycle.

## Explicit non-grants

This authorization does NOT authorize:

- any successor T113 execution ref;
- the name `r3` or any other future execution-ref name;
- any mutation under `.github/workflows/`;
- rerun or failed-job rerun of r1 or r2;
- move/delete/recreate/reuse of r1 or r2 refs;
- T111/T112 replay regeneration as substitute evidence;
- T113 publication;
- T114 mutation;
- T075 semantics mutation;
- T076 metric formula changes;
- T077 assertion formula changes;
- membership-policy weakening;
- stdout/stderr or textual output as positive membership proof;
- guessed cache expansion;
- `benchmarks/harness-lib.mjs` mutation;
- `benchmarks/membership-proxy.mjs` mutation;
- `benchmarks/membership-preload.cjs` mutation;
- `benchmarks/run.mjs` mutation;
- product, selector, receipt, schema, CLI, package, dependency, runtime, donor, oracle, replay, manifest, or historical-result mutation;
- source-study security integration;
- AICGSecEval, AI-Infra-Guard, or Magika code/data/rule/model/dependency import;
- npm/tag/release publication;
- force-push, rebase, or destructive history rewrite.

## Implementation branch discipline

After this authorization becomes effective:

1. re-read exact then-current canonical `main` and Issue #234;
2. create a separate R007-09 implementation branch from that exact canonical commit;
3. mutate only the two authorized implementation paths;
4. keep diagnostic and causal evidence in the implementation PR body/comments unless a separately authorized evidence path is required;
5. do not create any successor execution ref;
6. do not mutate a future task before R007-09 is canonically closed.

## Focused implementation qualification

A future R007-09 implementation PR must, at minimum, demonstrate on its exact final head:

- exact changed-file set limited to the two authorized paths;
- focused regression tests for diagnostic parity and exact wrapper/lifecycle topology;
- existing benchmark-metrics tests;
- TypeScript/JavaScript syntax and applicable type/build checks;
- successful positive structured-report case;
- fail-closed no-report case;
- fail-closed malformed-report case;
- preservation of existing adversarial membership cases;
- evidence of whether a bounded root cause was or was not reproduced;
- no mutation to frozen evidence/result blobs;
- no workflow/dependency/toolchain expansion;
- exact-head Self Verification success;
- original-attempt exact-head Project CI success on all six required OS/Node lanes;
- fresh independent substantive exact-head implementation/correctness/security/governance review;
- zero unresolved material review threads;
- current rules/protection truth;
- guarded normal merge with exact expected head SHA;
- post-merge canonical identity/tree/path/signature/PR verification.

Allowed implementation closeouts:

`R007-09 = CLOSED_CANONICAL / QUALIFIED`

or

`R007-09 = NO_GO / RETURN_TO_PLANNING`

## Success does not authorize execution

Even if R007-09 closes as qualified, no new T113 execution ref becomes authorized automatically.

A future successor execution requires a separate canonical planning/authorization unit that prospectively defines:

- one new never-before-created exact ref;
- exact workflow binding;
- single-use create-event semantics;
- attempt-1-only qualification;
- exact source/workflow binding;
- fresh read-only preflight;
- frozen T091/T111/T112 artifact identities and current availability;
- historical/current manifest compatibility;
- frozen T078/T091/T095 blob identities;
- exact toolchain and permissions;
- candidate-only/no-publication semantics;
- immutable failure treatment if the successor fails.

No successor run may be used as a speculative diagnostic experiment.

## Authorization-candidate qualification gate

This authorization becomes effective only if its exact final head satisfies all of the following:

1. exactly one additive authorization artifact changed;
2. canonical base is the exact then-current `main`;
3. Self Verification succeeds on exact head;
4. original-attempt Project CI succeeds on exact head across all six required OS/Node jobs;
5. a fresh independent substantive exact-head authorization/correctness/security/governance review reports no material unresolved finding;
6. unresolved material review threads are zero;
7. current rules/protection truth is recorded without inventing unavailable administration evidence;
8. guarded normal merge uses the exact reviewed head SHA;
9. post-merge verification proves canonical main, ordered parents, expected tree/path delta, valid GitHub verification, and merged/closed PR state;
10. Issue #234 is durably closed with:

`R007-09_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

If any gate fails, implementation remains unauthorized.

## Current disposition

Until the authorization-candidate qualification gate closes:

`R007-09_IMPLEMENTATION_AUTHORIZED = NO`

`SUCCESSOR_T113_EXECUTION_AUTHORIZED = NO`

`T113 = NO_GO / RETURN_TO_PLANNING`

`T114 = BLOCKED_BY_T113`
