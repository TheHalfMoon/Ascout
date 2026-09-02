# Specification 005 Tasks — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

**Canonical order:** T104 → T105 → T106

## T104 — Add receipt environment contract and compatibility proof

### Scope

- Add `EnvironmentV1` to `src/receipt/model.ts`.
- Add optional `environment?: EnvironmentV1` to receipt v1.
- Add additive optional `environment` JSON Schema contract.
- Preserve `schema_version = "1.0"` under `RECEIPT_V1_ADDITIVE_LOCKSTEP`.
- Update all repository-supported same-source/build validators/consumers needed to keep the producing build internally schema-consistent; do not introduce a second schema copy into runtime code.
- Add focused validation/compatibility tests, including an immutable exact prior-schema reference for the unsupported stale-validator case.

### Acceptance

- old canonical receipt + new semantic validator = ACCEPT;
- old canonical receipt + new JSON Schema validator = ACCEPT;
- new valid environment receipt + new semantic validator = ACCEPT;
- new valid environment receipt + new JSON Schema validator = ACCEPT;
- new environment receipt + exact prior strict schema = REJECT_EXPECTED_VERSION_SKEW;
- exact prior schema identity is pinned deterministically and cannot drift;
- current JSON/agent/terminal consumers remain functional without bespoke environment presentation;
- no same-source/build consumer uses a stale schema copy;
- semantic/schema validation requires `package_json` source to carry manager + exact non-null version, `lockfile` source to carry manager + null version, and `unavailable` source to carry null manager/version;
- invalid runtime name/version, manager/source/version combinations, unsafe paths, mismatched null groups, and invalid digest fail;
- existing verification semantics remain unchanged.

### Hard boundary

No environment observation/wiring behavior yet. No `src/check.ts` change in T104. No receipt 1.1/v2, in-receipt revision field, or schema-negotiation machinery.

## T105 — Observe environment identity without execution

### Scope

- Add `src/environment.ts`.
- Observe Node runtime version, platform, and architecture from the current process.
- Use `discovery.packageManager` as the sole package-manager authority.
- If manager authority comes from root `package.json`, read only that same already-authoritative file to recover the exact validated version and confirm it names the same manager.
- If manager authority comes from a recognized lockfile, use that exact discovery source path.
- If manager authority comes from root `package.json`, inspect only the fixed supported root lockfile matching the already-resolved manager as supplemental evidence; it must not influence manager selection.
- Hash at most one safe matching lockfile byte-for-byte with SHA-256.
- Add focused observer/privacy/containment/provenance tests.

### Acceptance

- no process spawn or implicit install;
- deterministic environment identity;
- validated `packageManager` authority from `package.json` supplies manager/source=`package_json` and the exact non-null `x.y.z` version from that same authoritative declaration;
- declaration-led authority with missing/unreadable/malformed version state or declaration/discovery manager contradiction fails integrity rather than emitting `version=null` or selecting a different manager;
- lockfile-derived manager has version null/source=`lockfile` and hashes that exact authority source when safe;
- unsupported/ambiguous/unavailable manager state becomes null/null/`unavailable` with no lockfile identity;
- package-json-derived manager may hash only its matching fixed root lockfile as supplemental evidence;
- non-matching lockfiles never override manager authority;
- absent/unsafe/unreadable supplemental lockfile identity is represented with nulls rather than guessing;
- raw absolute paths, hostname/user/env inventory/secrets are absent.

### Hard boundary

No receipt emission/wiring yet. No `src/discovery.ts`, package, dependency, or workflow change. If existing discovery state plus its exact source files is insufficient, stop `NO_GO` and return to planning instead of widening authority.

## T106 — Publish environment identity in new receipts

### Scope

- Wire the environment observer into `src/check.ts`.
- New Ascout-produced receipts include environment identity when observation succeeds.
- Integrity failure while constructing environment identity follows existing internal/integrity error semantics.
- Add controlled integration tests proving emitted identity, current consumer operation, and unchanged existing verification semantics.

### Acceptance

- emitted environment matches controlled runtime/discovery/lockfile observations;
- line/branch exercise, selection, task status, findings, completeness, and exit behavior remain unchanged solely due to environment metadata;
- canonical older externally supplied receipts without environment remain valid under current validators;
- same-source/build JSON/agent/terminal consumers operate without stale-schema failures;
- `run.ascout_version` is not used as a schema revision lookup/negotiation key;
- no bespoke CLI/terminal redesign;
- no new child process or package-manager probe;
- exact-head six-lane Project CI green;
- fresh independent exact-head review reconciled;
- zero unresolved material review threads.

## Execution discipline

For every task T104–T106:

1. re-read canonical `main`, Constitution, Master Plan, Spec 005 planning/compatibility policy/authorization, current PR/review/Actions state;
2. branch from exact canonical `main`;
3. mutate only the current task surface;
4. prove historical benchmark-result immutability;
5. qualify exact head with Project CI across Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24;
6. obtain fresh independent exact-head substantive review;
7. reconcile every material finding and review thread;
8. guarded merge with expected head SHA;
9. verify ordered parents/tree/signature/PR/main;
10. record canonical task closeout before beginning the successor task.

No force-push, rebase, destructive history rewrite, hidden failing gate, publication, release, tag, receipt 1.1/v2, function coverage, M2 capability, dependency addition, new process execution, or fabricated evidence/review/CI/completion.

## Authorization gate

T104 must not begin until this planning package is canonically merged, its exact planning head receives independent review, post-merge identity is verified, and a durable implementation authorization explicitly binds the canonical planning merge, `COMPATIBILITY_POLICY.md`, and T104–T106 surfaces.