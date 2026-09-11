# T125 Release Documentation Recovery Plan

**Status:** PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED
**Planning ledger:** Issue #320
**T125 qualification ledger:** Issue #319
**Canonical planning base:** `edd5283729a0a80df5afcb73d62c54228865e869`

## Trigger

T125 attempt 1 is immutable `NO_GO` evidence against exact candidate:

- commit: `edd5283729a0a80df5afcb73d62c54228865e869`;
- tree: `e49aa4562f2d08d4fdb2f36d9e04bcaa09a69f97`;
- package version: `0.1.0`;
- package privacy: `private: true`;
- npm publication: not performed;
- qualified tarball: none;
- T126 publication authorization: not effective.

Before blocker discovery, the candidate passed exact-lockfile installation, typecheck,
`948 passed / 27 skipped` project tests, build, and `147 passed / 25 skipped`
focused release-contract tests. Those facts remain historical attempt-1 evidence and do not
qualify any successor candidate.

## Exact observed blocker
The npm-compatible package surface includes `README.md`. The exact candidate's manifest says
`@thehalfmoon/ascout`, version `0.1.0`, `private: true`, while README status text still states
that the package remains version `0.0.0`. README also tells users to use only a source checkout
until a future publication, even though Spec 013 intentionally targets a GitHub Release asset
while keeping npm publication out of scope.

This is a release-content contradiction, not a T124 metadata-implementation failure. T124
correctly changed only its authorized three version scalars. T125 is the first boundary that
must inspect the distributable package as a user would receive it.

## Root cause

`ROOT_CAUSE = T124_SCOPE_OMITTED_PACKAGED_README_RELEASE_STATE`

The release plan treated package metadata and package-content qualification as separate units,
but did not include a synchronization obligation for human-readable files that npm always
includes in the tarball. The resulting candidate can be technically installable while making a
false version claim in its packaged documentation.

## Recovery objective

Repair only the packaged release-state truth required for the first GitHub Release candidate.
No product capability, package identity, package metadata, executable behavior, dependency,
workflow, benchmark, release automation, or Spec 014/015 capability is part of this recovery.
## Prospective repair unit R013-01

Implementation is not authorized by this planning artifact. After a separate implementation-
authorization artifact becomes canonical/effective, R013-01 may mutate exactly:

- `README.md`

Required semantics:

1. state the package version as `0.1.0` and preserve `private: true` truth;
2. state explicitly that Ascout is not published to npm;
3. preserve package identity `@thehalfmoon/ascout` and binary identity `ascout`;
4. distinguish a GitHub Release asset from npm-registry publication;
5. use durable installation guidance that is true before and after `v0.1.0` exists: an exact
   source checkout, or an exact verified GitHub Release asset when available;
6. do not claim npm scope ownership or npm publication authority;
7. preserve trusted-local scope and all capability/security statements unless review finds a
   separate proven contradiction, which must return to planning rather than widen R013-01;
8. add no changelog system, installer, dependency, workflow, tag, release, or npm operation.

No other tracked path is authorized for R013-01.

## Required R013-01 qualification

The repair must independently prove exact one-path purity and release-truth-only semantics.
At minimum it must pass:

- package-content verification proving the repaired README is included in the npm-compatible
  archive surface and no forbidden surface is introduced;
- applicable typecheck, focused tests, full tests, and build;
- exact-head Self Verification;
- original-attempt Project CI success across all six required OS/Node lanes;
- fresh independent substantive exact-head review with no material findings;
- zero unresolved material review threads;
- live ruleset/protection/base/head revalidation immediately before merge;
- guarded normal merge using the exact expected head;
- post-merge ordered-parent/tree/signature/PR/main proof;
- push-triggered Project CI success on the repair merge.

If any required gate fails, preserve the failure and return to prospective repair governance.
Do not rerun-to-green or widen R013-01 in place.

## T125 recovery execution

Only after R013-01 is `CLOSED_CANONICAL / QUALIFIED` may T125 restart. The new candidate is
the exact R013-01 merge commit. T125 must use a newly materialized clean checkout and repeat all
canonical T125 gates. No test, audit, package, consumer, CLI, self-verification, benchmark, or
archive evidence from `edd5283729a0a80df5afcb73d62c54228865e869` substitutes for evidence
whose subject identity changes.

A new tarball may be frozen only after every T125 gate passes on the new candidate. T126,
`v0.1.0`, the GitHub Release, and T128 remain blocked until that fresh qualification succeeds.
## Hard prohibitions

- do not amend or rewrite T124/T125 history;
- do not reclassify the failed T125 candidate as qualified;
- do not freeze or publish a tarball from `edd5283729a0a80df5afcb73d62c54228865e869`;
- do not mutate package metadata again under this recovery;
- do not perform `npm publish` or any registry write;
- do not create `v0.1.0`, a GitHub Release, or a release asset before T126/T127 authority;
- do not use this recovery as authority for Spec 014 or Spec 015 implementation;
- do not copy donor code, add dependencies, or widen the product under a release-doc repair.

## Dependency order

`T125 attempt 1 NO_GO -> recovery planning -> implementation authorization -> R013-01 -> fresh T125 -> T126 -> T127 -> T128`

Planning closes only after this plan and its audit are independently reviewed, qualified,
guarded-merged, post-merge verified, and Issue #320 is durably closed as:

`T125_RECOVERY_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`

This plan grants no implementation authority by itself.