# Specification 005 Technical Plan

## Objective

Add deterministic, privacy-safe run-level environment identity to receipt v1 while preserving all existing verification semantics and avoiding any new executable authority.

## Current architecture

- `src/check.ts` constructs the final receipt from run/source/comparison/selection/task/exercise/evidence data.
- `src/receipt/model.ts` defines receipt v1 interfaces and semantic validation.
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` defines strict JSON Schema v1 with closed objects.
- `src/receipt/json.ts` validates using the repository's current receipt-v1 schema.
- `src/discovery.ts` already resolves supported JavaScript package-manager authority and records the exact source paths used for that resolution.
- Current `ProjectDiscovery.packageManager` does not retain a package-manager declaration version; it retains only the resolved manager and its source paths.
- Node built-ins expose runtime version, platform, architecture, file reads, and SHA-256 hashing without external dependencies.

## Compatibility policy

Spec 005 adopts `COMPATIBILITY_POLICY.md` decision `RECEIPT_V1_ADDITIVE_LOCKSTEP`:

- `schema_version` remains `"1.0"` as the current semantic family;
- canonical older v1 receipts must remain accepted by updated validators;
- all repository-supported validators/consumers from the producing canonical source/build revision must understand or mechanically tolerate the optional extension;
- a prior strict schema without `environment` is expected to reject a newer environment-bearing receipt and that version skew is explicitly unsupported, not hidden as forward compatibility;
- `run.ascout_version` is only a product-version label and is not a guaranteed unique source-revision or schema-revision identifier;
- Spec 005 does not use receipt fields to negotiate or select schema revisions;
- no receipt 1.1/v2 negotiation machinery is introduced.

T104 must prove both backward receipt acceptance and expected stale-validator rejection using an immutable prior-schema reference. The compatibility proof is bound to exact repository/source revisions, not inferred from `run.ascout_version` alone.

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

Extend `ReceiptV1` with optional `environment?: EnvironmentV1` and JSON Schema with an optional additive object. Schema version remains `"1.0"` under the lockstep policy.

### 2. Observation boundary

Create a small pure-or-nearly-pure environment observation module, preferably `src/environment.ts`, receiving repository root, normalized discovery-file content, and already-resolved discovery state.

It may:

- read `process.version`, `process.platform`, and `process.arch`;
- inspect already-resolved discovery package-manager authority;
- read only the exact root `package.json` already named by discovery when that file is the manager authority source, solely to recover the exact version from the already-validated declaration;
- inspect only the fixed supported root lockfile names (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) as supplemental evidence after manager authority is already resolved;
- hash at most one matching lockfile with Node `crypto`.

It must not:

- spawn a process;
- scan arbitrary environment variables;
- inspect host identity beyond platform/arch/runtime;
- choose or change the package manager independently of `discovery.packageManager`;
- treat a lockfile as manager authority when discovery did not.

### 3. Package-manager mapping

`discovery.packageManager` is the sole manager-authority decision.

- If it is not `resolved`, emit manager/version `null`, source=`unavailable`, and no lockfile identity.
- If it is `resolved` from `package.json`, emit that resolved manager and source=`package_json`. The observer may recover the exact version only by reading the same root `package.json` source already validated by discovery and re-checking that its exact `packageManager` declaration names the same resolved manager. Any contradiction is an integrity failure; absence of a recoverable version is `null`.
- If it is `resolved` from a recognized lockfile source path, emit that resolved manager, version=`null`, source=`lockfile`.

This is metadata derivation from an already-authoritative decision, not a second resolver.

### 4. Lockfile identity

Lockfile identity is supplemental evidence and never influences package-manager authority.

- When manager authority is resolved from a recognized lockfile, hash that exact discovery source path.
- When manager authority is resolved from `package.json`, inspect only the one fixed root lockfile name corresponding to the already-resolved manager (`npm -> package-lock.json`, `pnpm -> pnpm-lock.yaml`, `yarn -> yarn.lock`). If that matching root file exists safely, hash it; otherwise emit null path/digest.
- Ignore non-matching recognized lockfiles for environment identity rather than treating them as competing authority.
- Never select among multiple managers; discovery has already made that authority decision.
- Read exact bytes once and emit lowercase SHA-256.

### 5. Integrity semantics

The observer returns either a valid complete `EnvironmentV1` or a typed integrity failure. `check` must not emit a claimed environment object built from contradictory/unsafe state. A true internal observation failure follows existing integrity-error precedence; simple unavailable optional package-manager/version/lockfile metadata is represented with nulls and is not itself an error.

### 6. Validation

Semantic validation enforces:

- normalized non-empty runtime/OS/arch strings;
- runtime name exactly `node`;
- runtime version has no leading `v`;
- package-manager/version/source consistency;
- `package_manager_version` is null when manager is null;
- source `unavailable` requires manager/version null and lockfile identity null;
- lockfile path and digest are both null or both present;
- lockfile path uses canonical repository path validation;
- digest is lowercase 64-hex;
- supported lockfile basename matches declared package manager when both are present.

### 7. Compatibility proof

T104 must preserve the exact prior canonical schema identity needed to prove version-skew behavior without ambiguity. The proof mechanism may use an immutable exact fixture or another deterministic repository-local binding, but it must not depend on network access.

Required matrix:

- old canonical receipt + new semantic validator: accept;
- old canonical receipt + new JSON Schema validator: accept;
- new environment receipt + new semantic validator: accept;
- new environment receipt + new JSON Schema validator: accept;
- new environment receipt + exact prior strict schema: reject as expected unsupported version skew.

Current-source/build JSON/agent/terminal consumers must also remain functional. No consumer in the same source/build revision may embed or invoke a stale schema copy. The tests bind exact old/new repository identities directly; they do not treat `run.ascout_version` as a schema lookup key.

### 8. Serialization/output

No new renderer abstraction. Existing JSON emission naturally includes `environment`; agent/terminal behavior changes only if their current generic receipt path mechanically exposes it. No bespoke presentation work is planned.

## Authorized implementation surfaces candidate

Expected product paths:

- `src/environment.ts` (new);
- `src/check.ts`;
- `src/receipt/model.ts`;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`.

`src/discovery.ts` is **not** expected to change. If implementation cannot satisfy the provenance rules above without modifying discovery semantics or contracts, T105 must stop `NO_GO` and return to planning rather than widening authority.

Expected proof paths:

- `tests/environment-identity.contract.test.ts` (new);
- focused existing receipt/schema/JSON/agent/check tests or an exact immutable prior-schema fixture only where directly required for compatibility/integration proof.

No package/dependency/workflow/benchmark-result mutation is expected.

## Validation strategy

1. receipt compatibility matrix against exact old/new repository-bound validators;
2. focused environment observer contracts;
3. receipt semantic + current JSON Schema validation;
4. integration receipt emission from controlled repository fixtures;
5. current JSON/agent/terminal consumer compatibility;
6. privacy/path-containment negative cases;
7. contradictory manager declaration/discovery-state integrity cases;
8. full project tests/typecheck/build;
9. exact-head six-lane Project CI;
10. fresh independent exact-head substantive review.

## Rollback/compatibility

Because `environment` is additive optional within the explicitly defined lockstep v1 family, older receipts remain valid under newer validators. Stale strict validators are not forward-compatible with newer environment-bearing receipts and are not a supported pairing. `run.ascout_version` alone does not identify a schema revision. No persistent-state migration or schema-negotiation layer is required in Spec 005.