# Specification 013 — T124 Implementation Authorization

## Status

`SPEC_013_T124_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`T124_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the repository authorization candidate for Issue #299. It grants no T124 implementation authority until it is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #299 closes `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Spec 013 planning is closed canonical:

- planning ledger: Issue #297, `CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`;
- planning PR: #298, merged/closed;
- planning merge: `911a82be3305deeaa56fb475d6f534fac00f1d55`;
- planning merge tree: `769fa8f9d44a5656dd10c913f89e44ee8fc2b11e`;
- ordered merge parents: `bc5e1d807a5a116ec3286e3f68907751b67d2814` + `8c7e239eec9fbf6228fefa8b288c0a39cfdbb531`;
- post-merge Project CI run `34620302043`: attempt 1 / success;
- authorization base: `911a82be3305deeaa56fb475d6f534fac00f1d55`.

The authoritative T124 contract remains the canonically merged Spec 013 planning package.
## Authority activation boundary

Until this artifact is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #299 closes effective:

- T124 repository mutation is forbidden;
- T125 remains blocked;
- no version, tag, release, registry, account, or publication operation follows from this candidate.

After activation, only the bounded T124 authority below becomes effective.

## T124 authorized tracked surface

Exactly two tracked repository paths may change during T124:

- `package.json`;
- `package-lock.json`.

No third tracked path is authorized for T124 implementation.

## Frozen behavior delta

T124 may make only the release-identity mutation required by canonical Spec 013:

1. change `package.json` version from `0.0.0` to `0.1.0`;
2. change only the corresponding existing package-version identities in `package-lock.json` from `0.0.0` to `0.1.0`;
3. keep package name `@thehalfmoon/ascout` unchanged;
4. keep binary name and mapping unchanged;
5. keep `private: true` unchanged;
6. preserve the dependency graph byte-for-byte except for the authorized version values.
## Hard prohibitions

T124 MUST NOT:

- set or remove npm publication configuration;
- change `private: true`;
- run `npm publish`;
- create or move a tag;
- create or edit a GitHub Release;
- add, remove, or update dependencies;
- regenerate unrelated lockfile structure;
- change source, tests, benchmarks, workflows, documentation, provenance, or licenses;
- absorb T125, T126, T127, T128, or Spec 014 work;
- use GlitchTip or any other donor source during T124.

Any material mismatch is `NO_GO / RETURN_TO_AUTHORIZATION_OR_PLANNING`.

## T124 qualification gate

Before T124 may merge, the exact T124 head must prove:

- reverified canonical base and live governance state;
- branch purity: exactly `package.json` and `package-lock.json`;
- semantic diff limited to the authorized version identities;
- `private: true`, package name, bin mapping, scripts, engines, and dependency graph unchanged;
- standard install/typecheck/test/build/package gates pass as applicable;
- exact-head Self Verification succeeds;
- original-attempt six-lane Project CI succeeds;
- fresh independent substantive exact-head review reports no unresolved material finding;
- zero unresolved material review threads;
- live rulesets, branch protection, base, and head state are revalidated immediately before merge;
- merge is a guarded expected-head normal merge;
- post-merge ordered-parent/tree/signature/main proof succeeds;
- push-triggered Project CI on the merge commit succeeds before T124 is treated as canonical.

## Downstream boundary

T124 completion authorizes no publication action. T125 remains a distinct exact-candidate qualification task and T126 remains a distinct publication-authorization task.

Spec 014 Issue #300 is founder-authorized planning only and remains blocked by Spec 013 T128. It MUST NOT change T124 scope or candidate bytes.

```text
SPEC_013_T124_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
T124_IMPLEMENTATION_AUTHORIZED = NO
T125 = BLOCKED_BY_T124
SPEC_014_EXECUTION_FRONTIER = BLOCKED_BY_SPEC_013_T128
```
