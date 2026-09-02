# Specification 005 Technical Plan

## Objective

Add deterministic, privacy-safe run-level environment identity to receipt v1 while preserving verification semantics and avoiding new executable authority.

## Current architecture

- `src/check.ts` constructs the final receipt after discovery/planning/task execution and source-end observation.
- `src/receipt/model.ts` defines receipt v1 interfaces/semantic validation.
- `receipt-v1.schema.json` is a strict closed JSON Schema v1.
- `src/receipt/json.ts` contains the canonical JSON Schema evaluator; normal validation loads only the bundled current schema.
- `runCli()` returns receipt summary exit codes for successful `runCheck()` outcomes; generic non-usage exceptions currently return `1`, while canonical Spec 001/Master Plan reserve exit `2` for internal/integrity errors.
- `collectDiscoveredProject()` returns canonical `root`, `DiscoveryFileMap files`, and `ProjectDiscovery discovery`.
- Root `package.json` content is retained in `files`; recognized lockfiles are empty-string presence sentinels.

## Compatibility policy

Spec 005 adopts `RECEIPT_V1_ADDITIVE_LOCKSTEP`: schema version stays `"1.0"`, older receipts remain accepted by updated validators, same-source/build consumers move in lockstep, prior strict-schema rejection is expected skew, `ascout_version` is not a unique schema key, and no v2/negotiation is introduced.

T104 may narrowly refactor `src/receipt/json.ts` so the same evaluator can run the current bundled schema and an immutable exact prior schema in repository-local proof. Normal `validateReceiptJsonSchema()` remains current-schema-only. No second validator/dependency/runtime schema selection.

## Proposed design

### 1. Environment model

Add `EnvironmentV1` with runtime name/version, OS, arch, manager/version/source, and lockfile path/digest. Extend `ReceiptV1` with optional `environment?: EnvironmentV1`; add a closed optional schema object.

### 2. T104 JSON Schema proof boundary

Refactor one existing evaluator call into a reusable controlled function. Pin the exact pre-Spec-005 strict schema as `tests/fixtures/receipt-v1-pre-spec005.schema.json`, tied to canonical base `7bede70ad2abfb91dc9186fb44d77a824efbfdef`, schema path `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`, Git blob `b331de44505f6fbdc5ff033367ef0904fda236b4`. Current and prior schemas run through the same evaluator. The current loader/cache and runtime validation behavior remain unchanged.

If the environment contract cannot be expressed using the evaluator's already-supported keyword set, T104 is `NO_GO` rather than validator expansion.

### 3. Observation boundary

T105 adds `src/environment.ts`, receiving canonical `root`, `files`, and `discovery` from `collectDiscoveredProject()`.

It observes process runtime/platform/arch, derives declaration-led version from the same package.json snapshot, and may hash only an already-authorized lockfile path. It never spawns a process, chooses a manager, hashes a discovery sentinel, discovers a post-snapshot lockfile, mutates discovery, or reads arbitrary host/environment identity.

T105 defines a typed environment-identity integrity error for contradictory/unsafe authority state. Supplemental lockfile absence/failure is nullable; authority failure is typed error.

### 4. Package-manager rules

- Not resolved: manager/version null, source `unavailable`, no lockfile identity.
- Package-json authority: manager from discovery, exact non-null version from same snapshot; contradiction = typed integrity failure.
- Lockfile authority: manager from discovery, version null, exact discovery path.
- Package-json supplemental lockfile: only matching fixed root path present in snapshot; failure => null identity, never fallback.

### 5. Object-bound lockfile hashing

A path containment check followed by a later independent open is insufficient because the path can be replaced between check and read. T105 therefore uses one object-bound descriptor sequence:

1. Resolve canonical repository root and the exact authorized repository-relative lockfile path.
2. Resolve the candidate's real target and require containment beneath canonical root.
3. Stat that contained target with bigint-capable Node file metadata and capture a stable pre-open object identity. The implementation must use a platform-proven stable identity tuple from Node path/descriptor stats (for example `dev` + `ino` where reliable); path string, size, or timestamps alone never qualify as identity.
4. Open the authorized candidate path read-only exactly once.
5. Before reading any bytes, `fstat` the opened descriptor, require a regular file, and require the descriptor identity to equal the pre-open contained-target identity. A swap to an out-of-root symlink/file between containment and open therefore fails before content is read.
6. Capture pre-read descriptor stability metadata including object identity, file type, size, and nanosecond modification/change timestamps where Node exposes them.
7. Hash exact bytes in bounded-memory chunks from that descriptor only. Never reopen the path for hash bytes.
8. `fstat` the same descriptor after reading and require identity/type/size/modification/change stability. In-place mutation during hashing is a failed observation.
9. Re-resolve and re-stat the authorized path after reading. Require it to remain contained and to identify the same object as the opened descriptor before accepting the digest. Persistent replacement after open/during read therefore fails even though it could not redirect descriptor reads.
10. Close the descriptor in `finally`; publish the digest only after all checks pass.

A transient path replacement after the descriptor is safely bound cannot redirect descriptor reads. The safety claim is therefore about the actual object supplying bytes, plus rejection of any persistent post-read path/object mismatch. No file-watch or generalized sandbox subsystem is introduced.

The implementation must prove reliable object identity on Ubuntu 24.04, macOS 14, and Windows 2025 under Node 22/24. If any supported platform cannot provide a trustworthy path-stat ↔ descriptor-`fstat` identity comparison, T105 stops `NO_GO` and returns to planning. There is no fallback to path-only, timestamp-only, size-only, or reopen-and-hash logic.

For lockfile-led authority, any containment/object-binding/stability/read/hash failure is typed integrity failure. For package-json supplemental identity, the same failure yields null lockfile identity without fallback or authority change.

### 6. T106 publication and integrity-error boundary

T106 wires the observer into `src/check.ts` **before any project task execution**. On successful observation, the one observed `EnvironmentV1` is carried to receipt construction and emitted unchanged.

On typed environment-identity integrity failure:

- no project task executes after the failed observation;
- no receipt/JSON/agent receipt is emitted;
- the typed failure propagates to the CLI boundary;
- `src/cli.ts` recognizes only this typed expected integrity failure, emits a repository-path-redacted diagnostic through existing redaction behavior, and returns exit `2`;
- generic unexpected-error handling remains unchanged and no new CLI flag/output mode is introduced.

### 7. Validation / output

Semantic/schema validation enforces runtime and source/manager/version/lockfile invariants. Existing JSON includes environment mechanically; agent/terminal behavior changes only where generic receipt handling already exposes fields. There is no bespoke presentation.

## Authorized implementation surfaces candidate

### T104

- `src/receipt/model.ts`;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`;
- `src/receipt/json.ts` only for same-evaluator proof reuse/current behavior preservation;
- focused receipt/model/JSON tests + immutable prior-schema fixture.

### T105

- `src/environment.ts` only for product behavior, typed integrity error, and local object-bound lockfile hashing logic;
- focused observer/privacy/containment/object-binding/race/stability tests.

### T106

- `src/check.ts` for pre-task observation and successful receipt publication;
- `src/cli.ts` only for typed environment-integrity failure → redacted diagnostic + exit `2`, generic error behavior unchanged;
- focused check/CLI/current-consumer integration tests.

`src/discovery.ts` remains excluded. No package/dependency/workflow/benchmark-result mutation.

## Validation strategy

1. same evaluator: old/current accept + new/current accept + new/prior expected reject;
2. current `validateReceiptJsonSchema()` remains current-schema-only;
3. environment model/source invariants and package-json snapshot derivation;
4. lockfile sentinel-not-bytes and exact descriptor-byte SHA-256;
5. pre-open contained identity ↔ immediate descriptor identity match;
6. swap after containment but before open is detected before any bytes are read;
7. swap after descriptor binding/during read cannot redirect bytes and persistent post-read path mismatch is rejected;
8. in-place mutation during hashing is rejected by pre/post descriptor stability checks;
9. object-binding proof on all six OS/Node CI lanes; unsupported identity semantics => `NO_GO`;
10. authority vs supplemental failure behavior;
11. T106 observes before project task execution; typed integrity failure causes zero tasks, no receipt, redacted diagnostic, exit `2`;
12. generic unexpected CLI error behavior unchanged;
13. successful receipt emission/current consumers;
14. full tests/typecheck/build;
15. exact-head six-lane Project CI;
16. fresh independent exact-head substantive review.

## Rollback/compatibility

Environment remains additive optional. Older receipts remain valid under newer validators. Stale strict validators are unsupported for new environment-bearing receipts. No migration/negotiation layer, generic CLI error redesign, or generalized filesystem security subsystem is introduced.
