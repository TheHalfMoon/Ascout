# Specification 005 Technical Plan

## Objective

Add deterministic, privacy-safe run-level environment identity to receipt v1 while preserving all existing verification semantics and avoiding any new executable authority.

## Current architecture

- `src/check.ts` constructs the final receipt from run/source/comparison/selection/task/exercise/evidence data.
- `src/receipt/model.ts` defines receipt v1 interfaces and semantic validation.
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` defines strict JSON Schema v1 with closed objects.
- `src/receipt/json.ts` validates using the repository's current receipt-v1 schema.
- `collectDiscoveredProject()` returns canonical `root`, a `DiscoveryFileMap files` snapshot, and `ProjectDiscovery discovery`.
- `src/discovery.ts` resolves supported JavaScript package-manager authority and records exact source paths.
- Root `package.json` content is retained in `files` because it is content-required discovery metadata.
- Recognized lockfiles are retained in `files` only as presence/path sentinels with empty-string values; their bytes are not retained by discovery.
- Current `ProjectDiscovery.packageManager` retains resolved manager + source paths, not declaration version.
- Node built-ins provide runtime version, platform, architecture, safe filesystem primitives, and SHA-256 without external dependencies.

## Compatibility policy

Spec 005 adopts `COMPATIBILITY_POLICY.md` decision `RECEIPT_V1_ADDITIVE_LOCKSTEP`:

- `schema_version` remains `"1.0"` as the current semantic family;
- canonical older v1 receipts remain accepted by updated validators;
- repository-supported validators/consumers from the producing canonical source/build revision move in lockstep;
- prior strict schema rejection of an environment-bearing receipt is expected unsupported version skew;
- `run.ascout_version` is only a product-version label, not a unique source/schema-revision identifier;
- receipt fields do not negotiate or select schema revisions;
- no receipt 1.1/v2 negotiation machinery is introduced.

T104 proves old/new compatibility using immutable repository/source-revision evidence rather than `run.ascout_version` as a schema lookup key.

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

Extend `ReceiptV1` with optional `environment?: EnvironmentV1`; add an optional closed JSON Schema object; keep schema version `"1.0"` under the lockstep policy.

### 2. Observation boundary

Add `src/environment.ts`, receiving the canonical repository `root`, the `files` snapshot, and already-resolved `discovery` from `collectDiscoveredProject()`.

It may:

- read `process.version`, `process.platform`, and `process.arch`;
- inspect `discovery.packageManager` and its source paths;
- parse the exact `files["package.json"]` snapshot when package.json is the manager authority source;
- use lockfile presence/path from `files` and discovery authority;
- safely re-open only the one already-authorized lockfile path under canonical `root` to hash exact bytes;
- use Node `fs`/`path`/`crypto` built-ins with bounded-memory chunked reading.

It must not:

- spawn a process;
- scan arbitrary environment variables;
- inspect host identity beyond platform/arch/runtime;
- choose/change package manager independently of discovery;
- treat `files[lockfilePath]` as lockfile content;
- discover a new lockfile after the discovery snapshot;
- trust an unrevalidated symlink/realpath when reading hash bytes;
- mutate `src/discovery.ts`.

### 3. Package-manager mapping

`discovery.packageManager` is the sole manager-authority decision.

- Not resolved: manager/version null, source=`unavailable`, no lockfile identity.
- Resolved from `package.json`: manager from discovery, source=`package_json`, exact non-null `x.y.z` parsed from the same `files["package.json"]` content discovery used. Confirm same manager. Missing/malformed snapshot or mismatch is integrity failure. Do not re-read package.json from disk.
- Resolved from recognized lockfile: manager from discovery, version null, source=`lockfile`, exact discovery source path is the authority path.

### 4. Lockfile byte source and identity

Discovery lockfile values are presence sentinels, not bytes. Hashing them would silently produce the SHA-256 of an empty string and is prohibited.

For lockfile-derived authority:

1. require exactly the recognized discovery authority source path and snapshot presence;
2. resolve that repository-relative path beneath canonical `root`;
3. re-resolve realpath/containment at read time, including symlink containment;
4. read exact bytes in bounded-memory chunks and hash with SHA-256;
5. inability to safely re-read/hash the authority source is an integrity failure.

For package-json-derived authority:

1. map already-resolved manager to its one fixed root lockfile name;
2. attempt supplemental identity only if that exact path is present in the discovery snapshot;
3. re-check containment and read/hash exact filesystem bytes;
4. if absent in the snapshot or unsafe/missing/unreadable at observation time, emit null path/digest;
5. never try another lockfile and never change manager authority.

This preserves discovery as the only resolver while obtaining real lockfile bytes without modifying discovery contracts.

### 5. Integrity semantics

Observer returns valid `EnvironmentV1` or typed integrity failure. Integrity failures include contradictory declaration-led version state and inability to re-observe a lockfile that supplied manager authority. Optional absence is limited to unresolved manager discovery and supplemental lockfile identity for package-json-derived authority.

### 6. Validation

Semantic validation enforces:

- non-empty normalized runtime/OS/arch;
- runtime name `node`, version without leading `v`;
- `package_json` => manager + exact non-null x.y.z version;
- `lockfile` => manager + null version;
- `unavailable` => null manager/version and null lockfile identity;
- lockfile path/digest null-pair invariant;
- canonical repository-relative lockfile path;
- lowercase 64-hex digest;
- supported lockfile basename matches manager when identity is present.

### 7. Compatibility proof

T104 pins exact prior canonical schema identity in deterministic repository-local proof. Matrix:

- old receipt + new semantic validator: accept;
- old receipt + new JSON Schema validator: accept;
- new environment receipt + new semantic validator: accept;
- new environment receipt + new JSON Schema validator: accept;
- new environment receipt + exact prior strict schema: expected reject.

Same-source/build JSON/agent/terminal consumers remain functional and cannot bundle a stale schema. Tests bind exact repository identities directly.

### 8. Serialization/output

No renderer abstraction. Existing JSON path includes environment mechanically; agent/terminal behavior changes only where generic receipt handling already exposes fields. No bespoke presentation work.

## Authorized implementation surfaces candidate

Expected product paths:

- `src/environment.ts` (new);
- `src/check.ts`;
- `src/receipt/model.ts`;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`.

`src/discovery.ts` is not expected to change. If the observer cannot satisfy these rules from `root + files + discovery`, stop `NO_GO` and replan.

Expected proof paths:

- `tests/environment-identity.contract.test.ts` (new);
- focused existing receipt/schema/JSON/agent/check tests and exact immutable prior-schema proof as directly required.

No package/dependency/workflow/benchmark-result mutation.

## Validation strategy

1. compatibility matrix against exact old/new repository-bound validators;
2. environment model/source invariants;
3. declaration-led version recovery from discovery snapshot and no disk reread;
4. lockfile sentinel-not-bytes regression test;
5. lockfile-authority exact-byte SHA-256 + containment/symlink/reread-failure tests;
6. supplemental matching-lockfile absent/unsafe/unreadable null tests;
7. semantic + current JSON Schema validation;
8. integration receipt emission/current consumers;
9. privacy/path-containment negative cases;
10. full tests/typecheck/build;
11. exact-head six-lane Project CI;
12. fresh independent exact-head substantive review.

## Rollback/compatibility

Environment remains additive optional within the explicit lockstep v1 family. Older receipts remain valid under newer validators; stale strict validators are unsupported for newer environment-bearing receipts. `run.ascout_version` alone does not identify schema revision. No migration or negotiation layer is introduced.
