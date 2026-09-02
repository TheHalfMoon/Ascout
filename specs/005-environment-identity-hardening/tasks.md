# Specification 005 Tasks — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

**Canonical order:** T104 → T105 → T106

## T104 — Add receipt environment contract and compatibility proof

### Scope

- Add `EnvironmentV1` to `src/receipt/model.ts` and optional `environment?: EnvironmentV1` to receipt v1.
- Add the optional closed `environment` JSON Schema contract while preserving `schema_version = "1.0"`.
- Narrowly refactor `src/receipt/json.ts` so the existing canonical JSON Schema evaluator can validate a controlled supplied parsed schema for repository-local compatibility proof, while `validateReceiptJsonSchema()` continues loading only the current bundled schema.
- Pin the exact pre-Spec-005 strict schema as immutable repository-local proof, expected at `tests/fixtures/receipt-v1-pre-spec005.schema.json`, tied to canonical pre-Spec-005 schema identity.
- Add focused validation/compatibility tests, including `tests/receipt-json.test.ts` and model contract proof as directly required.
- Keep same-source/build repository consumers/validators schema-consistent; do not introduce a second runtime schema copy/evaluator.

### Acceptance

- old canonical receipt + new semantic validator = `ACCEPT`;
- old canonical receipt + current JSON Schema through canonical evaluator = `ACCEPT`;
- new valid environment receipt + new semantic/current JSON Schema validators = `ACCEPT`;
- new environment receipt + exact prior strict schema through the **same canonical evaluator** = `REJECT_EXPECTED_VERSION_SKEW`;
- exact prior schema fixture identity is pinned deterministically and cannot drift;
- normal `validateReceiptJsonSchema()` behavior remains current-schema-only;
- no duplicate test-local validator, validation dependency, runtime schema selector, or negotiation mechanism;
- current JSON/agent/terminal consumers remain functional without bespoke environment presentation;
- `package_json` source requires manager + exact non-null version; `lockfile` requires manager + null version; `unavailable` requires null manager/version;
- invalid runtime/source/version/path/digest/null-group combinations fail;
- existing verification semantics remain unchanged.

### Hard boundary

No environment observation/wiring yet. No `src/check.ts` change. `src/receipt/json.ts` mutation is limited to same-evaluator reuse/testability; do not change current schema loading, add arbitrary schema ingestion, add a second evaluator/dependency, or introduce receipt 1.1/v2/in-receipt revision fields/schema negotiation.

## T105 — Observe environment identity without execution

### Scope

- Add `src/environment.ts` only for product behavior in this task.
- Receive canonical `root`, `DiscoveryFileMap files`, and already-resolved `discovery` from `collectDiscoveredProject()`.
- Observe Node runtime/platform/arch from current process.
- Use `discovery.packageManager` as sole manager authority.
- For package-json authority, recover exact version from the same package.json snapshot discovery parsed; never re-read package.json from disk.
- For lockfile authority, use only the exact discovery source path.
- For package-json authority, supplemental lockfile identity may use only the fixed matching root lockfile present in the discovery snapshot.
- Re-read exact lockfile bytes beneath canonical root with realpath/symlink containment rechecked and bounded-memory chunked hashing.
- Never hash `files[lockfilePath]`; recognized lockfile values are presence sentinels, not contents.
- Add focused observer/privacy/containment/provenance tests.

### Acceptance

- no process spawn or implicit install;
- deterministic environment identity;
- package-json authority emits manager/source and exact non-null x.y.z from the same discovery snapshot; contradictory snapshot state fails integrity;
- package.json is not re-read from disk;
- lockfile-derived manager has version null/source `lockfile`;
- lockfile-derived authority hashes exact filesystem bytes at its exact discovery source path, never sentinel bytes;
- authority lockfile missing/unreadable/unsafe/symlink-escape reread fails integrity;
- unresolved/ambiguous/unsupported manager emits null/null/`unavailable` and no lockfile identity;
- supplemental matching lockfile is considered only if present in discovery snapshot and may degrade to null without fallback;
- hash reading is bounded-memory exact-byte SHA-256;
- raw absolute paths, hostname/user/env inventory/secrets are absent.

### Hard boundary

No receipt publication/wiring yet. No `src/check.ts`, `src/discovery.ts`, package, dependency, or workflow change. If `root + files + discovery` is insufficient, stop `NO_GO` and return to planning.

## T106 — Publish environment identity in new receipts

### Scope

- Wire the T105 observer into `src/check.ts` using the existing `collectDiscoveredProject()` result.
- New Ascout-produced receipts include environment identity when observation succeeds.
- Integrity failure follows existing internal/integrity error semantics.
- Add controlled integration/current-consumer tests.

### Acceptance

- emitted environment matches controlled runtime/discovery/snapshot/lockfile observations;
- line/branch exercise, selection, task status, findings, completeness, and exit behavior remain unchanged solely due to environment metadata;
- canonical older externally supplied receipts remain valid under current validators;
- same-source/build JSON/agent/terminal consumers operate without stale-schema failures;
- `run.ascout_version` is not a schema revision lookup/negotiation key;
- no bespoke CLI/terminal redesign;
- no new child process/package-manager probe;
- exact-head six-lane Project CI green;
- fresh independent exact-head review reconciled;
- zero unresolved material review threads.

## Execution discipline

For every task T104–T106:

1. re-read canonical `main`, Constitution, Master Plan, Spec 005 planning/policy/authorization, and live PR/Actions/review state;
2. branch from exact canonical `main`;
3. mutate only the current task surface;
4. prove historical benchmark-result immutability;
5. qualify exact head with Project CI across Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24;
6. obtain fresh independent exact-head substantive review;
7. reconcile every material finding/thread;
8. guarded merge with expected head SHA;
9. verify ordered parents/tree/signature/PR/main;
10. record canonical task closeout before successor.

No force-push, rebase, destructive history rewrite, hidden failing gate, publication, release, tag, receipt 1.1/v2, function coverage, M2, dependency addition, new process execution, or fabricated evidence/review/CI/completion.

## Authorization gate

T104 must not begin until this planning package is canonically merged, its exact planning head receives independent review, post-merge identity is verified, and durable implementation authorization explicitly binds the canonical planning merge, compatibility policy, and T104–T106 surfaces.
