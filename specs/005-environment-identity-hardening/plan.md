# Specification 005 Technical Plan

## Objective

Add deterministic, privacy-safe run-level environment identity to receipt v1 while preserving verification semantics and avoiding new executable authority.

## Current architecture

- `src/check.ts` constructs the final receipt after discovery/planning/task execution and source-end observation.
- `src/receipt/model.ts` defines receipt v1 interfaces/semantic validation.
- `receipt-v1.schema.json` is a strict closed JSON Schema v1.
- `src/receipt/json.ts` contains the canonical JSON Schema evaluator; normal validation loads only the bundled current schema.
- `runCli()` returns receipt summary exit codes for successful `runCheck()` outcomes. Its current generic non-usage exception path returns `1`, while canonical Spec 001/Master Plan reserve exit `2` for usage/config/internal/task-execution integrity errors. Therefore a newly expected environment-integrity failure cannot simply fall into the generic exception path without explicit bounded handling.
- `collectDiscoveredProject()` returns canonical `root`, `DiscoveryFileMap files`, and `ProjectDiscovery discovery`.
- Root `package.json` content is retained in `files`; recognized lockfiles are empty-string presence sentinels.

## Compatibility policy

Spec 005 adopts `RECEIPT_V1_ADDITIVE_LOCKSTEP`: schema version stays `"1.0"`, older receipts remain accepted by updated validators, same-source/build consumers move in lockstep, prior strict-schema rejection is expected skew, `ascout_version` is not a unique schema key, and no v2/negotiation is introduced.

T104 may narrowly refactor `src/receipt/json.ts` so the same evaluator can run the current bundled schema and an immutable exact prior schema in repository-local proof. Normal `validateReceiptJsonSchema()` remains current-schema-only. No second validator/dependency/runtime schema selection.

## Proposed design

### 1. Environment model

Add `EnvironmentV1` with runtime name/version, OS, arch, manager/version/source, and lockfile path/digest. Extend `ReceiptV1` with optional `environment?: EnvironmentV1`; add a closed optional schema object.

### 2. T104 JSON Schema proof boundary

Refactor one existing evaluator call into a reusable controlled function. Pin the exact pre-Spec-005 strict schema as `tests/fixtures/receipt-v1-pre-spec005.schema.json`, tied to canonical base `7bede70ad2abfb91dc9186fb44d77a824efbfdef`, schema path `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`, Git blob `b331de44505f6fbdc5ff033367ef0904fda236b4`. Current and prior schemas run through the same evaluator. The current loader/cache and current runtime validation behavior remain unchanged.

The existing evaluator supports the conditional/closed-object keywords needed for the environment contract. If the contract cannot be expressed using the already-supported keyword set, T104 is `NO_GO` rather than validator expansion.

### 3. Observation boundary

T105 adds `src/environment.ts`, receiving canonical `root`, `files`, and `discovery` from `collectDiscoveredProject()`.

It observes process runtime/platform/arch, derives declaration-led version from the same package.json snapshot, and hashes only exact filesystem bytes at an already-authorized lockfile path with containment rechecked. It never spawns a process, chooses a manager, hashes a discovery sentinel, discovers a post-snapshot lockfile, trusts an unrevalidated symlink, or mutates discovery.

T105 defines a typed environment-identity integrity error for contradictory/unsafe authority state. Supplemental absence is represented with nulls; authority failure is typed error.

### 4. Package-manager / lockfile rules

- Not resolved: manager/version null, source `unavailable`, no lockfile identity.
- Package-json authority: manager from discovery, exact non-null version from same snapshot; contradiction = typed integrity failure.
- Lockfile authority: manager from discovery, version null, exact discovery path; unsafe/unreadable/hash failure = typed integrity failure.
- Package-json supplemental lockfile: only matching fixed root path present in snapshot; failure => null identity, never fallback.

### 5. T106 publication and integrity-error boundary

T106 wires the observer into `src/check.ts` **before any project task execution**. On successful observation, the one observed `EnvironmentV1` is carried to receipt construction and emitted unchanged.

On typed environment-identity integrity failure:

- no project task is executed after the failed observation;
- no receipt/JSON/agent receipt is emitted, because inventing a synthetic task or `environment_error` field would misrepresent the receipt model;
- the typed failure propagates to the CLI boundary;
- `src/cli.ts` receives a narrowly authorized change that recognizes only this typed expected integrity failure, emits a repository-path-redacted diagnostic through existing redaction behavior, and returns exit code `2`;
- generic unexpected-error handling remains unchanged and no new CLI flag/output mode is introduced.

This is the minimum truthful route to the canonical integrity-error exit code without widening the receipt schema beyond environment identity.

### 6. Validation / output

Semantic/schema validation enforces runtime and source/manager/version/lockfile invariants. Existing JSON includes environment mechanically; agent/terminal behavior changes only where generic receipt handling already exposes fields. There is no bespoke presentation.

## Authorized implementation surfaces candidate

### T104

- `src/receipt/model.ts`;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`;
- `src/receipt/json.ts` only for same-evaluator proof reuse/current behavior preservation;
- focused receipt/model/JSON tests + immutable prior-schema fixture.

### T105

- `src/environment.ts` only for product behavior, including its typed integrity error;
- focused observer/privacy/containment tests.

### T106

- `src/check.ts` for pre-task observation and successful receipt publication;
- `src/cli.ts` only for typed environment-integrity failure → redacted diagnostic + exit `2`, with generic error behavior unchanged;
- focused check/CLI/current-consumer integration tests.

`src/discovery.ts` remains excluded. No package/dependency/workflow/benchmark-result mutation.

## Validation strategy

1. same evaluator: old/current accept + new/current accept + new/prior expected reject;
2. current `validateReceiptJsonSchema()` remains current-schema-only;
3. environment model/source invariants and package-json snapshot derivation;
4. lockfile sentinel-not-bytes, exact-byte hash, containment/symlink, authority/supplemental failure cases;
5. T106 calls observer before project task execution;
6. typed environment integrity failure causes zero project-task execution, no receipt output, redacted diagnostic, CLI exit `2`;
7. generic unexpected CLI error behavior is unchanged;
8. successful integration receipt emission/current consumers;
9. full tests/typecheck/build;
10. exact-head six-lane Project CI;
11. fresh independent exact-head substantive review.

## Rollback/compatibility

Environment remains additive optional. Older receipts remain valid under newer validators. Stale strict validators are unsupported for new environment-bearing receipts. No migration/negotiation layer or generic CLI error redesign is introduced.
