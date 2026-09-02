# Specification 005 Tasks — Environment Identity Hardening

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

**Canonical order:** T104 → T105 → T106

## T104 — Add receipt environment contract and compatibility proof

### Scope

- Add `EnvironmentV1` and optional receipt `environment` in `src/receipt/model.ts`.
- Add the optional closed environment JSON Schema while keeping `schema_version = "1.0"`.
- Narrowly refactor `src/receipt/json.ts` so the existing canonical evaluator can run a controlled supplied parsed schema for repository-local proof while normal validation remains current-bundled-schema-only.
- Pin `tests/fixtures/receipt-v1-pre-spec005.schema.json` to canonical base `7bede70ad2abfb91dc9186fb44d77a824efbfdef`, schema path `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`, blob `b331de44505f6fbdc5ff033367ef0904fda236b4`.
- Add focused model/JSON compatibility tests and keep current consumers schema-consistent.

### Acceptance

- old receipt + new semantic/current JSON Schema = `ACCEPT`;
- new environment receipt + new semantic/current JSON Schema = `ACCEPT`;
- new environment receipt + exact pinned prior schema through the same evaluator = `REJECT_EXPECTED_VERSION_SKEW`;
- fixture identity cannot drift;
- normal `validateReceiptJsonSchema()` behavior remains current-schema-only;
- no duplicate evaluator/dependency/runtime schema selector/negotiation;
- source/version/path/digest/null-group invalid states fail;
- existing verification semantics unchanged.

### Hard boundary

No observation/wiring, no `src/check.ts`/`src/cli.ts`, no v2/revision field/schema negotiation.

## T105 — Observe environment identity without execution

### Scope

- Add `src/environment.ts` only for product behavior in this task.
- Receive canonical `root`, `files`, and already-resolved `discovery`.
- Observe runtime/platform/arch from current process.
- Use discovery as sole manager authority; derive package-json version from the exact discovery snapshot and never disk reread.
- Re-read only exact authorized lockfile bytes beneath canonical root with containment rechecked and bounded-memory hashing; never hash discovery sentinel values.
- Define a typed environment-identity integrity error for contradictory declaration state, unsafe authority path, or authority-lockfile reread/hash failure.
- Add focused observer/privacy/containment/provenance/error-class tests.

### Acceptance

- no process spawn/install;
- deterministic identity;
- package-json authority => exact non-null x.y.z from same snapshot;
- lockfile authority => version null + exact source bytes; authority failure => typed integrity error;
- unresolved/ambiguous/unsupported manager => null/null/`unavailable`;
- package-json supplemental matching lockfile may be null on failure with no fallback;
- bounded-memory exact-byte SHA-256 and no host/user/env/secret leakage.

### Hard boundary

No receipt publication/wiring. No `src/check.ts`, `src/cli.ts`, `src/discovery.ts`, package, dependency, or workflow change. If `root + files + discovery` is insufficient, stop `NO_GO` and replan.

## T106 — Publish environment identity and preserve integrity-error exit semantics

### Scope

- Wire the T105 observer into `src/check.ts` before any project task execution.
- Carry one successful observation unchanged into new receipts.
- On typed environment-integrity failure, execute no project task after the failure and emit no receipt.
- Narrowly update `src/cli.ts` to recognize only the typed environment-integrity failure, emit a repository-path-redacted diagnostic through existing redaction behavior, and return exit code `2`.
- Keep generic unexpected-error handling unchanged; add no CLI flag/output mode.
- Add controlled check/CLI/current-consumer integration tests.

### Acceptance

- successful emitted environment matches controlled observations;
- observer is called before project task execution;
- typed environment-integrity failure causes zero subsequent project-task executions, no terminal/JSON/agent receipt, redacted diagnostic, and CLI exit `2`;
- generic unexpected CLI exceptions retain their pre-Spec-005 behavior;
- no synthetic task/environment-error field is added;
- existing line/branch exercise, selection, task status, findings, completeness, and successful receipt exit behavior remain unchanged solely due to environment metadata;
- canonical older receipts remain valid under current validators;
- current JSON/agent/terminal consumers operate without stale-schema failures;
- exact-head six-lane Project CI green;
- fresh independent exact-head review reconciled;
- zero unresolved material review threads.

## Execution discipline

For every T104–T106 task:

1. reread canonical `main`, Constitution, Master Plan, Spec 005 authority, live PR/review/Actions state;
2. branch from exact canonical `main`;
3. mutate only current task surface;
4. prove historical benchmark-result immutability;
5. qualify exact head with Ubuntu 24.04/macOS 14/Windows 2025 × Node 22/24 Project CI;
6. obtain fresh independent exact-head substantive review;
7. reconcile every material finding/thread;
8. guarded merge with expected head SHA;
9. verify ordered parents/tree/signature/PR/main;
10. record canonical task closeout before successor.

No force-push/rebase/history rewrite, publication/release/tag, receipt 1.1/v2, function coverage, M2, dependency addition, new process execution, or fabricated evidence/review/CI/completion.

## Authorization gate

T104 must not begin until this planning package is canonically merged, its exact planning head receives independent review, post-merge identity is verified, and durable implementation authorization explicitly binds the canonical planning merge, compatibility policy, and T104–T106 surfaces.
