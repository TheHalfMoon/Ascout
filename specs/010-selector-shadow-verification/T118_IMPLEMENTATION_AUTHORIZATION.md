# Specification 010 — T118 Implementation Authorization

## Status

`SPEC_010_T118_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`T118_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the repository successor-authorization candidate for Issue #272. It grants no T118 implementation authority until it is independently qualified, guarded-merged, post-merge verified, and Issue #272 is closed `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

T117 is durably closed canonical and qualified:

- execution ledger: Issue #266, closed `completed` with `T117 = CLOSED_CANONICAL / QUALIFIED`;
- implementation PR: #267, merged/closed;
- final qualified T117 head: `3049084127cf6dc739a9d2a1427e68a81ee7c6fc`;
- final T117 tree: `68721a37d9e98b49ec9afe913c160f75b07dd61b`;
- canonical T117 merge / this authorization base: `5b1363502f22627b8045ed3ea9f0e84c9fcba991`;
- canonical T117 merge tree: `68721a37d9e98b49ec9afe913c160f75b07dd61b`;
- ordered T117 merge parents:
  1. `d24ce8274092d5798adef0ce5f74c28ce3eeb198`;
  2. `3049084127cf6dc739a9d2a1427e68a81ee7c6fc`;
- GitHub merge verification: `verified=true`, `reason=valid`;
- final T117 Self Verification: run `34295692404` / #135, `SUCCESS`;
- final T117 Project CI: run `34295692338` / #524, original qualifying attempt, six of six required OS/Node lanes `SUCCESS`;
- final independent T117 review: CodeRabbit `NO MATERIAL FINDINGS` on exact range `d24ce8274092d5798adef0ce5f74c28ce3eeb198..3049084127cf6dc739a9d2a1427e68a81ee7c6fc`;
- unresolved material T117 review threads: `0`.

The authoritative T118 contract remains the canonically merged `spec.md`, `plan.md`, `tasks.md`, and supporting Spec 010 planning artifacts.

## Authority activation boundary

Until this artifact itself becomes canonical and Issue #272 closes effective:

- T118 repository mutation is forbidden;
- `.github/workflows/self-verify.yml` is not authorized to change under T118;
- no live selector-shadow workflow observation may be promoted as T118 qualification evidence;
- T119 remains blocked;
- no other repository surface follows from this candidate.

After this artifact becomes canonical and Issue #272 closes `SPEC_010_T118_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`, only the bounded T118 authority below becomes effective.

## T118 authorized tracked surface

Exactly one tracked repository path is authorized for T118:

- `.github/workflows/self-verify.yml`.

No second workflow, helper, fixture, source file, test file, package file, result file, schema file, or governance file is authorized as T118 implementation surface.

## Frozen workflow delta

T118 may make only the bounded integration required by canonical Spec 010:

1. preserve the existing `pull_request` trigger;
2. preserve same-repository eligibility `github.event.pull_request.head.repo.full_name == github.repository`;
3. preserve `permissions: contents: read` and introduce no additional permission;
4. preserve the pinned checkout action, exact PR-head checkout, full history, and disabled persisted credentials;
5. preserve the exact-head guard and clean source checks;
6. preserve the pinned Node setup action, Node 24 selection, npm cache, exact lockfile installation, and exact-head build;
7. preserve the existing Spec 006 capture command and its exact event-base/head binding;
8. change the existing self-verify job `timeout-minutes` exactly from `30` to `60`;
9. immediately after successful Spec 006 capture, invoke canonical `benchmarks/selector-shadow.mjs` against the exact just-produced receipt and envelope;
10. write exactly `$RUNNER_TEMP/self-verification/selector-shadow-observation.json`;
11. add exactly that observation file to the existing pinned `actions/upload-artifact` path list;
12. preserve the existing artifact name, `if-no-files-found: error`, `retention-days: 30`, and pinned upload action;
13. introduce no new action, workflow, dependency, permission, secret, service, network call, retry, fallback, or alternate test command.

## Frozen timeout budget

The self-verification job budget is frozen prospectively at exactly 60 minutes:

- 20 minutes: checkout/setup/install/build/artifact-publication reserve;
- 20 minutes: existing Spec 006 self-verification allowance;
- 10 minutes: canonical T117 full-suite reference timeout;
- 10 minutes: contingency and orderly-cleanup reserve.

The canonical selector-shadow reference timeout remains exactly 10 minutes.

Neither timeout may be increased, adapted, retried, or replaced after observing live behavior.

If the final-head live run cannot produce valid evidence within this budget:

`T118 = NO_GO / RETURN_TO_PLANNING`

No timeout widening is authorized.

## Canonical selector-shadow invocation boundary

T118 must invoke the already-canonical `benchmarks/selector-shadow.mjs` only after successful Spec 006 capture and supply the exact files created by that immediately preceding step:

- `$RUNNER_TEMP/self-verification/self-verification-receipt.json`;
- `$RUNNER_TEMP/self-verification/self-verification-envelope.json`.

The output path must be:

- `$RUNNER_TEMP/self-verification/selector-shadow-observation.json`.

T118 may not change `benchmarks/selector-shadow.mjs`, its command contract, its 10-minute timeout, its identity matching rules, or its output classification.

## Non-gating semantics

The selector-shadow observation is measurement evidence only.

An observation with one or more selector misses remains successful `SELECTOR_SHADOW_NON_GATING` evidence. Miss existence, miss count, no-miss state, or any derived recall concept MUST NOT become merge authority or workflow failure policy.

Only canonically defined workflow/harness/evidence-integrity failures may make the integration step fail.

`UNAVAILABLE` must remain distinct from observed no-miss and observed miss.

## Required live final-head proof

Static workflow inspection is necessary but insufficient.

The exact final eligible same-repository T118 PR head must itself produce a downloadable Self Verification artifact within the frozen 60-minute budget containing:

- `self-verification-receipt.json`;
- `self-verification-envelope.json`;
- `selector-shadow-observation.json`.

The exact downloaded observation must prove at minimum:

- `classification = SELECTOR_SHADOW_NON_GATING`;
- source identity bound to the exact final T118 PR head;
- receipt/envelope digest and identity binding internally consistent with the sibling exact-head evidence;
- explicit internally consistent observation disposition;
- bounded privacy-safe content;
- no use of miss/no-miss truth as qualification or merge authority.

If the observation is unavailable because of an unplanned contract/runtime requirement, or the artifact is absent, malformed, unbound, privacy-unsafe, or produced outside the frozen budget, T118 does not qualify.

## Explicitly unauthorized surfaces

T118 may not change or introduce:

- any tracked path other than `.github/workflows/self-verify.yml`;
- another workflow file;
- another GitHub Action;
- action version or pin drift;
- permissions beyond existing `contents: read`;
- secrets or credentials;
- `pull_request_target`;
- fork execution authority;
- `src/**`;
- Receipt v1 schema/model/builder/validator/renderer;
- selector or widening policy;
- CLI or public command behavior;
- package manifests, lockfiles, or dependencies;
- Project CI;
- `benchmarks/selector-shadow.mjs`;
- benchmark-result or historical-result artifacts;
- T078/T091 evidence;
- Spec 007;
- release, tag, or npm publication surfaces;
- retries, implicit install, fallback commands, thresholds, new gates, generalized selector frameworks, telemetry stores, databases, models, services, donors, or external oracles.

No force-push, rebase, destructive history rewrite, rerun-to-green substitution, stale-review substitution, timeout widening, or fabricated evidence is authorized.

## T118 implementation qualification gate

A future T118 implementation may become canonical only after all of the following are proven on one exact unchanged final head:

1. repository diff is exactly `.github/workflows/self-verify.yml`;
2. job timeout is exactly 60 minutes and the canonical T117 reference timeout remains exactly 10 minutes;
3. workflow trigger, same-repository eligibility, permissions, exact-head guard, install/build, Spec 006 capture, action pins, artifact identity, retention, and least privilege remain preserved except the exact authorized integration delta;
4. selector-shadow invocation consumes the exact just-produced receipt/envelope and writes the exact runner-temp observation path;
5. focused static inspection proves no new action/dependency/permission/secret/workflow/retry/fallback/implicit-install surface;
6. exact-head Self Verification succeeds on the original qualifying attempt;
7. the exact Self Verification run produces a downloadable artifact containing receipt, envelope, and selector-shadow observation within the frozen 60-minute budget;
8. the downloaded live observation has `SELECTOR_SHADOW_NON_GATING` classification and exact final-head source/evidence binding;
9. observation disposition is explicit and internally consistent, and miss/no-miss truth is not used as merge authority;
10. exact-head Project CI succeeds across all six required OS/Node lanes on the original qualifying attempt;
11. fresh independent substantive exact-head review covers workflow correctness, exact invocation, source/digest binding, timeout budget, artifact publication, non-gating semantics, security, privacy, evidence integrity, governance, and one-path purity;
12. every material finding is reconciled on that same final head;
13. unresolved material review threads equal zero;
14. live repository rulesets and observable branch-protection truth are recorded;
15. canonical `main` and exact implementation head remain unchanged immediately before merge;
16. guarded normal merge uses the exact expected head SHA;
17. post-merge proof verifies ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact one-path scope;
18. the T118 execution ledger receives durable canonical closeout before T119 reconciliation begins.

Any material mismatch yields:

`T118 = NO_GO / RETURN_TO_PLANNING`

## T119 non-authority

This authorization does not authorize T119 tracked repository mutation.

T119 remains ledger/governance-only by default and may begin only after T118 is canonically qualified and durably closed.

## Authorization qualification gate

This successor authorization artifact itself may become effective only after all of the following are proven on its exact unchanged final head:

1. repository diff is exactly one added path: `specs/010-selector-shadow-verification/T118_IMPLEMENTATION_AUTHORIZATION.md`;
2. exact binding to canonical T117 merge `5b1363502f22627b8045ed3ea9f0e84c9fcba991` and tree `68721a37d9e98b49ec9afe913c160f75b07dd61b`;
3. exact one-path T118 authority and frozen workflow, timeout, live-evidence, failure, non-gating, and explicit non-authority boundaries;
4. exact-head Self Verification succeeds on the original qualifying attempt;
5. exact-head Project CI succeeds across all six required OS/Node lanes on the original qualifying attempt;
6. fresh independent substantive exact-head authority/security/evidence-integrity/workflow/governance review finds no unresolved material defect;
7. unresolved material review threads equal zero;
8. live repository rulesets and observable branch-protection truth are reverified;
9. expected canonical `main` and exact authorization head remain unchanged immediately before merge;
10. guarded normal merge uses the exact expected head SHA;
11. post-merge proof verifies ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact one-path authorization scope;
12. Issue #272 receives durable closeout as:

`SPEC_010_T118_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Only after that closeout does this artifact authorize T118.