# Specification 006 Tasks — Self-Verification Shadow Receipt

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

**Canonical order:** T107 → T108 → T109

## T107 — Implement exact-tree self-verification harness

### Scope

Authorized candidate surfaces:

- `benchmarks/self-verify.mjs` — new single-purpose repository qualification harness;
- `tests/t107-self-verification-harness.contract.test.ts` — new focused contracts.

Required behavior:

- accept explicit exact PR base/head identities and output directory;
- prove initial exact head checkout and target head tree;
- require clean tracked/index state and no unrelated nonignored untracked files before reconstruction;
- use CI-ephemeral `git reset --soft <base>` only after exact verifier build exists;
- prove post-reset `HEAD == base` and `git write-tree == target head tree` with no unstaged tracked divergence;
- run only the exact pre-reconstruction head-built Ascout CLI with `check --format json` and **without** changed-command-surface admission;
- capture exact stdout receipt bytes and stderr separately;
- accept only a parseable receipt that passes current head-built JSON Schema + semantic validation and whose summary exit equals process exit;
- classify valid receipt exits `0`, `1`, `3`, and `4` as successful shadow captures without rewriting their meaning;
- treat missing/invalid receipt, exit `2`, identity mismatch, reconstruction failure, validation failure, or digest mismatch as harness failure;
- emit a privacy-safe qualification envelope binding verifier head/tree, subject base/head/tree, exact receipt exit, receipt SHA-256, and receipt filename;
- place generated evidence outside repository source identity, preferably under runner temp;
- add no `src/**`, receipt/schema, CLI, dependency, workflow, benchmark-result, publication/release/tag mutation.

### Focused acceptance proof

At minimum cover:

1. correct exact-H precondition;
2. wrong declared head rejection;
3. missing/non-ancestor base rejection;
4. exact soft-reset head/tree reconstruction;
5. added tracked file identity;
6. deleted tracked file identity;
7. rename/content-change identity;
8. pre/post unstaged tracked drift rejection;
9. unrelated nonignored untracked-file rejection;
10. canonical ignored build/install paths allowed;
11. valid exit 0 capture;
12. valid exit 1 shadow capture;
13. valid exit 3 shadow capture;
14. valid exit 4 shadow capture;
15. process/receipt exit mismatch rejection;
16. malformed JSON rejection;
17. current-schema-invalid receipt rejection;
18. semantic-invalid receipt rejection;
19. exit 2/no-receipt rejection;
20. exact receipt-byte SHA-256;
21. envelope allowlist/privacy;
22. executed argv never contains `--allow-changed-command-surface`.

### T107 hard boundary

No `.github/workflows/**` mutation under T107. No `src/**`. No product behavior, package/dependency, historical benchmark result, release/tag/publication mutation.

### T107 qualification

T107 requires exact-head Project CI 6/6, fresh independent substantive review, zero material findings/threads, exact two-path purity, guarded expected-head merge, post-merge ordered parents/tree/signature/PR/main verification, and durable `T107 = CLOSED_CANONICAL` before T108 begins.

---

## T108 — Add non-gating self-verification workflow and live artifact proof

### Scope

Authorized candidate surface:

- `.github/workflows/self-verify.yml` — new workflow only.

The workflow MUST use the canonically merged T107 harness; T108 does not change the harness unless a prospective authority amendment is first canonicalized.

### Required workflow behavior

- trigger on `pull_request`;
- `permissions: contents: read` only;
- run on Ubuntu 24.04 / Node 24 only;
- checkout exact PR head with enough Git history to resolve the event base SHA;
- exact-head guard before install/build;
- `npm ci --ignore-scripts --no-audit --no-fund`;
- `npm run build` at exact PR head;
- invoke the T107 harness with exact event base/head SHAs and runner-temp output;
- never pass changed-command-surface admission;
- upload only the generated receipt and qualification envelope;
- artifact name must bind exact PR head SHA;
- `if-no-files-found: error`;
- `retention-days: 30`;
- use exact pinned `actions/upload-artifact` commit approved by implementation authorization;
- no PR/repository writes, comments, statuses mutation, secrets, release, tag, publication, or hidden-file upload.

### Shadow semantics

The workflow succeeds when trustworthy capture succeeds, even if the retained valid receipt has exit `1`, `3`, or `4`.

The workflow fails on harness/bootstrap/identity/reconstruction/execution-without-valid-receipt/validation/digest/artifact failure.

It MUST NOT claim a green self-verification verdict merely because the workflow job is green. Job green means **capture integrity succeeded**.

### Live qualification proof

The exact T108 implementation PR MUST produce, on its exact final head:

- ordinary Project CI 6/6 success;
- a successful run of the new self-verification workflow against the exact PR base/head pair;
- downloadable workflow artifact containing exactly the receipt/envelope files expected by the approved design;
- envelope identities matching the exact PR head/tree and base;
- receipt digest matching exact retained bytes;
- valid current-schema + semantic receipt;
- no automatic command-surface admission;
- fresh independent exact-head substantive review;
- zero unresolved material threads;
- exact one-path T108 purity.

### T108 hard boundary

No modification to `.github/workflows/ci.yml`, T107 harness/tests, `src/**`, package/dependency manifests, receipt/schema, benchmark results, release/tag/publication.

### T108 qualification

Guarded expected-head merge and post-merge verification are mandatory. Record `T108 = CLOSED_CANONICAL` only after merge identity is verified.

---

## T109 — Reconcile the first canonical shadow observation

### Scope

Ledger/governance reconciliation only. No code/product/workflow mutation is authorized by default.

After T108 merge:

1. identify the exact qualified T108 workflow run/artifact that proved the feature;
2. record exact workflow run ID, verifier head/tree, subject base/head/tree, receipt exit, receipt digest, artifact identity/retention, and whether the receipt was clean/non-clean/incomplete;
3. explicitly preserve that the observation is `SHADOW_NON_GATING`;
4. record any measured friction discovered by the first live observation;
5. decide only whether Spec 006 itself met its acceptance criteria.

T109 MUST NOT promote self-verification to a required gate, widen retention, add trend aggregation, start selector shadow, or begin M2.

### T109 closeout

If all Spec 006 criteria are satisfied, record:

`T109 = CLOSED_CANONICAL`

then:

`SPEC_006 = CLOSED_CANONICAL / GO`

If the live artifact cannot establish the promised identity/integrity properties, record `SPEC_006 = NO_GO` and return to planning.

---

## Execution discipline

For T107 and T108:

1. reread canonical `main`, Constitution, Master Plan, roadmap, Spec 006 authority, live PR/review/Actions state;
2. branch from exact canonical `main` after predecessor closeout;
3. mutate only exact current-task surfaces;
4. preserve historical benchmark-result blobs;
5. run focused proof and full repository typecheck/test/build as applicable;
6. qualify exact head with Project CI Ubuntu 24.04/macOS 14/Windows 2025 × Node 22/24;
7. obtain fresh independent exact-head substantive review;
8. reconcile every material finding/thread;
9. keep final head unchanged after qualification;
10. guarded merge with expected head SHA;
11. verify ordered parents/tree/GitHub signature/PR/main/no-intervening-main movement;
12. record canonical task closeout before successor.

Any head mutation invalidates earlier exact-head CI/review evidence.

## Authorization gate

T107 MUST NOT begin until the Spec 006 planning package is canonically merged and post-merge verified, then a separate durable implementation authorization binds that exact planning merge, T107–T109 surfaces, supply-chain decision, acceptance criteria, and prohibitions.

Planning files alone do not authorize implementation.