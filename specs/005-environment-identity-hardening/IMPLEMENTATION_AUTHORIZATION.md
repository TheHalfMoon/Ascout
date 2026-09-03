# Implementation Authorization: Spec 005 Environment Identity Hardening

**Spec:** 005  
**Status:** AUTHORIZATION_PENDING_MERGE  
**Canonical base:** `a361c440d6d1a43d851b4481916f92a0a23ec7e9`  
**Date:** 2026-09-03

## Authority chain

This authorization binds, in order:

1. `.specify/memory/constitution.md`
2. `docs/founding/MASTER_PLAN_V1.md`
3. `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
4. `specs/005-environment-identity-hardening/GAP_EVIDENCE.md`
5. `specs/005-environment-identity-hardening/spec.md`
6. `specs/005-environment-identity-hardening/clarifications.md`
7. `specs/005-environment-identity-hardening/COMPATIBILITY_POLICY.md`
8. `specs/005-environment-identity-hardening/ponytail-review.md`
9. `specs/005-environment-identity-hardening/plan.md`
10. `specs/005-environment-identity-hardening/plan-ponytail-review.md`
11. `specs/005-environment-identity-hardening/tasks.md`
12. `specs/005-environment-identity-hardening/checklists/requirements.md`
13. `specs/005-environment-identity-hardening/analysis.md`
14. `specs/005-environment-identity-hardening/FINAL_PLAN_AUDIT.md`
15. `specs/005-environment-identity-hardening/HEAD_CROSS_ARTIFACT_REVIEW.md`

## Canonical planning merge binding

- **Planning merge SHA:** `a361c440d6d1a43d851b4481916f92a0a23ec7e9`
- **Planning merge tree:** `a5ba6f31033a8ded5dfce814b3bb3d2a1e23b2b4`
- **Planning merge parent 1:** `7bede70ad2abfb91dc9186fb44d77a824efbfdef` (canonical main before Spec 005 planning)
- **Planning merge parent 2:** `6b88fce810e11b09b013af1809e5fbdc221910af` (qualified Spec 005 planning head)
- **Planning merge signature:** GitHub-verified PGP signature present
- **Planning PR:** #139 (`MERGED`)
- **Planning Project CI:** run `33684202874`, six-lane success on exact planning head
- **Planning independent review:** CodeRabbit issue comment `5516558542`, `NO MATERIAL FINDINGS`, exact head `6b88fce810e11b09b013af1809e5fbdc221910af`
- **Planning findings:** F1–F8 reconciled before final qualification and merge

This authorization becomes effective only when this file itself is merged into canonical `main` and that merge identity is verified. It does not backdate or fabricate implementation authority.

## Authorized task sequence

`T104 → T105 → T106`, executed strictly in canonical order. Each task may begin only after its predecessor is `CLOSED_CANONICAL`. T104 may not begin before this authorization is canonically merged and verified.

## T104 — Receipt environment contract and compatibility proof

### Authorized product surfaces

- `src/receipt/model.ts`
- `src/receipt/json.ts` — only the minimum same-evaluator reuse/testability refactor; normal `validateReceiptJsonSchema()` remains current-bundled-schema-only
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` — additive optional environment contract only

### Authorized proof surfaces

- `tests/t104-environment-receipt.contract.test.ts` — new focused contract/compatibility/current-consumer proof
- `tests/fixtures/receipt-v1-pre-spec005.schema.json` — exact immutable prior strict-schema fixture

The prior fixture MUST reproduce the exact canonical pre-Spec-005 schema identified by:

- commit: `7bede70ad2abfb91dc9186fb44d77a824efbfdef`
- path: `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`
- Git blob: `b331de44505f6fbdc5ff033367ef0904fda236b4`

### Required acceptance

- old canonical receipt + new semantic validator = `ACCEPT`;
- old canonical receipt + new current JSON Schema = `ACCEPT`;
- new environment receipt + new semantic/current JSON Schema = `ACCEPT`;
- new environment receipt + exact pinned prior strict schema through the **same canonical evaluator implementation** = `REJECT_EXPECTED_VERSION_SKEW`;
- current normal schema loading behavior remains unchanged;
- invalid environment source/manager/version/path/digest/null combinations fail;
- JSON/agent/terminal current consumers remain functional without bespoke environment presentation;
- no receipt 1.1/v2, runtime schema selection, negotiation, arbitrary external schema ingestion, second evaluator, or validation dependency.

### T104 hard boundary

No `src/check.ts`, `src/cli.ts`, `src/environment.ts`, `src/discovery.ts`, `src/receipt/build.ts`, package/dependency/workflow/benchmark-result mutation.

## T105 — Environment observation and lockfile object binding

### Authorized product surface

- `src/environment.ts` — new module only

### Authorized proof surface

- `tests/t105-environment-observer.contract.test.ts` — new focused observer/provenance/privacy/object-binding/race/stability proof

### Required behavior

- runtime/platform/architecture from current Node process only;
- `discovery.packageManager` remains sole manager authority;
- package-json-led exact non-null manager version comes from the exact discovery-retained `files["package.json"]` snapshot; package.json is not reread for version derivation;
- recognized discovery lockfile values are presence sentinels, never bytes;
- lockfile-led authority uses its exact discovery authority path and version remains null;
- package-json-led supplemental identity may consider only the matching fixed root lockfile that was present in the discovery snapshot;
- no process spawn, implicit install, fallback manager resolver, or discovery mutation.

### Required object-bound hash sequence

1. resolve exact authorized repository-relative lockfile candidate beneath canonical root;
2. resolve contained real target and capture stable pre-open object identity;
3. open the authorized path read-only exactly once;
4. before reading any bytes, `fstat` the descriptor, require a regular file, and require stable object identity to match the contained target;
5. hash exact bytes in bounded-memory chunks from that descriptor only; never reopen the path for hash bytes;
6. compare pre/post descriptor object identity, file type, size, and available modification/change stability metadata;
7. re-resolve/re-stat the authorized path after hashing and require containment plus identity with the opened object before digest acceptance;
8. close the descriptor in `finally`.

Path spelling, size, or timestamps alone are not sufficient object identity. Replacement between containment and open must be detected before any bytes are read. Replacement after descriptor binding cannot redirect descriptor reads and a persistent path/object mismatch must be rejected before digest acceptance. In-place mutation during hashing must be rejected by descriptor stability checks.

The exact object-identity strategy must be proven in Project CI on Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24. If any supported platform cannot provide a trustworthy path-stat ↔ descriptor-`fstat` identity proof with Node-supported metadata, T105 is `NO_GO` and returns to planning. No path-only, size-only, timestamp-only, reopen-and-hash, file-watch, generalized sandbox, or reusable safe-file framework fallback is authorized.

### Failure semantics

- authority lockfile containment/object-binding/stability/read/hash failure => typed environment-identity integrity error;
- contradictory package-json authority snapshot => typed environment-identity integrity error;
- package-json supplemental lockfile failure => null lockfile path/digest, never fallback or authority change;
- unresolved/ambiguous/unsupported manager => null manager/version, source `unavailable`, null lockfile identity.

### T105 hard boundary

No `src/check.ts`, `src/cli.ts`, `src/discovery.ts`, receipt/schema changes, package/dependency/workflow/benchmark-result mutation, child process, generalized filesystem security subsystem, publication, release, or tag work.

## T106 — Publish environment identity and preserve integrity-error semantics

### Authorized product surfaces

- `src/check.ts` — invoke the T105 observer before any project task execution and publish one successful observation in the final receipt
- `src/cli.ts` — only classify the typed T105 environment-integrity failure to existing redacted diagnostic behavior + canonical exit code `2`; generic unexpected-error behavior remains unchanged

### Authorized proof surface

- `tests/t106-environment-publication.integration.test.ts` — new focused check/CLI/current-consumer integration proof

### Receipt-construction rule

`src/receipt/build.ts` is **not authorized to change**. T106 may extend the root receipt in `src/check.ts` after `buildReceipt()` returns and before the existing semantic validation step, carrying the already-observed `EnvironmentV1` unchanged. This must not change builder-derived task/selection/exercise/completeness/exit semantics.

### Required acceptance

- successful environment observation occurs before project task execution and is emitted unchanged in the receipt;
- typed environment-integrity failure occurs before project tasks, executes no subsequent project task, emits no terminal/JSON/agent receipt, and maps to exit `2` through existing path-redacted diagnostics;
- generic unexpected CLI exceptions retain pre-Spec-005 behavior;
- no synthetic task or `environment_error` receipt field;
- current JSON/agent/terminal consumers remain functional;
- environment metadata alone does not change line/branch exercise, selection, task status, findings, completeness, or successful receipt exit behavior;
- no child process/package-manager probe, new flag, output redesign, runtime schema selection, or receipt version change.

### T106 hard boundary

No `src/receipt/build.ts`, `src/discovery.ts`, package/dependency/workflow/benchmark-result mutation, publication, release, or tag work.

## Task qualification and merge discipline

Every T104–T106 task independently requires:

1. branch from exact canonical `main` after predecessor closeout;
2. exact authorized-path purity;
3. historical benchmark-result immutability;
4. focused tests plus full repository typecheck/test/build as applicable;
5. exact-head Project CI success across Ubuntu 24.04, macOS 14, Windows 2025 × Node 22/24;
6. fresh independent substantive review of the exact final head;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. unchanged final head after qualification/review;
10. guarded merge with expected head SHA;
11. post-merge verification of ordered parents, tree, GitHub signature, PR state, canonical `main`, and absence of intervening main movement;
12. durable canonical task closeout before the successor begins.

Any head mutation invalidates earlier exact-head CI/review evidence.

## Hard prohibitions

1. No function coverage, mutation/property/fuzzing, AST/CFG, browser/container identity, dependency inventory, SBOM, or M2 capability.
2. No new runtime dependency.
3. No executable package-manager probing or implicit install.
4. No second package-manager resolver or `src/discovery.ts` mutation.
5. No raw hostname/user/home/network/environment-variable/machine/credential/secret identity in receipts.
6. No receipt 1.1/v2, schema negotiation, runtime schema selection, or new in-receipt source/schema revision field.
7. No second JSON Schema evaluator or new validation dependency.
8. No generalized filesystem sandbox/watcher/security framework.
9. No new CLI verb/flag or generic CLI error redesign.
10. No `src/receipt/build.ts` mutation under T104–T106.
11. No historical benchmark-result overwrite/fabrication.
12. No npm publication, GitHub Release, or Git tag.
13. No force-push, rebase of shared history, or destructive history rewrite.
14. No fabricated evidence, CI, review, authority, qualification, or completion claim.
15. No task starts before its exact predecessor and authorization/closeout gates are canonical.

## Founder standing approval

The founder's standing approval for ordinary repository work is recorded prospectively. It applies only to the exact sequence, file surfaces, acceptance criteria, and prohibitions above. It becomes effective only when this authorization file itself is merged into canonical `main` and the merge identity is verified.

## Spec 005 canonical closeout criteria

Spec 005 closes `GO` only when:

1. this authorization is canonically merged and verified;
2. T104, T105, and T106 are each canonically merged in order and independently qualified;
3. every task merge has verified parents/tree/signature/PR/main identity;
4. each task has exact-head six-lane CI success and fresh independent review with zero unresolved material findings/threads;
5. F1–F8 planning constraints remain satisfied in implementation;
6. T105 proves reliable object binding on all six supported OS/Node lanes or stops `NO_GO`;
7. receipt schema remains `"1.0"` under `RECEIPT_V1_ADDITIVE_LOCKSTEP`;
8. historical benchmark results remain unchanged;
9. no prohibited dependency/publication/release/tag/successor capability is introduced.

If any required gate cannot be satisfied within this authorization, stop `NO_GO` and return to planning rather than widen authority.
