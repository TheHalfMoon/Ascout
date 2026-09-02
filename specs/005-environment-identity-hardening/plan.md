# Specification 005 Technical Plan

## Objective

Add deterministic, privacy-safe run-level environment identity to receipt v1 while preserving existing verification semantics and avoiding new executable authority.

## Current architecture

- `src/check.ts` constructs the final receipt.
- `src/receipt/model.ts` defines receipt v1 interfaces and semantic validation.
- `receipt-v1.schema.json` is a strict closed JSON Schema v1.
- `src/receipt/json.ts` contains the repository's canonical JSON Schema evaluator and exports `validateReceiptJsonSchema()`, whose current entry point loads only the bundled current schema. The generic evaluator path is internal and is not currently injectable with an exact historical schema.
- `collectDiscoveredProject()` returns canonical `root`, `DiscoveryFileMap files`, and `ProjectDiscovery discovery`.
- Root `package.json` content is retained in `files`; recognized lockfiles are retained only as empty-string presence sentinels.
- `ProjectDiscovery.packageManager` retains manager + source paths, not declaration version.
- Node built-ins provide runtime/platform/architecture, safe filesystem primitives, and SHA-256.

## Compatibility policy

Spec 005 adopts `RECEIPT_V1_ADDITIVE_LOCKSTEP`:

- `schema_version` remains `"1.0"`;
- older receipts remain accepted by updated validators;
- same-source/build validators/consumers move in lockstep;
- prior strict schema rejection of an environment-bearing receipt is expected unsupported skew;
- `run.ascout_version` is not a unique source/schema identifier;
- no receipt 1.1/v2 or runtime schema negotiation.

T104 must prove old/new compatibility using exact repository/source-revision evidence. Because the current JSON module can only invoke its canonical evaluator through a current-schema loader, T104 may make a narrow refactor in `src/receipt/json.ts` that reuses the same evaluator with a caller-supplied parsed schema **only for controlled repository-local proof**. `validateReceiptJsonSchema()` continues to load and validate against the current bundled schema exactly as before. No second validator or dependency is permitted.

## Proposed design

### 1. Environment model

Add `EnvironmentV1` with runtime name/version, OS, arch, manager/version/source, lockfile path/digest. Extend `ReceiptV1` with optional `environment?: EnvironmentV1`; add a closed optional JSON Schema object while keeping schema version `"1.0"`.

### 2. T104 JSON Schema proof boundary

Keep one evaluator implementation in `src/receipt/json.ts`.

- Refactor the current evaluator call into a small reusable function that accepts a parsed, already-controlled schema object and a value.
- The existing current-schema loader/cache and `validateReceiptJsonSchema(value)` behavior remain unchanged and continue to use only the bundled current schema.
- Pin the exact pre-Spec-005 strict schema as an immutable repository-local test fixture, e.g. `tests/fixtures/receipt-v1-pre-spec005.schema.json`, with the fixture content/identity tied to canonical pre-Spec-005 source.
- Execute the new environment receipt against that pinned schema through the **same evaluator** and assert expected rejection.
- Do not expose runtime schema negotiation or an arbitrary schema-loading CLI/API; do not duplicate evaluator logic in tests.

The existing evaluator already supports the conditional/closed-object constructs needed for the environment contract (`if`/`then`/`else`, `allOf`, `oneOf`, `const`, patterns, required properties), so no validator feature expansion or dependency is planned. If the contract cannot be expressed using the currently supported keyword set, T104 stops `NO_GO` and returns to planning.

### 3. Observation boundary

Add `src/environment.ts`, receiving canonical `root`, `files`, and `discovery` from `collectDiscoveredProject()`.

It may read process runtime/platform/arch, parse the exact package.json snapshot already used by discovery, use lockfile authority/path presence from discovery, and safely re-open at most one already-authorized lockfile path for exact-byte hashing with Node built-ins.

It must not spawn processes, inspect arbitrary environment variables/host identity, choose a manager independently, hash a lockfile sentinel, discover a new lockfile after the snapshot, trust unrevalidated symlink paths, or mutate `src/discovery.ts`.

### 4. Package-manager mapping

- Not resolved: manager/version null, source `unavailable`, no lockfile identity.
- Resolved from `package.json`: manager from discovery, source `package_json`, exact non-null `x.y.z` from the same `files["package.json"]` snapshot; mismatch/malformed/missing snapshot = integrity failure.
- Resolved from recognized lockfile: manager from discovery, version null, source `lockfile`, exact discovery source path is authority.

### 5. Lockfile byte source and identity

Discovery lockfile values are presence sentinels, not bytes.

For lockfile-derived authority: require the exact recognized source path and snapshot presence, resolve beneath canonical root, re-check realpath/symlink containment, hash exact bytes in bounded chunks, and fail integrity if the authority source cannot be safely re-observed.

For package-json-derived authority: consider only the manager's fixed matching root lockfile if present in the discovery snapshot; re-check containment and hash exact bytes; absent/unsafe/missing/unreadable supplemental state yields null identity with no fallback.

### 6. Validation

Semantic/schema validation enforces runtime name/version, `package_json => manager + exact non-null version`, `lockfile => manager + null version`, `unavailable => null manager/version + null lockfile identity`, lockfile path/digest null-pair, canonical repository path, lowercase 64-hex digest, and manager/lockfile basename consistency when identity is present.

### 7. Serialization/output

No renderer abstraction. Existing JSON path includes `environment` mechanically; agent/terminal behavior changes only where existing generic receipt handling already exposes it.

## Authorized implementation surfaces candidate

### T104 product/contract surfaces

- `src/receipt/model.ts`;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`;
- `src/receipt/json.ts` **only** for the narrow same-evaluator reusable validation refactor described above; current-schema runtime behavior must remain unchanged.

### T105 product surface

- `src/environment.ts` (new) only.

### T106 product surface

- `src/check.ts` only for minimal environment publication/wiring.

`src/discovery.ts` is not expected to change. Any need to widen discovery is `NO_GO` + replanning.

Expected proof paths include:

- `tests/environment-identity.contract.test.ts` (focused model/observer proof as task-appropriate);
- `tests/receipt-json.test.ts` for T104 current/prior same-evaluator compatibility proof;
- `tests/fixtures/receipt-v1-pre-spec005.schema.json` as the immutable exact prior strict-schema fixture;
- focused existing receipt/schema/agent/check tests only where directly required.

No package/dependency/workflow/benchmark-result mutation.

## Validation strategy

1. current evaluator + current schema: old receipt accept;
2. current evaluator + current schema: new environment receipt accept;
3. same evaluator + immutable exact prior strict schema: new environment receipt expected reject;
4. prove normal `validateReceiptJsonSchema()` still loads only current bundled schema;
5. prove no test-local duplicate evaluator/new validation dependency;
6. environment model/source invariants;
7. declaration-led version recovery from discovery snapshot and no disk reread;
8. lockfile sentinel-not-bytes regression;
9. lockfile authority exact-byte SHA-256 + containment/symlink/reread-failure tests;
10. supplemental matching-lockfile null cases;
11. integration receipt emission/current consumers;
12. full tests/typecheck/build;
13. exact-head six-lane Project CI;
14. fresh independent exact-head substantive review.

## Rollback/compatibility

Environment remains additive optional within the lockstep v1 family. Older receipts remain valid under newer validators; stale strict validators are unsupported for newer environment-bearing receipts. `run.ascout_version` alone does not identify schema revision. No migration or negotiation layer is introduced.
