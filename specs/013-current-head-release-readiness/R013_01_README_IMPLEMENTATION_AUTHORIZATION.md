# Specification 013 — R013-01 README Implementation Authorization

## Status

`R013_01_IMPLEMENTATION_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`README_MUTATION_AUTHORIZED = NO`

This artifact is the repository authorization candidate for Issue #322. It grants no README mutation authority until it is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #322 closes `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

T125 recovery planning is closed canonical through Issue #320 / PR #321:

- planning merge: `dd9875f28c269bb050c3b2f8f0993869bdb33d60`;
- planning merge tree: `c6355f70f43f632c1f360c4513ecf1ec34040abc`;
- ordered parents: `edd5283729a0a80df5afcb73d62c54228865e869` + `6e074be91b89b7c08be473ec20e24ac45683882e`;
- PR Self Verification `34654221802`: SUCCESS;
- PR Project CI `34654221819`: SUCCESS / attempt 1 / six lanes;
- CodeRabbit exact-head review: no actionable comments;
- unresolved review threads: 0;
- post-merge Project CI `34654898999`: SUCCESS / attempt 1 / six lanes.

The authoritative recovery contract is the canonically merged T125 release-documentation recovery plan and audit.
## Authority activation boundary

Until this artifact is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #322 closes effective:

- `README.md` mutation is forbidden;
- T125 remains blocked in `NO_GO_PENDING_REPAIR`;
- no tag, GitHub Release, release asset, npm publication, registry/account mutation, or Spec 014/015 implementation is authorized.

After activation, only the bounded R013-01 authority below becomes effective.

## Authorized tracked surface

Exactly one tracked repository path may change during R013-01:

- `README.md`

No second tracked path is authorized.

## Frozen release-truth delta

R013-01 may change only the stale release-state wording required to make the packaged README truthful for the `0.1.0` GitHub Release plan:

1. state package version `0.1.0` and preserve `private: true` truth;
2. state explicitly that Ascout is not published to npm;
3. preserve package identity `@thehalfmoon/ascout` and binary identity `ascout`;
4. distinguish GitHub Release distribution from npm-registry publication;
5. provide usage guidance that remains true before and after a GitHub `v0.1.0` Release exists;
6. make no authenticated npm scope ownership or publication claim.
## Required preservation

R013-01 MUST preserve unchanged:

- package metadata and lockfile;
- source/runtime code;
- tests, benchmarks, workflows, and CI policy;
- dependencies and toolchain requirements;
- product capability and trusted-local/security claims except if separately proven false under new authority;
- licenses/provenance;
- Spec 014 and Spec 015 implementation state.

It MUST NOT add changelog machinery, installers, release automation, dependencies, tags, releases, npm configuration, or registry writes.

Any additional material contradiction discovered during review is `NO_GO / RETURN_TO_PLANNING`; it does not widen this authority.

## R013-01 qualification gate

Before the README repair may merge, the exact repair head must prove:

- branch purity: exactly `README.md`;
- semantic diff limited to the authorized release-truth wording;
- package-content proof confirms README remains inside the npm-compatible archive surface;
- applicable install/typecheck/full-test/build gates pass;
- exact-head Self Verification succeeds;
- original-attempt six-lane Project CI succeeds;
- fresh independent substantive exact-head review reports no material finding;
- zero unresolved material review threads;
- live base/head/rulesets/protection state is revalidated immediately before merge;
- guarded expected-head normal merge;
- post-merge ordered-parent/tree/signature/main proof;
- push-triggered Project CI succeeds on the repair merge.
## Downstream boundary

R013-01 completion authorizes no publication action. Its canonical merge commit becomes only the next T125 candidate.

T125 must restart from a newly materialized clean checkout of that exact merge commit and rerun every candidate-sensitive gate. No evidence from failed candidate `edd5283729a0a80df5afcb73d62c54228865e869` substitutes for successor-candidate evidence.

Only fresh T125 success may open T126 publication authorization. T127 tag/GitHub Release and T128 final release verification remain separately gated. npm publication remains forbidden.

Spec 014 and Spec 015 remain blocked by Spec 013 T128.

```text
R013_01_IMPLEMENTATION_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
README_MUTATION_AUTHORIZED = NO
T125 = NO_GO_PENDING_REPAIR
T126 = BLOCKED_BY_T125
NPM_PUBLICATION = FORBIDDEN
SPEC_014_EXECUTION_FRONTIER = BLOCKED_BY_SPEC_013_T128
SPEC_015_EXECUTION_FRONTIER = BLOCKED_BY_SPEC_013_T128
```

## Failure discipline

Any required R013-01 qualification failure is preserved as first-attempt evidence and blocks merge/activation.

This applies to path purity, semantic-diff review, package-content proof, install/typecheck/test/build, Self Verification, any Project CI lane, independent review, review-thread state, pre-merge governance/race proof, guarded merge, post-merge identity proof, and push-triggered post-merge CI.

A failed gate MUST NOT be normalized into PASS through rerun-to-green, selective omission, hidden weakening, in-place scope widening, assertion/test/workflow changes, or unrecorded environment changes.

If a failure proves a new defect or an independently justified environment/governance issue, preserve the original evidence and create separate prospective repair/recovery authority before any additional mutation.

A successor R013-01 repair candidate must qualify from its own exact source identity. CI, review, package, verification, or other qualification evidence from a failed repair candidate MUST NOT substitute for successor-candidate evidence.
