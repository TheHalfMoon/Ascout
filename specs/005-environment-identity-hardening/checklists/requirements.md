# Specification 005 Requirements Quality Checklist

## Scope and value

- [x] The problem is tied to a current measurable receipt-vs-benchmark evidence-depth gap.
- [x] The scope is limited to M1.1 run-level environment identity.
- [x] Function coverage and all M2+ capabilities are explicitly excluded.
- [x] No speculative platform/plugin abstractions are introduced.

## Trust and evidence

- [x] Environment metadata is explicitly non-authoritative for PASS/completeness.
- [x] No current-run evidence is replaced by history.
- [x] No new execution authority, implicit install, or package-manager probe is authorized.
- [x] Integrity failure cannot silently emit fabricated environment identity.
- [x] `discovery.packageManager` is the sole manager-authority decision.
- [x] Lockfile metadata is supplemental only and cannot repair/override manager authority.

## Privacy and safety

- [x] Raw absolute paths are prohibited.
- [x] Hostname, username, machine identifiers, IP/network identity, and environment-variable inventory are prohibited.
- [x] Credentials and secret-bearing values are prohibited.
- [x] Lockfile paths are repository-relative and containment-validated.

## Compatibility

- [x] Receipt schema version remains `"1.0"` under explicit `RECEIPT_V1_ADDITIVE_LOCKSTEP` policy.
- [x] `environment` is additive and optional for backward receipt compatibility.
- [x] The plan does not claim stale strict validators are forward-compatible.
- [x] Updated semantic and JSON Schema validators must accept canonical old receipts.
- [x] Updated semantic and JSON Schema validators must accept new environment-bearing receipts.
- [x] Exact prior strict schema rejection of a new environment receipt is explicitly required as `REJECT_EXPECTED_VERSION_SKEW` proof.
- [x] The prior schema proof must be immutable and repository-local/deterministic.
- [x] All repository-supported consumers from the producing canonical source/build revision must move in lockstep or mechanically tolerate the new optional field.
- [x] `run.ascout_version` is treated only as a product-version label, not a guaranteed unique producer/schema-revision binding or schema-selection key.
- [x] Exact compatibility proof binds repository/source revisions directly rather than inferring them from receipt version labels.
- [x] Receipt 1.1/v2/schema-negotiation machinery and new in-receipt revision fields are out of scope.
- [x] Existing task/tool identity remains unchanged.
- [x] Existing selection, exercise, findings, completeness, and exit semantics are preserved.

## Determinism

- [x] Runtime/platform/arch sources are defined.
- [x] Package-manager source and version provenance semantics are defined.
- [x] Lockfile evidence rules are bounded by existing discovery authority plus the one matching fixed root lockfile case.
- [x] SHA-256 format and null-pair invariants are defined.
- [x] Serialization/validation must be deterministic.

## Testability

- [x] Positive and negative semantic/schema cases are specified.
- [x] Bidirectional compatibility policy proof is specified.
- [x] Current JSON/agent/terminal consumer operation is specified.
- [x] Privacy/path-containment proof is specified.
- [x] Integration emission proof is specified.
- [x] Cross-platform exact-head CI and independent review gates are specified.

## Authorization

- [x] Planning artifacts do not authorize implementation.
- [x] T104 is blocked until canonical planning merge and durable implementation authorization binding the compatibility policy.

**Result:** `READY_FOR_CROSS_ARTIFACT_ANALYSIS_AFTER_REVISION_IDENTITY_RECONCILIATION`