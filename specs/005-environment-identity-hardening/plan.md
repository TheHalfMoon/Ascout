# Specification 005 Technical Plan

## Objective

Add deterministic, privacy-safe run-level environment identity to receipt v1 while preserving all existing verification semantics and avoiding any new executable authority.

## Current architecture

- `src/check.ts` constructs the final receipt from run/source/comparison/selection/task/exercise/evidence data.
- `src/receipt/model.ts` defines receipt v1 interfaces and semantic validation.
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` defines JSON Schema v1.
- `src/discovery.ts` already resolves supported JavaScript package-manager state and relevant source paths.
- Node built-ins expose runtime version, platform, architecture, file reads, and SHA-256 hashing without external dependencies.

## Proposed design

### 1. Environment model

Add `EnvironmentV1`:

```ts
interface EnvironmentV1 {
  readonly runtime_name: "node";
  readonly runtime_version: string;
  readonly os: string;
  readonly arch: string;
  readonly package_manager: "npm" | "pnpm" | "yarn" | null;
  readonly package_manager_version: string | null;
  readonly package_manager_source: "package_json" | "lockfile" | "unavailable";
  readonly lockfile_path: string | null;
  readonly lockfile_sha256: string | null;
}
```

Extend `ReceiptV1` with optional `environment?: EnvironmentV1` and JSON Schema with an optional additive object. Schema version remains `"1.0"`.

### 2. Observation boundary

Create a small pure-or-nearly-pure environment observation module, preferably `src/environment.ts`, receiving repository root and already-resolved discovery state.

It may:

- read `process.version`, `process.platform`, and `process.arch`;
- inspect already-resolved discovery package-manager data;
- read at most the single already-authoritative supported lockfile;
- hash bytes with Node `crypto`.

It must not:

- spawn a process;
- scan arbitrary environment variables;
- inspect host identity beyond platform/arch/runtime;
- introduce a second package-manager resolution algorithm.

### 3. Package-manager mapping

Reuse `discovery.packageManager` semantics. A validated `packageManager` declaration like `npm@x.y.z` may supply name/version/source=`package_json`. A lockfile-derived manager without a validated version supplies manager, version=`null`, source=`lockfile`. Unsupported/ambiguous/unavailable discovery produces manager/version `null` and source=`unavailable`.

### 4. Lockfile identity

Use only an existing discovery-selected/source path when it corresponds to a supported lockfile and is repository-contained. Read exact bytes once and emit lowercase SHA-256. Do not hash multiple competing candidates. If no unambiguous effective lockfile is available, emit `null` path/digest.

### 5. Integrity semantics

The observer returns either a valid complete `EnvironmentV1` or a typed integrity failure. `check` must not emit a claimed environment object built from contradictory/unsafe state. A true internal observation failure follows existing integrity-error precedence; simple unavailable optional package-manager/lockfile metadata is represented with nulls and is not itself an error.

### 6. Validation

Semantic validation enforces:

- normalized non-empty runtime/OS/arch strings;
- runtime name exactly `node`;
- runtime version has no leading `v`;
- package-manager/version/source consistency;
- `package_manager_version` is null when manager is null;
- source `unavailable` requires manager/version null;
- lockfile path and digest are both null or both present;
- lockfile path uses canonical repository path validation;
- digest is lowercase 64-hex;
- supported lockfile basename matches declared package manager when both are present.

### 7. Serialization/output

No new renderer abstraction. Existing JSON emission naturally includes `environment`; agent/terminal behavior changes only if their current generic receipt path mechanically exposes it. No bespoke presentation work is planned.

## Authorized implementation surfaces candidate

Expected product paths:

- `src/environment.ts` (new);
- `src/check.ts`;
- `src/receipt/model.ts`;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`.

Expected proof paths:

- `tests/environment-identity.contract.test.ts` (new);
- focused existing receipt/check tests only where directly required for compatibility/integration proof.

No package/dependency/workflow/benchmark-result mutation is expected.

## Validation strategy

1. focused environment observer contracts;
2. receipt semantic + JSON Schema validation;
3. legacy receipt compatibility;
4. integration receipt emission from controlled repository fixtures;
5. privacy/path-containment negative cases;
6. full project tests/typecheck/build;
7. exact-head six-lane Project CI;
8. fresh independent exact-head substantive review.

## Rollback/compatibility

Because `environment` is additive optional receipt-v1 data, old receipts remain valid. No migration or persistent state rewrite is required.
