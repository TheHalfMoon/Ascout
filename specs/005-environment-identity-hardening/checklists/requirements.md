# Specification 005 Requirements Quality Checklist

## Scope / trust / privacy

- [x] Measured M1.1 receipt-vs-benchmark gap only; function coverage/M2 excluded.
- [x] Environment metadata non-authoritative for PASS/completeness.
- [x] No new execution/install/package-manager probe; discovery sole manager authority.
- [x] Package-json version from exact discovery snapshot; lockfile sentinel values never hashed.
- [x] Lockfile authority failure is integrity; supplemental failure may be null without fallback.
- [x] Raw host/user/network/env/secret identity prohibited; filesystem reads re-check canonical-root containment and use bounded memory.

## Compatibility

- [x] Schema stays `"1.0"` under explicit lockstep policy.
- [x] Old/current and new/current acceptance plus exact prior rejection are explicit.
- [x] Prior/current schemas use the same canonical JSON Schema evaluator.
- [x] T104 narrow `src/receipt/json.ts` reuse preserves normal current-schema loading.
- [x] Exact prior fixture binds base `7bede70ad2abfb91dc9186fb44d77a824efbfdef` and schema blob `b331de44505f6fbdc5ff033367ef0904fda236b4`.
- [x] No duplicate evaluator/dependency/runtime schema selection/negotiation.
- [x] `ascout_version` is not a unique schema/source key.

## Environment invariants

- [x] `package_json` => manager + exact non-null version.
- [x] `lockfile` => manager + null version.
- [x] `unavailable` => null manager/version + no lockfile identity.
- [x] Authority contradictions/unsafe reads fail typed integrity; supplemental identity cannot create authority.

## Integrity-error process behavior

- [x] T105 defines a typed environment-identity integrity error.
- [x] T106 observes before any project task execution.
- [x] Typed environment-integrity failure emits no receipt/synthetic task/error field.
- [x] T106 explicitly authorizes only the minimal `src/cli.ts` classification needed to map that typed expected integrity failure to canonical exit `2` with existing path redaction.
- [x] Generic unexpected CLI error behavior remains unchanged; no new flag/output mode.
- [x] Tests prove zero subsequent project-task execution, no receipt output, redacted diagnostic, exit `2`.

## Authorization / qualification

- [x] Planning artifacts do not authorize implementation.
- [x] T104 blocked until planning merge + durable authorization.
- [x] T104 → T105 → T106 exact surfaces are explicit.
- [x] Exact-head six-lane CI + fresh independent review required.

**Result:** `READY_FOR_INDEPENDENT_REVIEW_AFTER_F1_F2_F3_F4_F5_F6_F7_RECONCILIATION`
