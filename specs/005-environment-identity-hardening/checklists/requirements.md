# Specification 005 Requirements Quality Checklist

## Scope and value

- [x] Measured receipt-vs-benchmark M1.1 gap.
- [x] Runtime environment identity only.
- [x] Function coverage and M2+ excluded.
- [x] No speculative platform/plugin abstractions.

## Trust and evidence

- [x] Environment metadata is non-authoritative for PASS/completeness.
- [x] No current evidence replaced by history.
- [x] No new execution/install/package-manager probe.
- [x] `discovery.packageManager` is sole manager authority.
- [x] Package-json authority requires exact non-null version from discovery's package.json content snapshot.
- [x] Package.json is not re-read from disk for version derivation.
- [x] Lockfile metadata cannot override manager authority.
- [x] Lockfile discovery values are explicitly treated as presence sentinels, never bytes.
- [x] Lockfile-authority reread failure is integrity failure.
- [x] Supplemental matching lockfile failure may produce null identity without fallback.

## Privacy and filesystem safety

- [x] Raw absolute paths prohibited from receipt.
- [x] Hostname/username/machine/network/env inventory prohibited.
- [x] Credentials/secrets prohibited.
- [x] Receipt lockfile paths canonical repository-relative.
- [x] Filesystem lockfile reads re-check canonical-root realpath/symlink containment.
- [x] Exact-byte hashing uses bounded-memory reading.

## Compatibility

- [x] Schema version remains `"1.0"` under explicit lockstep policy.
- [x] Environment optional for backward receipt compatibility.
- [x] No stale strict-validator forward-compatibility claim.
- [x] New validators accept canonical old receipts and new environment receipts.
- [x] Exact prior strict schema rejection is required proof.
- [x] Prior schema proof immutable/deterministic.
- [x] Same-source/build consumers move in lockstep.
- [x] `ascout_version` is only product label, not unique schema/source key.
- [x] Exact repository revisions bind compatibility proof.
- [x] No receipt 1.1/v2/negotiation/new revision field.

## Environment invariants

- [x] `package_json` => manager non-null + exact non-null x.y.z version.
- [x] `lockfile` => manager non-null + version null.
- [x] `unavailable` => manager/version null + no lockfile identity.
- [x] Package-json contradictory snapshot state fails integrity.
- [x] Lockfile-authority path cannot be silently lost.
- [x] Supplemental lockfile identity cannot create manager authority.

## Determinism and testability

- [x] Runtime/platform/arch sources defined.
- [x] Package-manager provenance defined.
- [x] Lockfile byte source defined separately from discovery sentinel.
- [x] SHA-256/null-pair invariants defined.
- [x] Sentinel-not-bytes regression test specified.
- [x] Authority/supplemental lockfile read-failure distinction specified.
- [x] Symlink/path containment tests specified.
- [x] Current consumer tests specified.
- [x] Exact-head cross-platform CI + independent review required.

## Authorization

- [x] Planning artifacts do not authorize implementation.
- [x] T104 blocked until planning merge + durable authorization.

**Result:** `READY_FOR_INDEPENDENT_REVIEW_AFTER_F1_F2_F3_F4_F5_RECONCILIATION`
