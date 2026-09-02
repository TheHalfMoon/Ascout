# Specification 005 HEAD Cross-Artifact Review Checklist

**Purpose:** repository-side exact-head checklist; never substitutes for independent review.

## Canonical references

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- complete Spec 005 planning package including `COMPATIBILITY_POLICY.md`

## Consistency checks

- [x] M1.1-B measured scope only.
- [x] Runtime/OS/arch/package-manager/lockfile identity only.
- [x] Schema `"1.0"` under explicit additive-lockstep policy.
- [x] Old/new validator matrix explicit; stale strict rejection honest.
- [x] Same-source/build consumers move in lockstep.
- [x] `run.ascout_version` not a unique source/schema key.
- [x] Exact repository identities bind compatibility proof.
- [x] No 1.1/v2/negotiation/new revision field.
- [x] No process/install/execution authority.
- [x] Discovery remains sole package-manager authority.
- [x] Package-json exact version comes from the same discovery content snapshot, not a disk reread.
- [x] Package-json authority never degrades to null version.
- [x] Recognized lockfile values in `DiscoveryFileMap` are presence sentinels, not bytes, and are never hashed.
- [x] Lockfile SHA reads exact filesystem bytes beneath canonical root with realpath/symlink containment rechecked.
- [x] Lockfile-authority reread/hash failure is integrity failure.
- [x] Package-json supplemental lockfile is considered only if matching root path existed in discovery snapshot; failure may yield null without fallback.
- [x] Lockfile evidence cannot change manager authority.
- [x] `src/discovery.ts` remains outside implementation surface; insufficiency => NO_GO/replan.
- [x] Privacy boundaries explicit.
- [x] Environment metadata cannot weaken verification completeness.
- [x] T104 → T105 → T106 ordering valid.
- [x] No function coverage/M2/release/publication/tag/dependency/workflow mutation.
- [x] Exact-head six-lane CI, fresh independent review, guarded merge, post-merge verification required.
- [x] Implementation blocked until canonical planning merge + durable authorization.

## Findings reconciled before this head

- [x] F1 package-manager/lockfile provenance ambiguity.
- [x] F2 strict stale-validator compatibility ambiguity.
- [x] F3 false exact revision binding via `ascout_version`.
- [x] F4 declaration-led authority could degrade to null version.
- [x] F5 discovery lockfile sentinel/byte-source mismatch and authority reread semantics.

No earlier independent review qualifies the repaired head.

## Branch-purity expectation

Planning PR may change only `specs/005-environment-identity-hardening/`. Any product/test/package/workflow/benchmark-result mutation is NO_GO.

## Review disposition

`INTERNAL_CONSISTENCY = PASS_AFTER_F1_F2_F3_F4_F5_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_YET_EFFECTIVE`
