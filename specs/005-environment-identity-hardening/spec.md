# Specification 005 — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Purpose

Close the next measured M1.1 evidence-depth gap after canonical Spec 004 closure by binding non-secret run-level environment identity to receipt v1 without broadening Ascout into environment orchestration.

## Canonical basis

- Constitution: evidence before claims, source-bound truth, native capability before invention, bounded/private execution, benchmark-gated growth.
- Master Plan v1: future material implementation requires a new canonical Spec Kit authority chain and explicit durable authorization.
- Post-M1 roadmap M1.1-B: reliable non-secret runtime, OS/architecture, package-manager version, tool versions, and lockfile digest.
- Canonical base at planning start: `7bede70ad2abfb91dc9186fb44d77a824efbfdef`.
- Spec 004: `CLOSED_CANONICAL / GO`.
- Compatibility policy: `COMPATIBILITY_POLICY.md` → `RECEIPT_V1_ADDITIVE_LOCKSTEP`.

## Scope

Add one optional additive `environment` object to receipt v1 with runtime, OS/architecture, discovery-authoritative package-manager identity/version, and one safely attributable supported lockfile path/SHA-256.

## Functional requirements

1. `schema_version` remains exactly `"1.0"` under the additive-lockstep policy; no stale strict-schema forward-compatibility claim is made.
2. Existing line/branch evidence, task semantics, selection, completeness, and receipt exit semantics remain unchanged solely because environment identity is present.
3. Runtime/OS/architecture are observed from the running Node process.
4. `discovery.packageManager` is the sole package-manager authority; no package-manager command or second resolver is authorized.
5. Declaration-led authority recovers the exact non-null `x.y.z` from the exact `DiscoveryFileMap["package.json"]` content snapshot discovery parsed; package.json is not reread from disk for version derivation.
6. Lockfile-led authority keeps version `null`; recognized lockfiles in discovery are presence sentinels and their map values are never hashed.
7. Lockfile hashing MUST be one object-bound descriptor operation. Pre-open, resolve the authorized path and its real target beneath canonical root and capture stable object identity from the contained target. Open the authorized path read-only exactly once. Before reading any bytes, `fstat` the descriptor and require a regular file whose stable object identity matches the containment-checked target. Path spelling, size, or timestamps alone are insufficient identity.
8. After identity match, all hash bytes are read in bounded-memory chunks from that same descriptor only. The path MUST NOT be reopened for hashing. Descriptor identity and content-stability metadata are captured before and after reading; object identity, file type, size, or modification/change timestamp drift invalidates the observation.
9. Before accepting the digest, re-resolve/re-stat the authorized path and require it to remain beneath canonical root and identify the same opened object. Replacement between containment and open must be detected before any bytes are read. Replacement after descriptor binding cannot redirect descriptor reads, but a persistent post-read path/object mismatch is rejected.
10. Supported Ubuntu/macOS/Windows execution MUST prove a reliable stable object-identity comparison between pre-open path stat and descriptor `fstat` using Node-supported file identity fields. If any supported platform cannot prove this, T105 is `NO_GO`; there is no path-only, size-only, timestamp-only, or reopen-and-hash fallback.
11. Lockfile-led authority: containment/object-binding/stability/read/hash failure is a typed environment-identity integrity failure. Package-json-led supplemental lockfile: the same failures yield null lockfile identity, never fallback or manager-authority change.
12. Absent/ambiguous/unsupported package-manager discovery yields manager/version null, source `unavailable`, and null lockfile identity.
13. Raw absolute path, host/user/network/environment inventory, machine identity, credentials, and secret-bearing values are prohibited from the receipt.
14. Updated same-source/build semantic and JSON Schema validators accept canonical older v1 receipts; new environment receipts are accepted by current validators while the exact prior strict schema rejection is explicitly proven as unsupported version skew.
15. The prior strict-schema rejection proof uses the same canonical JSON Schema evaluator implementation in `src/receipt/json.ts`; only a narrow T104 reuse/testability refactor is authorized. No duplicated evaluator, new validation dependency, runtime schema selector, or negotiation.
16. `run.ascout_version` is only a product-version label, not an exact source/schema-revision key.
17. T105 reports contradictory/unsafe authority state as a typed environment-identity integrity failure. T106 invokes observation before any project task execution; failure emits no receipt, uses existing redaction, and maps specifically to canonical exit `2` through a narrow `src/cli.ts` classification without redesigning generic CLI errors.
18. `src/discovery.ts` remains outside the implementation surface. If current discovery truth, supported-platform file identity primitives, or object-binding guarantees are insufficient, implementation stops `NO_GO` and returns to planning.

## Non-goals

- function coverage, mutation/property/fuzzing, browser/container identity;
- arbitrary environment capture or executable package-manager probing;
- dependency graphing/SBOM/toolchain installation/sandboxing;
- receipt 1.1/v2, schema negotiation, runtime schema selection, or in-receipt schema revision identifiers;
- generalized filesystem sandboxing/file-watch infrastructure/reusable safe-file framework;
- generic CLI redesign, publication, release, or tag work.

## Trust and privacy constraints

Environment identity is evidence metadata, not execution authority. Lockfile bytes may be read only from an opened descriptor proven to be the same contained file object that passed pre-open containment/identity checks. No lockfile bytes may be read before descriptor object identity matches. Descriptor and path identity/stability are rechecked after hashing. A failed authority observation stops before project-task execution and cannot produce a misleading partial receipt.

## Acceptance criteria

- deterministic runtime/OS/arch identity and discovery-only manager authority;
- exact package-json version from the discovery snapshot, never disk reread;
- lockfile digest hashes exact bytes from one object-bound descriptor, never sentinel values or a reopened path;
- swap between containment and open is detected before bytes; persistent swap after open/during read is rejected before digest acceptance;
- in-place mutation during hashing is rejected by pre/post descriptor stability checks;
- object-binding is proven on Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24 or T105 is `NO_GO`;
- authority lockfile failure yields typed integrity; supplemental lockfile failure may yield null without fallback;
- old receipt + new validators = `ACCEPT`; new receipt + new validators = `ACCEPT`; new receipt + exact prior strict schema via the same evaluator = `REJECT_EXPECTED_VERSION_SKEW`;
- typed environment integrity failure happens before project task execution, emits no receipt, and maps to exit `2`;
- exact-head six-lane Project CI and fresh independent review are required before implementation merge.
