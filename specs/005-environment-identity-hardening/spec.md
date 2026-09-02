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
- Receipt compatibility policy: `COMPATIBILITY_POLICY.md` → `RECEIPT_V1_ADDITIVE_LOCKSTEP`.

## Measured gap

Current receipt v1 run identity contains `run_id`, `ascout_version`, `started_at`, `finished_at`, and `config_digest`; task results already contain `tool_name` and `tool_version`. The product receipt does not currently expose a run-level environment identity for Node runtime, host OS, architecture, package-manager identity/version, or a safely attributable supported lockfile digest. The benchmark harness already treats OS, Node, and package-manager identity as reproducibility evidence, showing a direct mismatch between benchmark evidence discipline and product receipt evidence depth.

## Scope

Add one optional additive `environment` object to receipt v1. When present it must be complete and semantically validated.

Required fields:

- `runtime_name`: exactly `node` for this bounded slice;
- `runtime_version`: normalized non-empty Node version without a leading `v`;
- `os`: normalized Node platform identifier;
- `arch`: normalized Node architecture identifier;
- `package_manager`: `npm | pnpm | yarn | null`;
- `package_manager_version`: normalized exact `x.y.z` string or `null`;
- `package_manager_source`: `package_json | lockfile | unavailable`;
- `lockfile_path`: canonical repository-relative path or `null`;
- `lockfile_sha256`: lowercase 64-hex digest or `null`.

## Functional requirements

1. Receipt `schema_version` remains exactly `"1.0"` under the explicit additive-lockstep policy; this does not claim forward compatibility with stale strict schema revisions.
2. Existing line/branch evidence, task semantics, selection, completeness, and exit codes remain unchanged solely because environment identity is present or absent.
3. Runtime identity is observed from the running Node process, not inferred from project declarations.
4. OS and architecture are observed from the running Node process and normalized deterministically.
5. `discovery.packageManager` is the sole package-manager authority decision; environment observation must not select or change a manager independently and no package-manager command may be executed solely to populate environment identity.
6. When discovery resolved package-manager authority from root `package.json`, package-manager version MUST be recovered from the exact `DiscoveryFileMap["package.json"]` content snapshot that discovery itself parsed, after confirming that it names the same resolved manager. Because declaration-led discovery only resolves after validating exact `manager@x.y.z`, missing/malformed/mismatched snapshot state is an integrity failure, not an optional null version. The observer must not re-read package.json from disk to create a second time-of-check source.
7. When discovery resolved authority from a recognized lockfile, version remains `null` and the exact discovery source path remains authoritative for manager provenance.
8. `collectDiscoveredProject.files` records recognized lockfiles as presence/path sentinels rather than file contents. `DiscoveryFileMap[lockfilePath]` MUST NOT be treated as lockfile bytes and MUST NOT be hashed. Lockfile SHA-256 must be computed from the exact filesystem bytes at the already-authorized path beneath the canonical repository root, with containment/symlink safety rechecked at read time and bounded-memory reading.
9. For lockfile-derived manager authority, failure to safely re-read/hash that exact authority source is an integrity failure; emitting a lockfile-derived manager whose authority source cannot be re-observed is prohibited.
10. For package-json-derived manager authority, lockfile identity is supplemental only. Inspect/hash the fixed matching root lockfile only when that path was present in the discovery snapshot. If it was absent, unsafe, missing, or unreadable at supplemental observation time, emit null lockfile path/digest and do not fall back to another lockfile.
11. Lockfile evidence never changes package-manager authority. Non-matching recognized lockfiles are ignored for environment identity.
12. Lockfile digest is SHA-256 of exact observed bytes and uses repository-safe canonical path and realpath containment rules.
13. If package-manager discovery is absent, ambiguous, or unsupported, manager/version are null, source is `unavailable`, and lockfile identity is null; the environment feature must not create a fallback resolver.
14. No raw absolute path, user identity, hostname, environment-variable inventory, network address, machine identifier, credential, or secret-bearing value may enter the receipt.
15. Environment identity must serialize deterministically.
16. Semantic validation rejects inconsistent nullable groups: `package_json` requires manager + non-null exact version; `lockfile` requires manager + null version; `unavailable` requires null manager/version; lockfile path/digest must appear together and obey manager/source consistency.
17. Updated same-source/build semantic and JSON Schema validators must accept canonical older v1 receipts without `environment`.
18. New environment-bearing receipts must be accepted by the same-source/build semantic and JSON Schema validators. The exact prior strict schema is expected to reject them and that version-skew behavior must be tested/documented rather than mislabeled as forward compatibility.
19. All repository-supported receipt validators/consumers from the producing canonical source/build revision must move in lockstep with this additive v1 extension; no same-build consumer may pin a stale schema copy. `run.ascout_version` is only a product-version label and is not an exact source/schema-revision key.
20. New Ascout-produced receipts after implementation must publish `environment` when observation succeeds; observation integrity failure must fail closed as an Ascout execution/integrity error rather than silently fabricate identity.
21. `src/discovery.ts` is not part of the expected implementation surface. If the bounded feature cannot satisfy these provenance requirements from current discovery truth, its discovery-file snapshot, and the exact authority paths under the canonical repository root, implementation must stop `NO_GO` and return to planning rather than widening authority.

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
- receipt 1.1/v2 or schema-negotiation machinery;
- in-receipt commit/schema-revision negotiation fields;
- policy engine changes;
- new CLI verbs or output redesign;
- publication, release, or tag work.

## Trust and privacy constraints

Environment identity is evidence metadata, not execution authority. It must never grant admission, suppress missing verification, or convert uncertainty into PASS. All paths remain repository-relative and canonical. No new child process is authorized for identity collection. Lockfile presence cannot supersede or repair the package-manager authority chosen by discovery. Filesystem reads for lockfile hashing must remain under the canonical repository root and must re-check realpath containment rather than trusting stale symlink resolution.

## Acceptance criteria

- deterministic runtime/OS/arch identity is emitted;
- package-manager authority is inherited exactly from current discovery without new execution or fallback resolution;
- package-json-derived manager always carries the exact validated non-null version from the discovery snapshot used to make the authority decision;
- package-json version recovery never re-reads disk and any contradictory snapshot state fails integrity;
- lockfile-derived manager has null version and may hash only its exact authority path;
- lockfile digest hashes filesystem bytes, never the discovery sentinel string;
- lockfile-authority read/containment/hash failure fails integrity;
- package-json-derived supplemental lockfile identity is attempted only for the matching root lockfile present in the discovery snapshot and may degrade to null without guessing;
- non-matching lockfiles never alter manager authority;
- absent/ambiguous/unsupported manager state is represented without guessing;
- old receipt + new semantic/JSON Schema validators = ACCEPT;
- new environment receipt + new semantic/JSON Schema validators = ACCEPT;
- new environment receipt + exact prior strict schema = REJECT_EXPECTED_VERSION_SKEW;
- current repository consumers remain functional without bespoke environment rendering;
- malformed/inconsistent environment objects fail validation;
- privacy and path/symlink containment boundaries are proven by focused tests;
- existing receipt/task/exercise/selection semantics remain unchanged;
- exact-head six-lane Project CI and fresh independent review are required before implementation merge.
