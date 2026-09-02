# Specification 005 Requirements Quality Checklist

## Scope / trust / privacy

- [x] Measured M1.1 receipt-vs-benchmark gap only; function coverage/M2 excluded.
- [x] Environment metadata non-authoritative for PASS/completeness.
- [x] No new execution/install/package-manager probe; discovery sole manager authority.
- [x] Package-json version from exact discovery snapshot; lockfile sentinel values never hashed.
- [x] Raw host/user/network/environment/secret identity prohibited.

## Lockfile object binding

- [x] Containment target identity captured before open.
- [x] Authorized path opened read-only exactly once.
- [x] Descriptor `fstat` must match contained target identity before any bytes are read.
- [x] Path spelling, size, or timestamps alone are insufficient object identity.
- [x] Hash bytes come only from the proven descriptor; no reopen-and-hash.
- [x] Pre/post descriptor identity/type/size/modification/change stability is required.
- [x] Post-read authorized path must remain contained and identify the opened object before digest acceptance.
- [x] Swap after containment/before open is tested and rejected before bytes.
- [x] Swap after descriptor binding/during read is tested; it cannot redirect bytes and persistent path mismatch is rejected.
- [x] In-place mutation during read is tested and rejected.
- [x] Object identity is proven on Ubuntu 24.04/macOS 14/Windows 2025 × Node 22/24 or T105 stops `NO_GO`.
- [x] No weaker path-only/size-only/timestamp-only fallback, file-watch service, generalized sandbox, or reusable security framework.
- [x] Authority object-binding/read failure is typed integrity; supplemental failure may be null without fallback.

## Compatibility

- [x] Schema stays `"1.0"` under explicit lockstep policy.
- [x] Old/current and new/current acceptance plus exact prior rejection are explicit.
- [x] Prior/current schemas use the same canonical JSON Schema evaluator.
- [x] T104 narrow `src/receipt/json.ts` reuse preserves normal current-schema loading.
- [x] Exact prior fixture binds base `7bede70ad2abfb91dc9186fb44d77a824efbfdef` and schema blob `b331de44505f6fbdc5ff033367ef0904fda236b4`.
- [x] No duplicate evaluator/dependency/runtime schema selection/negotiation.
- [x] `ascout_version` is not a unique schema/source key.

## Environment invariants / process behavior

- [x] `package_json` => manager + exact non-null version.
- [x] `lockfile` => manager + null version.
- [x] `unavailable` => null manager/version + no lockfile identity.
- [x] T105 defines a typed environment-identity integrity error.
- [x] T106 observes before any project task execution.
- [x] Typed environment-integrity failure emits no receipt/synthetic task/error field.
- [x] T106 minimally maps only that typed failure to canonical exit `2` with existing path redaction.
- [x] Generic unexpected CLI error behavior remains unchanged; no new flag/output mode.

## Authorization / qualification

- [x] Planning artifacts do not authorize implementation.
- [x] T104 blocked until planning merge + durable authorization.
- [x] T104 → T105 → T106 exact surfaces are explicit.
- [x] Exact-head six-lane CI + fresh independent review required.

**Result:** `READY_FOR_INDEPENDENT_REVIEW_AFTER_F1_F2_F3_F4_F5_F6_F7_F8_RECONCILIATION`
