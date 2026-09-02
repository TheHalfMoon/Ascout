# Specification 005 Requirements Quality Checklist

## Scope and value

- [x] Measured receipt-vs-benchmark M1.1 gap.
- [x] Runtime environment identity only.
- [x] Function coverage and M2+ excluded.
- [x] No speculative platform/plugin abstractions.

## Trust and evidence

- [x] Environment metadata non-authoritative for PASS/completeness.
- [x] No current evidence replaced by history.
- [x] No new execution/install/package-manager probe.
- [x] Discovery is sole manager authority.
- [x] Package-json version comes from exact discovery snapshot; no disk reread.
- [x] Lockfile sentinel values never treated as bytes.
- [x] Authority lockfile reread failure is integrity failure; supplemental matching lockfile may be null without fallback.

## Privacy and filesystem safety

- [x] Raw absolute paths/host/user/network/env inventory/credentials/secrets prohibited from receipt.
- [x] Lockfile paths canonical repository-relative.
- [x] Lockfile reads re-check canonical-root realpath/symlink containment.
- [x] Exact-byte hashing uses bounded-memory reading.

## Compatibility

- [x] Schema version remains `"1.0"` under explicit lockstep policy.
- [x] Environment optional for backward receipt compatibility.
- [x] No stale strict-validator forward-compatibility claim.
- [x] Updated validators accept canonical old receipts and new environment receipts.
- [x] Exact prior strict-schema rejection is required proof.
- [x] Prior schema proof immutable/deterministic.
- [x] Prior schema and current schema are exercised through the same canonical JSON Schema evaluator implementation.
- [x] T104 explicitly permits the minimum `src/receipt/json.ts` evaluator-reuse refactor needed for that proof while preserving current-schema runtime behavior.
- [x] No test-local duplicate evaluator, new validation dependency, runtime schema selection, or negotiation.
- [x] Same-source/build consumers move in lockstep.
- [x] `ascout_version` is product label, not unique schema/source key.
- [x] Exact repository revisions bind compatibility proof.
- [x] No receipt 1.1/v2/negotiation/new revision field.

## Environment invariants

- [x] `package_json` => manager non-null + exact non-null x.y.z version.
- [x] `lockfile` => manager non-null + version null.
- [x] `unavailable` => manager/version null + no lockfile identity.
- [x] Contradictory package-json snapshot state fails integrity.
- [x] Lockfile authority path cannot be silently lost.
- [x] Supplemental lockfile identity cannot create manager authority.

## Determinism and testability

- [x] Current/prior schema compatibility uses one evaluator.
- [x] Runtime/platform/arch and package-manager provenance defined.
- [x] Lockfile byte source separated from discovery sentinel.
- [x] SHA-256/null-pair invariants defined.
- [x] Sentinel-not-bytes, authority/supplemental read-failure, symlink/path containment, and current-consumer tests specified.
- [x] Exact-head cross-platform CI + independent review required.

## Authorization

- [x] Planning artifacts do not authorize implementation.
- [x] T104 blocked until planning merge + durable authorization.
- [x] T104 product surface now explicitly includes the narrow `src/receipt/json.ts` proof refactor; no other JSON subsystem widening is authorized.

**Result:** `READY_FOR_INDEPENDENT_REVIEW_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`
