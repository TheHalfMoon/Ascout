# Specification 005 Tasks — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

**Canonical order:** T104 → T105 → T106

## T104 — Add receipt environment contract and compatibility proof

### Scope

- Add `EnvironmentV1` to `src/receipt/model.ts`.
- Add optional `environment?: EnvironmentV1` to receipt v1.
- Add additive optional `environment` JSON Schema contract.
- Preserve `schema_version = "1.0"` under `RECEIPT_V1_ADDITIVE_LOCKSTEP`.
- Keep same-source/build repository consumers/validators schema-consistent; no second runtime schema copy.
- Add focused validation/compatibility tests with immutable exact prior-schema proof.

### Acceptance

- old canonical receipt + new semantic validator = ACCEPT;
- old canonical receipt + new JSON Schema validator = ACCEPT;
- new valid environment receipt + new semantic validator = ACCEPT;
- new valid environment receipt + new JSON Schema validator = ACCEPT;
- new environment receipt + exact prior strict schema = REJECT_EXPECTED_VERSION_SKEW;
- exact prior schema identity cannot drift;
- current JSON/agent/terminal consumers remain functional without bespoke environment presentation;
- no same-source/build consumer uses stale schema;
- `package_json` source requires manager + exact non-null version; `lockfile` requires manager + null version; `unavailable` requires null manager/version;
- invalid runtime/source/version/path/digest/null-group combinations fail;
- existing verification semantics remain unchanged.

### Hard boundary

No observation/wiring yet. No `src/check.ts` change. No receipt 1.1/v2, in-receipt revision field, or schema negotiation.

## T105 — Observe environment identity without execution

### Scope

- Add `src/environment.ts` only for product behavior in this task.
- Receive canonical `root`, `DiscoveryFileMap files`, and already-resolved `discovery` from `collectDiscoveredProject()`.
- Observe Node runtime/platform/arch from current process.
- Use `discovery.packageManager` as sole package-manager authority.
- For package-json authority, recover exact version from the same `files["package.json"]` snapshot discovery parsed; never re-read package.json from disk.
- For lockfile authority, use only the exact discovery source path.
- For package-json authority, supplemental lockfile identity may use only the fixed matching root lockfile that was present in the discovery snapshot.
- Re-read exact lockfile bytes from canonical repository root with realpath/symlink containment rechecked at read time and bounded-memory chunked hashing.
- Never hash `files[lockfilePath]`; recognized lockfile values are presence sentinels, not contents.
- Add focused observer/privacy/containment/provenance tests.

### Acceptance

- no process spawn or implicit install;
- deterministic environment identity;
- package-json authority emits manager/source and exact non-null x.y.z from the same discovery snapshot; malformed/missing/mismatched snapshot state fails integrity;
- package.json is not re-read from disk for version derivation;
- lockfile-derived manager has version null/source=`lockfile`;
- lockfile-derived authority hashes exact filesystem bytes at its exact discovery source path, never sentinel bytes;
- lockfile-authority missing/unreadable/unsafe/symlink-escape reread fails integrity;
- unresolved/ambiguous/unsupported manager emits null/null/`unavailable` and no lockfile identity;
- package-json-derived supplemental lockfile is considered only if the matching fixed root path existed in discovery snapshot;
- supplemental absent/unsafe/missing/unreadable lockfile emits null path/digest and never falls back;
- non-matching lockfiles never override manager authority;
- hash reading is bounded-memory and exact-byte SHA-256;
- raw absolute paths, hostname/user/env inventory/secrets are absent.

### Hard boundary

No receipt publication/wiring yet. No `src/check.ts`, `src/discovery.ts`, package, dependency, or workflow change. If `root + files + discovery` is insufficient, stop `NO_GO` and replan.

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
- no new child process or package-manager probe;
- exact-head six-lane Project CI green;
- fresh independent exact-head review reconciled;
- zero unresolved material review threads.

## Execution discipline

For every task T104–T106:

1. re-read canonical `main`, Constitution, Master Plan, Spec 005 planning/policy/authorization, current PR/review/Actions state;
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

T104 must not begin until this planning package is canonically merged, its exact planning head receives independent review, post-merge identity is verified, and durable implementation authorization explicitly binds the canonical planning merge, `COMPATIBILITY_POLICY.md`, and T104–T106 surfaces.
