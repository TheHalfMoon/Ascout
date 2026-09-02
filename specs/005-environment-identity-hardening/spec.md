# Specification 005 — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Purpose

Close the next measured M1.1 evidence-depth gap after canonical Spec 004 closure by binding non-secret run-level environment identity to receipt v1 without broadening Ascout into environment orchestration.

## Canonical basis

- Constitution: evidence before claims, source-bound truth, native capability before invention, bounded/private execution, benchmark-gated growth.
- Master Plan v1: future material implementation requires a new canonical Spec Kit authority chain and explicit durable authorization.
- Post-M1 roadmap M1.1-B: record reliable non-secret runtime, OS/architecture, package-manager version, tool versions, and lockfile digest.
- Canonical base at planning start: `7bede70ad2abfb91dc9186fb44d77a824efbfdef`.
- Spec 004: `CLOSED_CANONICAL / GO`.

## Measured gap

Current receipt v1 run identity contains `run_id`, `ascout_version`, `started_at`, `finished_at`, and `config_digest`; task results already contain `tool_name` and `tool_version`. The product receipt does not currently expose a run-level environment identity for Node runtime, host OS, architecture, package-manager identity/version, or the active supported lockfile digest. The benchmark harness already treats OS, Node, and package-manager identity as reproducibility evidence, showing a direct mismatch between benchmark evidence discipline and product receipt evidence depth.

## Scope

Add one optional additive `environment` object to receipt v1. When present it must be complete and semantically validated.

Required fields:

- `runtime_name`: exactly `node` for this bounded slice;
- `runtime_version`: normalized non-empty Node version without a leading `v`;
- `os`: normalized Node platform identifier;
- `arch`: normalized Node architecture identifier;
- `package_manager`: `npm | pnpm | yarn | null`;
- `package_manager_version`: normalized semver string or `null`;
- `package_manager_source`: `package_json | lockfile | unavailable`;
- `lockfile_path`: canonical repository-relative path or `null`;
- `lockfile_sha256`: lowercase 64-hex digest or `null`.

## Functional requirements

1. Receipt `schema_version` remains exactly `"1.0"`.
2. Existing line/branch evidence, task semantics, selection, completeness, and exit codes remain unchanged solely because environment identity is present or absent.
3. Runtime identity is observed from the running Node process, not inferred from project declarations.
4. OS and architecture are observed from the running Node process and normalized deterministically.
5. Package-manager identity reuses existing trusted discovery results; no package-manager command may be executed solely to populate environment identity.
6. Package-manager version may be recorded only when already reliably available from a validated `packageManager` declaration or another existing non-executing trusted discovery source. Otherwise it is `null`.
7. Lockfile identity may include only the single effective supported lockfile selected by existing discovery semantics. Ambiguous or unavailable lockfile identity remains `null`; this feature must not invent a new package-manager resolver.
8. Lockfile digest is SHA-256 of the exact observed file bytes and uses repository-safe containment rules.
9. No raw absolute path, user identity, hostname, environment-variable inventory, network address, machine identifier, credential, or secret-bearing value may enter the receipt.
10. Environment identity must serialize deterministically.
11. Semantic validation rejects inconsistent nullable groups: package manager/version/source and lockfile path/digest must agree with the declared source state.
12. Existing receipts without `environment` remain valid for backward compatibility.
13. New Ascout-produced receipts after implementation must publish `environment` when observation succeeds; observation integrity failure must fail closed as an Ascout execution/integrity error rather than silently fabricate identity.

## Non-goals

- function coverage;
- mutation/property/fuzzing;
- browser or container identity;
- arbitrary environment variable capture;
- executable package-manager version probing;
- dependency graphing;
- SBOM generation;
- toolchain installation;
- sandboxing;
- receipt v2;
- policy engine changes;
- new CLI verbs or output redesign;
- publication, release, or tag work.

## Trust and privacy constraints

Environment identity is evidence metadata, not execution authority. It must never grant admission, suppress missing verification, or convert uncertainty into PASS. All paths remain repository-relative and canonical. No new child process is authorized for identity collection.

## Acceptance criteria

- deterministic runtime/OS/arch identity is emitted;
- package manager identity uses current discovery without new execution;
- validated package-manager version is emitted when already known and otherwise `null`;
- one effective supported lockfile is hashed byte-for-byte when safely and unambiguously available;
- ambiguous/unavailable lockfile state is represented without guessing;
- schema and semantic validators accept legacy receipts with no environment object;
- malformed/inconsistent environment objects fail validation;
- privacy boundaries are proven by focused tests;
- existing receipt/task/exercise/selection semantics remain unchanged;
- exact-head six-lane Project CI and fresh independent review are required before implementation merge.
