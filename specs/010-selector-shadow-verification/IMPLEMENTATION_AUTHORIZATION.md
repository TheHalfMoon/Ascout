# Specification 010 — T117 Implementation Authorization

## Status

`SPEC_010_T117_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`T117_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the repository authorization candidate for Issue #264. It grants no implementation authority until it is independently qualified, guarded-merged, post-merge verified, and Issue #264 is closed `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Specification 010 planning is canonically closed at:

- planning issue: #261;
- planning PR: #262;
- final planning head: `908b07fb056e72f55f8f9823712148e13058ba53`;
- final planning-head tree: `55bc9b8d5fcd8da7e78e5d07173d01c58dbd7427`;
- canonical planning merge: `0076d8ece12a478e4bcfb9d54cf546e1fd1e8291`;
- canonical planning merge tree: `55bc9b8d5fcd8da7e78e5d07173d01c58dbd7427`;
- ordered planning-merge parents:
  1. `ec78d0225f66390ad45804fb122b6d51c4f6980f`;
  2. `908b07fb056e72f55f8f9823712148e13058ba53`;
- GitHub merge verification: `verified=true`, `reason=valid`;
- planning Self Verification: run `34271728363`, `run_attempt=1`, `SUCCESS`;
- planning Project CI: run `34271728417`, `run_attempt=1`, `SUCCESS`, six of six required OS/Node lanes successful;
- final independent exact-head planning review: CodeRabbit comment `5591096123`, exact range `ec78d0225f66390ad45804fb122b6d51c4f6980f..908b07fb056e72f55f8f9823712148e13058ba53`, no remaining material planning findings;
- unresolved material planning review threads: `0`.

The authoritative planning contract is the exact canonically merged content under `specs/010-selector-shadow-verification/**`.

## Authority activation boundary

Until this artifact itself becomes canonical and Issue #264 closes effective:

- T117 repository mutation is forbidden;
- `benchmarks/selector-shadow.mjs` is not authorized to be created or changed under Spec 010;
- `tests/t117-selector-shadow.contract.test.ts` is not authorized to be created or changed under Spec 010;
- T118 remains blocked;
- no workflow, product, selector, Receipt v1, schema, validator, CLI, package, dependency, Project CI, benchmark-result, historical-result, Spec 007, release, tag, or publication mutation follows from this candidate.

After this artifact becomes canonical and Issue #264 closes `CLOSED_CANONICAL / EFFECTIVE`, only the bounded T117 authority below becomes effective.

## T117 authorized tracked surface

Exactly two tracked repository paths are authorized for T117:

- `benchmarks/selector-shadow.mjs`;
- `tests/t117-selector-shadow.contract.test.ts`.

No third helper, fixture, snapshot, generated schema, product file, workflow file, package file, result artifact, or release file is authorized.

T117 must remain repository-internal measurement infrastructure and focused contract proof only.

## Frozen T117 behavior

T117 must implement only the canonically frozen behavior in `spec.md`, `plan.md`, and `tasks.md`:

1. consume the exact Spec 006 `self-verification-receipt.json` and `self-verification-envelope.json` inputs supplied by the caller;
2. validate the envelope shape and `SHADOW_NON_GATING` classification required by the canonical Spec 006 contract;
3. verify the exact receipt SHA-256 binding declared by the envelope before any comparison;
4. prove the current reconstructed subject is still exactly the expected merge-base/head-tree state before reference execution;
5. require exactly one comparable Ascout test task with normal command admission and completed comparable evidence;
6. require the root package contract `scripts.test == "vitest run"` and use only the already-installed local Vitest executable from the exact runtime;
7. execute exactly one full-suite structured JSON reference with no shell, no retry, no fallback command, no implicit installation, and an exact 10-minute timeout;
8. treat timeout, spawn failure, missing structured report, malformed structured report, source drift, command-contract mismatch, or other canonically enumerated comparability/integrity failure as explicit `UNAVAILABLE` shadow evidence rather than a no-miss claim;
9. extract full-suite failing identities exactly as `(repository-relative path, fullName)`;
10. extract Ascout test-finding identities exactly as `(finding.path, finding.rule_or_test_id)` from the comparable test task;
11. compare identities by exact tuple equality only;
12. publish every unmatched full-suite failure identity as an observed selector miss;
13. perform the required post-reference source-stability proof before publication;
14. emit exactly one bounded deterministic `selector-shadow-observation.json` outside repository source identity;
15. classify the observation as `SELECTOR_SHADOW_NON_GATING`;
16. preserve `UNAVAILABLE`, observed no-miss, and observed miss as distinct factual dispositions;
17. treat an observed selector miss as successful non-gating measurement evidence, not as harness failure and not as merge authority.

No fuzzy path matching, title normalization, suffix inference, threshold, recall percentage gate, causal attribution, or universal selector-recall claim is authorized.

## Exact timeout authority

The full-suite reference timeout is frozen prospectively at exactly 10 minutes.

T117 may not increase, adapt, or retry that timeout after observing live behavior. If the exact 10-minute boundary proves insufficient for a required canonical case or reveals an unplanned runtime requirement:

`T117 = NO_GO / RETURN_TO_PLANNING`

No timeout widening or alternate command may be hidden inside implementation remediation.

## Command and dependency boundary

T117 must reuse only existing repository-owned runtime and installed dependency surfaces.

It may not:

- alter `package.json` or any lockfile;
- invoke a package manager to add/install/repair a dependency;
- use `npx`, `npm exec`, download-on-demand behavior, network fallback, or remote service;
- execute an alternate test command when the exact root `scripts.test` contract is absent or different;
- introduce a generic runner adapter, plugin SDK, telemetry client, database, model, hosted service, donor repository, or external oracle.

Command-contract or local-runtime unavailability is evidence, not permission to expand scope.

## Evidence and privacy boundary

The T117 observation must remain deterministic and bounded to the canonical planning contract.

It must not publish:

- raw stdout or stderr;
- absolute filesystem paths;
- actor identity;
- host identity;
- repository URL;
- environment dumps;
- credentials, tokens, secrets, or secret-derived values;
- arbitrary source-file contents;
- unbounded test-runner payloads.

The observation may contain only the bounded identifiers, digests, durations, counts, exact normalized failure identities, selector-miss identities, source bindings, and disposition fields required by the canonical Spec 010 contract.

## Focused contract proof

`tests/t117-selector-shadow.contract.test.ts` must prove the complete material boundary frozen in `plan.md §14`, including at minimum:

- exact receipt/envelope digest success and digest-replacement rejection;
- malformed/missing envelope and receipt rejection or explicit unavailability as canonically specified;
- source-binding mismatch and pre/post source-drift handling;
- comparable test-task acceptance;
- admission-refused, blocked, errored, not-run, not-applicable, ambiguous, or otherwise incomparable task handling;
- exact `scripts.test == "vitest run"` command-contract enforcement;
- local-Vitest-only execution and no implicit install/fallback;
- exact 10-minute timeout and no retry semantics;
- structured-report success, missing-report, malformed-report, and process-failure handling;
- repository-relative path normalization and unsafe/out-of-repository identity rejection;
- exact `(path, fullName)` and `(path, rule_or_test_id)` identity boundaries;
- exact-match no-miss behavior;
- unmatched full-suite failure publication as selector miss;
- deterministic ordering;
- bounded/privacy-safe output;
- `UNAVAILABLE` separation;
- observed selector miss remaining non-gating and successful measurement.

Focused proof must not weaken or reinterpret the canonically frozen contract merely to obtain green.

## T117 failure dispositions

If implementation discovers that the canonically frozen contract cannot be implemented within the exact two-path surface without adding an unplanned dependency, helper, workflow, product change, alternate command, broader identity rule, timeout increase, or other authority expansion:

`T117 = NO_GO / RETURN_TO_PLANNING`

If the comparator successfully observes one or more selector misses under the frozen contract, that is valid measurement evidence and does not itself make T117 fail qualification.

Any discovered selector defect must remain evidence. T117 does not authorize selector repair.

## Explicitly unauthorized surfaces

This authorization does not permit T117 changes to:

- `src/**`;
- Receipt v1 JSON Schema, model, builder, validator, or renderer;
- selector or widening policy;
- CLI behavior or public command surface;
- `.github/workflows/**`;
- Project CI;
- package manifests or lockfiles;
- dependencies;
- `benchmarks/results/**`;
- historical T078/T091 evidence;
- Spec 007 artifacts, refs, replay, results, or terminal disposition;
- release, tag, or npm publication surfaces;
- generalized selector frameworks, generic adapters, plugin systems, telemetry stores, databases, services, models, or donor integrations;
- any third T117 tracked path.

No force-push, rebase, destructive history rewrite, rerun-to-green substitution, stale-review substitution, fallback-to-green, threshold invention, timeout widening, or fabricated evidence is authorized.

## T117 qualification gate

A future T117 implementation may become canonical only after all of the following are proven on its exact unchanged final head:

1. repository diff is exactly the two authorized T117 paths;
2. focused T117 contract tests pass and prove the complete frozen material boundary;
3. full repository `npm test`, `npm run typecheck`, and `npm run build` pass as applicable;
4. exact 10-minute reference timeout and no-retry/no-implicit-install behavior are proven;
5. exact-head Self Verification succeeds on the original qualifying attempt where governed;
6. exact-head Project CI succeeds across all six required OS/Node lanes on the original qualifying attempt;
7. fresh independent substantive exact-head review covers comparator correctness, source binding, digest integrity, command authority, timeout semantics, exact identity matching, privacy, non-gating semantics, failure separation, security/evidence integrity, governance, and branch purity;
8. every material finding is reconciled on that same final head;
9. unresolved material review threads equal zero;
10. live repository ruleset and observable branch-protection state are recorded;
11. canonical `main` and exact implementation head remain unchanged immediately before merge;
12. merge uses normal merge-commit method with exact expected-head protection;
13. post-merge proof verifies ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact two-path scope;
14. the T117 execution ledger receives durable canonical closeout before any T118 authority is created or exercised.

If all gates pass:

`T117 = CLOSED_CANONICAL / QUALIFIED`

## T118 and T119 non-authority

This authorization does not authorize T118.

T118 remains blocked until T117 is canonically qualified and a separate prospective successor authorization is established for exactly:

- `.github/workflows/self-verify.yml`.

T119 remains ledger/governance only by default and remains dependency-blocked until T118 closes canonically.

## Authorization qualification gate

This authorization artifact itself may become effective only after all of the following are proven on its exact unchanged final head:

1. repository diff is exactly `specs/010-selector-shadow-verification/IMPLEMENTATION_AUTHORIZATION.md`;
2. the artifact binds exact planning merge `0076d8ece12a478e4bcfb9d54cf546e1fd1e8291` and tree `55bc9b8d5fcd8da7e78e5d07173d01c58dbd7427`;
3. it binds exact T117 two-path authority, frozen comparator behavior, exact 10-minute timeout, non-gating miss semantics, explicit `UNAVAILABLE` separation, hard prohibitions, and T118 non-authority;
4. exact-head Self Verification succeeds on the original qualifying attempt;
5. exact-head Project CI succeeds across all six required OS/Node lanes on the original qualifying attempt;
6. fresh independent substantive exact-head review finds no unresolved material authority, security, evidence-integrity, correctness, or governance defect;
7. unresolved material review threads equal zero;
8. live ruleset and observable branch-protection truth are reverified;
9. expected canonical `main` and authorization PR head remain unchanged immediately before merge;
10. guarded normal merge uses the exact expected head SHA;
11. post-merge proof verifies ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact authorization-file bytes;
12. Issue #264 receives durable closeout as:

`SPEC_010_T117_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Only after that closeout does this artifact authorize T117.
