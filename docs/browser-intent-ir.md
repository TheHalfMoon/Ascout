# IntentTest IR — P016-02

First Spec 016 implementation slice under P016-01 authorization
(effective after PR #345 merge `df68f22a`, Issue #344 closeout).

## What this slice adds

`src/browser/intent.ts`: deterministic `IntentTest` domain types and
validators, the portable verification-intent representation above Playwright
code and free-form prompts:

- `createIntentTest` validates every field and canonicalizes refs
  (deduplicated, sorted) and oracle policy (canonical scope/index/oracle
  order). Actions, preconditions, and expected outcomes keep author order
  because order is semantic.
- Every obligation ref must resolve against the known obligation id set;
  dangling refs fail closed, and an intent with zero bound obligations,
  zero actions, or zero expected outcomes is rejected (no-green-by-omission).
- Navigate targets must be `http(s)` URLs or origin-relative web paths;
  filesystem-absolute paths, `file:` URLs, traversal segments, and
  protocol-relative hosts are rejected.
- Unknown action kinds, condition kinds, oracle classes, policy scopes,
  provenance origins, target surfaces (only `web`), and intent versions
  fail closed.
- Recovery budgets are bounded integers (`max_recovery_actions <= 10`,
  `max_retry_attempts <= 5`); `conservativeRecoveryPolicy` offers the
  deny-all zero-budget default.
- Unambiguous raw secret markers are rejected in free text (a floor, not a
  guarantee; authors remain responsible and P016-05/P016-08 enforce the
  `secret_leakage_from_ascout_owned_artifacts` gate at evidence level).
- `intentToJson` / `intentFromJson` provide deterministic serialization with
  strict revalidation; `intentDigest` is the sha256 over canonical JSON.
- `uncoveredConditions` reports entries without oracle policy as data;
  uncovered entries stay advisory and grant no authority.

Field-name mapping to planning: `tasks.md` minimum fields are implemented
verbatim (`intent_id`, `requirement_refs`, `obligation_refs`, `risk_refs`,
`goal`, `preconditions`, `actions`, `expected_outcomes`, `oracle_policy`,
`recovery_policy`, `target_surface`, `source_identity`, `provenance`), with
`target_surface` as the structured `{surface, application_origin,
browser_profile}` object from the architecture contract and `provenance` as
`{origin, artifact_ref}`.

## What this slice does not do

No browser dependency (`package.json` untouched). No execution, no Playwright
API, no oracle evidence (policy entries are references only; P016-05 owns
concrete oracle records), no recovery behavior (P016-07), no benchmark
(P016-09). Natural-language text is preserved verbatim as immutable data and
never becomes executable authority.

## Evidence

`tests/browser-intent.contract.test.ts` proves creation, id canonicalization,
ref ordering, dangling-ref rejection, unknown-enum rejection, navigate-target
rules, recovery budgets, policy index binding, canonical policy order,
digest determinism/sensitivity, JSON round-trip integrity, NL preservation,
coverage reporting, secret-marker rejection, and origin/action/outcome
requirements.
