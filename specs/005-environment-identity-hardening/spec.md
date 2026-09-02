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

## Measured gap

Current receipt v1 run identity records `run_id`, `ascout_version`, timestamps, and `config_digest`; task results already record tool identity. Product receipts do not expose run-level Node runtime, OS, architecture, package-manager identity/version, or safely attributable supported lockfile digest, while benchmark evidence already retains comparable environment context.

## Scope

Add one optional additive `environment` object to receipt v1. When present it is complete and semantically validated:

- `runtime_name`: exactly `node`;
- `runtime_version`: normalized non-empty Node version without leading `v`;
- `os`: normalized Node platform identifier;
- `arch`: normalized Node architecture identifier;
- `package_manager`: `npm | pnpm | yarn | null`;
- `package_manager_version`: exact `x.y.z` or `null`;
- `package_manager_source`: `package_json | lockfile | unavailable`;
- `lockfile_path`: canonical repository-relative path or `null`;
- `lockfile_sha256`: lowercase 64-hex digest or `null`.

## Functional requirements

1. `schema_version` remains exactly `"1.0"` under the additive-lockstep policy; no stale strict-schema forward-compatibility claim is made.
2. Existing line/branch evidence, task semantics, selection, completeness, and exit codes remain unchanged solely because environment identity is present or absent.
3. Runtime/OS/architecture are observed from the running Node process.
4. `discovery.packageManager` is the sole package-manager authority; no package-manager command may be executed solely for identity and no second resolver may be introduced.
5. Declaration-led authority MUST recover exact non-null `x.y.z` from the exact `DiscoveryFileMap["package.json"]` content snapshot discovery parsed and confirm the same manager. Missing/malformed/mismatched snapshot state is integrity failure. Package.json MUST NOT be re-read from disk for version derivation.
6. Lockfile-led authority keeps version `null` and its exact discovery source path remains authoritative for manager provenance.
7. Recognized lockfiles in `collectDiscoveredProject.files` are presence/path sentinels, not file bytes. Their map values MUST NOT be hashed.
8. Lockfile SHA-256 is computed from exact filesystem bytes at the already-authorized repository-relative path beneath canonical root, with realpath/symlink containment rechecked at read time and bounded-memory reading.
9. If a lockfile supplied manager authority, inability to safely re-read/hash that exact source is integrity failure.
10. For package-json-led authority, lockfile identity is supplemental only. Inspect/hash only the fixed matching root lockfile that was present in the discovery snapshot. Absent/unsafe/missing/unreadable supplemental state yields null path/digest, never fallback.
11. Lockfile evidence never changes manager authority; non-matching lockfiles are ignored for environment identity.
12. Absent/ambiguous/unsupported package-manager discovery yields manager/version null, source `unavailable`, and null lockfile identity.
13. No raw absolute path, user identity, hostname, environment-variable inventory, network address, machine identifier, credential, or secret-bearing value may enter the receipt.
14. Environment identity serializes deterministically.
15. Semantic validation rejects inconsistent source/manager/version and lockfile path/digest combinations.
16. Updated same-source/build semantic and JSON Schema validators accept canonical older v1 receipts without `environment`.
17. New environment-bearing receipts are accepted by updated same-source/build validators; exact prior strict schema rejection is expected unsupported version skew and MUST be explicitly proven.
18. The prior strict-schema rejection proof MUST execute the exact pinned prior schema through the same canonical JSON Schema evaluator implementation used by current `src/receipt/json.ts`. A narrow T104 refactor may make that evaluator reusable for repository-local proof, while the normal runtime/current-schema entry point continues loading only the current bundled schema. No duplicated test validator, new validator dependency, runtime schema selector, or negotiation is authorized.
19. Same-source/build receipt consumers move in lockstep; `run.ascout_version` is only a product-version label and is not an exact source/schema-revision key.
20. New Ascout-produced receipts publish `environment` when observation succeeds; observation integrity failure fails closed as an existing execution/integrity error rather than fabricating identity.
21. `src/discovery.ts` is outside the expected implementation surface. If current discovery truth plus its snapshot/authority paths cannot support T105, implementation stops `NO_GO` and returns to planning.

## Non-goals

- function coverage, mutation/property/fuzzing, browser/container identity;
- arbitrary environment-variable capture or executable package-manager version probing;
- dependency graphing/SBOM/toolchain installation/sandboxing;
- receipt 1.1/v2, schema negotiation, runtime schema selection, or in-receipt schema revision identifiers;
- a second JSON Schema evaluator or new validation dependency;
- policy engine changes, new CLI verbs/output redesign;
- publication, release, or tag work.

## Trust and privacy constraints

Environment identity is evidence metadata, not execution authority. It cannot grant admission, suppress missing verification, or convert uncertainty into PASS. Paths remain repository-relative and canonical. Filesystem reads for lockfile hashing stay beneath canonical root with realpath containment rechecked.

## Acceptance criteria

- deterministic runtime/OS/arch identity;
- discovery-only manager authority with no execution/fallback resolution;
- exact package-json version from the discovery snapshot, never disk reread;
- lockfile digest hashes exact filesystem bytes, never sentinel values;
- authority lockfile read/containment/hash failure fails integrity;
- supplemental matching lockfile may degrade to null without guessing;
- old receipt + new semantic/current JSON Schema validators = `ACCEPT`;
- new environment receipt + new semantic/current JSON Schema validators = `ACCEPT`;
- new environment receipt + exact prior strict schema through the same canonical JSON Schema evaluator = `REJECT_EXPECTED_VERSION_SKEW`;
- current repository consumers remain functional without bespoke environment rendering;
- malformed/inconsistent environment objects fail validation;
- privacy/path/symlink boundaries proven by focused tests;
- existing receipt/task/exercise/selection semantics unchanged;
- exact-head six-lane Project CI and fresh independent review required before implementation merge.
