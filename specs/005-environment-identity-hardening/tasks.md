# Specification 005 Tasks — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

**Canonical order:** T104 → T105 → T106

## T104 — Add receipt environment contract

### Scope

- Add `EnvironmentV1` to `src/receipt/model.ts`.
- Add optional `environment?: EnvironmentV1` to receipt v1.
- Add additive optional `environment` JSON Schema contract.
- Preserve `schema_version = "1.0"`.
- Add focused validation/compatibility tests.

### Acceptance

- legacy receipts without environment remain valid;
- valid environment object passes semantic and JSON Schema validation;
- invalid runtime name/version, manager/source/version combinations, unsafe paths, mismatched null groups, and invalid digest fail;
- existing receipt semantics remain unchanged.

### Hard boundary

No observation/wiring behavior yet. No `src/check.ts` change in T104.

## T105 — Observe environment identity without execution

### Scope

- Add `src/environment.ts`.
- Observe Node runtime version, platform, and architecture from the current process.
- Reuse existing package-manager discovery truth.
- Resolve at most one effective supported lockfile from existing discovery information.
- Hash exact lockfile bytes with SHA-256.
- Add focused observer/privacy/containment tests.

### Acceptance

- no process spawn or implicit install;
- deterministic environment identity;
- validated `packageManager` declaration supplies manager/version/source=`package_json`;
- lockfile-derived manager has version null/source=`lockfile`;
- unsupported/ambiguous/unavailable manager state becomes null/null/`unavailable`;
- one safe lockfile is hashed exactly;
- ambiguous/unavailable lockfile identity is represented with nulls;
- raw absolute paths, hostname/user/env inventory/secrets are absent.

### Hard boundary

No receipt emission/wiring yet. No package/dependency/workflow change.

## T106 — Publish environment identity in new receipts

### Scope

- Wire the environment observer into `src/check.ts`.
- New Ascout-produced receipts include environment identity when observation succeeds.
- Integrity failure while constructing environment identity follows existing internal/integrity error semantics.
- Add controlled integration tests proving emitted identity and unchanged existing verification semantics.

### Acceptance

- emitted environment matches controlled runtime/discovery/lockfile observations;
- line/branch exercise, selection, task status, findings, completeness, and exit behavior remain unchanged solely due to environment metadata;
- legacy externally supplied receipts without environment remain valid;
- no bespoke CLI/terminal redesign;
- no new child process or package-manager probe;
- exact-head six-lane Project CI green;
- fresh independent exact-head review reconciled;
- zero unresolved material review threads.

## Execution discipline

For every task T104–T106:

1. re-read canonical `main`, Constitution, Master Plan, Spec 005 planning/authorization, current PR/review/Actions state;
2. branch from exact canonical `main`;
3. mutate only the current task surface;
4. prove historical benchmark-result immutability;
5. qualify exact head with Project CI across Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24;
6. obtain fresh independent exact-head substantive review;
7. reconcile every material finding and review thread;
8. guarded merge with expected head SHA;
9. verify ordered parents/tree/signature/PR/main;
10. record canonical task closeout before beginning the successor task.

No force-push, rebase, destructive history rewrite, hidden failing gate, publication, release, tag, receipt v2, function coverage, M2 capability, dependency addition, new process execution, or fabricated evidence/review/CI/completion.

## Authorization gate

T104 must not begin until this planning package is canonically merged, its exact planning head receives independent review, post-merge identity is verified, and a durable implementation authorization explicitly binds the canonical planning merge and T104–T106 surfaces.