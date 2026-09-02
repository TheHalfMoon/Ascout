# Specification 005 HEAD Cross-Artifact Review Checklist

**Purpose:** repository-side exact-head checklist; never substitutes for independent review.

## Canonical references

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- complete Spec 005 planning package including `COMPATIBILITY_POLICY.md`

## Consistency checks

- [x] M1.1-B measured scope only; no function coverage/M2.
- [x] Schema `"1.0"` under explicit additive-lockstep policy.
- [x] Old/new validator matrix explicit; stale strict rejection honest.
- [x] Exact prior strict schema is pinned and evaluated through the same canonical JSON Schema evaluator as current validation.
- [x] T104 explicitly includes narrow `src/receipt/json.ts` evaluator reuse/testability while preserving normal current-schema loading.
- [x] No second evaluator/dependency/runtime schema selection/negotiation.
- [x] Same-source/build consumers move in lockstep; `ascout_version` is not a unique source/schema key.
- [x] No process/install/execution authority.
- [x] Discovery remains sole manager authority; package-json exact version comes from same content snapshot.
- [x] Lockfile discovery values are sentinels, not bytes; SHA reads exact contained filesystem bytes.
- [x] Authority lockfile reread/hash failure is integrity failure; supplemental matching lockfile may yield null without fallback.
- [x] `src/discovery.ts` remains outside implementation surface.
- [x] Privacy boundaries explicit; environment metadata cannot weaken verification completeness.
- [x] T104 → T105 → T106 ordering valid.
- [x] No release/publication/tag/dependency/workflow/benchmark-result mutation.
- [x] Exact-head six-lane CI, fresh independent review, guarded merge, post-merge verification required.
- [x] Implementation blocked until canonical planning merge + durable authorization.

## Findings reconciled before this head

- [x] F1 package-manager/lockfile provenance ambiguity.
- [x] F2 strict stale-validator compatibility ambiguity.
- [x] F3 false exact revision binding via `ascout_version`.
- [x] F4 declaration-led authority could degrade to null version.
- [x] F5 discovery lockfile sentinel/byte-source and authority-reread semantics.
- [x] F6 prior strict-schema proof lacked an authorized way to use the canonical evaluator on the pinned historical schema.

No earlier independent review qualifies the repaired head.

## Branch-purity expectation

Planning PR may change only `specs/005-environment-identity-hardening/`. Any product/test/package/workflow/benchmark-result mutation is `NO_GO`.

## Review disposition

`INTERNAL_CONSISTENCY = PASS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_YET_EFFECTIVE`
